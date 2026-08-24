-- Fix member farm create:
-- 1) SELECT allows creator to read their new row (INSERT...RETURNING)
-- 2) Security-definer RPC creates farm + farm_members atomically

DROP POLICY IF EXISTS "farms: org admins or farm members can select" ON public.farms;
CREATE POLICY "farms: org admins, farm members, or creator can select"
  ON public.farms
  FOR SELECT
  TO authenticated
  USING (
    public.is_org_admin(organization_id)
    OR id IN (SELECT public.get_my_farm_ids())
    OR created_by = auth.uid()
  );

CREATE OR REPLACE FUNCTION public.create_org_farm(
  p_org_id uuid,
  p_name text,
  p_lat double precision,
  p_lng double precision,
  p_district text DEFAULT NULL,
  p_province text DEFAULT NULL,
  p_country text DEFAULT NULL
)
RETURNS public.farms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_farm public.farms;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน';
  END IF;

  IF p_org_id IS NULL THEN
    RAISE EXCEPTION 'ไม่พบองค์กร';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = p_org_id
      AND om.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์สร้างฟาร์มในองค์กรนี้';
  END IF;

  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'กรุณาระบุชื่อฟาร์ม';
  END IF;

  INSERT INTO public.farms (
    name,
    organization_id,
    lat,
    lng,
    district,
    province,
    country,
    created_by
  )
  VALUES (
    trim(p_name),
    p_org_id,
    p_lat,
    p_lng,
    NULLIF(trim(p_district), ''),
    NULLIF(trim(p_province), ''),
    NULLIF(trim(COALESCE(p_country, '')), ''),
    auth.uid()
  )
  RETURNING * INTO v_farm;

  INSERT INTO public.farm_members (farm_id, user_id, role, assigned_by)
  VALUES (
    v_farm.id,
    auth.uid(),
    'owner'::public.farm_member_role,
    auth.uid()
  )
  ON CONFLICT (farm_id, user_id) DO NOTHING;

  RETURN v_farm;
END;
$$;

REVOKE ALL ON FUNCTION public.create_org_farm(
  uuid, text, double precision, double precision, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_org_farm(
  uuid, text, double precision, double precision, text, text, text
) TO authenticated;

COMMENT ON FUNCTION public.create_org_farm(
  uuid, text, double precision, double precision, text, text, text
) IS
  'Any org member can create a farm; creator becomes farm_members.owner.';
