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

export const fetchIOTDevices = async (): Promise<IOTDevice[]> => {
  const response = await fetch(
    'https://api-dev.kasetkorn.app/api/iot/setup/GetIotAll',
  );
  if (!response.ok) {
    throw new Error('Failed to fetch IoT devices');
  }
  return response.json().then((data) => data.data as IOTDevice[]);
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
