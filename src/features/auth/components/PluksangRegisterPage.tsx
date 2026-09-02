import { useSetAtom } from 'jotai';
import { useCallback, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PluksangAuthError, pluksangRegister, pluksangSignIn } from '../pluksangApi';
import { PLUKSANG_HOME_PATH, savePluksangSession } from '../pluksangStore';
import { authAtom } from '../store';

const MIN_PASSWORD_LENGTH = 8;

export function PluksangRegisterPage() {
  const navigate = useNavigate();
  const setAuth = useSetAtom(authAtom);
  const bgRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const [mobileNo, setMobileNo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const phone = mobileNo.trim();
    if (!/^\d{10}$/.test(phone)) {
      setError('กรอกเบอร์โทรศัพท์ 10 หลัก');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`);
      return;
    }
    if (password !== confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }

    setIsLoading(true);
    try {
      await pluksangRegister(phone, password);
      const session = await pluksangSignIn(phone, password);
      savePluksangSession(session);
      setAuth({
        mode: 'pluksang',
        pluksangSession: session,
        user: null,
        session: null,
        profile: null,
        organizations: [],
        isLoading: false,
        isInitialized: true,
        isProfileReady: true,
      });
      navigate(PLUKSANG_HOME_PATH, { replace: true });
    } catch (err) {
      if (err instanceof PluksangAuthError) {
        setError(err.message);
      } else {
        setError('สมัครสมาชิกไม่สำเร็จ');
      }
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      onMouseMove={handleMouseMove}
    >
      <div
        ref={bgRef}
        className="pointer-events-none absolute inset-0 scale-[1.05] bg-[url('/images/login_background2.webp')] bg-cover bg-center bg-no-repeat"
        style={{
          transition: 'transform 0.12s cubic-bezier(0.25,0.46,0.45,0.94)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/0 to-black/60" />

      <div className="relative w-full max-w-md">
        <div className="overflow-hidden rounded-3xl bg-white/85 shadow-xl ring-1 ring-black/5 backdrop-blur-xs">
          <div className="p-8">
            <div className="mb-5 flex items-center gap-3">
              <Link
                to="/auth/login"
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                aria-label="กลับ"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">สมัครสมาชิก</h1>
                <p className="text-sm text-gray-500">Smart Building</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="pluksang-register-phone"
                  className="block text-sm font-medium text-gray-700"
                >
                  เบอร์โทรศัพท์
                </label>
                <input
                  id="pluksang-register-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  required
                  maxLength={10}
                  value={mobileNo}
                  onChange={(e) =>
                    setMobileNo(e.target.value.replace(/\D/g, '').slice(0, 10))
                  }
                  className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  placeholder="เบอร์โทรศัพท์ 10 หลัก"
                />
              </div>

              <div>
                <label
                  htmlFor="pluksang-register-password"
                  className="block text-sm font-medium text-gray-700"
                >
                  รหัสผ่านใหม่
                </label>
                <input
                  id="pluksang-register-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                />
              </div>

              <div>
                <label
                  htmlFor="pluksang-register-confirm"
                  className="block text-sm font-medium text-gray-700"
                >
                  ยืนยันรหัสผ่านใหม่
                </label>
                <input
                  id="pluksang-register-confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                  <svg
                    className="mr-2 h-4 w-4 animate-spin"
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
                ) : null}
                {isLoading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-gray-500">
              มีบัญชีอยู่แล้ว?{' '}
              <Link
                to="/auth/login"
                className="font-semibold text-[#03662c] hover:text-[#03662c]/80"
              >
                เข้าสู่ระบบ
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
