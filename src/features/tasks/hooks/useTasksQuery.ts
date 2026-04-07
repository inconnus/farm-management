import { isAuthenticatedAtom } from '@features/auth/store';
import { useRealtimeSubscription } from '@lib/supabase/useRealtimeSubscription';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import * as tasksApi from '../api';

export type { DbTask } from '../api';

export function useTasksQuery(farmId?: string) {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const queryClient = useQueryClient();

  useRealtimeSubscription(
    { channel: `tasks-realtime-${farmId ?? 'all'}`, table: 'tasks' },
    () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  );

  return useQuery({
    queryKey: farmId
      ? (['tasks', 'farm', farmId] as const)
      : (['tasks'] as const),
    queryFn: farmId
      ? () => tasksApi.fetchTasksByFarm(farmId)
      : tasksApi.fetchAllTasks,
    enabled: isAuthenticated,
  });
}
