import { Column, Row } from '@app/layout';
import { useWaterLevelMqtt } from '@features/map/hooks/useWaterLevelMqtt';
import { Card } from '@heroui/react';
import { DropletsIcon, GaugeIcon, RadioIcon, WavesIcon } from 'lucide-react';
import type { WaterLevelData } from './WaterLevelMarker';

type WaterLevelPopupProps = {
  device: WaterLevelData;
};

function formatLevel(value: number | null): string {
  if (value === null) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatUpdatedAt(ts: number | null): string {
  if (!ts) return 'ยังไม่ได้รับค่า';
  return new Date(ts).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  unit,
  color,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  unit: string;
  color: string;
}) => (
  <Column className="bg-gray-50 rounded-xl p-2.5 gap-0.5">
    <Row className="items-center gap-1.5">
      <Icon size={12} className={color} />
      <span className="text-[10px] text-gray-500">{label}</span>
    </Row>
    <Row className="items-baseline gap-1">
      <span className="text-base font-semibold text-gray-800">{value}</span>
      <span className="text-[10px] text-gray-400">{unit}</span>
    </Row>
  </Column>
);

export const WaterLevelPopup = ({ device }: WaterLevelPopupProps) => {
  const mqtt = useWaterLevelMqtt(device.mqtt);
  const levelCm = mqtt.value;
  const scaleMax = Math.max(device.maxDepthCm, levelCm ?? 0, 1);
  const percent =
    levelCm === null
      ? 0
      : Math.min(100, Math.max(0, (levelCm / scaleMax) * 100));

  const statusBadge =
    mqtt.status === 'connected'
      ? {
          label: levelCm === null ? 'CONNECTED' : 'LIVE',
          className: 'text-green-600 bg-green-100 border-green-200',
        }
      : mqtt.status === 'connecting'
        ? {
            label: 'CONNECTING',
            className: 'text-amber-700 bg-amber-50 border-amber-200',
          }
        : mqtt.status === 'error'
          ? {
              label: 'ERROR',
              className: 'text-red-600 bg-red-50 border-red-200',
            }
          : {
              label: 'OFFLINE',
              className: 'text-gray-500 bg-gray-100 border-gray-200',
            };

  return (
    <Card className="flex w-[340px] flex-col overflow-hidden border-none rounded-3xl bg-white/85 p-0 shadow-2xl backdrop-blur-xl gap-0">
      <div className="relative h-[100px] w-full shrink-0 overflow-hidden rounded-t-3xl bg-sky-50">
        <div className="absolute inset-0 flex items-center justify-center">
          <WavesIcon size={48} className="text-sky-300/60" />
        </div>
        <div
          className="absolute inset-x-0 bottom-0 bg-sky-400/25 transition-all duration-500"
          style={{ height: `${percent}%` }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-white/80 via-transparent to-transparent" />
        <div className="absolute top-3 left-4">
          <span
            className={`text-[11px] rounded-full px-2 py-0.5 border font-medium ${statusBadge.className}`}
          >
            {statusBadge.label}
          </span>
        </div>
        <div className="absolute bottom-3 left-4 right-4">
          <Row className="items-center gap-2">
            <DropletsIcon size={14} className="text-sky-600" />
            <h3 className="text-sm font-bold text-gray-800 drop-shadow-sm">
              {device.name}
            </h3>
          </Row>
          <p className="text-xs text-gray-500 mt-0.5">
            MQTT realtime · {device.mqtt?.topic ?? 'ไม่มี topic'}
          </p>
        </div>
      </div>

      <Column className="px-4 py-3 gap-3">
        <Column className="items-center gap-1.5">
          <Row className="items-baseline gap-1.5">
            <span className="text-3xl font-bold text-gray-800 tabular-nums">
              {formatLevel(levelCm)}
            </span>
            <span className="text-sm text-gray-400">{device.unit}</span>
          </Row>
          <span className="text-[11px] text-gray-400">
            ระดับน้ำปัจจุบัน (MQTT)
          </span>
          <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${percent}%`,
                background:
                  percent > 70
                    ? 'linear-gradient(90deg, #0ea5e9, #38bdf8)'
                    : percent > 40
                      ? 'linear-gradient(90deg, #0284c7, #0ea5e9)'
                      : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
              }}
            />
          </div>
          <span className="text-[10px] text-gray-400">
            อัปเดตล่าสุด {formatUpdatedAt(mqtt.updatedAt)}
          </span>
        </Column>

        <div className="grid grid-cols-2 gap-2">
          <StatCard
            icon={GaugeIcon}
            label="ระดับน้ำ"
            value={formatLevel(levelCm)}
            unit={device.unit}
            color="text-sky-500"
          />
          <StatCard
            icon={DropletsIcon}
            label="เทียบสูงสุด"
            value={levelCm === null ? '—' : percent.toFixed(0)}
            unit="%"
            color="text-blue-500"
          />
          <StatCard
            icon={RadioIcon}
            label="สถานะ"
            value={
              mqtt.status === 'connected'
                ? 'เชื่อมต่อ'
                : mqtt.status === 'connecting'
                  ? 'กำลังต่อ'
                  : mqtt.status === 'error'
                    ? 'ผิดพลาด'
                    : 'ปิด'
            }
            unit=""
            color="text-emerald-500"
          />
          <StatCard
            icon={WavesIcon}
            label="สูงสุดอ้างอิง"
            value={String(device.maxDepthCm)}
            unit={device.unit}
            color="text-cyan-500"
          />
        </div>

        {mqtt.error && (
          <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
            {mqtt.error}
          </p>
        )}

        <Row className="items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-100 gap-2">
          <span className="truncate">
            {device.mqtt?.url?.replace(/^wss?:\/\//, '') ?? '—'}
          </span>
        </Row>
      </Column>
    </Card>
  );
};
