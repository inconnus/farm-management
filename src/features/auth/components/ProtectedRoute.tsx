import { useAtomValue } from 'jotai';
import { Navigate, useLocation } from 'react-router-dom';
import { PLUKSANG_HOME_PATH } from '../pluksangStore';
import {
  authModeAtom,
  isAuthenticatedAtom,
  isAuthInitializedAtom,
} from '../store';

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const isInitialized = useAtomValue(isAuthInitializedAtom);
  const authMode = useAtomValue(authModeAtom);
  const location = useLocation();

  if (!isInitialized) {
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

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (authMode === 'pluksang' && location.pathname === '/org/select') {
    return <Navigate to={PLUKSANG_HOME_PATH} replace />;
  }

  return <>{children}</>;
}
