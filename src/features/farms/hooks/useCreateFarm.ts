import { organizationsAtom } from '@features/auth/store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useParams } from 'react-router-dom';
import { createFarm } from '../api';

export function useCreateFarm() {
  const organizations = useAtomValue(organizationsAtom);
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const queryClient = useQueryClient();

  const orgId = organizations.find((o) => o.slug === orgSlug)?.id ?? null;

  const mutation = useMutation({
    mutationFn: (input: { name: string; lat: number; lng: number; province?: string }) => {
      if (!orgId) throw new Error('ไม่พบ organization');
      return createFarm({ ...input, organizationId: orgId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms'] });
    },
  });

  return { ...mutation, orgId };
}
