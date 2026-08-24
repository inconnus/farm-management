-- Allow any org member to create farms in their organization.
-- Creator is auto-added as farm_members.owner so they can see/manage it
-- under the farm-scoped SELECT policy.

DROP POLICY IF EXISTS "farms: org owners/admins can insert" ON public.farms;

CREATE POLICY "farms: org members can insert"
  ON public.farms
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (SELECT public.get_my_org_ids())
  );

CREATE OR REPLACE FUNCTION public.set_farm_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS farms_set_created_by ON public.farms;
CREATE TRIGGER farms_set_created_by
  BEFORE INSERT ON public.farms
  FOR EACH ROW
  EXECUTE FUNCTION public.set_farm_created_by();

CREATE OR REPLACE FUNCTION public.add_farm_creator_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.farm_members (farm_id, user_id, role, assigned_by)
  VALUES (
    NEW.id,
    auth.uid(),
    'owner'::public.farm_member_role,
    auth.uid()
  )
  ON CONFLICT (farm_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS farms_add_creator_membership ON public.farms;
CREATE TRIGGER farms_add_creator_membership
  AFTER INSERT ON public.farms
  FOR EACH ROW
  EXECUTE FUNCTION public.add_farm_creator_membership();

REVOKE ALL ON FUNCTION public.set_farm_created_by() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_farm_creator_membership() FROM PUBLIC;
