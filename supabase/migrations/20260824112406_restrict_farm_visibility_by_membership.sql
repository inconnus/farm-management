-- Restrict farm visibility: org owner/admin see all farms in org;
-- member/viewer only see farms listed in farm_members (default: none).
-- Org admins can assign farms via set_org_member_farm_access.

-- ─── Helper: can current user access a farm's content? ───────────────────────

CREATE OR REPLACE FUNCTION public.can_access_farm(p_farm_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.farm_members fm
      WHERE fm.farm_id = p_farm_id
        AND fm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.farms f
      WHERE f.id = p_farm_id
        AND public.is_org_admin(f.organization_id)
    );
$$;

REVOKE ALL ON FUNCTION public.can_access_farm(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_farm(uuid) TO authenticated;

-- ─── farms SELECT ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "farms: org/farm members can select" ON public.farms;
CREATE POLICY "farms: org admins or farm members can select"
  ON public.farms
  FOR SELECT
  TO authenticated
  USING (
    public.is_org_admin(organization_id)
    OR id IN (SELECT public.get_my_farm_ids())
  );

-- ─── lands SELECT ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "lands: farm/org members can select" ON public.lands;
CREATE POLICY "lands: farm members or org admins can select"
  ON public.lands
  FOR SELECT
  TO authenticated
  USING (public.can_access_farm(farm_id));

-- ─── farm_devices SELECT / UPDATE ────────────────────────────────────────────

DROP POLICY IF EXISTS "farm_devices: farm/org members can select" ON public.farm_devices;
CREATE POLICY "farm_devices: farm members or org admins can select"
  ON public.farm_devices
  FOR SELECT
  TO authenticated
  USING (public.can_access_farm(farm_id));

DROP POLICY IF EXISTS "farm_devices: farm members can update" ON public.farm_devices;
CREATE POLICY "farm_devices: farm members or org admins can update"
  ON public.farm_devices
  FOR UPDATE
  TO authenticated
  USING (public.can_access_farm(farm_id))
  WITH CHECK (public.can_access_farm(farm_id));

-- ─── tasks SELECT ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "tasks: farm/org members can select" ON public.tasks;
CREATE POLICY "tasks: farm members or org admins can select"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (public.can_access_farm(farm_id));

-- ─── automated_jobs SELECT ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "automated_jobs: farm/org members can select" ON public.automated_jobs;
CREATE POLICY "automated_jobs: farm members or org admins can select"
  ON public.automated_jobs
  FOR SELECT
  TO authenticated
  USING (public.can_access_farm(farm_id));

-- ─── farm_members SELECT / DELETE ────────────────────────────────────────────
-- Admins need to list and revoke assignments; members only see own / their farms.

DROP POLICY IF EXISTS "farm_members: visible to org/farm members" ON public.farm_members;
CREATE POLICY "farm_members: self, farm peers, or org admins can select"
  ON public.farm_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR farm_id IN (SELECT public.get_my_farm_ids())
    OR public.can_access_farm(farm_id)
  );

DROP POLICY IF EXISTS "farm_members: self-leave or manager-remove" ON public.farm_members;
CREATE POLICY "farm_members: self-leave, farm managers, or org admins can delete"
  ON public.farm_members
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR farm_id IN (
      SELECT fm.farm_id
      FROM public.farm_members fm
      WHERE fm.user_id = auth.uid()
        AND fm.role = ANY (
          ARRAY[
            'owner'::public.farm_member_role,
            'manager'::public.farm_member_role
          ]
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.farms f
      WHERE f.id = farm_members.farm_id
        AND public.is_org_admin(f.organization_id)
    )
  );

-- ─── RPC: replace farm access for an org member ──────────────────────────────

CREATE OR REPLACE FUNCTION public.set_org_member_farm_access(
  p_org_id uuid,
  p_user_id uuid,
  p_farm_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ids uuid[] := COALESCE(p_farm_ids, ARRAY[]::uuid[]);
  v_invalid uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน';
  END IF;

  IF NOT public.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์ตั้งค่าการเข้าถึงฟาร์ม';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = p_org_id
      AND om.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'ผู้ใช้ไม่ได้อยู่ในองค์กรนี้';
  END IF;

  -- Reject farms outside this org
  SELECT x INTO v_invalid
  FROM unnest(v_ids) AS x
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.farms f
    WHERE f.id = x
      AND f.organization_id = p_org_id
  )
  LIMIT 1;

  IF v_invalid IS NOT NULL THEN
    RAISE EXCEPTION 'พบฟาร์มที่ไม่ได้อยู่ในองค์กรนี้';
  END IF;

  -- Remove assignments in this org that are no longer selected
  DELETE FROM public.farm_members fm
  USING public.farms f
  WHERE fm.farm_id = f.id
    AND f.organization_id = p_org_id
    AND fm.user_id = p_user_id
    AND NOT (fm.farm_id = ANY (v_ids));

  -- Add missing assignments (default farm role: worker)
  INSERT INTO public.farm_members (farm_id, user_id, role)
  SELECT farm_id, p_user_id, 'worker'::public.farm_member_role
  FROM unnest(v_ids) AS farm_id
  ON CONFLICT (farm_id, user_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.set_org_member_farm_access(uuid, uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_org_member_farm_access(uuid, uuid, uuid[]) TO authenticated;

COMMENT ON FUNCTION public.set_org_member_farm_access(uuid, uuid, uuid[]) IS
  'Org owner/admin replaces which farms a member/viewer can see via farm_members.';
