-- Allow farm owners/managers (and org admins) to delete farms.
-- Previously only is_org_admin could delete, so member deletes
-- returned success with 0 rows and the farm stayed visible.

DROP POLICY IF EXISTS "farms: org owners/admins can delete" ON public.farms;

CREATE POLICY "farms: org admins or farm managers can delete"
  ON public.farms
  FOR DELETE
  TO authenticated
  USING (
    public.is_org_admin(organization_id)
    OR public.is_farm_manager(id)
  );
