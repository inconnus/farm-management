-- UPDATE ใครมองเห็นได้จาก SELECT ก็แก้ config ได้ (สมาชิกฟาร์ม หรือสมาชิก org ที่ฟาร์มอยู่ใน org เดียวกัน)
DROP POLICY IF EXISTS "farm_devices: farm members can update" ON public.farm_devices;

CREATE POLICY "farm_devices: farm members can update"
  ON public.farm_devices
  FOR UPDATE
  TO public
  USING (
    (farm_id IN (SELECT public.get_my_farm_ids()))
    OR (farm_id IN (
      SELECT f.id
      FROM public.farms f
      WHERE f.organization_id IN (SELECT public.get_my_org_ids())
    ))
  )
  WITH CHECK (
    (farm_id IN (SELECT public.get_my_farm_ids()))
    OR (farm_id IN (
      SELECT f.id
      FROM public.farms f
      WHERE f.organization_id IN (SELECT public.get_my_org_ids())
    ))
  );
