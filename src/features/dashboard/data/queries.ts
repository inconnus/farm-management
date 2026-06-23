import type { SensorApiSettings } from '@shared/store/sensorApiStore';
import { queryOptions } from '@tanstack/react-query';
import { fetchGetLand, fetchIOTDevices, fetchIOTDeviceTelemetry } from './api';

export const iotDeviceQueries = {
  all: () =>
    queryOptions({
      queryKey: ['iot-devices'] as const,
      queryFn: fetchIOTDevices,
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
