import { atom } from 'jotai';
import type { CameraData } from '../components/CameraMarker';
import type { LightData } from '../components/LightMarker';
import type { SolarCellData } from '../components/SolarCellMarker';

export type DevicePopupState =
  | {
      type: 'camera';
      lngLat: [number, number];
      camera: CameraData;
    }
  | {
      type: 'solar';
      lngLat: [number, number];
      solar: SolarCellData;
    }
  | {
      type: 'light';
      lngLat: [number, number];
      light: LightData;
    }
  | null;

export const devicePopupAtom = atom<DevicePopupState>(null);
