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

export const fetchIOTDeviceTelemetry = async (
  appIotId: string,
): Promise<TelemetryResponse> => {
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
    _id: '69c2959b6928f8e78c62834a',
    appIotId: 'KS_E49DD971FE68',
    appIotName: 'สถานีทดสอบ บจก.แอโร กรุ๊ป (1992)',
    appFarmerId: 'FM1751268124',
    appFarmId: 'FD1775552732740',
    appFarmName: 'สวนทดสอบ',
    tambon: 'ลำผักกูด',
    amphur: 'ธัญบุรี',
    province: 'ปทุมธานี',
    lat: 14.018601684415657,
    lon: 100.76597861945629,
  },
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

export const fetchIOTDevices = async (): Promise<IOTDevice[]> => {
  const response = await fetch(
    'https://api-dev.kasetkorn.app/api/iot/setup/GetIotAll',
  );
  if (!response.ok) {
    throw new Error('Failed to fetch IoT devices');
  }
  const apiDevices = await response.json().then((data) => data.data as IOTDevice[]);
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
