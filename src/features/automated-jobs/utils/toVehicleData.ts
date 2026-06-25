import type { DbAutomatedJob, DbAutomatedJobStatus } from '@features/automated-jobs/api';
import { parseWorkPath } from '@features/automated-jobs/api';
import { positionAlongPath } from '@features/vehicles/data/mockVehicles';
import {
  deviceTypeToVehicleType,
  getVehicleTypeMeta,
} from '@features/vehicles/utils/vehicleDisplay';
import { DEFAULT_SIMULATION_SPEED_FACTOR, computeJobProgress } from '@features/vehicles/utils/pathMath';
import type { VehicleData, VehicleStatus } from '@features/vehicles/types';

function deviceConfigNumber(config: DbAutomatedJob['device']['config'], key: string, fallback: number) {
  if (config !== null && typeof config === 'object' && !Array.isArray(config)) {
    const value = (config as Record<string, unknown>)[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return fallback;
}

function statusToVehicle(status: DbAutomatedJobStatus): VehicleStatus {
  switch (status) {
    case 'working':
      return 'working';
    case 'paused':
      return 'idle';
    case 'queued':
      return 'idle';
    case 'completed':
      return 'idle';
    case 'cancelled':
      return 'offline';
    default:
      return 'idle';
  }
}

export function automatedJobToVehicleData(job: DbAutomatedJob, landName: string): VehicleData {
  const workPath = parseWorkPath(job.work_path);
  const vehicleType = deviceTypeToVehicleType(job.device.device_type);
  const typeMeta = getVehicleTypeMeta(vehicleType);
  const speedKmh = job.speed_kmh ?? deviceConfigNumber(job.device.config, 'speed_kmh', typeMeta.defaultSpeedKmh);

  const pathProgress = computeJobProgress({
    startedAt: job.started_at,
    speedKmh,
    pathLengthKm: job.path_length_km ?? 0.001,
    simulationSpeedFactor: job.simulation_speed_factor ?? DEFAULT_SIMULATION_SPEED_FACTOR,
    status: job.status,
    storedProgress: job.path_progress,
  });
  const position =
    workPath.length >= 2
      ? positionAlongPath(workPath, pathProgress)
      : { lat: job.device.lat, lng: job.device.lng, heading: 0 };

  return {
    id: job.id,
    farmId: job.farm_id,
    name: job.device.name,
    jobTitle: job.title,
    type: vehicleType,
    status: statusToVehicle(job.status),
    lat: position.lat,
    lng: position.lng,
    heading: position.heading,
    batteryPercent: deviceConfigNumber(job.device.config, 'battery_percent', 78),
    speedKmh,
    landName,
    workPath,
    pathProgress,
    startedAt: job.started_at,
    pathLengthKm: job.path_length_km ?? 0.001,
    simulationSpeedFactor: job.simulation_speed_factor ?? DEFAULT_SIMULATION_SPEED_FACTOR,
    jobStatus: job.status,
  };
}
