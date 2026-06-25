import { queryOptions } from '@tanstack/react-query';
import * as automatedJobsApi from './api';

export const automatedJobQueries = {
  byLand: (landId: string) =>
    queryOptions({
      queryKey: ['automated-jobs', 'land', landId] as const,
      queryFn: () => automatedJobsApi.fetchAutomatedJobsByLand(landId),
    }),
  busyDevicesByFarm: (farmId: string) =>
    queryOptions({
      queryKey: ['automated-jobs', 'busy-devices', farmId] as const,
      queryFn: () => automatedJobsApi.fetchBusyAutomatedDevicesByFarm(farmId),
    }),
};
