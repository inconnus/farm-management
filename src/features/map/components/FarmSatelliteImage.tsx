import type { LandData } from '@shared/types/lands';
import type { ImgHTMLAttributes } from 'react';

const MAPBOX_TOKEN = import.meta.env.PUBLIC_MAPBOX_TOKEN;

type LandSlice = Pick<LandData, 'coords' | 'color'>;

/**
 * Builds a Mapbox Static Images URL centred on a lat/lng point.
 * Used as a fallback when a farm has no land polygons yet.
 */
export function buildFarmLocationUrl(
  lat: number,
  lng: number,
  width = 96,
  height = 96,
  zoom = 14,
): string {
  return [
    `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static`,
    `/${lng},${lat},${zoom}`,
    `/${width * 2}x${height * 2}@2x`,
    `?access_token=${MAPBOX_TOKEN}`,
    `&attribution=false&logo=false`,
  ].join('');
}

/**
 * Builds a Mapbox Static Images API URL from a list of land polygons.
 * Each land uses its own configured `color` for the fill and stroke.
 */
export function buildFarmSatelliteUrl(
  lands: LandSlice[],
  width = 96,
  height = 96,
  padding = 20,
): string | null {
  const features: object[] = [];

  for (const land of lands) {
    if (land.coords.length < 3) continue;

    const ring = [...land.coords] as [number, number][];
    const [first, last] = [ring[0], ring[ring.length - 1]];
    if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);

    const color = land.color || '#22c55e';

    features.push({
      type: 'Feature',
      properties: {
        stroke: color,
        'stroke-width': 2,
        'stroke-opacity': 0.9,
        fill: color,
        'fill-opacity': 0.25,
      },
      geometry: { type: 'Polygon', coordinates: [ring] },
    });
  }

  if (features.length === 0) return null;

  const geojson = { type: 'FeatureCollection', features };
  const encoded = encodeURIComponent(JSON.stringify(geojson));

  // @2x for retina; actual pixel size doubled
  return [
    `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static`,
    `/geojson(${encoded})`,
    `/auto/${width * 2}x${height * 2}@2x`,
    `?access_token=${MAPBOX_TOKEN}`,
    `&padding=${padding}`,
    `&attribution=false&logo=false`,
  ].join('');
}

// ─────────────────────────────────────────────────────────────────────────────

type FarmSatelliteImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'src'
> & {
  lands: LandSlice[];
  fallbackSrc?: string;
  /** Width in logical pixels (displayed size). Default 96. */
  width?: number;
  /** Height in logical pixels (displayed size). Default 96. */
  height?: number;
  /** Padding in pixels around polygons. Default 20. */
  padding?: number;
  /** Latitude for location-based fallback when no lands exist. */
  lat?: number | null;
  /** Longitude for location-based fallback when no lands exist. */
  lng?: number | null;
};

/**
 * Reusable `<img>` that renders a Mapbox satellite snapshot of all farm lands.
 * Each land is colored according to its `color` config.
 *
 * @example
 * <FarmSatelliteImage
 *   lands={farm.lands}
 *   width={56}
 *   height={56}
 *   className="w-14 h-14 rounded-xl object-cover"
 *   alt={farm.name}
 *   fallbackSrc={farm.image}
 * />
 */
export function FarmSatelliteImage({
  lands,
  fallbackSrc,
  width = 96,
  height = 96,
  padding = 20,
  lat,
  lng,
  alt = '',
  onError,
  ...imgProps
}: FarmSatelliteImageProps) {
  const locationUrl =
    lat != null && lng != null
      ? buildFarmLocationUrl(lat, lng, width, height)
      : null;

  const src =
    buildFarmSatelliteUrl(lands, width, height, padding) ??
    locationUrl ??
    fallbackSrc ??
    '';

  // Fallback chain: lands URL → location URL → fallbackSrc
  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.src !== locationUrl && locationUrl) {
      img.src = locationUrl;
    } else if (img.src !== fallbackSrc && fallbackSrc) {
      img.src = fallbackSrc;
    }
    onError?.(e);
  };

  return (
    <img
      src={src}
      alt={alt}
      onError={handleError}
      {...imgProps}
    />
  );
}
