import { useEffect, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { drawInstanceAtom } from '@shared/store/mapStore';

type MapPolygonMountProps = {
  id: string;
  coords: number[][]; // [number, number][]
  properties?: Record<string, any>;
};

export function MapPolygonMount({
  id,
  coords,
  properties = {},
}: MapPolygonMountProps) {
  const draw = useAtomValue(drawInstanceAtom);

  const coordsStr = useMemo(() => JSON.stringify(coords), [coords]);
  const propsStr = useMemo(() => JSON.stringify(properties), [properties]);

  useEffect(() => {
    if (!draw) return;

    if (!draw.get(id)) {
      draw.add({
        id: id,
        type: 'Feature',
        properties: JSON.parse(propsStr),
        geometry: { type: 'Polygon', coordinates: [JSON.parse(coordsStr)] },
      });
    } else {
      // If it exists, we could just update the properties and geometry, but simplest is just ensuring it's added.
      // Or if we want to ensure it has latest coords:
      draw.add({
        id: id,
        type: 'Feature',
        properties: JSON.parse(propsStr),
        geometry: { type: 'Polygon', coordinates: [JSON.parse(coordsStr)] },
      });
    }

    return () => {
      // Small check to see if it still exists before deleting
      if (draw && draw.get(id)) {
        draw.delete(id);
      }
    };
  }, [draw, id, coordsStr, propsStr]);

  return null;
}
