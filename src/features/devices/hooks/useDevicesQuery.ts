import { isAuthenticatedAtom } from '@features/auth/store';
import { useRealtimeSubscription } from '@lib/supabase/useRealtimeSubscription';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { deviceQueries } from '../queries';

export type { DbDevice } from '../api';

export function useDevicesQuery(farmId?: string) {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const queryClient = useQueryClient();

  useRealtimeSubscription(
    { channel: `devices-realtime-${farmId ?? 'all'}`, table: 'farm_devices' },
    () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  );

  return useQuery({
    ...(farmId ? deviceQueries.byFarm(farmId) : deviceQueries.all()),
    enabled: isAuthenticated,
  });
}
