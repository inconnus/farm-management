-- Server-side simulation tick for automated_jobs (option C)
-- pg_cron runs every 5 seconds — single source of truth for path_progress + device position

ALTER TABLE public.automated_jobs
  ADD COLUMN IF NOT EXISTS path_length_km double precision,
  ADD COLUMN IF NOT EXISTS simulation_speed_factor double precision NOT NULL DEFAULT 1;

UPDATE public.automated_jobs
SET path_length_km = 0.001
WHERE path_length_km IS NULL OR path_length_km <= 0;

CREATE OR REPLACE FUNCTION public.haversine_km(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 6371 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

CREATE OR REPLACE FUNCTION public.path_length_km_from_json(path jsonb)
RETURNS double precision
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  i integer;
  n integer;
  total double precision := 0;
  lng1 double precision;
  lat1 double precision;
  lng2 double precision;
  lat2 double precision;
BEGIN
  IF path IS NULL OR jsonb_typeof(path) <> 'array' THEN
    RETURN 0;
  END IF;

  n := jsonb_array_length(path);
  IF n < 2 THEN
    RETURN 0;
  END IF;

  FOR i IN 0..(n - 2) LOOP
    lng1 := (path -> i ->> 0)::double precision;
    lat1 := (path -> i ->> 1)::double precision;
    lng2 := (path -> (i + 1) ->> 0)::double precision;
    lat2 := (path -> (i + 1) ->> 1)::double precision;
    total := total + public.haversine_km(lat1, lng1, lat2, lng2);
  END LOOP;

  RETURN GREATEST(total, 0.001);
END;
$$;

CREATE OR REPLACE FUNCTION public.position_along_work_path(
  path jsonb,
  progress double precision
)
RETURNS TABLE(out_lng double precision, out_lat double precision, out_heading double precision)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  n integer;
  total_km double precision;
  target_km double precision;
  walked_km double precision := 0;
  seg_km double precision;
  i integer;
  lng1 double precision;
  lat1 double precision;
  lng2 double precision;
  lat2 double precision;
  ratio double precision;
  next_lng double precision;
  next_lat double precision;
  v_heading double precision := 0;
BEGIN
  IF path IS NULL OR jsonb_typeof(path) <> 'array' THEN
    out_lng := 0;
    out_lat := 0;
    out_heading := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  n := jsonb_array_length(path);
  IF n = 0 THEN
    out_lng := 0;
    out_lat := 0;
    out_heading := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  IF n = 1 OR progress <= 0 THEN
    out_lng := (path -> 0 ->> 0)::double precision;
    out_lat := (path -> 0 ->> 1)::double precision;
    out_heading := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  IF progress >= 1 THEN
    out_lng := (path -> (n - 1) ->> 0)::double precision;
    out_lat := (path -> (n - 1) ->> 1)::double precision;
    IF n >= 2 THEN
      lng1 := (path -> (n - 2) ->> 0)::double precision;
      lat1 := (path -> (n - 2) ->> 1)::double precision;
      v_heading := degrees(atan2(out_lng - lng1, out_lat - lat1));
    END IF;
    out_heading := v_heading;
    RETURN NEXT;
    RETURN;
  END IF;

  total_km := public.path_length_km_from_json(path);
  target_km := total_km * progress;

  lng1 := (path -> 0 ->> 0)::double precision;
  lat1 := (path -> 0 ->> 1)::double precision;

  FOR i IN 0..(n - 2) LOOP
    lng2 := (path -> (i + 1) ->> 0)::double precision;
    lat2 := (path -> (i + 1) ->> 1)::double precision;
    seg_km := public.haversine_km(lat1, lng1, lat2, lng2);

    IF walked_km + seg_km >= target_km THEN
      ratio := CASE WHEN seg_km = 0 THEN 0 ELSE (target_km - walked_km) / seg_km END;
      out_lng := lng1 + (lng2 - lng1) * ratio;
      out_lat := lat1 + (lat2 - lat1) * ratio;

      IF i + 2 < n THEN
        next_lng := (path -> (i + 2) ->> 0)::double precision;
        next_lat := (path -> (i + 2) ->> 1)::double precision;
        v_heading := degrees(atan2(next_lng - out_lng, next_lat - out_lat));
      ELSE
        v_heading := degrees(atan2(lng2 - lng1, lat2 - lat1));
      END IF;
      out_heading := v_heading;
      RETURN NEXT;
      RETURN;
    END IF;

    walked_km := walked_km + seg_km;
    lng1 := lng2;
    lat1 := lat2;
  END LOOP;

  out_lng := lng1;
  out_lat := lat1;
  out_heading := v_heading;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.tick_automated_jobs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  job record;
  pos record;
  new_progress double precision;
  updated_count integer := 0;
BEGIN
  FOR job IN
    SELECT
      aj.id,
      aj.device_id,
      aj.work_path,
      aj.speed_kmh,
      aj.path_length_km,
      aj.simulation_speed_factor,
      aj.started_at
    FROM public.automated_jobs aj
    WHERE aj.status = 'working'
      AND aj.started_at IS NOT NULL
      AND aj.work_path IS NOT NULL
  LOOP
    IF job.path_length_km IS NULL OR job.path_length_km <= 0 THEN
      UPDATE public.automated_jobs
      SET path_length_km = public.path_length_km_from_json(job.work_path)
      WHERE id = job.id;
      CONTINUE;
    END IF;

    new_progress := LEAST(
      1,
      (
        EXTRACT(EPOCH FROM (now() - job.started_at)) / 3600.0
        * COALESCE(job.speed_kmh, 4.2)
        * COALESCE(job.simulation_speed_factor, 1)
      ) / job.path_length_km
    );

    IF new_progress >= 1 THEN
      SELECT p.out_lng, p.out_lat, p.out_heading
      INTO pos
      FROM public.position_along_work_path(job.work_path, 1) AS p;

      UPDATE public.automated_jobs
      SET
        path_progress = 1,
        status = 'completed',
        completed_at = COALESCE(completed_at, now()),
        updated_at = now()
      WHERE id = job.id;

      UPDATE public.farm_devices
      SET lat = pos.out_lat, lng = pos.out_lng, updated_at = now()
      WHERE id = job.device_id;
    ELSE
      SELECT p.out_lng, p.out_lat, p.out_heading
      INTO pos
      FROM public.position_along_work_path(job.work_path, new_progress) AS p;

      UPDATE public.automated_jobs
      SET path_progress = new_progress, updated_at = now()
      WHERE id = job.id;

      UPDATE public.farm_devices
      SET lat = pos.out_lat, lng = pos.out_lng, updated_at = now()
      WHERE id = job.device_id;
    END IF;

    updated_count := updated_count + 1;
  END LOOP;

  RETURN updated_count;
END;
$$;

-- pg_cron: tick ทุก 30 วินาที (เฉพาะตอนมีงาน working — ดู migration pause/resume)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'tick-automated-jobs') THEN
    PERFORM cron.unschedule((SELECT jobid FROM cron.job WHERE jobname = 'tick-automated-jobs' LIMIT 1));
  END IF;
END $$;

-- ไม่ schedule ถาวร — เปิดผ่าน ensure_automated_jobs_tick_cron() เมื่อมีงาน working
