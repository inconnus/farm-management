import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteLand, type UpdateLandInput, updateLand } from '../api';

export function useUpdateLand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      landId,
      input,
    }: {
      landId: string;
      input: UpdateLandInput;
    }) => updateLand(landId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms'] });
    },
  });
}

export function useDeleteLand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (landId: string) => deleteLand(landId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms'] });
    },
  });
}
