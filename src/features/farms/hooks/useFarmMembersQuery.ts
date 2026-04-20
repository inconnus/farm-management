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

export function useOrgMembersWithFarmTeamsQuery(
  orgId: string | null | undefined,
  farmId: string | undefined,
) {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);

  return useQuery({
    ...farmMemberQueries.byOrgAndFarm(orgId ?? '', farmId ?? ''),
    enabled: isAuthenticated && !!orgId && !!farmId,
  });
}
