import type { CameraData } from '@features/map/components';
import type { KasetkornCamera } from './api';

export function isGkKasetkornCamera(cam: KasetkornCamera): boolean {
  return cam.deviceSerial.startsWith('GK');
}

export function kasetkornCameraToCameraData(
  cam: KasetkornCamera,
  accessToken?: string,
): CameraData {
  return {
    id: cam._id,
    name: cam.deviceName,
    lat: cam.lat,
    lng: cam.lon,
    province: cam.province,
    amphur: cam.amphur,
    tambon: cam.tambon,
    ...(accessToken
      ? {
          mode: 'hik' as const,
          hik: {
            accessToken,
            deviceSerial: cam.deviceSerial,
            code: cam.validateCode,
            channelNo: 1,
            quality: 1,
            method: 2,
          },
        }
      : {}),
  };
}
