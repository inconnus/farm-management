import type { OrgMembership } from '@store/orgStore';
import { useAtomValue } from 'jotai';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isAuthLoadingAtom, organizationsAtom } from '../store';

const roleLabelMap: Record<string, string> = {
  owner: 'เจ้าของ',
  admin: 'ผู้ดูแล',
  member: 'สมาชิก',
};

const roleColorMap: Record<string, string> = {
  owner: 'bg-amber-100 text-amber-800',
  admin: 'bg-blue-100 text-blue-800',
  member: 'bg-gray-100 text-gray-700',
};

export function OrgSelectPage() {
  const navigate = useNavigate();
  const organizations = useAtomValue(organizationsAtom);
  const isLoading = useAtomValue(isAuthLoadingAtom);
  const { signOut } = useAuth();

  const handleSelect = (org: OrgMembership) => {
    navigate(`/${org.slug}/farms`, { replace: true });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth/login', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-green-50 to-emerald-100">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="h-8 w-8 animate-spin text-green-600"
            fill="none"
            viewBox="0 0 24 24"
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

  if (organizations.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-green-50 to-emerald-100 px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-400 shadow-lg">
              <svg
                className="h-8 w-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">ไม่มีองค์กร</h1>
            <p className="mt-1 text-sm text-gray-500">
              คุณยังไม่ได้เป็นสมาชิกขององค์กรใดๆ
            </p>
          </div>

          <div className="rounded-2xl bg-white p-8 text-center shadow-xl ring-1 ring-black/5">
            <p className="text-sm text-gray-600">
              กรุณาติดต่อผู้ดูแลระบบเพื่อเพิ่มคุณเข้าองค์กร หรือสร้างองค์กรใหม่
            </p>
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-6 flex w-full items-center justify-center rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // if (organizations.length === 1) {
  //   return (
  //     <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-green-50 to-emerald-100">
  //       <div className="flex flex-col items-center gap-3">
  //         <svg
  //           className="h-8 w-8 animate-spin text-green-600"
  //           fill="none"
  //           viewBox="0 0 24 24"
  //         >
  //           <circle
  //             className="opacity-25"
  //             cx="12"
  //             cy="12"
  //             r="10"
  //             stroke="currentColor"
  //             strokeWidth="4"
  //           />
  //           <path
  //             className="opacity-75"
  //             fill="currentColor"
  //             d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
  //           />
  //         </svg>
  //         <p className="text-sm text-gray-500">กำลังเข้าสู่องค์กร...</p>
  //       </div>
  //     </div>
  //   )
  // }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-green-50 to-emerald-100 px-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-600 shadow-lg">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">เลือกองค์กร</h1>
          <p className="mt-1 text-sm text-gray-500">เลือกองค์กรที่ต้องการเข้าใช้งาน</p>
        </div>

        <div className="space-y-3">
          {organizations.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => handleSelect(org)}
              className="flex w-full items-center gap-4 rounded-2xl bg-white p-5 text-left shadow-md ring-1 ring-black/5 transition hover:shadow-lg hover:ring-green-300 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {org.logo_url ? (
                <img
                  src={org.logo_url}
                  alt={org.name}
                  className="h-12 w-12 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100 text-lg font-bold text-green-700">
                  {org.name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-gray-900">
                    {org.name}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${roleColorMap[org.role] ?? roleColorMap.member}`}
                  >
                    {roleLabelMap[org.role] ?? org.role}
                  </span>
                </div>
                {org.description && (
                  <p className="mt-0.5 truncate text-sm text-gray-500">
                    {org.description}
                  </p>
                )}
              </div>

              <svg
                className="h-5 w-5 shrink-0 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          ))}
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm text-gray-500 transition hover:text-gray-700 hover:underline"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
}
