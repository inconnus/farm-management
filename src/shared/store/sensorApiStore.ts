import { atom } from 'jotai';

export type SensorApiMode = 'last' | 'all';

export type SensorApiSettings = {
  mode: SensorApiMode;
  timeRange: string;
  /** ใช้ข้อมูล mock แทน API จริง (สำหรับ demo / mockup) */
  useMockData: boolean;
};

export const SENSOR_TIME_OPTIONS = [
  { value: '-1h', label: '1 ชั่วโมงที่แล้ว' },
  { value: '-6h', label: '6 ชั่วโมงที่แล้ว' },
  { value: '-1d', label: '1 วันที่แล้ว' },
  { value: '-7d', label: '7 วันที่แล้ว' },
  { value: '-30d', label: '30 วันที่แล้ว' },
] as const;

const STORAGE_KEY = 'farm-mgmt:sensor-api-settings';

const DEFAULT_SETTINGS: SensorApiSettings = {
  mode: 'last',
  timeRange: '-1d',
  useMockData: false,
};

function loadSettings(): SensorApiSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<SensorApiSettings>;
    if (parsed.mode !== 'last' && parsed.mode !== 'all') return DEFAULT_SETTINGS;
    return {
      mode: parsed.mode,
      timeRange:
        typeof parsed.timeRange === 'string' ? parsed.timeRange : '-1d',
      useMockData: parsed.useMockData === true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persistSettings(settings: SensorApiSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage unavailable
  }
}

export const sensorApiSettingsAtom = atom<SensorApiSettings>(loadSettings());

export const setSensorApiSettingsAtom = atom(
  null,
  (_get, set, settings: SensorApiSettings) => {
    set(sensorApiSettingsAtom, settings);
    persistSettings(settings);
  },
);
