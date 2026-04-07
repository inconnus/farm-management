import { queryOptions } from '@tanstack/react-query';
import * as devicesApi from './api';

export const deviceQueries = {
  all: () =>
    queryOptions({
      queryKey: ['devices'] as const,
      queryFn: devicesApi.fetchAllDevices,
      staleTime: 1000 * 60 * 5,
    }),

  byFarm: (farmId: string) =>
    queryOptions({
      queryKey: ['devices', 'farm', farmId] as const,
      queryFn: () => devicesApi.fetchDevicesByFarm(farmId),
      staleTime: 1000 * 60 * 5,
    }),
};
