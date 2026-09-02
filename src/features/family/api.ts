import type { KasetkornAuthContext } from '@features/dashboard/data/api';
import type {
  FamilyFarmerSearch,
  FamilyIncomingInvite,
  FamilyMember,
  FamilyModel,
  FamilyPendingInvite,
  FamilySharedDevice,
} from './types';

const KASETKORN_API_BASE = 'https://api.kasetkorn.app';

type JsonMap = Record<string, unknown>;

function authHeaders(auth: KasetkornAuthContext) {
  return { Authorization: `Bearer ${auth.token}` };
}

function asMap(v: unknown): JsonMap | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return v as JsonMap;
  }
  return null;
}

function str(m: JsonMap | null, keys: string[]): string | undefined {
  if (!m) return undefined;
  for (const k of keys) {
    const v = m[k];
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return undefined;
}

function bool(m: JsonMap | null, keys: string[]): boolean | undefined {
  if (!m) return undefined;
  for (const k of keys) {
    const v = m[k];
    if (typeof v === 'boolean') return v;
    if (v != null) {
      const s = String(v).toLowerCase();
      if (s === 'true' || s === '1') return true;
      if (s === 'false' || s === '0') return false;
    }
  }
  return undefined;
}

function extractDataListMaps(raw: unknown): JsonMap[] {
  if (Array.isArray(raw)) {
    return raw.map(asMap).filter((m): m is JsonMap => m != null);
  }
  const root = asMap(raw);
  if (!root) return [];
  const data = root.data ?? root.Data;
  if (Array.isArray(data)) {
    return data.map(asMap).filter((m): m is JsonMap => m != null);
  }
  return [];
}

function parseSharedDevice(json: unknown): FamilySharedDevice {
  const m = asMap(json) ?? {};
  return {
    appIotId: str(m, ['appIotId', 'AppIotId', 'appCameraId', 'deviceId', 'id']),
    type: str(m, ['type', 'Type', 'deviceType']),
    permission: str(m, ['permission', 'Permission']),
  };
}

export function parseFamilyModel(json: unknown): FamilyModel {
  const m = asMap(json) ?? {};
  const deviceNodes = m.devices ?? m.Devices ?? m.sharedDevices;
  const devices = Array.isArray(deviceNodes)
    ? deviceNodes.map(parseSharedDevice)
    : [];

  return {
    familyId: str(m, ['familyId', 'FamilyId', 'id']),
    familyName: str(m, ['familyName', 'FamilyName', 'name']),
    ownerFarmerId: str(m, ['ownerFarmerId', 'OwnerFarmerId']),
    createdAt: str(m, ['createdAt', 'CreatedAt']),
    isOwner: bool(m, ['isOwner', 'IsOwner']),
    devices,
  };
}

export function familiesFromGetFamilyResponse(raw: unknown): FamilyModel[] {
  let maps = extractDataListMaps(raw);
  const root = asMap(raw);
  if (maps.length === 0 && root) {
    const nested = root.families ?? root.Families;
    if (Array.isArray(nested)) {
      maps = nested.map(asMap).filter((m): m is JsonMap => m != null);
    } else if (str(root, ['familyId', 'FamilyId'])) {
      maps = [root];
    }
  }
  return maps
    .map(parseFamilyModel)
    .filter((f) => (f.familyId ?? '').length > 0);
}

function parseSingleFamily(raw: unknown): FamilyModel | null {
  if (raw == null) return null;
  const list = familiesFromGetFamilyResponse(raw);
  if (list.length > 0) return list[0] ?? null;
  const m = parseFamilyModel(raw);
  return (m.familyId ?? '').length > 0 ? m : null;
}

export function parseFamilyMember(json: unknown): FamilyMember {
  const m = asMap(json) ?? {};
  return {
    appFarmerId: str(m, [
      'memberFarmerId',
      'MemberFarmerId',
      'appFarmerId',
      'AppFarmerId',
      'farmerId',
    ]),
    firstName: str(m, ['firstName', 'FirstName']),
    lastName: str(m, ['lastName', 'LastName']),
    memberName: str(m, ['memberName', 'MemberName', 'name', 'Name', 'fullName']),
    mobileNo: str(m, ['mobileNo', 'MobileNo', 'phone']),
    familyId: str(m, ['familyId', 'FamilyId']),
    joinedAt: str(m, ['joinedAt', 'JoinedAt']),
    role: str(m, ['role', 'Role']),
  };
}

function parseFarmerSearch(json: unknown): FamilyFarmerSearch {
  const m = asMap(json) ?? {};
  return {
    appFarmerId: str(m, ['appFarmerId', 'AppFarmerId']),
    firstName: str(m, ['firstName', 'FirstName']),
    lastName: str(m, ['lastName', 'LastName']),
    mobileNo: str(m, ['mobileNo', 'MobileNo', 'phone']),
  };
}

function parseIncomingInvite(json: unknown): FamilyIncomingInvite {
  const m = asMap(json) ?? {};
  return {
    inviteId: str(m, ['inviteId', 'InviteId', 'id']),
    familyId: str(m, ['familyId', 'FamilyId']),
    familyName: str(m, ['familyName', 'FamilyName']),
    ownerFarmerId: str(m, ['ownerFarmerId', 'OwnerFarmerId']),
    ownerName: str(m, ['ownerName', 'OwnerName']),
    memberFarmerId: str(m, ['memberFarmerId', 'MemberFarmerId']),
    status: str(m, ['status', 'Status']),
    createdAt: str(m, ['createdAt', 'CreatedAt']),
  };
}

function parsePendingInvite(json: unknown): FamilyPendingInvite {
  const m = asMap(json) ?? {};
  return {
    inviteId: str(m, ['inviteId', 'InviteId', 'id']),
    familyId: str(m, ['familyId', 'FamilyId']),
    familyName: str(m, ['familyName', 'FamilyName']),
    memberFarmerId: str(m, ['memberFarmerId', 'MemberFarmerId']),
    memberName: str(m, ['memberName', 'MemberName', 'name']),
    status: str(m, ['status', 'Status']),
    createdAt: str(m, ['createdAt', 'CreatedAt']),
  };
}

async function parseApiError(response: Response): Promise<string> {
  try {
    const json = (await response.json()) as JsonMap;
    const detail = json.detail ?? json.message;
    if (detail) return String(detail);
  } catch {
    // ignore
  }
  return 'เกิดข้อผิดพลาด';
}

export async function fetchFamilyList(
  ownerFarmerId: string,
  auth: KasetkornAuthContext,
): Promise<FamilyModel[]> {
  const response = await fetch(
    `${KASETKORN_API_BASE}/api/family/GetFamily/${ownerFarmerId}`,
    { headers: authHeaders(auth) },
  );
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(await parseApiError(response));
  const json = await response.json();
  return familiesFromGetFamilyResponse(json);
}

export async function fetchFamilyMembers(
  familyId: string,
  auth: KasetkornAuthContext,
): Promise<FamilyMember[]> {
  const response = await fetch(
    `${KASETKORN_API_BASE}/api/family/GetMembers/${familyId}`,
    { headers: authHeaders(auth) },
  );
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(await parseApiError(response));
  const json = await response.json();
  return extractDataListMaps(json).map(parseFamilyMember);
}

export async function createFamily(
  ownerFarmerId: string,
  familyName: string,
  auth: KasetkornAuthContext,
): Promise<FamilyModel | null> {
  const response = await fetch(`${KASETKORN_API_BASE}/api/family/CreateFamily`, {
    method: 'POST',
    headers: { ...authHeaders(auth), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerFarmerId, familyName }),
  });
  if (!response.ok) throw new Error(await parseApiError(response));
  const json = await response.json();
  return parseSingleFamily(json);
}

