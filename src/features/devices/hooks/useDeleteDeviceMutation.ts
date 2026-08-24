import { useMutation, useQueryClient } from '@tanstack/react-query';
import { softDeleteDevice } from '../api';

export function useDeleteDeviceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => softDeleteDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
}
