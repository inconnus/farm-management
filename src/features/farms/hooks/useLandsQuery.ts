import { isAuthenticatedAtom } from '@features/auth/store';
import { useRealtimeSubscription } from '@lib/supabase/useRealtimeSubscription';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { landQueries } from '../queries';

export type { DbLand } from '../api';

export function useLandsQuery() {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const queryClient = useQueryClient();

  useRealtimeSubscription({ channel: 'lands-realtime', table: 'lands' }, () =>
    queryClient.invalidateQueries({ queryKey: ['lands'] }),
  );

  return useQuery({
    ...landQueries.all(),
    enabled: isAuthenticated,
  });
}

export function useLandsByFarmQuery(farmId: string | undefined) {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);

  return useQuery({
    ...landQueries.byFarm(farmId ?? ''),
    enabled: isAuthenticated && !!farmId,
  });
}
