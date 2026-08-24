import { measurePathLengthKm } from '@features/vehicles/utils/pathMath';
import { useMemo } from 'react';

const PREVIEW_WIDTH = 320;
const PREVIEW_HEIGHT = 180;
const PADDING = 14;

type WorkPathPreviewProps = {
  landCoords: [number, number][];
  workPath: [number, number][];
  marginM: number;
};

function ringToSvgPoints(
  coords: [number, number][],
  project: (lng: number, lat: number) => [number, number],
): string {
  return coords.map(([lng, lat]) => project(lng, lat).join(',')).join(' ');
}

export function WorkPathPreview({
  landCoords,
  workPath,
  marginM,
}: WorkPathPreviewProps) {
  const { landPoints, pathD, pathLengthKm, hasPath } = useMemo(() => {
    if (landCoords.length < 3) {
      return { landPoints: '', pathD: '', pathLengthKm: 0, hasPath: false };
    }

    const allCoords = [...landCoords, ...workPath];
    const lngs = allCoords.map(([lng]) => lng);
    const lats = allCoords.map(([, lat]) => lat);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    const innerW = PREVIEW_WIDTH - PADDING * 2;
    const innerH = PREVIEW_HEIGHT - PADDING * 2;
    const lngSpan = Math.max(maxLng - minLng, 0.00001);
    const latSpan = Math.max(maxLat - minLat, 0.00001);
    const scale = Math.min(innerW / lngSpan, innerH / latSpan);

    const offsetX = PADDING + (innerW - lngSpan * scale) / 2;
    const offsetY = PADDING + (innerH - latSpan * scale) / 2;

    const project = (lng: number, lat: number): [number, number] => [
      offsetX + (lng - minLng) * scale,
      offsetY + (maxLat - lat) * scale,
    ];

    const landPoints = ringToSvgPoints(landCoords, project);

    let pathD = '';
    if (workPath.length >= 2) {
      pathD = workPath
        .map(([lng, lat], i) => {
          const [x, y] = project(lng, lat);
          return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(' ');
    }

    return {
      landPoints,
      pathD,
      pathLengthKm: workPath.length >= 2 ? measurePathLengthKm(workPath) : 0,
      hasPath: workPath.length >= 2,
    };
  }, [landCoords, workPath]);

  if (landCoords.length < 3) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 h-[180px] flex items-center justify-center text-xs text-gray-400">
        แปลงนี้ยังไม่มี polygon เพียงพอสำหรับ preview
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-[#f8faf8] overflow-hidden">
      <svg
        width="100%"
        viewBox={`0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}`}
        aria-label="ตัวอย่างเส้นทางงานอัตโนมัติ"
        className="block"
      >
        <polygon
          points={landPoints}
          fill="rgba(34, 197, 94, 0.12)"
          stroke="#16a34a"
          strokeWidth="1.5"
        />
        {hasPath ? (
          <>
            <path
              d={pathD}
              fill="none"
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
            />
            <path
              d={pathD}
              fill="none"
              stroke="#03662c"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="6 4"
            />
          </>
        ) : (
          <text
            x={PREVIEW_WIDTH / 2}
            y={PREVIEW_HEIGHT / 2}
            textAnchor="middle"
            className="fill-gray-400 text-[11px]"
          >
            ไม่สามารถสร้างเส้นทางด้วยค่าปัจจุบัน
          </text>
        )}
      </svg>
      <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
        <span>
          {hasPath ? `${workPath.length} จุด` : '—'}
          {marginM > 0 ? ` · margin ${marginM} ม.` : ''}
        </span>
        <span>
          {hasPath
            ? `~${pathLengthKm < 1 ? `${Math.round(pathLengthKm * 1000)} ม.` : `${pathLengthKm.toFixed(2)} กม.`}`
            : ''}
        </span>
      </div>
    </div>
  );
}
