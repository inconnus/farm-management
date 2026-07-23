import type { SensorApiSettings } from '@shared/store/sensorApiStore';
import { queryOptions } from '@tanstack/react-query';
import {
  fetchAllCameras,
  fetchGetLand,
  fetchIOTDevices,
  fetchIOTDeviceTelemetry,
} from './api';
import { kasetkornCameraToCameraData } from './cameras';

export const iotDeviceQueries = {
  all: (sensorApiSettings: Pick<SensorApiSettings, 'useMockData'>) =>
    queryOptions({
      queryKey: ['iot-devices', sensorApiSettings.useMockData] as const,
      queryFn: () => fetchIOTDevices(sensorApiSettings),
    }),
  telemetry: (
    appIotId: string | undefined,
    sensorApiSettings: SensorApiSettings,
  ) =>
    queryOptions({
      queryKey: [
        'iot-telemetry',
        appIotId,
        sensorApiSettings.mode,
        sensorApiSettings.timeRange,
        sensorApiSettings.useMockData,
      ] as const,
      queryFn: () => fetchIOTDeviceTelemetry(appIotId!, sensorApiSettings),
      enabled: !!appIotId,
      select: (data) => ({ appIotId, telemetry: data?.data?.[0] }),
    }),
};

export const cameraQueries = {
  all: () =>
    queryOptions({
      queryKey: ['kasetkorn-cameras'] as const,
      queryFn: async () => {
        const items = await fetchAllCameras();
        return items.map(kasetkornCameraToCameraData);
      },
    }),
};

export const landQueries = {
  detail: (appFarmId: string | undefined) =>
    queryOptions({
      queryKey: ['land', appFarmId] as const,
      queryFn: () => fetchGetLand(appFarmId!),
      enabled: !!appFarmId,
    }),
};
