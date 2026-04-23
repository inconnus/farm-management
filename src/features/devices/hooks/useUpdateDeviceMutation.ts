import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patchDeviceConfig } from '../api';

export function useUpdateDeviceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Record<string, unknown>;
    }) => patchDeviceConfig(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
}
