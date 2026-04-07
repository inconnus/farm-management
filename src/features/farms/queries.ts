import { queryOptions } from '@tanstack/react-query';
import * as farmsApi from './api';

export const farmQueries = {
  all: (organizationId: string) =>
    queryOptions({
      queryKey: ['farms', organizationId] as const,
      queryFn: () => farmsApi.fetchFarms(organizationId),
    }),
};

export const landQueries = {
  all: () =>
    queryOptions({
      queryKey: ['lands'] as const,
      queryFn: farmsApi.fetchAllLands,
    }),

  byFarm: (farmId: string) =>
    queryOptions({
      queryKey: ['lands', 'farm', farmId] as const,
      queryFn: () => farmsApi.fetchLandsByFarm(farmId),
    }),
};

export const farmMemberQueries = {
  byFarm: (farmId: string) =>
    queryOptions({
      queryKey: ['farm-members', farmId] as const,
      queryFn: () => farmsApi.fetchFarmMembers(farmId),
      staleTime: 1000 * 60 * 5,
    }),
};
