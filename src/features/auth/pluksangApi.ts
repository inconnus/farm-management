import type { PluksangSession } from './pluksangStore';

const PLUKSANG_LOGIN_URL =
  import.meta.env.PUBLIC_PLUKSANG_LOGIN_URL ??
  'https://api.kasetkorn.app/login';

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
    throw new PluksangAuthError('เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', response.status);
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
