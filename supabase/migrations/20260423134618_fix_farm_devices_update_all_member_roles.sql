-- Allow any farm member (owner / manager / worker) to UPDATE farm_devices.
-- Replaces policy limited to owner+manager only — workers need to PATCH config (e.g. lights).
-- Note: Postgres RLS disallows set-returning functions in policy expressions; use IN (SELECT ...).

DROP POLICY IF EXISTS "farm_devices: farm owners/managers can update" ON public.farm_devices;

CREATE POLICY "farm_devices: farm members can update"
  ON public.farm_devices
  FOR UPDATE
  TO public
  USING (farm_id IN (SELECT public.get_my_farm_ids()))
  WITH CHECK (farm_id IN (SELECT public.get_my_farm_ids()));
