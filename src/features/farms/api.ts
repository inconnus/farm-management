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

// ─── Mutations ───────────────────────────────────────────

export type CreateFarmInput = {
  name: string;
  organizationId: string;
  lat: number;
  lng: number;
  province?: string;
};

export type CreateLandInput = {
  farmId: string;
  name: string;
  cropType?: string;
  color?: string;
  coords: [number, number][];
};

export async function createLand(input: CreateLandInput): Promise<DbLand> {
  const geometryJson = {
    type: 'Polygon',
    coordinates: [input.coords],
  };

  const { data, error } = await supabase
    .from('lands')
    .insert({
      farm_id: input.farmId,
      name: input.name,
      crop_type: input.cropType ?? null,
      color: input.color ?? '#22c55e',
      geometry_json: geometryJson,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export type UpdateFarmInput = {
  name?: string;
  province?: string;
  lat?: number;
  lng?: number;
};

export async function updateFarm(farmId: string, input: UpdateFarmInput): Promise<void> {
  const { data, error } = await supabase
    .from('farms')
    .update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.province !== undefined && { province: input.province }),
      ...(input.lat !== undefined && { lat: input.lat }),
      ...(input.lng !== undefined && { lng: input.lng }),
    })
    .eq('id', farmId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('ไม่มีสิทธิ์แก้ไขฟาร์ม หรือไม่พบข้อมูล');
}

export async function deleteFarm(farmId: string): Promise<void> {
  const { error } = await supabase.from('farms').delete().eq('id', farmId);
  if (error) throw error;
}

export type UpdateLandInput = {
  name?: string;
  cropType?: string | null;
  color?: string;
  coords?: [number, number][];
};

export async function updateLand(landId: string, input: UpdateLandInput): Promise<void> {
  const { data, error } = await supabase
    .from('lands')
    .update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.cropType !== undefined && { crop_type: input.cropType }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.coords !== undefined && {
        geometry_json: { type: 'Polygon', coordinates: [input.coords] },
      }),
    })
    .eq('id', landId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('ไม่มีสิทธิ์แก้ไขแปลงที่ดิน หรือไม่พบข้อมูล');
}

export async function deleteLand(landId: string): Promise<void> {
  const { error } = await supabase.from('lands').delete().eq('id', landId);
  if (error) throw error;
}

export async function createFarm(input: CreateFarmInput): Promise<DbFarm> {
  const { data, error } = await supabase
    .from('farms')
    .insert({
      name: input.name,
      organization_id: input.organizationId,
      lat: input.lat,
      lng: input.lng,
      province: input.province ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Queries ─────────────────────────────────────────────

export async function fetchFarms(
  organizationId: string,
): Promise<DbFarmWithLands[]> {
  const { data, error } = await supabase
    .from('farms')
    .select(`
      id, name, province, image_url, description, total_area, area_unit,
      lat, lng, created_at, updated_at, organization_id, created_by,
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

export async function fetchOrgMembersWithFarmTeams(
  orgId: string,
  farmId: string,
): Promise<FarmMembersData> {
  const { data: orgMembers, error: orgError } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', orgId);

  if (orgError) throw orgError;

  const userIds = (orgMembers ?? []).map((m) => m.user_id);
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
