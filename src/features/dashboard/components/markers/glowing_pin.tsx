type GlowingPinProps = {
  isOnline: boolean;
};

export const GlowingPin = ({ isOnline }: GlowingPinProps) => {
  const color = isOnline ? '#4caf50' : '#ff5252';

  return (
    <span className="relative inline-block size-3.5 shrink-0 cursor-pointer">
      <span
        aria-hidden
        className="absolute -inset-0.5 -z-10 animate-glowing-pin-pulse rounded-full"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative z-10 block size-3.5 rounded-full border-2 border-white"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 10px ${color}`,
        }}
      />
    </span>
  );
};
