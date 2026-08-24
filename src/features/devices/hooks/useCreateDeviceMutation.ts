import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type CreateDeviceInput, createDevice } from '../api';

export function useCreateDeviceMutation(farmId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<CreateDeviceInput, 'farmId'>) =>
      createDevice({ ...input, farmId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['devices', 'farm', farmId] });
    },
  });
}
