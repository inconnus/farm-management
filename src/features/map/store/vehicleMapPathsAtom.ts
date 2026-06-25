import { atom } from 'jotai';

export type VehicleMapPath = {
  id: string;
  coords: [number, number][];
  color: string;
  width: number;
  dashed?: boolean;
  opacity?: number;
};

export const vehicleMapPathsAtom = atom<VehicleMapPath[]>([]);
