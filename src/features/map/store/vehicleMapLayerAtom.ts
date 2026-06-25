import type { VehicleData } from '@features/vehicles/types';
import { atom } from 'jotai';

/** รถไถที่แสดงบน VehicleMapMarkerOverlay (DOM layer เหนือ path) */
export const vehicleMapMarkersAtom = atom<VehicleData[]>([]);
