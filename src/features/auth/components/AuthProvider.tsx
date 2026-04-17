import { supabase } from '@lib/supabase/client';
import { useAtom } from 'jotai';
import { type ReactNode, useEffect } from 'react';
import { fetchProfile } from '../api';
import { fetchUserOrganizations } from '../orgApi';
import { authAtom } from '../store';

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [auth, setAuth] = useAtom(authAtom);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth((prev) => {
        const sameUser = session?.user?.id === prev.user?.id;
        return {
          user: session?.user ?? null,
          session: session ?? null,
          profile: sameUser ? prev.profile : null,
          organizations: sameUser ? prev.organizations : [],
          isLoading: false,
          isInitialized: true,
          // ถ้าไม่มี user → ready ทันที
          // ถ้า user คนเดิม → คงค่าเดิมไว้ (เช่น tab focus / token refresh)
          // ถ้า user ใหม่ → reset รอ fetch
          isProfileReady: !session?.user ? true : sameUser ? prev.isProfileReady : false,
        };
      });
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
        setAuth((prev) => ({ ...prev, profile, organizations, isProfileReady: true }));
      },
    );

    return () => {
      cancelled = true;
    };
  }, [auth.user?.id, setAuth]);

  return <>{children}</>;
}
