import type { SensorApiSettings } from '@shared/store/sensorApiStore';
import { queryOptions } from '@tanstack/react-query';
import { fetchGetLand, fetchIOTDevices, fetchIOTDeviceTelemetry } from './api';

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

export const landQueries = {
  detail: (appFarmId: string | undefined) =>
    queryOptions({
      queryKey: ['land', appFarmId] as const,
      queryFn: () => fetchGetLand(appFarmId!),
      enabled: !!appFarmId,
    }),
};
