import { queryOptions } from '@tanstack/react-query';
import * as mapApi from './api';

export const tilesetQueries = {
  all: () =>
    queryOptions({
      queryKey: ['tilesets'] as const,
      queryFn: mapApi.fetchTilesets,
      staleTime: 1000 * 60 * 10,
    }),
};
