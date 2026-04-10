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
    [key: string]: any;
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
    [key: string]: any;
  }[];
}

// ── Mock telemetry config ──────────────────────────────────────────
// กำหนดช่วง min-max ของแต่ละค่าเซ็นเซอร์สำหรับ mock devices
export const MOCK_TELEMETRY_RANGES = {
  sensor_ambient_humid: { min: 55, max: 85 },
  sensor_ambient_temperature: { min: 25, max: 38 },
  sensor_soil_humid_humid: { min: 15, max: 45 },
  sensor_soil_humid_temperature: { min: 28, max: 36 },
  sensor_voltage_v_in: { min: 20, max: 26 },
};

/** สุ่มค่าระหว่าง min–max (ทศนิยม 2 ตำแหน่ง) */
const randBetween = (min: number, max: number) =>
  Math.round((Math.random() * (max - min) + min) * 100) / 100;

/** Set ของ appIotId ที่เป็น mock — ใช้ตรวจสอบใน fetchIOTDeviceTelemetry */
const mockAppIotIds = new Set<string>();
// จะถูก populate หลังจาก mockIOTDevices ถูก define (ด้านล่าง)

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
      },
    ],
  };
}

export const fetchIOTDeviceTelemetry = async (
  appIotId: string,
): Promise<TelemetryResponse> => {
  // ถ้าเป็น mock device → return dummy data ทันที (ไม่เรียก API จริง)
  if (mockAppIotIds.has(appIotId)) {
    return generateMockTelemetry();
  }

  const response = await fetch(
    `https://api-dev.kasetkorn.app/api/iot/read/last/${appIotId}`,
    {
      headers: {
        Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBGYXJtZXJJZCI6IkZNMTc1MTI2ODEyNCIsIm1vYmlsZU5vIjoiMDAwMCIsImlkQ2FyZCI6IjMyMjM0NDMiLCJsZXZlbCI6MSwiZXhwIjoxNzc2MDgxMjYxfQ.3ZNoPNavps28GpzuK7IBH1DvvjYLy8YHUZ2if-0VdhI`,
      },
    },
  );
  if (!response.ok) {
    throw new Error('Failed to fetch telemetry');
  }
  return response.json();
};

const mockIOTDevices: IOTDevice[] = [
  {
    _id: '69c2959b6928f8e78c62834b',
    appIotId: 'KS_E49DD971FE69',
    appIotName: 'แปลงทดสอบสันทราย เชียงใหม่ - บริษัท แอโร กรุ๊ป (1992) จำกัด',
    appFarmerId: 'FM1751268124',
    appFarmId: 'FD1775552732740',
    appFarmName: 'แปลงทดสอบสันทราย เชียงใหม่ - บริษัท แอโร กรุ๊ป (1992) จำกัด',
    tambon: 'สันป่าเปา',
    amphur: 'สันทราย',
    province: 'เชียงใหม่',
    lat: 18.8331,
    lon: 99.057354,
  },
  {
    _id: '69c2959b6928f8e78c62834c',
    appIotId: 'KS_E49DD971FE6A',
    appIotName: 'แปลงนำร่องตำบลพระบาท ลำปาง - บริษัท แอโร กรุ๊ป (1992) จำกัด',
    appFarmerId: 'FM1751268124',
    appFarmId: 'FD1775552732740',
    appFarmName: 'แปลงนำร่องตำบลพระบาท ลำปาง - บริษัท แอโร กรุ๊ป (1992) จำกัด',
    tambon: 'พระบาท',
    amphur: 'เมืองลำปาง',
    province: 'ลำปาง',
    lat: 18.279062,
    lon: 99.488498,
  },
  {
    _id: '69c2959b6928f8e78c62834d',
    appIotId: 'KS_E49DD971FE6B',
    appIotName: 'แปลงทดสอบ ศรีราชา ชลบุรี - บริษัท แอโร กรุ๊ป (1992) จำกัด',
    appFarmerId: 'FM1751268124',
    appFarmId: 'FD1775552732740',
    appFarmName: 'แปลงทดสอบ ศรีราชา ชลบุรี - บริษัท แอโร กรุ๊ป (1992) จำกัด',
    tambon: 'บางพระ',
    amphur: 'ศรีราชา',
    province: 'ชลบุรี',
    lat: 13.244617,
    lon: 100.994689,
  },
  {
    _id: '69c2959b6928f8e78c62834e',
    appIotId: 'KS_E49DD971FE6C',
    appIotName: 'แปลงทดสอบ มโนรมย์ ชัยนาท - บริษัท แอโร กรุ๊ป (1992) จำกัด',
    appFarmerId: 'FM1751268124',
    appFarmId: 'FD1775552732740',
    appFarmName: 'แปลงทดสอบ มโนรมย์ ชัยนาท - บริษัท แอโร กรุ๊ป (1992) จำกัด',
    tambon: 'หางน้ำสาคร',
    amphur: 'มโนรมย์',
    province: 'ชัยนาท',
    lat: 15.297043,
    lon: 100.190748,
  },
  {
    _id: '69c2959b6928f8e78c62834f',
    appIotId: 'KS_E49DD971FE6D',
    appIotName: 'แปลงทดสอบ อำเภอเมืองขอนแก่น ขอนแก่น - บริษัท แอโร กรุ๊ป (1992) จำกัด',
    appFarmerId: 'FM1751268124',
    appFarmId: 'FD1775552732740',
    appFarmName: 'แปลงทดสอบ อำเภอเมืองขอนแก่น ขอนแก่น - บริษัท แอโร กรุ๊ป (1992) จำกัด',
    tambon: 'ศิลา',
    amphur: 'เมืองขอนแก่น',
    province: 'เมืองขอนแก่น',
    lat: 16.489979,
    lon: 102.83292,
  },
  {
    _id: '69c2959b6928f8e78c628350',
    appIotId: 'KS_E49DD971FE6E',
    appIotName: 'แปลงทดสอบ ควนขนุน พัทลุง - บริษัท แอโร กรุ๊ป (1992) จำกัด',
    appFarmerId: 'FM1751268124',
    appFarmId: 'FD1775552732740',
    appFarmName: 'แปลงทดสอบ ควนขนุน พัทลุง - บริษัท แอโร กรุ๊ป (1992) จำกัด',
    tambon: 'ปันแต',
    amphur: 'ควนขนุน',
    province: 'พัทลุง',
    lat: 7.778141,
    lon: 100.025671,
  },
  {
    _id: '69c2959b6928f8e78c628351',
    appIotId: 'KS_E49DD971FE6F',
    appIotName: 'แปลงทดสอบ ศรีสัชนาลัย สุโขทัย - บริษัท แอโร กรุ๊ป (1992) จำกัด',
    appFarmerId: 'FM1751268124',
    appFarmId: 'FD1775552732740',
    appFarmName: 'แปลงทดสอบ ศรีสัชนาลัย สุโขทัย - บริษัท แอโร กรุ๊ป (1992) จำกัด',
    tambon: 'บ้านตึก',
    amphur: 'ศรีสัชนาลัย',
    province: 'สุโขทัย',
    lat: 17.589397287467573,
    lon: 99.81072511735451,
  },
];

// Populate mock IDs set
for (const d of mockIOTDevices) mockAppIotIds.add(d.appIotId);
export const fetchIOTDevices = async (): Promise<IOTDevice[]> => {
  const response = await fetch(
    'https://api-dev.kasetkorn.app/api/iot/setup/GetIotAll',
  );
  if (!response.ok) {
    throw new Error('Failed to fetch IoT devices');
  }
  const apiDevices = await response
    .json()
    .then((data) => data.data as IOTDevice[]);
  return [...apiDevices, ...mockIOTDevices];
};

export interface LandResponse {
  // Assuming a generic return type or any if unspecified
  [key: string]: any;
}

export const fetchGetLand = async (
  appFarmId: string,
): Promise<LandResponse> => {
  const response = await fetch(
    'https://api-dev.kasetkorn.app/api/land/GetLand',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ appFarmId }),
    },
  );
  if (!response.ok) {
    throw new Error('Failed to fetch land data');
  }
  return response.json();
};
