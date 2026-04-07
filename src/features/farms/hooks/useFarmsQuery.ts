import { isAuthenticatedAtom } from '@features/auth/store';
import { currentOrgIdAtom } from '@store/orgStore';
import { useRealtimeSubscription } from '@lib/supabase/useRealtimeSubscription';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { farmQueries } from '../queries';

export type { DbFarm, DbFarmWithLands, DbLandInFarm } from '../api';

export function useFarmsQuery() {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const orgId = useAtomValue(currentOrgIdAtom);
  const queryClient = useQueryClient();

  useRealtimeSubscription({ channel: 'farms-realtime', table: 'farms' }, () =>
    queryClient.invalidateQueries({ queryKey: ['farms'] }),
  );

  return useQuery({
    ...farmQueries.all(orgId!),
    enabled: isAuthenticated && !!orgId,
  });
}
