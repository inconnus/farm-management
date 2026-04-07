import { isAuthenticatedAtom } from '@features/auth/store';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { tilesetQueries } from '../queries';

export type { DbTileset } from '../api';

export function useTilesetsQuery() {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);

  return useQuery({
    ...tilesetQueries.all(),
    enabled: isAuthenticated,
  });
}
