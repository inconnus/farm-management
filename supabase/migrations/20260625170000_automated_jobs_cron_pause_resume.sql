-- Cron tick: 30s interval + pause เมื่อไม่มีงาน working, resume เมื่อมีงานใหม่

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'tick-automated-jobs') THEN
    PERFORM cron.unschedule((SELECT jobid FROM cron.job WHERE jobname = 'tick-automated-jobs' LIMIT 1));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.ensure_automated_jobs_tick_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'tick-automated-jobs') THEN
    PERFORM cron.schedule(
      'tick-automated-jobs',
      '30 seconds',
      $cron$SELECT public.tick_automated_jobs();$cron$
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.pause_automated_jobs_tick_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'tick-automated-jobs') THEN
    PERFORM cron.unschedule((SELECT jobid FROM cron.job WHERE jobname = 'tick-automated-jobs' LIMIT 1));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_automated_jobs_tick_cron()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.automated_jobs
    WHERE status = 'working'
  ) THEN
    PERFORM public.ensure_automated_jobs_tick_cron();
  ELSE
    PERFORM public.pause_automated_jobs_tick_cron();
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS automated_jobs_sync_tick_cron ON public.automated_jobs;

CREATE TRIGGER automated_jobs_sync_tick_cron
  AFTER INSERT OR UPDATE OF status OR DELETE
  ON public.automated_jobs
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.sync_automated_jobs_tick_cron();

-- ถ้ามีงาน working อยู่แล้ว ให้เปิด cron ทันที
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.automated_jobs WHERE status = 'working') THEN
    PERFORM public.ensure_automated_jobs_tick_cron();
  END IF;
END $$;
