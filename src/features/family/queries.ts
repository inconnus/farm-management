import type { KasetkornAuthContext } from '@features/dashboard/data/api';
import { queryOptions } from '@tanstack/react-query';
import {
  fetchFamilyInvites,
  fetchFamilySnapshot,
  fetchIncomingInvites,
} from './api';

export const familyQueries = {
  dashboard: (
    appFarmerId: string | undefined,
    auth: KasetkornAuthContext,
    focusedFamilyId?: string | null,
  ) =>
    queryOptions({
      queryKey: [
        'family-dashboard',
        appFarmerId,
        auth.scope === 'farmer' ? auth.appFarmerId : null,
        focusedFamilyId ?? null,
      ] as const,
      queryFn: () => fetchFamilySnapshot(appFarmerId!, auth, focusedFamilyId),
      enabled: !!appFarmerId && auth.scope === 'farmer',
    }),

  incomingInvites: (
    appFarmerId: string | undefined,
    auth: KasetkornAuthContext,
  ) =>
    queryOptions({
      queryKey: [
        'family-incoming-invites',
        appFarmerId,
        auth.scope === 'farmer' ? auth.appFarmerId : null,
      ] as const,
      queryFn: () => fetchIncomingInvites(appFarmerId!, auth),
      enabled: !!appFarmerId && auth.scope === 'farmer',
    }),

  outgoingInvites: (
    familyId: string | undefined,
    auth: KasetkornAuthContext,
  ) =>
    queryOptions({
      queryKey: ['family-outgoing-invites', familyId] as const,
      queryFn: () => fetchFamilyInvites(familyId!, auth),
      enabled: !!familyId && auth.scope === 'farmer',
    }),
};
