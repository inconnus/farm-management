import type { SensorApiSettings } from '@shared/store/sensorApiStore';
import { pickMockOnlineIds } from './mockIotDevices';

export interface IOTDevice {
  _id: string;
  appIotId: string;
  appIotName: string;
  appFarmerId: string;
  appFarmId: string;
  appFarmName: string;
  tambon: string;
  amphur: string;
  province: string;
  lat: number;
  lon: number;
  telemetry?: {
    sensor_ambient_temperature?: number;
    sensor_ambient_humid?: number;
    sensor_soil_humid_humid?: number;
    sensor_soil_humid_ph?: number;
    sensor_soil_humid_ec?: number;
    sensor_v_in?: number;
    [key: string]: unknown;
  };
}

export interface TelemetryResponse {
  data: {
    topic: string;
    time: string;
    sensor_ambient_humid: number;
    sensor_ambient_temperature: number;
    sensor_relay_0: number;
    sensor_relay_1: number;
    sensor_relay_2: number;
    sensor_relay_3: number;
    sensor_relay_4: number;
    sensor_relay_5: number;
    sensor_soil_humid_humid: number;
    sensor_soil_humid_temperature: number;
    sensor_ts: number;
    sensor_voltage_v_1: number;
    sensor_voltage_v_2: number;
    sensor_voltage_v_3: number;
    sensor_voltage_v_in: number;
    sensor_soil_humid_ph?: number;
    sensor_soil_humid_ec?: number;
    sensor_v_in?: number;
    [key: string]: unknown;
  }[];
}

// ── Mock telemetry config ──────────────────────────────────────────
export const MOCK_TELEMETRY_RANGES = {
  sensor_ambient_humid: { min: 55, max: 85 },
  sensor_ambient_temperature: { min: 25, max: 38 },
  sensor_soil_humid_humid: { min: 15, max: 45 },
  sensor_soil_humid_temperature: { min: 28, max: 36 },
  sensor_voltage_v_in: { min: 20, max: 26 },
  sensor_soil_humid_ph: { min: 5.8, max: 7.2 },
  sensor_soil_humid_ec: { min: 0.8, max: 2.4 },
};

/** สุ่มค่าระหว่าง min–max (ทศนิยม 2 ตำแหน่ง) */
const randBetween = (min: number, max: number) =>
  Math.round((Math.random() * (max - min) + min) * 100) / 100;

function generateMockTelemetry(): TelemetryResponse {
  const r = MOCK_TELEMETRY_RANGES;
  return {
    data: [
      {
        topic: 'mock/telemetry',
        time: new Date().toISOString(),
        sensor_ambient_humid: randBetween(
          r.sensor_ambient_humid.min,
          r.sensor_ambient_humid.max,
        ),
        sensor_ambient_temperature: randBetween(
          r.sensor_ambient_temperature.min,
          r.sensor_ambient_temperature.max,
        ),
        sensor_relay_0: 0,
        sensor_relay_1: 0,
        sensor_relay_2: 0,
        sensor_relay_3: 0,
        sensor_relay_4: 0,
        sensor_relay_5: 0,
        sensor_soil_humid_humid: randBetween(
          r.sensor_soil_humid_humid.min,
          r.sensor_soil_humid_humid.max,
        ),
        sensor_soil_humid_temperature: randBetween(
          r.sensor_soil_humid_temperature.min,
          r.sensor_soil_humid_temperature.max,
        ),
        sensor_ts: Date.now(),
        sensor_voltage_v_1: 0,
        sensor_voltage_v_2: 0,
        sensor_voltage_v_3: 0,
        sensor_voltage_v_in: randBetween(
          r.sensor_voltage_v_in.min,
          r.sensor_voltage_v_in.max,
        ),
        sensor_soil_humid_ph: randBetween(
          r.sensor_soil_humid_ph.min,
          r.sensor_soil_humid_ph.max,
        ),
        sensor_soil_humid_ec: randBetween(
          r.sensor_soil_humid_ec.min,
          r.sensor_soil_humid_ec.max,
        ),
      },
    ],
  };
}

/** ชุด appIotId ที่ mock เป็นออนไลน์ — อัปเดตตอน fetchIOTDevices */
let mockOnlineIds = new Set<string>();

