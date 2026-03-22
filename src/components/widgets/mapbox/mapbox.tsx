import mapboxgl from 'mapbox-gl';
import { useEffect, useRef, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useSetAtom, useAtomValue } from 'jotai';
import { mapInstanceAtom, isImageEditModeAtom } from '../../../store/mapStore';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { customDrawStyles } from './config';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
const ACCESS_TOKEN = import.meta.env.PUBLIC_MAPBOX_TOKEN;
const initialCoords: [number, number][] = [
  [100.972114, 13.718654], // Top Left
  [100.979496, 13.718299], // Top Right
  [100.978638, 13.711649], // Bottom Right
  [100.971793, 13.711722], // Bottom Left
];
// drawStyles.ts หรือวางในไฟล์ Mapbox.tsx

const processImageWithSoftEdges = (imageUrl: string, featherPixels: number = 50): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { width, height } = img;
      canvas.width = width;
      canvas.height = height;

      // 1. วาดรูปต้นฉบับลงไปก่อน
      ctx.drawImage(img, 0, 0);

      // 2. ใช้ Destination-In เพื่อลบขอบ (Masking)
      // เราจะใช้การไล่สีขาวดำเพื่อทำ Alpha Mask
      ctx.globalCompositeOperation = 'destination-in';

      // สร้าง Gradient สำหรับแกน X (ซ้ายไปขวา)
      const gradX = ctx.createLinearGradient(0, 0, width, 0);
      gradX.addColorStop(0, 'rgba(0,0,0,0)');
      gradX.addColorStop(featherPixels / width, 'rgba(0,0,0,1)');
      gradX.addColorStop(1 - featherPixels / width, 'rgba(0,0,0,1)');
      gradX.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = gradX;
      ctx.fillRect(0, 0, width, height);

      // สร้าง Gradient สำหรับแกน Y (บนลงล่าง)
      const gradY = ctx.createLinearGradient(0, 0, 0, height);
      gradY.addColorStop(0, 'rgba(0,0,0,0)');
      gradY.addColorStop(featherPixels / height, 'rgba(0,0,0,1)');
      gradY.addColorStop(1 - featherPixels / height, 'rgba(0,0,0,1)');
      gradY.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = gradY;
      ctx.fillRect(0, 0, width, height);

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
  });
};
const Mapbox = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [polygonColor, setPolygonColor] = useState<string>('#ff0000');
  const corners = useRef<[number, number][]>(initialCoords);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const setMapInstance = useSetAtom(mapInstanceAtom);
  const isImageEditMode = useAtomValue(isImageEditModeAtom);

  useEffect(() => {
    mapboxgl.accessToken = ACCESS_TOKEN;
    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      center: { lat: 12.5352438, lng: 101.4918194 },
      zoom: 5,
      projection: 'mercator',
      style: 'mapbox://styles/inconnus/cmn1u9im3001m01r44we5ej1x',
    });

    setMapInstance(map.current);
    map.current.setPadding({ left: 445, top: 0, right: 0, bottom: 0 });
    map.current.on('load', async () => {
      const softImageUrl = await processImageWithSoftEdges('https://kkndpqqmsswhgnupsznq.supabase.co/storage/v1/object/public/Public/Gemini_Generated_Image_nnmv0nnnmv0nnnmv.png', 80);
      map.current?.addSource('my-image', {
        type: 'image',
        url: softImageUrl,
        coordinates: corners.current as [[number, number], [number, number], [number, number], [number, number]],
      });

      // 2. เพิ่ม Layer แสดงรูป
      map.current?.addLayer({
        id: 'image-layer',
        type: 'raster',
        source: 'my-image',
        paint: {
          'raster-opacity': 1,
          'raster-fade-duration': 0 // ปิดการวาดแบบค่อยๆ จาง (Fade) จะทำให้รูปขยับทันทีไม่กระพริบ
        },
      });
      const draw = new MapboxDraw({
        displayControlsDefault: true,
        userProperties: true,
        controls: {
          polygon: true,
          trash: true,
        },
        styles: customDrawStyles,

      });
      map.current?.addControl(draw);
      drawRef.current = draw;
      map.current?.on('draw.create', (e: any) => {
        if (e.features.length > 0) {
          const featureId = e.features[0].id;
          // Set initial color
          draw.setFeatureProperty(featureId, 'color', '#ff0000');

          // Re-fetch and re-add to ensure the style update is picked up immediately
          const updatedFeature = draw.get(featureId);
          if (updatedFeature) draw.add(updatedFeature);
        }
      });
      map.current?.on('draw.selectionchange', (e: any) => {
        if (e.features.length > 0) {
          const feature = e.features[0];
          setSelectedFeatureId(feature.id as string);

          // Get the latest properties directly from MapboxDraw
          const currentFeature = draw.get(feature.id as string);
          setPolygonColor(currentFeature?.properties?.color || '#ff0000');
        } else {
          setSelectedFeatureId(null);
        }
      });
      // map.current?.on('draw.create', (e: any) => {
      //   if (e.features.length > 0) {
      //     draw.setFeatureProperty(e.features[0].id, 'color', '#ff0000');
      //   }
      // });
      corners.current.forEach((pos, index) => {
        const marker = new mapboxgl.Marker({
          draggable: true,
          color: '#ff0000',
        })
          .setLngLat(pos as [number, number])
          .addTo(map.current!);
        markersRef.current.push(marker);
        marker.getElement().style.display = isImageEditMode ? 'block' : 'none';
        let requestID: number | null = null;
        marker.on('drag', () => {
          const lngLat = marker.getLngLat();
          corners.current[index] = [lngLat.lng, lngLat.lat];

          // ตรวจสอบว่ามีคิววาดอยู่แล้วหรือไม่ ถ้ามีให้ข้ามไป (ป้องกันการซ้อน)
          if (requestID) return;

          requestID = requestAnimationFrame(() => {
            const source = map.current?.getSource('my-image') as mapboxgl.ImageSource;
            if (source) {
              // ใช้ setCoordinates ตรงๆ (ไม่ใช้ setState ของ React ในจังหวะนี้)
              source.setCoordinates(corners.current as any);
            }
            requestID = null; // วาดเสร็จแล้ว เคลียร์คิว
          });
        });
      });
    });

    return () => {
      setMapInstance(null);
      map.current!.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    markersRef.current.forEach((marker) => {
      const el = marker.getElement();
      if (el) {
        el.style.display = isImageEditMode ? 'block' : 'none';
      }
    });
  }, [isImageEditMode]);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setPolygonColor(newColor);
    if (selectedFeatureId && drawRef.current) {
      drawRef.current.setFeatureProperty(selectedFeatureId, 'color', newColor);

      // บังคับ Re-render เฉพาะตัวที่เลือก เพื่อให้สีเปลี่ยนทันทีบนหน้าจอ
      const feat = drawRef.current.get(selectedFeatureId);
      if (feat) drawRef.current.add(feat);
    }
  };

  return (
    <>
      <div id="map-container" ref={mapContainer} />
      {selectedFeatureId && (
        <div className="absolute top-[10px] right-[10px] z-10 bg-white/90 backdrop-blur-xl p-3 rounded-2xl shadow-2xl border border-white/20 flex flex-col gap-2 min-w-[120px] transition-all animate-in fade-in slide-in-from-right-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Style</span>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: polygonColor }} />
          </div>
          <div className="flex items-center gap-3 bg-gray-100/50 p-2 rounded-xl border border-gray-200/50">
            <label className="text-sm font-medium text-gray-700">Color</label>
            <input
              type="color"
              value={polygonColor}
              onChange={handleColorChange}
              className="w-10 h-8 p-0 cursor-pointer rounded-lg border-2 border-white shadow-sm transition-transform hover:scale-105 active:scale-95"
            />
          </div>
          <div className="flex flex-col gap-1 px-1">
            <span className="text-[10px] text-gray-400">Selected ID:</span>
            <span className="text-[10px] font-mono text-gray-500 truncate">{selectedFeatureId}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default Mapbox;
