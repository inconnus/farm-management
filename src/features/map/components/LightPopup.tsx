import { Column, Row } from '@app/layout';
import { useUpdateDeviceMutation } from '@features/devices/hooks/useUpdateDeviceMutation';
import { Card } from '@heroui/react';
import {
  LoaderCircleIcon,
  MoonIcon,
  SunDimIcon,
  SunIcon,
  ThermometerIcon,
  TimerIcon,
  ZapIcon,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import type { LightData } from './LightMarker';

type LightPopupProps = {
  light: LightData;
  onUpdate?: (updated: Partial<LightData>) => void;
};

const KELVIN_MIN = 2700;
const KELVIN_MAX = 6500;

function kelvinToColor(k: number): string {
  const t = (k - KELVIN_MIN) / (KELVIN_MAX - KELVIN_MIN);
  const r = Math.round(255 - t * 55);
  const g = Math.round(200 + t * 20);
  const b = Math.round(100 + t * 155);
  return `rgb(${r},${g},${b})`;
}

function kelvinLabel(k: number): string {
  if (k <= 3000) return 'อบอุ่น';
  if (k <= 4500) return 'ธรรมชาติ';
  return 'เย็น';
}

export const LightPopup = ({ light, onUpdate }: LightPopupProps) => {
  const [isOn, setIsOn] = useState(light.isOn);
  const [brightness, setBrightness] = useState(light.brightness);
  const [kelvin, setKelvin] = useState(light.colorTempK);

  const queryClient = useQueryClient();
  const { mutate, mutateAsync, isPending } = useUpdateDeviceMutation();

  // Sync local state when the prop changes (query refetch after Supabase update)
  useEffect(() => {
    setIsOn(light.isOn);
    setBrightness(light.brightness);
    setKelvin(light.colorTempK);
  }, [light.id, light.isOn, light.brightness, light.colorTempK]);

  const brightnessDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kelvinDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleToggle() {
    const prev = isOn;
    const next = !prev;
    setIsOn(next);
    onUpdate?.({ isOn: next });
    try {
      await mutateAsync({ id: light.id, patch: { is_on: next } });
    } catch {
      setIsOn(prev);
      onUpdate?.({ isOn: prev });
    }
  }

  function handleBrightnessChange(val: number) {
    setBrightness(val);
    if (brightnessDebounceRef.current) clearTimeout(brightnessDebounceRef.current);
    brightnessDebounceRef.current = setTimeout(() => {
      onUpdate?.({ brightness: val });
      mutate(
        { id: light.id, patch: { brightness: val } },
        {
          onError: () => {
            queryClient.invalidateQueries({ queryKey: ['devices'] });
          },
        },
      );
    }, 400);
  }

  function handleKelvinChange(val: number) {
    setKelvin(val);
    if (kelvinDebounceRef.current) clearTimeout(kelvinDebounceRef.current);
    kelvinDebounceRef.current = setTimeout(() => {
      onUpdate?.({ colorTempK: val });
      mutate(
        { id: light.id, patch: { color_temp_k: val } },
        {
          onError: () => {
            queryClient.invalidateQueries({ queryKey: ['devices'] });
          },
        },
      );
    }, 400);
  }

  const estimatedWatts = isOn ? Math.round((brightness / 100) * 18) : 0;
  const tempColor = kelvinToColor(kelvin);

  return (
    <Card
      className="flex w-[320px] flex-col overflow-hidden border-none rounded-3xl p-0 shadow-2xl gap-0"
      style={{
        background: isOn
          ? 'linear-gradient(160deg, #1a1108 0%, #2d1f05 50%, #1a1108 100%)'
          : 'linear-gradient(160deg, #0d1117 0%, #161b22 100%)',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4">
        <Row className="items-center justify-between">
          <Row className="items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: isOn ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.06)' }}
            >
              <SunIcon size={16} style={{ color: isOn ? '#fbbf24' : '#6b7280' }} />
            </div>
            <Column className="gap-0">
              <span className="text-sm font-semibold text-white leading-tight">{light.name}</span>
              <span className="text-[10px]" style={{ color: isOn ? '#fbbf24' : '#6b7280' }}>
                {isOn ? `${estimatedWatts} W · กำลังทำงาน` : 'ปิดอยู่'}
              </span>
            </Column>
          </Row>

          {isPending && <LoaderCircleIcon size={14} className="text-white/30 animate-spin" />}
        </Row>
      </div>

      {/* ── Big Toggle ─────────────────────────────────────────── */}
      <Column className="items-center py-6 gap-2">
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          className="relative flex items-center justify-center w-24 h-24 rounded-full transition-all duration-500 focus:outline-none active:scale-95 disabled:opacity-60"
          style={{
            background: isOn
              ? 'radial-gradient(circle at 35% 35%, #fef08a, #f59e0b 50%, #d97706)'
              : 'radial-gradient(circle at 35% 35%, #374151, #1f2937 50%, #111827)',
            boxShadow: isOn
              ? '0 0 40px 12px rgba(245,158,11,0.35), 0 0 80px 20px rgba(245,158,11,0.15), inset 0 1px 1px rgba(255,255,255,0.3)'
              : '0 4px 20px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.05)',
          }}
        >
          {isOn
            ? <SunIcon size={32} className="text-white drop-shadow-lg" />
            : <MoonIcon size={28} className="text-gray-500" />}
          {isOn && (
            <span
              className="absolute inset-0 rounded-full animate-ping"
              style={{ background: 'rgba(245,158,11,0.15)' }}
            />
          )}
        </button>
        <span className="text-xs font-medium" style={{ color: isOn ? '#fbbf24' : '#4b5563' }}>
          {isOn ? 'แตะเพื่อปิด' : 'แตะเพื่อเปิด'}
        </span>
      </Column>

      {/* ── Sliders (visible when ON) ────────────────────────────── */}
      <div
        className="transition-all duration-500 overflow-hidden"
        style={{ maxHeight: isOn ? '220px' : '0px', opacity: isOn ? 1 : 0 }}
      >
        <Column className="px-5 pb-4 gap-5">
          {/* Brightness */}
          <Column className="gap-2">
            <Row className="items-center justify-between">
              <Row className="items-center gap-1.5">
                <SunDimIcon size={13} className="text-amber-400/70" />
                <span className="text-xs text-white/60">ความสว่าง</span>
              </Row>
              <span className="text-xs font-semibold text-amber-300">{brightness}%</span>
            </Row>
            <input
              type="range"
              min={1}
              max={100}
              value={brightness}
              onChange={(e) => handleBrightnessChange(Number(e.target.value))}
              className="w-full cursor-pointer"
              style={{
                height: '8px',
                borderRadius: '999px',
                outline: 'none',
                border: 'none',
                appearance: 'none',
                background: `linear-gradient(90deg, #fbbf24 ${brightness}%, rgba(255,255,255,0.1) ${brightness}%)`,
                accentColor: '#fbbf24',
              }}
            />
          </Column>

          {/* Color Temperature */}
          <Column className="gap-2">
            <Row className="items-center justify-between">
              <Row className="items-center gap-1.5">
                <ThermometerIcon size={13} className="text-blue-300/70" />
                <span className="text-xs text-white/60">อุณหภูมิสี</span>
              </Row>
              <Row className="items-center gap-1">
                <span className="text-xs font-semibold" style={{ color: tempColor }}>
                  {kelvin.toLocaleString()} K
                </span>
                <span className="text-[10px] text-white/30">· {kelvinLabel(kelvin)}</span>
              </Row>
            </Row>
            <input
              type="range"
              min={KELVIN_MIN}
              max={KELVIN_MAX}
              step={100}
              value={kelvin}
              onChange={(e) => handleKelvinChange(Number(e.target.value))}
              className="w-full cursor-pointer"
              style={{
                height: '8px',
                borderRadius: '999px',
                outline: 'none',
                border: 'none',
                appearance: 'none',
                background: 'linear-gradient(90deg, #fde68a, #f9fafb, #bfdbfe)',
                accentColor: tempColor,
              }}
            />
            <Row className="items-center justify-between">
              <span className="text-[9px] text-amber-300/50">อบอุ่น</span>
              <span className="text-[9px] text-blue-300/50">เย็น</span>
            </Row>
          </Column>
        </Column>
      </div>

      {/* ── Footer stats ─────────────────────────────────────────── */}
      <div className="border-t mx-4 mb-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <Row className="pt-3 gap-2">
          <Row className="flex-1 items-center gap-1.5 bg-white/5 rounded-xl px-3 py-2">
            <ZapIcon size={12} className="text-amber-400/70" />
            <Column className="gap-0">
              <span className="text-[10px] text-white/40">พลังงาน</span>
              <span className="text-xs font-semibold text-white/80">{estimatedWatts} W</span>
            </Column>
          </Row>
          <Row className="flex-1 items-center gap-1.5 bg-white/5 rounded-xl px-3 py-2">
            <TimerIcon size={12} className="text-purple-400/70" />
            <Column className="gap-0">
              <span className="text-[10px] text-white/40">ตำแหน่ง</span>
              <span className="text-[10px] font-medium text-white/60 font-mono tabular-nums">
                {light.lat.toFixed(4)}, {light.lng.toFixed(4)}
              </span>
            </Column>
          </Row>
        </Row>
      </div>
    </Card>
  );
};
