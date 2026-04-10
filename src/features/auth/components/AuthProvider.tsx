import { supabase } from '@lib/supabase/client';
import { getPersistedOrgId, setCurrentOrgAtom } from '@store/orgStore';
import { useAtom, useSetAtom } from 'jotai';
import { type ReactNode, useEffect } from 'react';
import { fetchProfile } from '../api';
import { fetchUserOrganizations } from '../orgApi';
import { authAtom } from '../store';

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [auth, setAuth] = useAtom(authAtom);
  const setCurrentOrg = useSetAtom(setCurrentOrgAtom);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth((prev) => ({
        user: session?.user ?? null,
        session: session ?? null,
        profile: session?.user?.id === prev.user?.id ? prev.profile : null,
        organizations:
          session?.user?.id === prev.user?.id ? prev.organizations : [],
        isLoading: false,
        isInitialized: true,
      }));
    });

    return () => subscription.unsubscribe();
  }, [setAuth]);

  useEffect(() => {
    const userId = auth.user?.id;
    if (!userId) return;

    let cancelled = false;

    Promise.all([fetchProfile(userId), fetchUserOrganizations(userId)]).then(
      ([profile, organizations]) => {
        if (cancelled) return;
        setAuth((prev) => ({ ...prev, profile, organizations }));

        const persistedOrgId = getPersistedOrgId();
        if (persistedOrgId) {
          const match = organizations.find((o) => o.id === persistedOrgId);
          if (match) setCurrentOrg(match);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [auth.user?.id, setAuth, setCurrentOrg]);

  return <>{children}</>;
}
