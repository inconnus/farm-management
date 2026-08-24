import { supabase } from '@lib/supabase/client';
import type { Enums } from '@lib/supabase/database.types';
import type { OrgMembership } from '@store/orgStore';

export type InviteOrgRole = Exclude<Enums<'org_member_role'>, 'owner'>;

export async function fetchUserOrganizations(
  userId: string,
): Promise<OrgMembership[]> {
  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      role,
      organizations (*)
    `)
    .eq('user_id', userId);

  if (error) throw error;

  return (data ?? [])
    .filter((row) => row.organizations !== null)
    .map((row) => ({
      ...(row.organizations as NonNullable<typeof row.organizations>),
      role: row.role,
    }));
}

/** Add an existing registered user to the org by email (no invitee confirmation). */
export async function addOrgMemberByEmail(input: {
  organizationId: string;
  email: string;
  role?: InviteOrgRole;
}): Promise<string> {
  const { data, error } = await supabase.rpc('add_org_member_by_email', {
    p_org_id: input.organizationId,
    p_email: input.email.trim(),
    p_role: input.role ?? 'member',
  });

  if (error) throw error;
  return data as string;
}

/** Farm IDs in this org that the user can see (via farm_members). */
export async function fetchUserFarmAccessIds(
  organizationId: string,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('farm_members')
    .select('farm_id, farms!inner(organization_id)')
    .eq('user_id', userId)
    .eq('farms.organization_id', organizationId);

  if (error) throw error;
  return (data ?? []).map((row) => row.farm_id);
}

/** Replace which farms a member/viewer can see (org owner/admin only). */
export async function setOrgMemberFarmAccess(input: {
  organizationId: string;
  userId: string;
  farmIds: string[];
}): Promise<void> {
  const { error } = await supabase.rpc('set_org_member_farm_access', {
    p_org_id: input.organizationId,
    p_user_id: input.userId,
    p_farm_ids: input.farmIds,
  });

  if (error) throw error;
}

export type OrgFarmOption = {
  id: string;
  name: string;
  district: string | null;
  province: string | null;
};

/** Lightweight farm list for admin assignment UI. */
export async function fetchOrgFarmOptions(
  organizationId: string,
): Promise<OrgFarmOption[]> {
  const { data, error } = await supabase
    .from('farms')
    .select('id, name, district, province')
    .eq('organization_id', organizationId)
    .order('name');

  if (error) throw error;
  return data ?? [];
}
