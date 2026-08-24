import type mapboxgl from 'mapbox-gl';

const PATH_LAYER_RE = /^path-(layer|outline|source)-/;

/** layer ที่ tileset raster ควรอยู่ใต้ (draw > path > tileset) */
export function getTilesetBeforeId(map: mapboxgl.Map): string | undefined {
  const layers = map.getStyle()?.layers;
  if (!layers) return undefined;

  const drawLayer = layers.find((l) => l.id.startsWith('gl-draw-'))?.id;
  if (drawLayer) return drawLayer;

  const pathLayer = layers.find((l) => PATH_LAYER_RE.test(l.id))?.id;
  if (pathLayer) return pathLayer;

  return undefined;
}

/** ย้ายเส้นทางรถไถไปด้านบนสุดของ canvas (เหนือ tileset) */
export function movePathLayersToTop(map: mapboxgl.Map) {
  const layers = map.getStyle()?.layers;
  if (!layers) return;

  const pathLayerIds = layers
    .map((l) => l.id)
    .filter(
      (id) => id.startsWith('path-outline-') || id.startsWith('path-layer-'),
    );

  for (const id of pathLayerIds) {
    if (map.getLayer(id)) map.moveLayer(id);
  }
}
