-- Align farm_devices INSERT with lands: farm managers or org admins can add devices.
-- Fixes RLS error when org admins (without farm_members row) import sensors.

DROP POLICY IF EXISTS "farm_devices: farm owners/managers can insert" ON public.farm_devices;

CREATE POLICY "farm_devices: farm managers or org admins can insert"
  ON public.farm_devices
  FOR INSERT
  WITH CHECK (
    public.is_farm_manager(farm_id)
    OR EXISTS (
      SELECT 1
      FROM public.farms f
      WHERE f.id = farm_devices.farm_id
        AND public.is_org_admin(f.organization_id)
    )
  );
