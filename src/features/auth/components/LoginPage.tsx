import type { OrgMembership } from '@store/orgStore';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Location } from 'react-router-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchUserOrganizations } from '../orgApi';
import { getSafeRedirectPath } from '../returnToPath';

// ─── Animation (iOS-style push/pop) ──────────────────────────────

const IOS_EASE = [0.25, 0.46, 0.45, 0.94] as const;
const DURATION = 0.38;

const pageVariants = {
  initial: (dir: number) => ({
    x: dir > 0 ? '100%' : '-25%',
    opacity: dir > 0 ? 1 : 0,
  }),
  animate: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? '-25%' : '100%',
    opacity: dir > 0 ? 0 : 1,
  }),
};

const pageTransition = { duration: DURATION, ease: IOS_EASE };

// ─── Role labels ──────────────────────────────────────────────────

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

// ─── Step type ────────────────────────────────────────────────────

type Step = 'login' | 'org';

// ─── LoginStep ────────────────────────────────────────────────────

interface LoginStepProps {
  onSuccess: (orgs: OrgMembership[]) => void;
}

function LoginStep({ onSuccess }: LoginStepProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const { data, error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    try {
      const userId = data.user?.id;
      if (!userId) {
        setError('ไม่สามารถระบุตัวตนผู้ใช้ได้');
        setIsLoading(false);
        return;
      }

      const orgs = await fetchUserOrganizations(userId);
      setIsLoading(false);
      // Always hand off — LoginPage decides whether to auto-select or show picker
      onSuccess(orgs);
    } catch {
      setError('เกิดข้อผิดพลาดในการโหลดองค์กร');
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      {/* <div className="mb-6">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-green-600 shadow-md">
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900">ยินดีต้อนรับกลับ</h1>
        <p className="mt-0.5 text-sm text-gray-500">เข้าสู่ระบบจัดการฟาร์มของคุณ</p>
      </div> */}

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            อีเมล
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              รหัสผ่าน
            </label>
            <Link
              to="/auth/forgot-password"
              className="text-xs text-[#03662c] hover:text-[#03662c]/80 hover:underline"
            >
              ลืมรหัสผ่าน?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center rounded-lg bg-[#03662c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#03662c]/80 focus:outline-none focus:ring-2 focus:ring-[#03662c]/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : null}
          {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-gray-500">
        ยังไม่มีบัญชี?{' '}
        <Link to="/auth/register" className="font-semibold text-[#03662c] hover:text-[#03662c]/80">
          สมัครสมาชิก
        </Link>
      </p>
    </div>
  );
}

// ─── OrgSelectStep ────────────────────────────────────────────────

interface OrgSelectStepProps {
  orgs: OrgMembership[];
  onSelect: (org: OrgMembership) => void;
  onBack: () => void;
}

function OrgSelectStep({ orgs, onSelect, onBack }: OrgSelectStepProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth/login', { replace: true });
  };

  return (
    <div className="p-8">
      {/* Header with back button */}
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          aria-label="กลับ"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-900">เลือกองค์กร</h2>
          <p className="text-xs text-gray-500">เลือกองค์กรที่ต้องการเข้าใช้งาน</p>
        </div>
      </div>

      {orgs.length === 0 ? (
        <div className="py-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">ไม่มีองค์กร</p>
          <p className="mt-1 text-xs text-gray-400">กรุณาติดต่อผู้ดูแลระบบเพื่อเพิ่มคุณเข้าองค์กร</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orgs.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => onSelect(org)}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-left transition hover:border-green-200 hover:bg-green-50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {org.logo_url ? (
                <img
                  src={org.logo_url}
                  alt={org.name}
                  className="h-10 w-10 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 text-base font-bold text-green-700">
                  {org.name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-gray-900">{org.name}</span>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium ${roleColorMap[org.role] ?? roleColorMap.member}`}
                  >
                    {roleLabelMap[org.role] ?? org.role}
                  </span>
                </div>
                {org.description && (
                  <p className="mt-0.5 truncate text-xs text-gray-500">{org.description}</p>
                )}
              </div>

              <svg className="h-4 w-4 shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 text-center">
        <button
          type="button"
          onClick={handleSignOut}
          className="text-xs text-gray-400 transition hover:text-gray-600 hover:underline"
        >
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}

// ─── LoginPage ────────────────────────────────────────────────────

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState<Step>('login');
  const [direction, setDirection] = useState(1);
  const [orgs, setOrgs] = useState<OrgMembership[]>([]);

  // Panel height animation — start as 'auto', switch to px after first measure
  const pageRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState<number | 'auto'>('auto');

  const updateHeight = useCallback(() => {
    if (pageRef.current) {
      setPanelHeight(pageRef.current.offsetHeight);
    }
  }, []);

  useEffect(() => {
    if (pageRef.current) {
      setPanelHeight(pageRef.current.offsetHeight);
    }
  }, []);

  // Parallax background
  const bgRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e;
    const { width, height } = e.currentTarget.getBoundingClientRect();
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const x = (clientX / width - 0.5) * 2;
      const y = (clientY / height - 0.5) * 2;
      const shift = 5;
      if (bgRef.current) {
        bgRef.current.style.transform = `translate(${x * -shift}px, ${y * -shift}px)`;
      }
    });
  }, []);

  const redirectAfterOrg = useCallback(
    (org: OrgMembership) => {
      const from = (location.state as { from?: Location } | null)?.from;
      const target = getSafeRedirectPath(from, org.slug);
      if (target) {
        navigate(target, { replace: true });
        return;
      }
      navigate(`/${org.slug}/dashboard`, { replace: true });
    },
    [location, navigate],
  );

  const handleLoginSuccess = useCallback(
    (fetchedOrgs: OrgMembership[]) => {
      if (fetchedOrgs.length === 1) {
        redirectAfterOrg(fetchedOrgs[0]);
        return;
      }
      setOrgs(fetchedOrgs);
      setDirection(1);
      setStep('org');
    },
    [redirectAfterOrg],
  );

  const handleOrgSelect = useCallback(
    (org: OrgMembership) => {
      redirectAfterOrg(org);
    },
    [redirectAfterOrg],
  );

  const handleBack = useCallback(() => {
    setDirection(-1);
    setStep('login');
  }, []);

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      onMouseMove={handleMouseMove}
    >
      {/* Parallax background */}
      <div
        ref={bgRef}
        className="pointer-events-none absolute inset-0 scale-[1.05] bg-[url('/images/login_background2.webp')] bg-cover bg-center bg-no-repeat"
        style={{ transition: 'transform 0.12s cubic-bezier(0.25,0.46,0.45,0.94)' }}
      />
      {/* Overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/0 to-black/60" />

      {/* Card */}
      <div className="relative w-full max-w-md">
        <div className="overflow-hidden rounded-3xl bg-white/85 shadow-xl ring-1 ring-black/5 backdrop-blur-xs">
          {/* Animated height wrapper */}
          <motion.div
            className="relative overflow-hidden"
            animate={{ height: panelHeight }}
            transition={pageTransition}
          >
            <AnimatePresence initial={false} mode="sync" custom={direction}>
              {step === 'login' ? (
                <motion.div
                  key="login"
                  ref={pageRef}
                  custom={direction}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageTransition}
                  onAnimationComplete={updateHeight}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', willChange: 'transform, opacity' }}
                >
                  <LoginStep onSuccess={handleLoginSuccess} />
                </motion.div>
              ) : (
                <motion.div
                  key="org"
                  ref={pageRef}
                  custom={direction}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageTransition}
                  onAnimationComplete={updateHeight}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', willChange: 'transform, opacity' }}
                >
                  <OrgSelectStep orgs={orgs} onSelect={handleOrgSelect} onBack={handleBack} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