export async function updateFamily(
  familyId: string,
  familyName: string,
  auth: KasetkornAuthContext,
): Promise<void> {
  const response = await fetch(`${KASETKORN_API_BASE}/api/family/UpdateFamily`, {
    method: 'POST',
    headers: { ...authHeaders(auth), 'Content-Type': 'application/json' },
    body: JSON.stringify({ familyId, familyName }),
  });
  if (!response.ok) throw new Error(await parseApiError(response));
}

export async function deleteFamily(
  familyId: string,
  auth: KasetkornAuthContext,
): Promise<void> {
  const response = await fetch(
    `${KASETKORN_API_BASE}/api/family/DeleteFamily/${familyId}`,
    { method: 'DELETE', headers: authHeaders(auth) },
  );
  if (!response.ok) throw new Error(await parseApiError(response));
}

export async function addFamilyDevice(
  familyId: string,
  appIotId: string,
  type: 'iot' | 'camera',
  permission: string,
  auth: KasetkornAuthContext,
): Promise<void> {
  const response = await fetch(`${KASETKORN_API_BASE}/api/family/AddDevice`, {
    method: 'POST',
    headers: { ...authHeaders(auth), 'Content-Type': 'application/json' },
    body: JSON.stringify({ familyId, appIotId, type, permission }),
  });
  if (!response.ok) throw new Error(await parseApiError(response));
}

