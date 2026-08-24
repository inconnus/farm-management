import {
  getCompletedPathCoords,
  positionAlongPath,
} from '@features/vehicles/data/mockVehicles';
import type { VehicleData } from '@features/vehicles/types';
import { computeJobProgress } from '@features/vehicles/utils/pathMath';
import { getVehicleTypeMeta } from '@features/vehicles/utils/vehicleDisplay';
import { useEffect, useRef } from 'react';

/**
 * แสดงตำแหน่งรถจากค่า server (started_at, speed, path_length)
 * — ไม่สะสม progress ใน client เอง
 */
export function useVehiclePathAnimation(
  vehicles: VehicleData[],
  onFrame: (animated: VehicleData[]) => void,
) {
  const onFrameRef = useRef(onFrame);
  const vehiclesRef = useRef(vehicles);
  onFrameRef.current = onFrame;
  vehiclesRef.current = vehicles;

  const vehicleKey = vehicles.map((v) => v.id).join(',');

  useEffect(() => {
    onFrameRef.current(vehicles);
  }, [vehicleKey, vehicles]);

  useEffect(() => {
    if (vehicles.length === 0) return;

    let raf = 0;

    const tick = () => {
      const current = vehiclesRef.current;
      if (current.length === 0) return;

      const next = current.map((vehicle) => {
        if (vehicle.workPath.length < 2) return vehicle;

        const progress = computeJobProgress({
          startedAt: vehicle.startedAt,
          speedKmh: vehicle.speedKmh,
          pathLengthKm: vehicle.pathLengthKm,
          simulationSpeedFactor: vehicle.simulationSpeedFactor,
          status: vehicle.jobStatus,
          storedProgress: vehicle.pathProgress,
        });

        const pos = positionAlongPath(vehicle.workPath, progress);

        return {
          ...vehicle,
          lat: pos.lat,
          lng: pos.lng,
          heading: pos.heading,
          pathProgress: progress,
        };
      });

      onFrameRef.current(next);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [vehicleKey, vehicles.length]);
}

export function buildVehicleMapPaths(vehicles: VehicleData[]) {
  return vehicles.flatMap((vehicle) => {
    const meta = getVehicleTypeMeta(vehicle.type);
    return [
      {
        id: `${vehicle.id}-planned`,
        coords: vehicle.workPath,
        color: meta.pathPlanned,
        width: 1.5,
        dashed: true,
        opacity: 0.95,
      },
      {
        id: `${vehicle.id}-completed`,
        coords: getCompletedPathCoords(vehicle.workPath, vehicle.pathProgress),
        color: meta.pathCompleted,
        width: 2.5,
        opacity: 1,
      },
    ];
  });
}
