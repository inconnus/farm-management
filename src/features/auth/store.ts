import { atom } from 'jotai';
import type { Session, User } from '@supabase/supabase-js';
import type { Tables } from '@lib/supabase/database.types';
import type { OrgMembership } from '@store/orgStore';

export type Profile = Tables<'profiles'>;

export type AuthState = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  organizations: OrgMembership[];
  isLoading: boolean;
  isInitialized: boolean;
};

export const authAtom = atom<AuthState>({
  user: null,
  session: null,
  profile: null,
  organizations: [],
  isLoading: true,
  isInitialized: false,
});

export const userAtom = atom((get) => get(authAtom).user);
export const sessionAtom = atom((get) => get(authAtom).session);
export const profileAtom = atom((get) => get(authAtom).profile);
export const organizationsAtom = atom((get) => get(authAtom).organizations);
export const isAuthLoadingAtom = atom((get) => get(authAtom).isLoading);
export const isAuthenticatedAtom = atom((get) => get(authAtom).user !== null);
export const isAuthInitializedAtom = atom((get) => get(authAtom).isInitialized);
