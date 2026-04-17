import { isAuthenticatedAtom, organizationsAtom } from '@features/auth/store';
import { useRealtimeSubscription } from '@lib/supabase/useRealtimeSubscription';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useParams } from 'react-router-dom';
import { farmQueries } from '../queries';

export type { DbFarm, DbFarmWithLands, DbLandInFarm } from '../api';

export function useFarmsQuery() {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const organizations = useAtomValue(organizationsAtom);
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const queryClient = useQueryClient();

  // Derive org id from URL slug
  const orgId = organizations.find((o) => o.slug === orgSlug)?.id ?? null;

  useRealtimeSubscription({ channel: 'farms-realtime', table: 'farms' }, () =>
    queryClient.invalidateQueries({ queryKey: ['farms'] }),
  );

  return useQuery({
    ...farmQueries.all(orgId!),
    enabled: isAuthenticated && !!orgId,
  });
}