export async function removeFamilyDevice(
  familyId: string,
  appIotId: string,
  auth: KasetkornAuthContext,
): Promise<void> {
  const response = await fetch(`${KASETKORN_API_BASE}/api/family/RemoveDevice`, {
    method: 'DELETE',
    headers: { ...authHeaders(auth), 'Content-Type': 'application/json' },
    body: JSON.stringify({ familyId, appIotId }),
  });
  if (!response.ok) throw new Error(await parseApiError(response));
}

export async function sendFamilyInvite(
  ownerFarmerId: string,
  familyId: string,
  memberFarmerId: string,
  auth: KasetkornAuthContext,
): Promise<void> {
  const response = await fetch(`${KASETKORN_API_BASE}/api/family/SendInvite`, {
    method: 'POST',
    headers: { ...authHeaders(auth), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerFarmerId, familyId, memberFarmerId }),
  });
  if (!response.ok) throw new Error(await parseApiError(response));
}

export async function fetchIncomingInvites(
  memberFarmerId: string,
  auth: KasetkornAuthContext,
): Promise<FamilyIncomingInvite[]> {
  const response = await fetch(
    `${KASETKORN_API_BASE}/api/family/GetInvites/${memberFarmerId}`,
    { headers: authHeaders(auth) },
  );
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(await parseApiError(response));
  const json = await response.json();
  return extractDataListMaps(json).map(parseIncomingInvite);
}

export async function fetchFamilyInvites(
  familyId: string,
  auth: KasetkornAuthContext,
): Promise<FamilyPendingInvite[]> {
  const response = await fetch(
    `${KASETKORN_API_BASE}/api/family/GetFamilyInvites/${familyId}`,
    { headers: authHeaders(auth) },
  );
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(await parseApiError(response));
  const json = await response.json();
  return extractDataListMaps(json).map(parsePendingInvite);
}

export async function acceptFamilyInvite(
  inviteId: string,
  memberFarmerId: string,
  auth: KasetkornAuthContext,
): Promise<void> {
  const response = await fetch(`${KASETKORN_API_BASE}/api/family/AcceptInvite`, {
    method: 'POST',
    headers: { ...authHeaders(auth), 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviteId, memberFarmerId }),
  });
  if (!response.ok) throw new Error(await parseApiError(response));
}

export async function rejectFamilyInvite(
  inviteId: string,
  memberFarmerId: string,
  auth: KasetkornAuthContext,
): Promise<void> {
  const response = await fetch(`${KASETKORN_API_BASE}/api/family/RejectInvite`, {
    method: 'DELETE',
    headers: { ...authHeaders(auth), 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviteId, memberFarmerId }),
  });
  if (!response.ok) throw new Error(await parseApiError(response));
}

