-- Store Kasetkorn external IDs for later linking
ALTER TABLE public.farms
  ADD COLUMN IF NOT EXISTS app_farmer_id text,
  ADD COLUMN IF NOT EXISTS app_farm_id text;

CREATE UNIQUE INDEX IF NOT EXISTS farms_app_farm_id_uidx
  ON public.farms (app_farm_id)
  WHERE app_farm_id IS NOT NULL;
