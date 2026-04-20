import { Modal } from '@heroui/react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPinIcon, SearchIcon, XIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const ACCESS_TOKEN = import.meta.env.PUBLIC_MAPBOX_TOKEN;

// ─── Geocoding helpers ─────────────────────────────────────────────────────────

type GeocodingFeature = {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
};

async function geocode(query: string): Promise<GeocodingFeature[]> {
  if (!query.trim()) return [];
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${ACCESS_TOKEN}&language=th&limit=5&country=TH`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  return json.features ?? [];
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PinLocation = {
  lat: number;
  lng: number;
  placeName?: string;
};

export type FarmFormData = { name: string; location: PinLocation };

export type FarmInitialValues = {
  name: string;
  lat?: number;
  lng?: number;
  province?: string;
};

type CreateFarmModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit?: (data: FarmFormData) => void;
  isSubmitting?: boolean;
  /** เมื่อส่ง initialValues จะเข้าสู่ "edit mode" (prefill + เปลี่ยน title/button) */
  initialValues?: FarmInitialValues;
};

// ─── Component ────────────────────────────────────────────────────────────────

export const CreateFarmModal = ({
  isOpen,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  initialValues,
}: CreateFarmModalProps) => {
  const isEditMode = !!initialValues;

  const [farmName, setFarmName] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodingFeature[]>([]);
  const [pinLocation, setPinLocation] = useState<PinLocation | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Map initialisation ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      mapboxgl.accessToken = ACCESS_TOKEN;

      const initCenter: [number, number] =
        initialValues?.lng != null && initialValues?.lat != null
          ? [initialValues.lng, initialValues.lat]
          : [100.9925, 15.87];
      const initZoom = initialValues?.lat != null ? 12 : 5;

      const m = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/standard-satellite',
        center: initCenter,
        zoom: initZoom,
        projection: 'mercator',
      });

      m.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
      m.on('load', () => {
        m.setFog(null);
        // In edit mode: drop pin at existing location immediately
        if (initialValues?.lng != null && initialValues?.lat != null) {
          placePinAt(m, initialValues.lng, initialValues.lat);
          setPinLocation({
            lat: initialValues.lat,
            lng: initialValues.lng,
            placeName: initialValues.province,
          });
        }
      });

      m.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        placePinAt(m, lng, lat);
        reverseGeocode(lng, lat).then((name) => {
          setPinLocation({ lat, lng, placeName: name });
          setLocationSearch(name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        });
      });

      mapRef.current = m;
    }, 150);

    return () => {
      clearTimeout(timer);
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pre-fill form when modal opens ──────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    if (initialValues) {
      setFarmName(initialValues.name);
      setLocationSearch(initialValues.province ?? '');
      setPinLocation(
        initialValues.lat != null && initialValues.lng != null
          ? { lat: initialValues.lat, lng: initialValues.lng, placeName: initialValues.province }
          : null,
      );
    } else {
      setFarmName('');
      setLocationSearch('');
      setPinLocation(null);
    }
    setSuggestions([]);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ────────────────────────────────────────────────────────────────

  const placePinAt = useCallback(
    (mapInstance: mapboxgl.Map, lng: number, lat: number) => {
      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat]);
      } else {
        const el = document.createElement('div');
        el.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 2px 6px rgba(0,0,0,.5));">
            <div style="width:30px;height:30px;border-radius:50% 50% 50% 0;background:#03662c;transform:rotate(-45deg);border:3px solid #fff;"></div>
          </div>`;
        el.style.cursor = 'grab';
        const marker = new mapboxgl.Marker({ element: el, draggable: true, anchor: 'bottom' })
          .setLngLat([lng, lat])
          .addTo(mapInstance);

        marker.on('dragend', () => {
          const pos = marker.getLngLat();
          reverseGeocode(pos.lng, pos.lat).then((name) => {
            setPinLocation({ lat: pos.lat, lng: pos.lng, placeName: name });
            setLocationSearch(name ?? `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`);
          });
        });

        markerRef.current = marker;
      }
    },
    [],
  );

  async function reverseGeocode(lng: number, lat: number): Promise<string | undefined> {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${ACCESS_TOKEN}&language=th&types=place,district,region`;
      const res = await fetch(url);
      const json = await res.json();
      return json.features?.[0]?.place_name;
    } catch {
      return undefined;
    }
  }

  const handleSearchChange = (value: string) => {
    setLocationSearch(value);
    setSuggestions([]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) return;
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      const results = await geocode(value);
      setSuggestions(results);
      setIsSearching(false);
    }, 400);
  };

  const handleSelectSuggestion = (feature: GeocodingFeature) => {
    const [lng, lat] = feature.center;
    setSuggestions([]);
    setLocationSearch(feature.place_name);
    setPinLocation({ lat, lng, placeName: feature.place_name });
    if (mapRef.current) {
      placePinAt(mapRef.current, lng, lat);
      mapRef.current.flyTo({ center: [lng, lat], zoom: 12, duration: 800 });
    }
  };

  const handleClose = () => {
    setFarmName('');
    setLocationSearch('');
    setSuggestions([]);
    setPinLocation(null);
    onOpenChange(false);
  };

  const handleSubmit = () => {
    if (!farmName.trim() || !pinLocation) return;
    onSubmit?.({ name: farmName.trim(), location: pinLocation });
    handleClose();
  };

  const isValid = farmName.trim().length > 0 && pinLocation !== null && !isSubmitting;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={handleClose}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-2xl bg-white text-gray-800 border border-gray-200 shadow-2xl">
            <Modal.CloseTrigger className="hover:bg-gray-100" />
            <Modal.Header className="border-b border-gray-100">
              <Modal.Heading className="font-bold uppercase tracking-wider text-gray-800">
                {isEditMode ? 'แก้ไขฟาร์ม' : 'สร้างฟาร์มใหม่'}
              </Modal.Heading>
            </Modal.Header>

            <Modal.Body className="pb-6 flex flex-col gap-5">
              {/* Farm Name */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="farm-name" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  ชื่อฟาร์ม <span className="text-red-500">*</span>
                </label>
                <input
                  id="farm-name"
                  type="text"
                  placeholder="เช่น ฟาร์มข้าวโพด หมู่ 3"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-[#03662c] focus:bg-white transition-all"
                />
              </div>

              {/* Location */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  ที่ตั้งฟาร์ม <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 focus-within:border-[#03662c] focus-within:bg-white transition-all">
                    <SearchIcon size={15} className="text-gray-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="ค้นหาสถานที่..."
                      value={locationSearch}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
                    />
                    {isSearching && (
                      <svg className="h-4 w-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                    {locationSearch && !isSearching && (
                      <button type="button" onClick={() => { setLocationSearch(''); setSuggestions([]); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <XIcon size={14} />
                      </button>
                    )}
                  </div>
                  {suggestions.length > 0 && (
                    <ul className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                      {suggestions.map((s) => (
                        <li key={s.id}>
                          <button type="button" className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => handleSelectSuggestion(s)}>
                            <MapPinIcon size={14} className="text-[#03662c] shrink-0" />
                            <span className="truncate">{s.place_name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="relative mt-1 rounded-2xl overflow-hidden border border-gray-200 shadow-sm h-[300px]">
                  <div ref={mapContainerRef} className="w-full h-full" />
                  {!pinLocation && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm pointer-events-none">
                      คลิกบนแผนที่เพื่อปักหมุดตำแหน่งฟาร์ม
                    </div>
                  )}
                  {pinLocation && (
                    <div className="absolute bottom-3 left-3 bg-[#03662c]/90 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1.5">
                      <MapPinIcon size={12} fill="white" />
                      <span>{pinLocation.lat.toFixed(5)}, {pinLocation.lng.toFixed(5)}</span>
                    </div>
                  )}
                </div>
              </div>
            </Modal.Body>

            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <button type="button" onClick={handleClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
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
                {isSubmitting ? 'กำลังบันทึก...' : isEditMode ? 'บันทึก' : 'สร้างฟาร์ม'}
              </button>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
