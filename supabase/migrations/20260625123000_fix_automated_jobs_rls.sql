-- Align automated_jobs RLS with tasks (farm members + org admins)

DROP POLICY IF EXISTS "automated_jobs: farm members can select" ON public.automated_jobs;
DROP POLICY IF EXISTS "automated_jobs: farm members can insert" ON public.automated_jobs;
DROP POLICY IF EXISTS "automated_jobs: farm members can update" ON public.automated_jobs;
DROP POLICY IF EXISTS "automated_jobs: farm members can delete" ON public.automated_jobs;

CREATE POLICY "automated_jobs: farm/org members can select"
  ON public.automated_jobs
  FOR SELECT
  TO public
  USING (
    farm_id IN (SELECT public.get_my_farm_ids())
    OR farm_id IN (
      SELECT f.id
      FROM public.farms f
      WHERE f.organization_id IN (SELECT public.get_my_org_ids())
    )
  );

CREATE POLICY "automated_jobs: farm managers or org admins can insert"
  ON public.automated_jobs
  FOR INSERT
  TO public
  WITH CHECK (
    farm_id IN (
      SELECT farm_members.farm_id
      FROM public.farm_members
      WHERE farm_members.user_id = auth.uid()
        AND farm_members.role = ANY (ARRAY['owner'::public.farm_member_role, 'manager'::public.farm_member_role])
    )
    OR farm_id IN (
      SELECT f.id
      FROM public.farms f
      WHERE f.organization_id IN (
        SELECT organization_members.organization_id
        FROM public.organization_members
        WHERE organization_members.user_id = auth.uid()
          AND organization_members.role = ANY (ARRAY['owner'::public.org_member_role, 'admin'::public.org_member_role])
      )
    )
  );

CREATE POLICY "automated_jobs: farm managers or org admins can update"
  ON public.automated_jobs
  FOR UPDATE
  TO public
  USING (
    farm_id IN (
      SELECT farm_members.farm_id
      FROM public.farm_members
      WHERE farm_members.user_id = auth.uid()
        AND farm_members.role = ANY (ARRAY['owner'::public.farm_member_role, 'manager'::public.farm_member_role])
    )
    OR farm_id IN (
      SELECT f.id
      FROM public.farms f
      WHERE f.organization_id IN (
        SELECT organization_members.organization_id
        FROM public.organization_members
        WHERE organization_members.user_id = auth.uid()
          AND organization_members.role = ANY (ARRAY['owner'::public.org_member_role, 'admin'::public.org_member_role])
      )
    )
  )
  WITH CHECK (
    farm_id IN (
      SELECT farm_members.farm_id
      FROM public.farm_members
      WHERE farm_members.user_id = auth.uid()
        AND farm_members.role = ANY (ARRAY['owner'::public.farm_member_role, 'manager'::public.farm_member_role])
    )
    OR farm_id IN (
      SELECT f.id
      FROM public.farms f
      WHERE f.organization_id IN (
        SELECT organization_members.organization_id
        FROM public.organization_members
        WHERE organization_members.user_id = auth.uid()
          AND organization_members.role = ANY (ARRAY['owner'::public.org_member_role, 'admin'::public.org_member_role])
      )
    )
  );

CREATE POLICY "automated_jobs: farm managers or org admins can delete"
  ON public.automated_jobs
  FOR DELETE
  TO public
  USING (
    farm_id IN (
      SELECT farm_members.farm_id
      FROM public.farm_members
      WHERE farm_members.user_id = auth.uid()
        AND farm_members.role = ANY (ARRAY['owner'::public.farm_member_role, 'manager'::public.farm_member_role])
    )
    OR farm_id IN (
      SELECT f.id
      FROM public.farms f
      WHERE f.organization_id IN (
        SELECT organization_members.organization_id
        FROM public.organization_members
        WHERE organization_members.user_id = auth.uid()
          AND organization_members.role = ANY (ARRAY['owner'::public.org_member_role, 'admin'::public.org_member_role])
      )
    )
  );
