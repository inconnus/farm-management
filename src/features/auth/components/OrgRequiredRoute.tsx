import { useAtomValue } from 'jotai';
import { Navigate, useLocation } from 'react-router-dom';
import { PLUKSANG_HOME_PATH } from '../pluksangStore';
import {
  authModeAtom,
  isAuthInitializedAtom,
  isProfileReadyAtom,
  organizationsAtom,
} from '../store';

type OrgRequiredRouteProps = {
  children: React.ReactNode;
};

export function OrgRequiredRoute({ children }: OrgRequiredRouteProps) {
  const isInitialized = useAtomValue(isAuthInitializedAtom);
  const isProfileReady = useAtomValue(isProfileReadyAtom);
  const organizations = useAtomValue(organizationsAtom);
  const authMode = useAtomValue(authModeAtom);
  const location = useLocation();

  if (!isInitialized || !isProfileReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="h-8 w-8 animate-spin text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="text-sm text-gray-500">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (authMode === 'pluksang') {
    return <Navigate to={PLUKSANG_HOME_PATH} state={{ from: location }} replace />;
  }

  const orgSlug = location.pathname.split('/')[1];
  if (!orgSlug || !organizations.find((o) => o.slug === orgSlug)) {
    return <Navigate to="/org/select" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
