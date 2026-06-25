-- ความเร็วจริง: simulation_speed_factor → 1
ALTER TABLE public.automated_jobs
  ALTER COLUMN simulation_speed_factor SET DEFAULT 1;

UPDATE public.automated_jobs
SET simulation_speed_factor = 1
WHERE simulation_speed_factor <> 1;
