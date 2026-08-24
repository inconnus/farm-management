const TRACTOR_LIVE_MOCK_SRC = '/videos/tractor-live-mock.mp4';

type VehicleLiveFeedProps = {
  label: string;
};

/** วิดีโอ mock แบบ loop — จำลองสัญญาณ realtime จากรถไถ */
export function VehicleLiveFeed({ label }: VehicleLiveFeedProps) {
  return (
    <div className="relative w-full shrink-0 overflow-hidden bg-gray-900 aspect-video">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={TRACTOR_LIVE_MOCK_SRC}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-label={`ภาพสดจาก ${label}`}
      />
      <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-3 left-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-red-300">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          LIVE
        </span>
      </div>
      <div className="absolute bottom-3 left-3 right-3">
        <p className="text-sm font-semibold text-white drop-shadow-md truncate">
          {label}
        </p>
        <p className="text-[10px] text-white/75">มุมมองจากรถไถ · สัญญาณจำลอง</p>
      </div>
    </div>
  );
}
