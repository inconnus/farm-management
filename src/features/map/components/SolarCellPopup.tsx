import { Column, Row } from '@app/layout';
import { Card } from '@heroui/react';
import {
  BatteryChargingIcon,
  SunIcon,
  ThermometerSunIcon,
  TrendingUpIcon,
  ZapIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { SolarCellData } from './SolarCellMarker';

type SolarCellPopupProps = {
  device: SolarCellData;
};

function useDummyMetrics(capacityKw: number) {
  const [metrics, setMetrics] = useState(() => generateMetrics(capacityKw));

  useEffect(() => {
    const interval = setInterval(
      () => setMetrics(generateMetrics(capacityKw)),
      3000,
    );
    return () => clearInterval(interval);
  }, [capacityKw]);

  return metrics;
}

function generateMetrics(capacityKw: number) {
  const currentPower = capacityKw * (0.55 + Math.random() * 0.4);
  const efficiency = 75 + Math.random() * 20;
  const temperature = 35 + Math.random() * 15;
  const todayKwh = capacityKw * (3.5 + Math.random() * 2);
  const monthKwh = todayKwh * (25 + Math.random() * 5);
  const voltage = 220 + Math.random() * 20 - 10;
  const current = (currentPower / voltage) * 1000;

  return {
    currentPower,
    efficiency,
    temperature,
    todayKwh,
    monthKwh,
    voltage,
    current,
  };
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

export const SolarCellPopup = ({ device }: SolarCellPopupProps) => {
  const m = useDummyMetrics(device.capacityKw);
  const pct = Math.min(100, (m.currentPower / device.capacityKw) * 100);

  return (
    <Card className="flex w-[380px] flex-col overflow-hidden border-none rounded-3xl bg-white/85 p-0 shadow-2xl backdrop-blur-xl gap-0">
      <div className="relative h-[100px] w-full shrink-0 overflow-hidden rounded-t-3xl bg-amber-50">
        <div className="absolute inset-0 flex items-center justify-center">
          <SunIcon size={48} className="text-amber-300/60" />
        </div>
        <div className="absolute inset-0 bg-linear-to-t from-white/80 via-transparent to-transparent" />
        <div className="absolute top-3 left-4">
          <span className="text-[11px] text-green-600 bg-green-100 rounded-full px-2 py-0.5 border border-green-200 font-medium">
            ONLINE
          </span>
        </div>
        <div className="absolute bottom-3 left-4 right-4">
          <Row className="items-center gap-2">
            <SunIcon size={14} className="text-amber-600" />
            <h3 className="text-sm font-bold text-gray-800 drop-shadow-sm">
              {device.name}
            </h3>
          </Row>
          <p className="text-xs text-gray-500 mt-0.5">
            {device.panelCount} แผง | {device.capacityKw} kW
          </p>
        </div>
      </div>

      <Column className="px-4 py-3 gap-3">
        <Column className="items-center gap-1.5">
          <Row className="items-baseline gap-1.5">
            <span className="text-3xl font-bold text-gray-800">
              {m.currentPower.toFixed(2)}
            </span>
            <span className="text-sm text-gray-400">kW</span>
          </Row>
          <span className="text-[11px] text-gray-400">
            กำลังผลิตปัจจุบัน / {device.capacityKw} kW
          </span>
          <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${pct}%`,
                background:
                  pct > 70
                    ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                    : pct > 40
                      ? 'linear-gradient(90deg, #eab308, #facc15)'
                      : 'linear-gradient(90deg, #ef4444, #f87171)',
              }}
            />
          </div>
          <span className="text-[10px] text-gray-400">
            ประสิทธิภาพ {m.efficiency.toFixed(1)}%
          </span>
        </Column>

        <div className="grid grid-cols-2 gap-2">
          <StatCard
            icon={ZapIcon}
            label="ผลิตวันนี้"
            value={m.todayKwh.toFixed(1)}
            unit="kWh"
            color="text-yellow-500"
          />
          <StatCard
            icon={TrendingUpIcon}
            label="ผลิตเดือนนี้"
            value={m.monthKwh.toFixed(0)}
            unit="kWh"
            color="text-green-500"
          />
          <StatCard
            icon={BatteryChargingIcon}
            label="แรงดัน / กระแส"
            value={`${m.voltage.toFixed(0)}V`}
            unit={`${m.current.toFixed(1)}A`}
            color="text-blue-500"
          />
          <StatCard
            icon={ThermometerSunIcon}
            label="อุณหภูมิแผง"
            value={m.temperature.toFixed(1)}
            unit="°C"
            color="text-orange-500"
          />
        </div>

        <Row className="items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-100">
          <span>
            ตำแหน่ง: {device.lat.toFixed(6)}, {device.lng.toFixed(6)}
          </span>
        </Row>
      </Column>
    </Card>
  );
};