function isMockOnline(appIotId: string): boolean {
  // ถ้ายังไม่ถูก populate (race ช่วงแรก) → ประมาณ 87% จาก hash ของ id
  if (mockOnlineIds.size === 0) {
    let hash = 2166136261;
    for (let i = 0; i < appIotId.length; i++) {
      hash ^= appIotId.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash % 100 < 87;
  }
  return mockOnlineIds.has(appIotId);
}

const KASETKORN_AUTH_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBGYXJtZXJJZCI6IkZNMTc1MTI2ODEyNCIsIm1vYmlsZU5vIjoiMDAwMCIsImlkQ2FyZCI6IjMyMjM0NDMiLCJsZXZlbCI6MSwiZXhwIjoxNzg1NDAxODc3fQ.QPfBWGXBfA3IUJCkbBHkTdeP4KD_AWyBe3apzOGAVaY';

const KASETKORN_API_BASE = 'https://api.kasetkorn.app';

const kasetkornAuthHeaders = {
  Authorization: `Bearer ${KASETKORN_AUTH_TOKEN}`,
};

function pickLatestTelemetry(
  data: TelemetryResponse['data'],
): TelemetryResponse['data'][number] | undefined {
  if (data.length === 0) return undefined;
  if (data.length === 1) return data[0];
  return [...data].sort((a, b) => {
    const ta = (a.time ? new Date(a.time).getTime() : 0) || a.sensor_ts || 0;
    const tb = (b.time ? new Date(b.time).getTime() : 0) || b.sensor_ts || 0;
    return tb - ta;
  })[0];
}

async function fetchRealIOTDevices(): Promise<IOTDevice[]> {
  const response = await fetch(
    'https://api.kasetkorn.app/api/iot/setup/GetIotAll',
  );
  if (!response.ok) {
    throw new Error('Failed to fetch IoT devices');
  }
  const apiDevices = await response
    .json()
    .then((data) => data.data as IOTDevice[]);
  return [...apiDevices];
}

export const fetchIOTDeviceTelemetry = async (
  appIotId: string,
  settings: SensorApiSettings,
): Promise<TelemetryResponse> => {
  if (settings.useMockData) {
    // ออฟไลน์ → ไม่มี telemetry
    if (!isMockOnline(appIotId)) {
      return { data: [] };
    }
    return generateMockTelemetry();
  }

  if (settings.mode === 'all') {
    const response = await fetch('https://api.kasetkorn.app/api/iot/read/all', {
      method: 'POST',
      headers: {
        ...kasetkornAuthHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ UID: appIotId, time: settings.timeRange }),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch telemetry');
    }
    const json = (await response.json()) as TelemetryResponse;
    const latest = pickLatestTelemetry(json.data ?? []);
    return { data: latest ? [latest] : [] };
  }

  const response = await fetch(
    `https://api.kasetkorn.app/api/iot/read/last/${appIotId}`,
    { headers: kasetkornAuthHeaders },
  );
  if (!response.ok) {
    throw new Error('Failed to fetch telemetry');
  }
  return response.json();
};

export const fetchIOTDevices = async (
  settings?: Pick<SensorApiSettings, 'useMockData'>,
): Promise<IOTDevice[]> => {
  const apiDevices = await fetchRealIOTDevices();

  if (settings?.useMockData) {
    // จำนวนเท่าของจริง — mock แค่สถานะ online ~87%
    mockOnlineIds = pickMockOnlineIds(apiDevices);
  } else {
    mockOnlineIds = new Set();
  }

  return apiDevices;
};

export interface LandResponse {
  [key: string]: unknown;
}

export interface KasetkornCamera {
  _id: string;
  appIotId: string;
  deviceName: string;
  deviceSerial: string;
  validateCode: string;
  appFarmerId: string;
  tambon: string;
  amphur: string;
  province: string;
  lat: number;
  lon: number;
  isPTZ: boolean;
  siteId?: string;
}

export const fetchCameraToken = async (): Promise<string> => {
  const response = await fetch(`${KASETKORN_API_BASE}/api/camera/GetToken`, {
    headers: kasetkornAuthHeaders,
  });
  if (!response.ok) {
    throw new Error('Failed to fetch camera token');
  }
  const json = (await response.json()) as { Authorization?: string };
  if (!json.Authorization) {
    throw new Error('Camera token missing in response');
  }
  return json.Authorization;
};

export const fetchAllCameras = async (): Promise<KasetkornCamera[]> => {
  const response = await fetch(
    `${KASETKORN_API_BASE}/api/camera/GetCameraAll`,
    { headers: kasetkornAuthHeaders },
  );
  if (!response.ok) {
    throw new Error('Failed to fetch cameras');
  }
  const json = (await response.json()) as { data?: KasetkornCamera[] };
  return json.data ?? [];
};

export const fetchGetLand = async (
  appFarmId: string,
): Promise<LandResponse> => {
  const response = await fetch('https://api.kasetkorn.app/api/land/GetLand', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ appFarmId }),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch land data');
  }
  return response.json();
};
