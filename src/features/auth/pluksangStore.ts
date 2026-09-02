/** Default landing route after pluksang login (no org slug in URL). */
export const PLUKSANG_HOME_PATH = '/dashboard';

/** @deprecated Old virtual org slug — kept for legacy URL redirects only. */
export const PLUKSANG_ORG_SLUG = 'pluksang';
const STORAGE_KEY = 'farm-mgmt:pluksang-session';

export type PluksangSession = {
  appFarmerId: string;
  mobileNo: string;
  idCard: string;
  token: string;
  level: number;
  registor: number;
};

function decodeJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as {
      exp?: number;
    };
    return payload.exp ?? null;
  } catch {
    return null;
  }
}

export function isPluksangTokenExpired(token: string): boolean {
  const exp = decodeJwtExp(token);
  if (!exp) return true;
  return Date.now() >= exp * 1000;
}

export function loadPluksangSession(): PluksangSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as PluksangSession;
    if (!session.token || isPluksangTokenExpired(session.token)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function savePluksangSession(session: PluksangSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearPluksangSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}
