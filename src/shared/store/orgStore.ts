import type { Tables } from '@lib/supabase/database.types';
import { atom } from 'jotai';

export type Organization = Tables<'organizations'>;

export type OrgMembership = Organization & {
  role: 'owner' | 'admin' | 'member';
};

const STORAGE_KEY = 'farm-mgmt:current-org-id';

function getPersistedOrgId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistOrgId(orgId: string | null) {
  try {
    if (orgId) {
      localStorage.setItem(STORAGE_KEY, orgId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable
  }
}

// ─── Base atom ───────────────────────────────────────────────────

export const currentOrgAtom = atom<OrgMembership | null>(null);

// ─── Derived read atoms ──────────────────────────────────────────

export const currentOrgIdAtom = atom((get) => get(currentOrgAtom)?.id ?? null);

// ─── Write helpers ───────────────────────────────────────────────

export const setCurrentOrgAtom = atom(
  null,
  (_get, set, org: OrgMembership | null) => {
    set(currentOrgAtom, org);
    persistOrgId(org?.id ?? null);
  },
);

export const clearCurrentOrgAtom = atom(null, (_get, set) => {
  set(currentOrgAtom, null);
  persistOrgId(null);
});

export { getPersistedOrgId };
