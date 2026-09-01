import type { OrgMemberRole } from '@shared/lib/permissions';
import { canAccessNavItem } from '@shared/lib/permissions';
import type { Location } from 'react-router-dom';

/**
 * Path ที่จะไปหลัง login เมื่อ user ถูกส่งมาจาก ProtectedRoute (state.from)
 * อนุญาตเฉพาะ path ภายใต้ `/:orgSlug` ที่ตรงกับ org ที่เลือก — กัน open redirect
 */
export function getSafeRedirectPath(
  from: Location | undefined,
  orgSlug: string,
  role?: OrgMemberRole | null,
): string | null {
  if (!from?.pathname) return null;
  const p = from.pathname;
  if (!p.startsWith('/') || p.includes('..')) return null;

  const prefix = `/${orgSlug}`;
  if (p !== prefix && p !== `${prefix}/` && !p.startsWith(`${prefix}/`)) {
    return null;
  }

  if (role) {
    if (p.startsWith(`${prefix}/farms`) && !canAccessNavItem(role, 'farms')) {
      return `${prefix}/dashboard`;
    }
    if (p.startsWith(`${prefix}/camera`) && !canAccessNavItem(role, 'camera')) {
      return `${prefix}/dashboard`;
    }
    if (
      p.startsWith(`${prefix}/iot-cameras`) &&
      !canAccessNavItem(role, 'iot-cameras')
    ) {
      return `${prefix}/dashboard`;
    }
  }

  return `${p}${from.search ?? ''}${from.hash ?? ''}`;
}
