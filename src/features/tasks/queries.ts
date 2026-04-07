import { queryOptions } from '@tanstack/react-query';
import * as tasksApi from './api';

export const taskQueries = {
  all: () =>
    queryOptions({
      queryKey: ['tasks'] as const,
      queryFn: tasksApi.fetchAllTasks,
    }),

  byFarm: (farmId: string) =>
    queryOptions({
      queryKey: ['tasks', 'farm', farmId] as const,
      queryFn: () => tasksApi.fetchTasksByFarm(farmId),
    }),

  byLand: (landId: string) =>
    queryOptions({
      queryKey: ['tasks', 'land', landId] as const,
      queryFn: () => tasksApi.fetchTasksByLand(landId),
    }),
};
