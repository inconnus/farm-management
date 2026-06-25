UPDATE public.automated_jobs
SET path_length_km = public.path_length_km_from_json(work_path)
WHERE path_length_km IS NULL OR path_length_km <= 0.001;
