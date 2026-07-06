import { organizationsAtom } from '@features/auth/store';
import { canAccessNavItem } from '@shared/lib/permissions';
import { useAtomValue } from 'jotai';
import { Navigate, useLocation, useParams } from 'react-router-dom';

type NavRoleRouteProps = {
  navItem: 'dashboard' | 'camera' | 'farms';
  children: React.ReactNode;
};

export function NavRoleRoute({ navItem, children }: NavRoleRouteProps) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const location = useLocation();
  const organizations = useAtomValue(organizationsAtom);
  const currentOrg = organizations.find((o) => o.slug === orgSlug) ?? null;

  if (!canAccessNavItem(currentOrg?.role, navItem)) {
    return <Navigate to={`/${orgSlug}/dashboard`} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
