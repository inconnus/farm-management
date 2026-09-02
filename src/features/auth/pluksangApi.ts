import type { PluksangSession } from './pluksangStore';

const PLUKSANG_LOGIN_URL =
  import.meta.env.PUBLIC_PLUKSANG_LOGIN_URL ??
  'https://api.kasetkorn.app/login';

const PLUKSANG_CREATE_URL =
  import.meta.env.PUBLIC_PLUKSANG_CREATE_URL ??
  PLUKSANG_LOGIN_URL.replace(/\/login\/?$/, '/create');

export type PluksangLoginResponse = {
  appFarmerId: string;
  mobileNo: string;
  idCard: string;
  token: string;
  level: number;
  registor: number;
  message: string;
};

export class PluksangAuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'PluksangAuthError';
  }
}

function parseErrorDetail(data: unknown, fallback: string): string {
  if (data && typeof data === 'object') {
    const map = data as Record<string, unknown>;
    const detail = map.detail ?? map.message;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (detail && typeof detail === 'object') {
      const nested = (detail as Record<string, unknown>).detail;
      if (typeof nested === 'string' && nested.trim()) return nested;
    }
  }
  return fallback;
}

export async function pluksangSignIn(
  mobileNoOrIdCard: string,
  password: string,
): Promise<PluksangSession> {
  const response = await fetch(PLUKSANG_LOGIN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mobileNo_or_idCard: mobileNoOrIdCard,
      password,
    }),
  });

  if (response.status === 401) {
    throw new PluksangAuthError(
      'เลขบัตรประชาชนหรือเบอร์โทรศัพท์ยังไม่ได้ลงทะเบียน',
      401,
    );
  }
  if (response.status === 402) {
    throw new PluksangAuthError('รหัสผ่านผิด', 402);
  }
  if (!response.ok) {
    throw new PluksangAuthError(
      'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
      response.status,
    );
  }

  const data = (await response.json()) as PluksangLoginResponse;

  return {
    appFarmerId: data.appFarmerId,
    mobileNo: data.mobileNo,
    idCard: data.idCard,
    token: data.token,
    level: data.level,
    registor: data.registor,
  };
}

/** POST /create — same payload as Kasetkorn app register. */
export async function pluksangRegister(
  mobileNo: string,
  password: string,
): Promise<void> {
  const response = await fetch(PLUKSANG_CREATE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mobileNo,
      password,
      idCard: '',
      level: 0,
    }),
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // ignore empty body
  }

  if (
    data &&
    typeof data === 'object' &&
    (data as { error?: boolean }).error === true
  ) {
    throw new PluksangAuthError(
      parseErrorDetail(data, 'สมัครสมาชิกไม่สำเร็จ'),
      response.status || 400,
    );
  }

  if (!response.ok) {
    throw new PluksangAuthError(
      parseErrorDetail(data, 'สมัครสมาชิกไม่สำเร็จ'),
      response.status,
    );
  }
}
