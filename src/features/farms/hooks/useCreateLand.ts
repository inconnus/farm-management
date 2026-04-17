import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLand } from '../api';

export function useCreateLand(farmId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: {
      name: string;
      cropType?: string;
      color?: string;
      coords: [number, number][];
    }) =>
      createLand({
        farmId,
        name: input.name,
        cropType: input.cropType,
        color: input.color,
        coords: input.coords,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms'] });
    },
  });

  return mutation;
}
