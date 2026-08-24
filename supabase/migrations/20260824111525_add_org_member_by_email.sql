-- Add existing user to organization by email (no invitee confirmation).
-- Caller must be org owner/admin. Role cannot be owner.

CREATE OR REPLACE FUNCTION public.add_org_member_by_email(
  p_org_id uuid,
  p_email text,
  p_role public.org_member_role DEFAULT 'member'::public.org_member_role
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_member_id uuid;
  v_normalized_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน';
  END IF;

  IF NOT public.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์เชิญสมาชิก';
  END IF;

  IF p_role IS NULL OR p_role = 'owner'::public.org_member_role THEN
    RAISE EXCEPTION 'ไม่สามารถมอบบทบาทเจ้าของผ่านการเชิญ';
  END IF;

  v_normalized_email := lower(trim(p_email));
  IF v_normalized_email IS NULL OR v_normalized_email = '' OR position('@' in v_normalized_email) = 0 THEN
    RAISE EXCEPTION 'อีเมลไม่ถูกต้อง';
  END IF;

  SELECT u.id
  INTO v_user_id
  FROM auth.users u
  WHERE lower(u.email) = v_normalized_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'ไม่พบบัญชีที่ใช้อีเมลนี้ กรุณาให้ผู้ใช้สมัครก่อน';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = p_org_id
      AND om.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'ผู้ใช้นี้อยู่ในองค์กรแล้ว';
  END IF;

  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role,
    invited_by
  )
  VALUES (
    p_org_id,
    v_user_id,
    p_role,
    auth.uid()
  )
  RETURNING id INTO v_member_id;

  RETURN v_member_id;
END;
$$;

REVOKE ALL ON FUNCTION public.add_org_member_by_email(uuid, text, public.org_member_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_org_member_by_email(uuid, text, public.org_member_role) TO authenticated;

COMMENT ON FUNCTION public.add_org_member_by_email(uuid, text, public.org_member_role) IS
  'Org owner/admin adds an existing auth user to the organization by email without invitee confirmation.';
