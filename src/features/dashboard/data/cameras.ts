import type { CameraData } from '@features/map/components';
import type { KasetkornCamera } from './api';

/** ISGP access token ระดับแอป (ใช้เรียก live address ร่วมกับ deviceSerial + validateCode) */
const KASETKORN_HIK_ISGP_ACCESS_TOKEN =
  'hpc.aYE8MVz2VCQRukF3gYA03azTuVBj5Daz';

export function kasetkornCameraToCameraData(cam: KasetkornCamera): CameraData {
  return {
    id: cam._id,
    name: cam.deviceName,
    lat: cam.lat,
    lng: cam.lon,
    province: cam.province,
    amphur: cam.amphur,
    tambon: cam.tambon,
    mode: 'hik',
    hik: {
      accessToken: KASETKORN_HIK_ISGP_ACCESS_TOKEN,
      deviceSerial: cam.deviceSerial,
      code: cam.validateCode,
      channelNo: 1,
      quality: 1,
      method: 2,
    },
  };
}
