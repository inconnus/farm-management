import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { ColorSwatchPicker, Modal, parseColor } from '@heroui/react';
import type { Color } from '@heroui/react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { RotateCcw, Sprout } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { mapInstanceAtom } from '@store/mapStore';

const ACCESS_TOKEN = import.meta.env.PUBLIC_MAPBOX_TOKEN;

const LAND_COLORS = [
  '#22c55e',
  '#f59e0b',
  '#3b82f6',
  '#ef4444',
  '#a855f7',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#06b6d4',
  '#84cc16',
];

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateLandFormData = {
  name: string;
  cropType: string;
  coords: [number, number][];
  color: string;
};

type Props = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  farmCenter?: { lat: number; lng: number } | null;
  onSubmit?: (data: CreateLandFormData) => void;
  isSubmitting?: boolean;
  error?: string | null;
};

// ─── Draw styles — color driven by user_color feature property ────────────────

const FALLBACK_COLOR = LAND_COLORS[0];

const modalDrawStyles = [
  {
    id: 'gl-draw-polygon-fill',
    type: 'fill' as const,
    filter: ['all', ['==', '$type', 'Polygon']],
    paint: {
      'fill-color': ['coalesce', ['get', 'user_color'], FALLBACK_COLOR],
      'fill-opacity': 0.2,
    },
  },
  {
    id: 'gl-draw-polygon-stroke',
    type: 'line' as const,
    filter: ['all', ['==', '$type', 'Polygon']],
    layout: { 'line-cap': 'round' as const, 'line-join': 'round' as const },
    paint: {
      'line-color': ['coalesce', ['get', 'user_color'], FALLBACK_COLOR],
      'line-width': 2.5,
      'line-opacity': 1,
    },
  },
  {
    id: 'gl-draw-vertex',
    type: 'circle' as const,
    filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex']],
    paint: {
      'circle-radius': 5,
      'circle-color': '#fff',
      'circle-stroke-color': ['coalesce', ['get', 'user_color'], FALLBACK_COLOR],
      'circle-stroke-width': 2,
    },
  },
  {
    id: 'gl-draw-midpoint',
    type: 'circle' as const,
    filter: ['all', ['==', 'meta', 'midpoint']],
    paint: { 'circle-radius': 3, 'circle-color': ['coalesce', ['get', 'user_color'], FALLBACK_COLOR] },
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const CreateLandModal = ({
  isOpen,
  onOpenChange,
  farmCenter,
  onSubmit,
  isSubmitting = false,
  error = null,
}: Props) => {
  const mainMap = useAtomValue(mapInstanceAtom);

  const [landName, setLandName] = useState('');
  const [cropType, setCropType] = useState('');
  const [drawnCoords, setDrawnCoords] = useState<[number, number][] | null>(null);
  const [isDrawing, setIsDrawing] = useState(true);
  const [color, setColor] = useState<Color>(() => parseColor(LAND_COLORS[0]));

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const colorRef = useRef<Color>(color);
  const drawnFeatureIdRef = useRef<string | null>(null);

  // Keep colorRef in sync so event handlers always see the latest color
  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  // Reset form state whenever the modal closes (from outside or handleClose)
  useEffect(() => {
    if (!isOpen) {
      setLandName('');
      setCropType('');
      setDrawnCoords(null);
      drawnFeatureIdRef.current = null;
      setColor(parseColor(LAND_COLORS[0]));
      setIsDrawing(true);
    }
  }, [isOpen]);

  // ── Map init ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      mapboxgl.accessToken = ACCESS_TOKEN;

      const mainCenter = mainMap?.getCenter();
      const mainZoom = mainMap?.getZoom();

      const center: [number, number] = mainCenter
        ? [mainCenter.lng, mainCenter.lat]
        : farmCenter
          ? [farmCenter.lng, farmCenter.lat]
          : [100.9925, 15.87];

      const zoom = mainZoom ?? (farmCenter ? 14 : 6);

      const m = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/standard-satellite',
        center,
        zoom,
        projection: 'mercator',
      });

      m.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
      m.on('load', () => {
        m.setFog(null);
      });

      const draw = new MapboxDraw({
        displayControlsDefault: false,
        userProperties: true,
        controls: {},
        styles: modalDrawStyles,
      });

      m.addControl(draw);
      drawRef.current = draw;
      mapRef.current = m;

      // Auto-start drawing once the style is loaded
      m.once('style.load', () => {
        draw.changeMode('draw_polygon');
      });

      // draw.create fires after the polygon is completed (double-click).
      // MapboxDraw already switches to simple_select internally — do NOT call
      // changeMode again here or it causes a "Maximum call stack size exceeded".
      m.on('draw.create', (e: { features: GeoJSON.Feature[] }) => {
        const feature = e.features[0];
        if (!feature) return;
        const featureId = String(feature.id);
        drawnFeatureIdRef.current = featureId;

        // Stamp the current color onto the feature.
        // setFeatureProperty('color', …) → MapboxDraw prefixes to 'user_color'
        // which matches the ['get', 'user_color'] expression in the draw styles.
        const hex = colorRef.current.toString('hex');
        draw.setFeatureProperty(featureId, 'color', hex);
        const refreshed = draw.get(featureId);
        if (refreshed) draw.add(refreshed);

        const coords = (feature.geometry as GeoJSON.Polygon).coordinates[0] as [number, number][];
        setDrawnCoords(coords);
        setIsDrawing(false);
      });

      m.on('draw.delete', () => {
        drawnFeatureIdRef.current = null;
        setDrawnCoords(null);
        draw.changeMode('draw_polygon');
        setIsDrawing(true);
      });
    }, 150);

    return () => {
      clearTimeout(timer);
      const draw = drawRef.current;
      const map = mapRef.current;
      if (map && draw && map.hasControl(draw)) {
        map.removeControl(draw);
      }
      map?.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync selected color → map layers + completed polygon ─────────────────
  //
  // MapboxDraw splits every custom layer into two copies:
  //   <id>.cold  →  inactive/completed features
  //   <id>.hot   →  the feature currently being drawn/selected
  // We must target both suffixes to update the active drawing line too.

  useEffect(() => {
    const map = mapRef.current;
    const draw = drawRef.current;
    if (!map) return;

    const hex = color.toString('hex');

    const setPaint = (
      base: string,
      prop: Parameters<typeof map.setPaintProperty>[1],
      value: string,
    ) => {
      for (const suffix of ['.cold', '.hot']) {
        const id = `${base}${suffix}`;
        if (map.getLayer(id)) map.setPaintProperty(id, prop, value);
      }
    };

    setPaint('gl-draw-polygon-fill',   'fill-color',          hex);
    setPaint('gl-draw-polygon-stroke', 'line-color',          hex);
    setPaint('gl-draw-vertex',         'circle-stroke-color', hex);
    setPaint('gl-draw-midpoint',       'circle-color',        hex);

    // Keep the completed feature's stored property in sync too
    const featureId = drawnFeatureIdRef.current;
    if (draw && featureId) {
      draw.setFeatureProperty(featureId, 'color', hex);
      const feature = draw.get(featureId);
      if (feature) draw.add(feature);
    }
  }, [color]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const redraw = () => {
    const draw = drawRef.current;
    if (!draw) return;
    draw.deleteAll();
    drawnFeatureIdRef.current = null;
    setDrawnCoords(null);
    draw.changeMode('draw_polygon');
    setIsDrawing(true);
  };

  const handleClose = () => onOpenChange(false);

  const handleSubmit = () => {
    if (!landName.trim() || !drawnCoords) return;
    onSubmit?.({
      name: landName.trim(),
      cropType: cropType.trim(),
      coords: drawnCoords,
      color: color.toString('hex'),
    });
  };

  const isValid = landName.trim().length > 0 && drawnCoords !== null && !isSubmitting;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={handleClose}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-2xl bg-white text-gray-800 border border-gray-200 shadow-2xl">
            <Modal.CloseTrigger className="hover:bg-gray-100" />
            <Modal.Header className="border-b border-gray-100">
              <Modal.Heading className="font-bold uppercase tracking-wider text-gray-800">
                สร้างแปลงที่ดินใหม่
              </Modal.Heading>
            </Modal.Header>

            <Modal.Body className="pb-6 flex flex-col gap-5">
              {/* Error banner */}
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Land Name */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="land-name"
                  className="text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  ชื่อแปลงที่ดิน <span className="text-red-500">*</span>
                </label>
                <input
                  id="land-name"
                  type="text"
                  placeholder="เช่น แปลง A, นาข้าวหมู่ 3"
                  value={landName}
                  onChange={(e) => setLandName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-[#03662c] focus:bg-white transition-all"
                />
              </div>

              {/* Crop Type */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="crop-type"
                  className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5"
                >
                  <Sprout size={13} />
                  พืชที่ปลูก
                </label>
                <input
                  id="crop-type"
                  type="text"
                  placeholder="เช่น ข้าว, ข้าวโพด, อ้อย"
                  value={cropType}
                  onChange={(e) => setCropType(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-[#03662c] focus:bg-white transition-all"
                />
              </div>

              {/* Color Picker */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  สีแปลง
                </label>
                <ColorSwatchPicker
                  value={color}
                  onChange={setColor}
                  variant="square"
                  size="lg"
                  className="gap-2"
                >
                  {LAND_COLORS.map((c) => (
                    <ColorSwatchPicker.Item key={c} color={c}>
                      <ColorSwatchPicker.Swatch className="rounded-lg" />
                      <ColorSwatchPicker.Indicator />
                    </ColorSwatchPicker.Item>
                  ))}
                </ColorSwatchPicker>
              </div>

              {/* Map + Draw */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    ขอบเขตแปลง <span className="text-red-500">*</span>
                  </label>
                  {drawnCoords && (
                    <button
                      type="button"
                      onClick={redraw}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      <RotateCcw size={12} />
                      วาดใหม่
                    </button>
                  )}
                </div>

                <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm h-[320px]">
                  <div ref={mapContainerRef} className="w-full h-full" />

                  {/* Instruction overlay */}
                  {isDrawing && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/65 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm pointer-events-none whitespace-nowrap">
                      คลิกเพื่อวางจุด — ดับเบิลคลิกเพื่อจบการวาด
                    </div>
                  )}

                  {drawnCoords && (
                    <div
                      className="absolute bottom-3 left-3 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1.5"
                      style={{ background: `${color.toString('hex')}dd` }}
                    >
                      <span className="w-2 h-2 rounded-full bg-white/80 shrink-0" />
                      วาดแปลงเรียบร้อย ({drawnCoords.length - 1} จุด)
                    </div>
                  )}
                </div>
              </div>
            </Modal.Body>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!isValid}
                onClick={handleSubmit}
                className="px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider text-white bg-[#03662c] hover:bg-[#03662c]/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-[#03662c]/30 flex items-center gap-2"
              >
                {isSubmitting && (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {isSubmitting ? 'กำลังสร้าง...' : 'สร้างแปลง'}
              </button>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
