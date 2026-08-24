export type LngLatPair = [lng: number, lat: number];

export type LngLatLogContext = {
  source?: string;
  id?: string | number;
};

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return Number.NaN;
};

export const isValidLatitude = (lat: number) =>
  Number.isFinite(lat) && lat >= -90 && lat <= 90;

export const isValidLongitude = (lng: number) =>
  Number.isFinite(lng) && lng >= -180 && lng <= 180;

const formatId = (id: string | number | undefined) =>
  id == null || id === '' ? 'unknown' : String(id);

const describeIssue = (
  kind: 'lat' | 'lng',
  raw: unknown,
  numeric: number,
): string => {
  if (raw == null || raw === '') return `${kind}=${String(raw)} (missing)`;
  if (!Number.isFinite(numeric)) {
    return `${kind}=${String(raw)} (not a finite number)`;
  }
  if (kind === 'lat') return `${kind}=${numeric} (must be between -90 and 90)`;
  return `${kind}=${numeric} (must be between -180 and 180)`;
};

const invalidField = (
  lngOk: boolean,
  latOk: boolean,
): 'lat' | 'lng' | 'both' => {
  if (!latOk && !lngOk) return 'both';
  if (!latOk) return 'lat';
  return 'lng';
};

/**
 * Mapbox ต้องการ [lng, lat] — lat นอกช่วง -90..90 จะ throw
 * คืนค่าคู่ที่ใช้งานได้ หรือ null ถ้าข้าม marker ได้
 */
export function toValidLngLat(
  lng: unknown,
  lat: unknown,
  context: LngLatLogContext | string = 'map',
): LngLatPair | null {
  const { source, id } =
    typeof context === 'string'
      ? { source: context, id: undefined }
      : { source: context.source ?? 'map', id: context.id };
  const markerId = formatId(id);

  const lngN = toNumber(lng);
  const latN = toNumber(lat);
  const lngOk = isValidLongitude(lngN);
  const latOk = isValidLatitude(latN);

  if (lngOk && latOk) return [lngN, latN];

  const latLooksLikeLng = isValidLongitude(latN) && !isValidLatitude(latN);
  const lngLooksLikeLat = isValidLatitude(lngN);

  if (latLooksLikeLng && lngLooksLikeLat) {
    console.warn(
      `[${source}] LngLat looks swapped — id=${markerId}, invalid=lat: lat=${latN} is outside -90..90 (looks like longitude), lng=${lngN} looks like latitude. Using [lng=${latN}, lat=${lngN}]`,
      { id: markerId, invalid: 'lat', lng, lat },
    );
    return [latN, lngN];
  }

  const issues: string[] = [];
  if (!lngOk) issues.push(describeIssue('lng', lng, lngN));
  if (!latOk) issues.push(describeIssue('lat', lat, latN));
  const invalid = invalidField(lngOk, latOk);

  console.warn(
    `[${source}] Invalid LngLat, skipping marker — id=${markerId}, invalid=${invalid}: ${issues.join('; ')}`,
    {
      id: markerId,
      invalid,
      lng,
      lat,
      issues,
      check: {
        lngOk,
        latOk,
        latMustBe: '-90..90',
        lngMustBe: '-180..180',
      },
    },
  );
  return null;
}
