import type { TeamMember } from '@features/map/types';
import { supabase } from '@lib/supabase/client';
import type { Tables } from '@lib/supabase/database.types';

// ─── Types ───────────────────────────────────────────────

export type DbFarm = Tables<'farms'>;

export type DbLandInFarm = Pick<
  Tables<'lands'>,
  | 'id'
  | 'name'
  | 'crop_type'
  | 'color'
  | 'geometry_json'
  | 'image_url'
  | 'status'
  | 'area'
  | 'area_unit'
>;

export type DbFarmWithLands = DbFarm & { lands: DbLandInFarm[] };

export type DbLand = Tables<'lands'>;

export type FarmTeam = {
  id: string;
  name: string;
  color: string;
  members: TeamMember[];
};

export type FarmMembersData = {
  allMembers: TeamMember[];
  teams: FarmTeam[];
  unassigned: TeamMember[];
};

// ─── Queries ─────────────────────────────────────────────

export async function fetchFarms(
  organizationId: string,
): Promise<DbFarmWithLands[]> {
  const { data, error } = await supabase
    .from('farms')
    .select(`
      id, name, province, image_url, description, total_area, area_unit,
      created_at, updated_at, organization_id, created_by,
      lands ( id, name, crop_type, color, geometry_json, image_url, status, area, area_unit )
    `)
    .eq('organization_id', organizationId)
    .order('name');

  if (error) throw error;
  return (data ?? []) as DbFarmWithLands[];
}

export async function fetchAllLands(): Promise<DbLand[]> {
  const { data, error } = await supabase
    .from('lands')
    .select('*')
    .order('name');

  if (error) throw error;
  return data ?? [];
}

export async function fetchLandsByFarm(farmId: string): Promise<DbLand[]> {
  const { data, error } = await supabase
    .from('lands')
    .select('*')
    .eq('farm_id', farmId)
    .order('name');

  if (error) throw error;
  return data ?? [];
}

export async function fetchFarmMembers(
  farmId: string,
): Promise<FarmMembersData> {
  const { data: farmMembers, error: fmError } = await supabase
    .from('farm_members')
    .select('user_id')
    .eq('farm_id', farmId);

  if (fmError) throw fmError;

  const userIds = (farmMembers ?? []).map((m) => m.user_id);
  if (userIds.length === 0) {
    return { allMembers: [], teams: [], unassigned: [] };
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);

  if (profilesError) throw profilesError;

  const allMembers: TeamMember[] = (profiles ?? []).map((p) => ({
    id: p.id,
    name: p.full_name ?? 'ไม่ระบุชื่อ',
    avatarUrl: p.avatar_url ?? undefined,
  }));

  const { data: teamsData, error: teamsError } = await supabase
    .from('teams')
    .select(`id, name, color, team_members ( user_id )`)
    .eq('farm_id', farmId)
    .order('name');

  if (teamsError) throw teamsError;

  const profileMap = new Map(allMembers.map((m) => [m.id, m]));

  const teams: FarmTeam[] = (teamsData ?? []).map((t) => {
    const members = (t.team_members as { user_id: string }[])
      .map((tm) => profileMap.get(tm.user_id))
      .filter((m): m is TeamMember => m !== undefined);
    return { id: t.id, name: t.name, color: t.color, members };
  });

  const assignedUserIds = new Set(
    teams.flatMap((t) => t.members.map((m) => m.id)),
  );
  const unassigned = allMembers.filter((m) => !assignedUserIds.has(m.id));

  return { allMembers, teams, unassigned };
}
