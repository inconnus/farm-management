import { isAuthenticatedAtom } from '@features/auth/store';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { farmMemberQueries } from '../queries';

export type { FarmMembersData, FarmTeam } from '../api';

export function useFarmMembersQuery(farmId: string | undefined) {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);

  return useQuery({
    ...farmMemberQueries.byFarm(farmId ?? ''),
    enabled: isAuthenticated && !!farmId,
  });
}
