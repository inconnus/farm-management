import { useAtomValue } from 'jotai';
import { Navigate, useLocation } from 'react-router-dom';
import { PLUKSANG_HOME_PATH } from '../pluksangStore';
import { authModeAtom } from '../store';

type PluksangOnlyRouteProps = {
  children: React.ReactNode;
};

export function PluksangOnlyRoute({ children }: PluksangOnlyRouteProps) {
  const authMode = useAtomValue(authModeAtom);

  if (authMode !== 'pluksang') {
    return <Navigate to="/org/select" replace />;
  }

  return <>{children}</>;
}

export function PluksangLegacyRedirect() {
  const { pathname } = useLocation();
  const rest = pathname.replace(/^\/pluksang\/?/, '') || 'dashboard';
  const target = rest.startsWith('/') ? rest : `/${rest}`;
  return <Navigate to={target === '/' ? PLUKSANG_HOME_PATH : target} replace />;
}
