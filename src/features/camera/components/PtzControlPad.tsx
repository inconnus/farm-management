import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
} from 'lucide-react';
import { useState } from 'react';
import type { PtzDirection } from '../data/ptz';

type PtzControlPadProps = {
  enabled?: boolean;
  onDirectionChanged: (direction: PtzDirection, pressed: boolean) => void;
  variant?: 'light' | 'dark';
};

const DIRECTIONS: {
  dir: PtzDirection;
  icon: typeof ArrowUp;
  className: string;
}[] = [
  { dir: 'up', icon: ArrowUp, className: 'col-start-2 row-start-1' },
  { dir: 'left', icon: ArrowLeft, className: 'col-start-1 row-start-2' },
  { dir: 'right', icon: ArrowRight, className: 'col-start-3 row-start-2' },
  { dir: 'down', icon: ArrowDown, className: 'col-start-2 row-start-3' },
];

export function PtzControlPad({
  enabled = true,
  onDirectionChanged,
  variant = 'light',
}: PtzControlPadProps) {
  const [pressed, setPressed] = useState<PtzDirection | null>(null);
  const isDark = variant === 'dark';

  const handlePointerDown = (dir: PtzDirection) => {
    if (!enabled) return;
    if (pressed !== dir) {
      if (pressed) onDirectionChanged(pressed, false);
      setPressed(dir);
      onDirectionChanged(dir, true);
    }
  };

  const handlePointerUp = () => {
    if (pressed) {
      onDirectionChanged(pressed, false);
      setPressed(null);
    }
  };

  return (
    <div
      className={`grid grid-cols-3 grid-rows-3 gap-1 w-40 h-40 mx-auto select-none touch-none ${
        enabled ? '' : 'opacity-50 pointer-events-none'
      }`}
      onPointerLeave={handlePointerUp}
      onPointerUp={handlePointerUp}
    >
      {DIRECTIONS.map(({ dir, icon: Icon, className }) => (
        <button
          key={dir}
          type="button"
          aria-label={dir}
          className={`${className} flex items-center justify-center rounded-xl border-2 transition-colors ${
            pressed === dir
              ? isDark
                ? 'bg-green-600/30 border-green-500 text-green-300'
                : 'bg-[#03662c]/15 border-[#03662c]/40 text-[#03662c]'
              : isDark
                ? 'bg-[#2a2a2a] border-gray-600 text-gray-300 hover:bg-[#333] hover:border-gray-500'
                : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:border-gray-300 active:bg-[#03662c]/10'
          }`}
          onPointerDown={(e) => {
            e.preventDefault();
            handlePointerDown(dir);
          }}
        >
          <Icon size={28} strokeWidth={2.5} />
        </button>
      ))}
      <div
        className={`col-start-2 row-start-2 flex items-center justify-center rounded-full border-2 text-[10px] font-medium ${
          isDark
            ? 'border-gray-600 bg-[#1a1a1a] text-gray-500'
            : 'border-gray-200 bg-white text-gray-400'
        }`}
      >
        PTZ
      </div>
    </div>
  );
}
