export type OrgMemberRole = 'owner' | 'admin' | 'member' | 'viewer';

export type SidebarNavItem = 'dashboard' | 'camera' | 'farms';

const ROLE_NAV_ACCESS: Record<OrgMemberRole, readonly SidebarNavItem[]> = {
  owner: ['dashboard', 'camera', 'farms'],
  admin: ['dashboard', 'camera', 'farms'],
  member: ['dashboard', 'camera', 'farms'],
  viewer: ['dashboard'],
};

export function canAccessNavItem(
  role: OrgMemberRole | string | null | undefined,
  item: SidebarNavItem,
): boolean {
  if (!role || !(role in ROLE_NAV_ACCESS)) return false;
  return ROLE_NAV_ACCESS[role as OrgMemberRole].includes(item);
}

export function canAccessSettings(role: OrgMemberRole | null | undefined): boolean {
  return role === 'owner' || role === 'admin';
}

export const ORG_ROLE_LABEL: Record<OrgMemberRole, string> = {
  owner: 'เจ้าของ',
  admin: 'ผู้ดูแล',
  member: 'สมาชิก',
  viewer: 'ผู้ชม',
};

export const ORG_ROLE_COLOR: Record<OrgMemberRole, string> = {
  owner: 'bg-amber-100 text-amber-800',
  admin: 'bg-blue-100 text-blue-800',
  member: 'bg-gray-100 text-gray-700',
  viewer: 'bg-purple-100 text-purple-800',
};
