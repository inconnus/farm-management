import { useCallback } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import * as authApi from '../api';
import {
  authAtom,
  isAuthenticatedAtom,
  isAuthLoadingAtom,
  profileAtom,
  sessionAtom,
  userAtom,
} from '../store';
import { clearCurrentOrgAtom } from '@store/orgStore';

export function useAuth() {
  const user = useAtomValue(userAtom);
  const session = useAtomValue(sessionAtom);
  const profile = useAtomValue(profileAtom);
  const isLoading = useAtomValue(isAuthLoadingAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const setAuth = useSetAtom(authAtom);
  const clearOrg = useSetAtom(clearCurrentOrgAtom);

  const signOut = useCallback(async () => {
    clearOrg();
    return authApi.signOut();
  }, [clearOrg]);

  const updateProfile = useCallback(
    async (updates: {
      full_name?: string;
      phone?: string;
      avatar_url?: string;
    }) => {
      if (!user) return { data: null, error: new Error('Not authenticated') };

      try {
        const data = await authApi.updateProfile(user.id, updates);
        setAuth((prev) => ({ ...prev, profile: data }));
        return { data, error: null };
      } catch (err) {
        return { data: null, error: err as Error };
      }
    },
    [user, setAuth],
  );

  return {
    user,
    session,
    profile,
    isLoading,
    isAuthenticated,
    signIn: authApi.signIn,
    signUp: authApi.signUp,
    signOut,
    resetPassword: authApi.resetPassword,
    updatePassword: authApi.updatePassword,
    updateProfile,
  };
}
