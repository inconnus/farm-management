import { supabase } from '@lib/supabase/client';
import type { OrgMembership } from '@store/orgStore';

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
