import { currentOrgAtom } from '@store/orgStore';
import { useAtomValue } from 'jotai';
import { Navigate } from 'react-router-dom';
import { isAuthInitializedAtom, organizationsAtom } from '../store';

type OrgRequiredRouteProps = {
  children: React.ReactNode;
};

export function OrgRequiredRoute({ children }: OrgRequiredRouteProps) {
  const isInitialized = useAtomValue(isAuthInitializedAtom);
  const currentOrg = useAtomValue(currentOrgAtom);
  const organizations = useAtomValue(organizationsAtom);

  if (!isInitialized) return null;

  if (!currentOrg) {
    if (organizations.length === 0) {
      return <Navigate to="/org/select" replace />;
    }
    return <Navigate to="/org/select" replace />;
  }

  return <>{children}</>;
}
