import { useAtomValue } from 'jotai';
import { Navigate, useParams } from 'react-router-dom';
import { isAuthInitializedAtom, isProfileReadyAtom, organizationsAtom } from '../store';

type OrgRequiredRouteProps = {
  children: React.ReactNode;
};

export function OrgRequiredRoute({ children }: OrgRequiredRouteProps) {
  const isInitialized = useAtomValue(isAuthInitializedAtom);
  const isProfileReady = useAtomValue(isProfileReadyAtom);
  const organizations = useAtomValue(organizationsAtom);
  const { orgSlug } = useParams<{ orgSlug: string }>();

  // ยังไม่ initialize หรือ orgs ยังโหลดไม่เสร็จ → แสดง spinner รอก่อน ห้าม redirect
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

  // โหลดเสร็จแล้ว — ตรวจสอบว่า slug ตรงกับ org ของ user ไหม
  if (!orgSlug || !organizations.find((o) => o.slug === orgSlug)) {
    return <Navigate to="/org/select" replace />;
  }

  return <>{children}</>;
}
