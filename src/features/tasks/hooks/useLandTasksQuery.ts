import { isAuthenticatedAtom } from '@features/auth/store';
import { useRealtimeSubscription } from '@lib/supabase/useRealtimeSubscription';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import * as tasksApi from '../api';
import { taskQueries } from '../queries';

export type { DbLandTask, DbTaskPriority, DbTaskStatus } from '../api';
export { advanceDbStatus } from '../api';

export function useLandTasksQuery(landId: string) {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const queryClient = useQueryClient();

  useRealtimeSubscription(
    {
      channel: `tasks-land-${landId}`,
      table: 'tasks',
      filter: `land_id=eq.${landId}`,
      enabled: !!landId,
    },
    () => {
      queryClient.invalidateQueries({
        queryKey: taskQueries.byLand(landId).queryKey,
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  );

  return useQuery({
    ...taskQueries.byLand(landId),
    enabled: isAuthenticated && !!landId,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tasksApi.createTask,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: taskQueries.byLand(variables.landId).queryKey,
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      status,
    }: {
      taskId: string;
      status: tasksApi.DbTaskStatus;
      landId: string;
    }) => tasksApi.updateTaskStatus(taskId, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: taskQueries.byLand(variables.landId).queryKey,
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTaskAssignee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      assignedTo,
    }: {
      taskId: string;
      assignedTo: string | null;
      landId: string;
    }) => tasksApi.updateTaskAssignee(taskId, assignedTo),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: taskQueries.byLand(variables.landId).queryKey,
      });
    },
  });
}
