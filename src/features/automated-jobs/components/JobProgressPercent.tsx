import type { VehicleData } from '@features/vehicles/types';
import {
  useLiveJobProgress,
  vehicleToProgressInput,
} from '@features/automated-jobs/hooks/useLiveJobProgress';

type JobProgressPercentProps = {
  vehicle: VehicleData;
};

export function JobProgressPercent({ vehicle }: JobProgressPercentProps) {
  const progress = useLiveJobProgress(vehicleToProgressInput(vehicle));
  return <>{Math.round(progress * 100)}%</>;
}
