import { useIOTTelemetryQueries } from '@features/dashboard/hooks';
import { Card } from '@heroui/react';
import { MapPinIcon, SproutIcon, ThermometerIcon } from 'lucide-react';
import type { SensorData } from './SensorMarker';

export function SensorPopup({ sensor }: { sensor: SensorData }) {
  const telemetryQueries = useIOTTelemetryQueries(
    sensor.appIotId ? [sensor.appIotId] : [],
  );
  const telemetry = telemetryQueries[0]?.data?.telemetry;
  const isOnline = !!telemetry;

  return (
    <Card className="min-w-[240px] border border-gray-100 bg-white shadow-lg">
      <Card.Header className="pb-2">
        <Card.Title className="text-sm font-bold uppercase tracking-wide">
          {sensor.name}
        </Card.Title>
        <Card.Description className="text-xs text-gray-500">
          {sensor.appIotId}
        </Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-3 pt-0">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span
            className={`size-2 rounded-full shrink-0 ${isOnline ? 'bg-green-500' : 'bg-red-400'}`}
          />
          <span>{isOnline ? 'ออนไลน์' : 'ออฟไลน์'}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg text-[#f44336] font-medium leading-none">
              {telemetry?.sensor_ambient_temperature?.toFixed(1) ?? '-'}
            </div>
            <span className="text-[9px] text-gray-400 font-bold uppercase mt-1 block">
              TEMP °C
            </span>
          </div>
          <div>
            <div className="text-lg text-[#f59e0b] font-medium leading-none">
              {telemetry?.sensor_ambient_humid?.toFixed(1) ?? '-'}
            </div>
            <span className="text-[9px] text-gray-400 font-bold uppercase mt-1 block">
              HUMID %
            </span>
          </div>
          <div>
            <div className="text-lg text-[#0ea5e9] font-medium leading-none">
              {telemetry?.sensor_soil_humid_humid?.toFixed(1) ?? '-'}
            </div>
            <span className="text-[9px] text-gray-400 font-bold uppercase mt-1 block">
              SOIL M.%
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 bg-[#03a9f4]/10 text-[#0288d1] rounded-md px-1.5 py-0.5 text-[10px] font-medium">
            <ThermometerIcon size={10} />
            อุณหภูมิ {telemetry?.sensor_ambient_temperature?.toFixed(1) ?? '-'}°C
          </span>
          <span className="inline-flex items-center gap-1 bg-[#4caf50]/10 text-[#2e7d32] rounded-md px-1.5 py-0.5 text-[10px] font-medium">
            <SproutIcon size={10} />
            ความชื้นดิน {telemetry?.sensor_soil_humid_humid?.toFixed(1) ?? '-'}%
          </span>
        </div>

        {(sensor.tambon || sensor.amphur || sensor.province) && (
          <div className="flex items-center gap-1 text-[11px] text-gray-500">
            <MapPinIcon size={11} className="text-red-400 shrink-0" />
            <span className="truncate">
              {[sensor.tambon, sensor.amphur, sensor.province]
                .filter(Boolean)
                .join(', ')}
            </span>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
