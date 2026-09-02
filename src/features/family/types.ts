export type FamilySharePermission = 'view' | 'control';

export const FamilySharePermission = {
  view: 'view' as const,
  control: 'control' as const,
  normalize(raw: string | null | undefined): FamilySharePermission {
    const s = (raw ?? '').toLowerCase().trim();
    if (s === 'control') return 'control';
    return 'view';
  },
};

export type FamilySharedDevice = {
  appIotId?: string;
  type?: string;
  permission?: string;
};

export type FamilyModel = {
  familyId?: string;
  familyName?: string;
  ownerFarmerId?: string;
  createdAt?: string;
  isOwner?: boolean;
  devices: FamilySharedDevice[];
};

export type FamilyMember = {
  appFarmerId?: string;
  firstName?: string;
  lastName?: string;
  memberName?: string;
  mobileNo?: string;
  familyId?: string;
  joinedAt?: string;
  role?: string;
};

export type FamilyFarmerSearch = {
  appFarmerId?: string;
  firstName?: string;
  lastName?: string;
  mobileNo?: string;
};

export type FamilyIncomingInvite = {
  inviteId?: string;
  familyId?: string;
  familyName?: string;
  ownerFarmerId?: string;
  ownerName?: string;
  memberFarmerId?: string;
  status?: string;
  createdAt?: string;
};

export type FamilyPendingInvite = {
  inviteId?: string;
  familyId?: string;
  familyName?: string;
  memberFarmerId?: string;
  memberName?: string;
  status?: string;
  createdAt?: string;
};

export type FamilySnapshot = {
  family: FamilyModel | null;
  members: FamilyMember[];
  allFamilies: FamilyModel[];
};

export function familyMemberDisplayName(member: FamilyMember): string {
  const combined = `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim();
  if (combined) return combined;
  const name = member.memberName?.trim();
  if (name) return name;
  return member.appFarmerId ?? 'สมาชิก';
}

export function farmerSearchDisplayName(farmer: FamilyFarmerSearch): string {
  const name = `${farmer.firstName ?? ''} ${farmer.lastName ?? ''}`.trim();
  return name || farmer.mobileNo || farmer.appFarmerId || '';
}

export function familyInviteAwaitingResponse(status: string | null | undefined): boolean {
  const s = (status ?? 'pending').toLowerCase().trim();
  if (s === 'accepted' || s === 'rejected') return false;
  return !s || s === 'pending' || s === 'sent' || s === 'waiting';
}

export function isOwnerEffective(
  family: FamilyModel | null | undefined,
  currentFarmerId: string | null | undefined,
): boolean {
  if (!family?.familyId || !currentFarmerId) return false;
  if (family.isOwner === true) return true;
  if (family.isOwner === false) return false;
  const owner = family.ownerFarmerId;
  if (owner) return owner === currentFarmerId;
  return false;
}

export function pickPrimaryFamily(
  list: FamilyModel[],
  farmerId?: string | null,
): FamilyModel | null {
  if (list.length === 0) return null;
  const owned = list.find((f) => f.isOwner === true);
  if (owned) return owned;
  if (farmerId) {
    const asOwner = list.find((f) => f.ownerFarmerId === farmerId);
    if (asOwner) return asOwner;
  }
  return list[0] ?? null;
}

export function sharedIotPermissions(family: FamilyModel | null | undefined): Map<string, FamilySharePermission> {
  const map = new Map<string, FamilySharePermission>();
  for (const d of family?.devices ?? []) {
    const id = d.appIotId;
    if (!id) continue;
    const t = (d.type ?? 'iot').toLowerCase();
    if (t === 'camera' || t === 'cctv') continue;
    map.set(id, FamilySharePermission.normalize(d.permission));
  }
  return map;
}

export function sharedCameraPermissions(family: FamilyModel | null | undefined): Map<string, FamilySharePermission> {
  const map = new Map<string, FamilySharePermission>();
  for (const d of family?.devices ?? []) {
    const id = d.appIotId;
    if (!id) continue;
    const t = (d.type ?? '').toLowerCase();
    if (t === 'camera' || t === 'cctv') {
      map.set(id, FamilySharePermission.normalize(d.permission));
    }
  }
  return map;
}

export type FamilyShareIotRow = {
  id: string;
  displayName: string;
  location: string;
  isOwner: boolean;
  permission?: FamilySharePermission;
};

export type FamilyShareCameraRow = {
  id: string;
  displayName: string;
  location: string;
  isOwner: boolean;
  permission?: FamilySharePermission;
};

export type FamilyAllDevicesSnapshot = {
  iotRows: FamilyShareIotRow[];
  cameraRows: FamilyShareCameraRow[];
};
