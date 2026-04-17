import type { Farm } from "@features/farms";
import * as turf from "@turf/turf";

export const landToLatLng = (lat: number[], lon: number[]) => {
  const latLng = Array.from({ length: lat.length }, (_, i) => [lat[i], lon[i]]);
  return latLng;
};

export const getCentroid = (farm: Farm) => {
  const polygons = farm.lands
    .filter((l) => l.coords.length >= 3)
    .map((l) => {
      const ring = [...l.coords];
      const [first, last] = [ring[0], ring[ring.length - 1]];
      if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);
      return turf.polygon([ring]);
    });
  if (polygons.length > 0) {
    const [lng, lat] = turf.centroid(turf.featureCollection(polygons)).geometry.coordinates;
    return { lat, lng };
  }

  if (farm.lat != null && farm.lng != null) {
    return { lat: farm.lat, lng: farm.lng };
  }

  return { lat: 0, lng: 0 };
};
