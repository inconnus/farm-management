import * as turf from '@turf/turf';

export type WorkPathOptions = {
  /** ทิศทางเดินตามเส้น (องศาจากทิศเหนือ ตามเข็ม) */
  angleDeg: number;
  /** ระยะห่างระหว่างรอบ (เมตร) */
  spacingM: number;
  /** ระยะห่างจากขอบแปลง (เมตร) */
  marginM: number;
};

export const DEFAULT_WORK_PATH_OPTIONS: WorkPathOptions = {
  angleDeg: 0,
  spacingM: 6,
  marginM: 2,
};

function closeRing(coords: [number, number][]): [number, number][] {
  if (coords.length === 0) return coords;
  const ring = [...coords];
  const [firstLng, firstLat] = ring[0];
  const [lastLng, lastLat] = ring[ring.length - 1];
  if (firstLng !== lastLng || firstLat !== lastLat) {
    ring.push(ring[0]);
  }
  return ring;
}

function dedupeAdjacent(path: [number, number][]): [number, number][] {
  if (path.length === 0) return path;
  const result: [number, number][] = [path[0]];
  for (let i = 1; i < path.length; i++) {
    const prev = result[result.length - 1];
    const curr = path[i];
    if (prev[0] !== curr[0] || prev[1] !== curr[1]) {
      result.push(curr);
    }
  }
  return result;
}

function latSpacingDegrees(centerLng: number, centerLat: number, spacingMeters: number): number {
  const north = turf.destination(
    turf.point([centerLng, centerLat]),
    spacingMeters / 1000,
    0,
    { units: 'kilometers' },
  );
  return north.geometry.coordinates[1] - centerLat;
}

function suggestedSpacingMeters(polygon: turf.helpers.Feature<turf.helpers.Polygon>): number {
  const bbox = turf.bbox(polygon);
  const centerLng = (bbox[0] + bbox[2]) / 2;
  const heightM = turf.distance(
    turf.point([centerLng, bbox[1]]),
    turf.point([centerLng, bbox[3]]),
    { units: 'meters' },
  );
  return Math.round(Math.max(4, Math.min(heightM / 32, 8)) * 10) / 10;
}

export function computeDefaultWorkPathOptions(
  landCoords: [number, number][],
): WorkPathOptions {
  if (landCoords.length < 3) return { ...DEFAULT_WORK_PATH_OPTIONS };
  const polygon = turf.polygon([closeRing(landCoords)]);
  return {
    angleDeg: 0,
    spacingM: suggestedSpacingMeters(polygon),
    marginM: 2,
  };
}

function applyMargin(
  polygon: turf.helpers.Feature<turf.helpers.Polygon>,
  marginM: number,
): turf.helpers.Feature<turf.helpers.Polygon> {
  if (marginM <= 0) return polygon;
  try {
    const shrunk = turf.buffer(polygon, -marginM, { units: 'meters', steps: 8 });
    if (!shrunk?.geometry || shrunk.geometry.type !== 'Polygon') return polygon;
    const area = turf.area(shrunk);
    if (!Number.isFinite(area) || area < 1) return polygon;
    return shrunk as turf.helpers.Feature<turf.helpers.Polygon>;
  } catch {
    return polygon;
  }
}

function generateHorizontalBoustrophedon(
  polygon: turf.helpers.Feature<turf.helpers.Polygon>,
  spacingM: number,
): [number, number][] {
  const bbox = turf.bbox(polygon);
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;

  const latStep = latSpacingDegrees(centerLng, centerLat, Math.max(spacingM, 1));
  const lngPad = Math.max((maxLng - minLng) * 0.05, 0.0005);

  const path: [number, number][] = [];
  let rowIndex = 0;

  for (let lat = minLat; lat <= maxLat + latStep * 0.25; lat += latStep) {
    const scanLine = turf.lineString([
      [minLng - lngPad, lat],
      [maxLng + lngPad, lat],
    ]);

    const boundary = turf.polygonToLine(polygon);
    const hits = turf.lineIntersect(scanLine, boundary);
    if (hits.features.length < 2) continue;

    const sorted = hits.features
      .map((f) => f.geometry.coordinates as [number, number])
      .sort((a, b) => a[0] - b[0]);

    const rowSegments: [[number, number], [number, number]][] = [];
    for (let i = 0; i + 1 < sorted.length; i += 2) {
      const start = sorted[i];
      const end = sorted[i + 1];
      const mid: [number, number] = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
      if (turf.booleanPointInPolygon(turf.point(mid), polygon)) {
        rowSegments.push([start, end]);
      }
    }

    if (rowSegments.length === 0) continue;

    const leftToRight = rowIndex % 2 === 0;
    const orderedSegments = leftToRight ? rowSegments : [...rowSegments].reverse();

    for (const [start, end] of orderedSegments) {
      path.push(leftToRight ? start : end, leftToRight ? end : start);
    }

    rowIndex++;
  }

  return dedupeAdjacent(path);
}

function rotatePath(
  path: [number, number][],
  angleDeg: number,
  pivot: turf.helpers.Feature<turf.helpers.Point>,
): [number, number][] {
  if (path.length === 0 || angleDeg === 0) return path;
  const rotated = turf.transformRotate(turf.lineString(path), angleDeg, { pivot });
  return rotated.geometry.coordinates as [number, number][];
}

/**
 * สร้างเส้นทางสลับฟันปลา (boustrophedon) พร้อมกำหนดมุม ระยะห่าง และ margin
 */
export function generateWorkPath(
  landCoords: [number, number][],
  options: Partial<WorkPathOptions> = {},
): [number, number][] {
  if (landCoords.length < 3) return [];

  const { angleDeg, spacingM, marginM } = { ...DEFAULT_WORK_PATH_OPTIONS, ...options };
  const polygon = turf.polygon([closeRing(landCoords)]);
  const workingPolygon = applyMargin(polygon, marginM);
  const pivot = turf.centroid(workingPolygon);

  const rotatedPolygon = turf.transformRotate(workingPolygon, -angleDeg, { pivot });
  const rotatedPath = generateHorizontalBoustrophedon(
    rotatedPolygon as turf.helpers.Feature<turf.helpers.Polygon>,
    spacingM,
  );

  return rotatePath(rotatedPath, angleDeg, pivot);
}
