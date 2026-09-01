import type { SensorApiSettings } from '@shared/store/sensorApiStore';
import { queryOptions } from '@tanstack/react-query';
import {
  fetchAllCameras,
  fetchCameraToken,
  fetchGetLand,
  fetchIOTDevices,
  fetchIOTDeviceTelemetry,
} from './api';
import { kasetkornCameraToCameraData, isGkKasetkornCamera } from './cameras';

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
  raw: () =>
    queryOptions({
      queryKey: ['kasetkorn-cameras-raw'] as const,
      queryFn: fetchAllCameras,
    }),
  all: () =>
    queryOptions({
      queryKey: ['kasetkorn-cameras'] as const,
      queryFn: async () => {
        // GetToken is only for live video — don't drop markers if it 401s.
        const items = (await fetchAllCameras()).filter(isGkKasetkornCamera);
        let accessToken: string | undefined;
        try {
          accessToken = await fetchCameraToken();
        } catch (error) {
          console.warn(
            '[cameras] GetToken failed; rendering markers without live stream',
            error,
          );
        }
        return items.map((cam) =>
          kasetkornCameraToCameraData(cam, accessToken),
        );
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
