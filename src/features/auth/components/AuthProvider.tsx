import { supabase } from '@lib/supabase/client';
import { useAtom } from 'jotai';
import { type ReactNode, useEffect } from 'react';
import { fetchProfile } from '../api';
import { fetchUserOrganizations } from '../orgApi';
import { loadPluksangSession } from '../pluksangStore';
import { authAtom } from '../store';

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [auth, setAuth] = useAtom(authAtom);

  useEffect(() => {
    const pluksangSession = loadPluksangSession();
    if (pluksangSession) {
      setAuth((prev) => ({
        ...prev,
        mode: 'pluksang',
        pluksangSession,
        isLoading: false,
        isInitialized: true,
        isProfileReady: true,
      }));
    }
  }, [setAuth]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth((prev) => {
        if (prev.mode === 'pluksang') return prev;

        const sameUser = session?.user?.id === prev.user?.id;
        return {
          ...prev,
          mode: session?.user ? 'supabase' : null,
          pluksangSession: null,
          user: session?.user ?? null,
          session: session ?? null,
          profile: sameUser ? prev.profile : null,
          organizations: sameUser ? prev.organizations : [],
          isLoading: false,
          isInitialized: true,
          isProfileReady: !session?.user
            ? true
            : sameUser
              ? prev.isProfileReady
              : false,
        };
      });
    });

    return () => subscription.unsubscribe();
  }, [setAuth]);

  useEffect(() => {
    if (auth.mode === 'pluksang') return;

    const userId = auth.user?.id;
    if (!userId) return;

    let cancelled = false;

    const loadUserData = () => {
      Promise.all([fetchProfile(userId), fetchUserOrganizations(userId)]).then(
        ([profile, organizations]) => {
          if (cancelled) return;
          setAuth((prev) => {
            if (prev.mode === 'pluksang') return prev;
            return {
              ...prev,
              profile,
              organizations,
              isProfileReady: true,
            };
          });
        },
      );
    };

    loadUserData();

    const handleFocus = () => {
      loadUserData();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleFocus);
    };
  }, [auth.mode, auth.user?.id, setAuth]);

  return <>{children}</>;
}
