-- ช้าลง: simulation_speed_factor 25 → 5
ALTER TABLE public.automated_jobs
  ALTER COLUMN simulation_speed_factor SET DEFAULT 5;

UPDATE public.automated_jobs
SET simulation_speed_factor = 5
WHERE simulation_speed_factor = 25;
