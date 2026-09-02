import { canAccessNavItem } from '@shared/lib/permissions';
import { useAtomValue } from 'jotai';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { PLUKSANG_HOME_PATH } from '../pluksangStore';
import { authModeAtom, organizationsAtom } from '../store';

type NavRoleRouteProps = {
  navItem:
    | 'dashboard'
    | 'camera'
    | 'iot-cameras'
    | 'farms'
    | 'device-sharing'
    | 'notifications';
  children: React.ReactNode;
};

const PLUKSANG_NAV_ITEMS = new Set([
  'dashboard',
  'iot-cameras',
  'device-sharing',
  'notifications',
]);

export function NavRoleRoute({ navItem, children }: NavRoleRouteProps) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const location = useLocation();
  const organizations = useAtomValue(organizationsAtom);
  const authMode = useAtomValue(authModeAtom);
  const currentOrg = organizations.find((o) => o.slug === orgSlug) ?? null;

  if (authMode === 'pluksang') {
    if (!PLUKSANG_NAV_ITEMS.has(navItem)) {
      return (
        <Navigate to={PLUKSANG_HOME_PATH} state={{ from: location }} replace />
      );
    }
    return <>{children}</>;
  }

  if (!canAccessNavItem(currentOrg?.role, navItem)) {
    return (
      <Navigate
        to={`/${orgSlug}/dashboard`}
        state={{ from: location }}
        replace
      />
    );
  }

  return <>{children}</>;
}