export async function searchFarmerByPhone(
  phone: string,
  auth: KasetkornAuthContext,
): Promise<FamilyFarmerSearch | null> {
  const q = phone.trim();
  if (!q) return null;
  const response = await fetch(
    `${KASETKORN_API_BASE}/api/family/SearchFarmer/${encodeURIComponent(q)}`,
    { headers: authHeaders(auth) },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(await parseApiError(response));
  const json = await response.json();
  const farmer = parseFarmerSearch(json);
  return (farmer.appFarmerId ?? '').length > 0 ? farmer : null;
}

export async function removeFamilyMember(
  familyId: string,
  memberFarmerId: string,
  auth: KasetkornAuthContext,
): Promise<void> {
  const response = await fetch(`${KASETKORN_API_BASE}/api/family/RemoveMember`, {
    method: 'DELETE',
    headers: { ...authHeaders(auth), 'Content-Type': 'application/json' },
    body: JSON.stringify({ familyId, memberFarmerId }),
  });
  if (!response.ok) throw new Error(await parseApiError(response));
}

export async function fetchFamilySnapshot(
  appFarmerId: string,
  auth: KasetkornAuthContext,
  focusedFamilyId?: string | null,
): Promise<import('./types').FamilySnapshot> {
  const allFamilies = await fetchFamilyList(appFarmerId, auth);
  let picked =
    focusedFamilyId != null
      ? allFamilies.find((f) => f.familyId === focusedFamilyId) ?? null
      : null;
  if (!picked) {
    const { pickPrimaryFamily } = await import('./types');
    picked = pickPrimaryFamily(allFamilies, appFarmerId);
  }
  if (!picked?.familyId) {
    return { family: null, members: [], allFamilies };
  }
  const members = await fetchFamilyMembers(picked.familyId, auth);
  return { family: picked, members, allFamilies };
}

export async function syncSharedDevices(
  familyId: string,
  prevIotPerms: Map<string, string>,
  prevCamPerms: Map<string, string>,
  nextIotPerms: Map<string, string>,
  nextCamPerms: Map<string, string>,
  managedIotIds: Set<string>,
  managedCameraIds: Set<string>,
  auth: KasetkornAuthContext,
): Promise<void> {
  const { FamilySharePermission } = await import('./types');

  const prevIot = new Set(prevIotPerms.keys());
  const prevCam = new Set(prevCamPerms.keys());
  const nextIot = new Set(nextIotPerms.keys());
  const nextCam = new Set(nextCamPerms.keys());

  for (const id of prevIot) {
    if (!nextIot.has(id) && managedIotIds.has(id)) {
      await removeFamilyDevice(familyId, id, auth);
    }
  }
  for (const id of prevCam) {
    if (!nextCam.has(id) && managedCameraIds.has(id)) {
      await removeFamilyDevice(familyId, id, auth);
    }
  }

  for (const [id, perm] of nextIotPerms) {
    if (!managedIotIds.has(id)) continue;
    const normalized = FamilySharePermission.normalize(perm);
    const wasShared = prevIot.has(id);
    if (!wasShared) {
      await addFamilyDevice(familyId, id, 'iot', normalized, auth);
      continue;
    }
    if (FamilySharePermission.normalize(prevIotPerms.get(id)) !== normalized) {
      await removeFamilyDevice(familyId, id, auth);
      await addFamilyDevice(familyId, id, 'iot', normalized, auth);
    }
  }

  for (const [id, perm] of nextCamPerms) {
    if (!managedCameraIds.has(id)) continue;
    const normalized = FamilySharePermission.normalize(perm);
    const wasShared = prevCam.has(id);
    if (!wasShared) {
      await addFamilyDevice(familyId, id, 'camera', normalized, auth);
      continue;
    }
    if (FamilySharePermission.normalize(prevCamPerms.get(id)) !== normalized) {
      await removeFamilyDevice(familyId, id, auth);
      await addFamilyDevice(familyId, id, 'camera', normalized, auth);
    }
  }
}
