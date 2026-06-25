DO $$
BEGIN
  CREATE TYPE public.automated_job_status AS ENUM (
    'queued',
    'working',
    'paused',
    'completed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.automated_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  land_id uuid NOT NULL REFERENCES public.lands(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES public.farm_devices(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  status public.automated_job_status NOT NULL DEFAULT 'queued',
  path_progress double precision NOT NULL DEFAULT 0
    CHECK (path_progress >= 0 AND path_progress <= 1),
  work_path jsonb NOT NULL DEFAULT '[]'::jsonb,
  speed_kmh double precision,
  created_by uuid REFERENCES public.profiles(id),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS automated_jobs_land_id_idx ON public.automated_jobs(land_id);
CREATE INDEX IF NOT EXISTS automated_jobs_farm_id_idx ON public.automated_jobs(farm_id);
CREATE INDEX IF NOT EXISTS automated_jobs_device_id_idx ON public.automated_jobs(device_id);

ALTER TABLE public.automated_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "automated_jobs: farm members can select" ON public.automated_jobs;
CREATE POLICY "automated_jobs: farm members can select"
  ON public.automated_jobs
  FOR SELECT
  TO public
  USING (farm_id IN (SELECT public.get_my_farm_ids()));

DROP POLICY IF EXISTS "automated_jobs: farm members can insert" ON public.automated_jobs;
CREATE POLICY "automated_jobs: farm members can insert"
  ON public.automated_jobs
  FOR INSERT
  TO public
  WITH CHECK (farm_id IN (SELECT public.get_my_farm_ids()));

DROP POLICY IF EXISTS "automated_jobs: farm members can update" ON public.automated_jobs;
CREATE POLICY "automated_jobs: farm members can update"
  ON public.automated_jobs
  FOR UPDATE
  TO public
  USING (farm_id IN (SELECT public.get_my_farm_ids()))
  WITH CHECK (farm_id IN (SELECT public.get_my_farm_ids()));

DROP POLICY IF EXISTS "automated_jobs: farm members can delete" ON public.automated_jobs;
CREATE POLICY "automated_jobs: farm members can delete"
  ON public.automated_jobs
  FOR DELETE
  TO public
  USING (farm_id IN (SELECT public.get_my_farm_ids()));

-- รถไถเริ่มต้น 1 คันต่อฟาร์ม (ถ้ายังไม่มี)
INSERT INTO public.farm_devices (farm_id, name, device_type, lat, lng, config)
SELECT
  f.id,
  'รถไถไร้คนขับ #1',
  'tractor'::public.device_type,
  COALESCE(f.lat, 13.7563),
  COALESCE(f.lng, 100.5018),
  jsonb_build_object('battery_percent', 100, 'speed_kmh', 4.2)
FROM public.farms f
WHERE NOT EXISTS (
  SELECT 1
  FROM public.farm_devices d
  WHERE d.farm_id = f.id
    AND d.device_type = 'tractor'::public.device_type
);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.automated_jobs;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
