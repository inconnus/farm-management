import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteFarm, updateFarm, type UpdateFarmInput } from '../api';

export function useUpdateFarm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ farmId, input }: { farmId: string; input: UpdateFarmInput }) =>
      updateFarm(farmId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms'] });
    },
  });
}

export function useDeleteFarm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (farmId: string) => deleteFarm(farmId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms'] });
    },
  });
}
