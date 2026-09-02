import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback } from 'react';
import * as authApi from '../api';
import { clearPluksangSession } from '../pluksangStore';
import {
  authAtom,
  authModeAtom,
  isAuthenticatedAtom,
  isAuthLoadingAtom,
  pluksangSessionAtom,
  profileAtom,
  sessionAtom,
  userAtom,
} from '../store';

export function useAuth() {
  const user = useAtomValue(userAtom);
  const session = useAtomValue(sessionAtom);
  const profile = useAtomValue(profileAtom);
  const authMode = useAtomValue(authModeAtom);
  const pluksangSession = useAtomValue(pluksangSessionAtom);
  const isLoading = useAtomValue(isAuthLoadingAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const setAuth = useSetAtom(authAtom);

  const signOut = useCallback(async () => {
    if (authMode === 'pluksang') {
      clearPluksangSession();
      setAuth({
        mode: null,
        pluksangSession: null,
        user: null,
        session: null,
        profile: null,
        organizations: [],
        isLoading: false,
        isInitialized: true,
        isProfileReady: true,
      });
      return { error: null };
    }
    return authApi.signOut();
  }, [authMode, setAuth]);

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
    authMode,
    pluksangSession,
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
