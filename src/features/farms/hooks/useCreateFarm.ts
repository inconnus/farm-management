import { organizationsAtom } from '@features/auth/store';
import { currentOrgIdAtom } from '@shared/store/orgStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useParams } from 'react-router-dom';
import { createFarm } from '../api';

export function useCreateFarm() {
  const organizations = useAtomValue(organizationsAtom);
  const currentOrgId = useAtomValue(currentOrgIdAtom);
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const queryClient = useQueryClient();

  const orgId =
    organizations.find((o) => o.slug === orgSlug)?.id ?? currentOrgId ?? null;

  const mutation = useMutation({
    mutationFn: (input: {
      name: string;
      lat: number;
      lng: number;
      district?: string;
      province?: string;
      country?: string;
    }) => {
      if (!orgId) throw new Error('ไม่พบ organization');
      return createFarm({ ...input, organizationId: orgId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms'] });
    },
  });

  return { ...mutation, orgId };
}
