import { isAuthenticatedAtom } from '@features/auth/store';
import { useRealtimeSubscription } from '@lib/supabase/useRealtimeSubscription';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { ACTIVE_AUTOMATED_JOB_STATUSES } from '../api';
import * as automatedJobsApi from '../api';
import { automatedJobQueries } from '../queries';

export type { CreateAutomatedJobInput, DbAutomatedJob, DbAutomatedJobStatus, BusyAutomatedDevice } from '../api';
export { ACTIVE_AUTOMATED_JOB_STATUSES } from '../api';

export function useLandAutomatedJobsQuery(landId: string) {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const queryClient = useQueryClient();

  useRealtimeSubscription(
    {
      channel: `automated-jobs-land-${landId}`,
      table: 'automated_jobs',
      filter: `land_id=eq.${landId}`,
      enabled: !!landId,
    },
    () => {
      queryClient.invalidateQueries({
        queryKey: automatedJobQueries.byLand(landId).queryKey,
      });
    },
  );

  return useQuery({
    ...automatedJobQueries.byLand(landId),
    enabled: isAuthenticated && !!landId,
    refetchInterval: (query) => {
      const jobs = query.state.data;
      if (jobs?.some((j) => ACTIVE_AUTOMATED_JOB_STATUSES.includes(j.status))) {
        return 5000;
      }
      return false;
    },
  });
}

export function useFarmBusyAutomatedDevicesQuery(farmId: string) {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const queryClient = useQueryClient();

  useRealtimeSubscription(
    {
      channel: `automated-jobs-farm-busy-${farmId}`,
      table: 'automated_jobs',
      filter: `farm_id=eq.${farmId}`,
      enabled: !!farmId,
    },
    () => {
      queryClient.invalidateQueries({
        queryKey: automatedJobQueries.busyDevicesByFarm(farmId).queryKey,
      });
    },
  );

  return useQuery({
    ...automatedJobQueries.busyDevicesByFarm(farmId),
    enabled: isAuthenticated && !!farmId,
  });
}

export function useCreateAutomatedJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: automatedJobsApi.createAutomatedJob,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: automatedJobQueries.byLand(variables.landId).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: automatedJobQueries.busyDevicesByFarm(variables.farmId).queryKey,
      });
    },
  });
}
