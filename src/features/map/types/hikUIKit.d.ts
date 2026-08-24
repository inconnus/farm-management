/** Hikvision ISGP / Ezviz — config จาก farm_devices.config */
export type HikCameraParams = {
  /** Bearer token สำหรับเรียก ISGP API — ถ้าไม่มีจะดึงจาก GetToken ตอนเล่น */
  accessToken?: string;
  deviceSerial: string;
  channelNo?: number | string;
  code?: string;
  /** 1 = HD, 2 = Smooth */
  quality?: number;
  /** 2 = local playback, 3 = cloud playback */
  method?: number;
};
