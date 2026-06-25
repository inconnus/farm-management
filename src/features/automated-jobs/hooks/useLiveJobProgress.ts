import { computeJobProgress, type JobProgressInput } from '@features/vehicles/utils/pathMath';
import type { VehicleData } from '@features/vehicles/types';
import { useEffect, useState } from 'react';

export function vehicleToProgressInput(
  vehicle: Pick<
    VehicleData,
    | 'startedAt'
    | 'speedKmh'
    | 'pathLengthKm'
    | 'simulationSpeedFactor'
    | 'jobStatus'
    | 'pathProgress'
  >,
): JobProgressInput {
  return {
    startedAt: vehicle.startedAt,
    speedKmh: vehicle.speedKmh,
    pathLengthKm: vehicle.pathLengthKm,
    simulationSpeedFactor: vehicle.simulationSpeedFactor,
    status: vehicle.jobStatus,
    storedProgress: vehicle.pathProgress,
  };
}

/** ความคืบหน้าแบบ live — สูตรเดียวกับแผนที่ (จาก started_at) */
export function useLiveJobProgress(input: JobProgressInput): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (input.status !== 'working' || !input.startedAt) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [input.status, input.startedAt]);

  void tick;
  return computeJobProgress(input);
}
