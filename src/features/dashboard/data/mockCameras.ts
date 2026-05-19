import type { DbDevice } from '@features/devices/hooks/useDevicesQuery';
import { toCameraData } from '@features/map/components';

/** config สำหรับ HPPUIKitPlayer (ISGP) — ใส่ใน farm_devices.config เมื่อ mode = hik */
export const HIK_SDK_MOCK_CONFIG = {
  mode: 'hik',
  access_token: 'hpc.6gkhm0Id7BkA8CN5zYBu9IkNDqEkifaA',
  device_serial: 'GK4595968',
  channel_no: 1,
  code: '12345678',
  quality: 1,
  method: 2,
} as const;

/** mock อุปกรณ์กล้อง (รูปแบบเดียวกับ farm_devices) */
export const MOCK_DASHBOARD_CAMERA_DEVICES: DbDevice[] = [
  {
    id: 'mock-cam-001',
    name: 'กล้องทดสอบ',
    lat: 12.5352,
    lng: 101.4918,
    device_type: 'camera',
    farm_id: '00000000-0000-0000-0000-000000000001',
    is_active: true,
    config: {
      mode: 'hik',
      access_token: 'hpc.6gkhm0Id7BkA8CN5zYBu9IkNDqEkifaA',
      device_serial: 'GK4595968',
      channel_no: 1,
      code: '12345678',
      quality: 1,
      method: 2,
    },
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'mock-cam-002',
    name: 'กล้องทดสอบ2',
    lat: 14.121693, 
    lng: 100.774481,
    device_type: 'camera',
    farm_id: '00000000-0000-0000-0000-000000000001',
    is_active: true,
    config: {
      mode: 'hik',
      access_token: 'hpc.6gkhm0Id7BkA8CN5zYBu9IkNDqEkifaA',
      device_serial: 'GK2156266',
      channel_no: 1,
      code: '12345678',
      quality: 1,
      method: 2,
    },
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
];

/** แปลง config → CameraData (mode + hik params สำหรับ popup) */
export const MOCK_DASHBOARD_CAMERAS = MOCK_DASHBOARD_CAMERA_DEVICES.map(
  toCameraData,
);
