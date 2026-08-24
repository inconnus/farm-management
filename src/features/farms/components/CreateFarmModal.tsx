import { isValidLatitude, isValidLongitude } from '@features/map/utils/lngLat';
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

async function reverseGeocode(
  lng: number,
  lat: number,
): Promise<
  | {
      placeName: string;
      district?: string;
      province?: string;
      country?: string;
    }
  | undefined
> {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${ACCESS_TOKEN}&language=th&types=place,district,region`;
    const res = await fetch(url);
    const json = await res.json();
    const placeName: string | undefined = json.features?.[0]?.place_name;
    if (!placeName) return undefined;
    return { placeName, ...parsePlaceName(placeName) };
  } catch {
    return undefined;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PinLocation = {
  lat: number;
  lng: number;
  placeName?: string;
  district?: string;
  province?: string;
  country?: string;
};

export type FarmFormData = { name: string; location: PinLocation };

export type FarmInitialValues = {
  name: string;
  lat?: number;
  lng?: number;
  district?: string;
  province?: string;
  country?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCoord = (n: number) => n.toFixed(5);

function coordFieldError(kind: 'lat' | 'lng', text: string): string | null {
  if (!text.trim()) return null;
  const n = Number(text.trim());
  if (!Number.isFinite(n)) return 'กรอกตัวเลขให้ถูกต้อง';
  if (kind === 'lat' && !isValidLatitude(n)) return 'ต้องอยู่ระหว่าง -90 ถึง 90';
  if (kind === 'lng' && !isValidLongitude(n)) return 'ต้องอยู่ระหว่าง -180 ถึง 180';
  return null;
}

/** Split "อำเภอโกสัมพีนคร, จังหวัดกำแพงเพชร, ประเทศไทย" → { district, province, country } */
function parsePlaceName(placeName: string): {
  district?: string;
  province?: string;
  country?: string;
} {
  const parts = placeName
    .split(', ')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 3) {
    return {
      district: parts[0],
      province: parts[1],
      country: parts[parts.length - 1],
    };
  }
  if (parts.length === 2) {
    return { district: undefined, province: parts[0], country: parts[1] };
  }
  return { district: undefined, province: parts[0], country: undefined };
}

type CreateFarmModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit?: (data: FarmFormData) => void;
  isSubmitting?: boolean;
  /** เมื่อส่ง initialValues จะเข้าสู่ "edit mode" (prefill + เปลี่ยน title/button) */
  initialValues?: FarmInitialValues;
};

const inputClassName =
  'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-[#03662c] focus:bg-white transition-all';

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
  const [latText, setLatText] = useState('');
  const [lngText, setLngText] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coordsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinLocationRef = useRef<PinLocation | null>(null);
  pinLocationRef.current = pinLocation;

  // ── Map initialisation ───────────────────────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: map should only init when the modal opens
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
        const pending = pinLocationRef.current;
        if (
          pending &&
          isValidLatitude(pending.lat) &&
          isValidLongitude(pending.lng)
        ) {
          placePinAt(m, pending.lng, pending.lat);
        } else if (initialValues?.lng != null && initialValues?.lat != null) {
          placePinAt(m, initialValues.lng, initialValues.lat);
          setPinLocation({
            lat: initialValues.lat,
            lng: initialValues.lng,
            placeName: initialValues.province,
            district: initialValues.district,
            province: initialValues.province,
            country: initialValues.country,
          });
          setLatText(formatCoord(initialValues.lat));
          setLngText(formatCoord(initialValues.lng));
        }
      });

      m.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        placePinAt(m, lng, lat);
        setLatText(formatCoord(lat));
        setLngText(formatCoord(lng));
        reverseGeocode(lng, lat).then((result) => {
          setPinLocation({
            lat,
            lng,
            placeName: result?.placeName,
            district: result?.district,
            province: result?.province,
            country: result?.country,
          });
          setLocationSearch(
            result?.placeName ?? `${formatCoord(lat)}, ${formatCoord(lng)}`,
          );
        });
      });

      mapRef.current = m;
    }, 150);

    return () => {
      clearTimeout(timer);
      if (coordsDebounceRef.current) clearTimeout(coordsDebounceRef.current);
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [isOpen]);

  // ── Pre-fill form when modal opens ──────────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: prefill once when the modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (initialValues) {
      setFarmName(initialValues.name);
      setLocationSearch(initialValues.province ?? '');
      setPinLocation(
        initialValues.lat != null && initialValues.lng != null
          ? {
              lat: initialValues.lat,
              lng: initialValues.lng,
              placeName: initialValues.province,
              district: initialValues.district,
              province: initialValues.province,
              country: initialValues.country,
            }
          : null,
      );
      setLatText(
        initialValues.lat != null ? formatCoord(initialValues.lat) : '',
      );
      setLngText(
        initialValues.lng != null ? formatCoord(initialValues.lng) : '',
      );
    } else {
      setFarmName('');
      setLocationSearch('');
      setPinLocation(null);
      setLatText('');
      setLngText('');
    }
    setSuggestions([]);
  }, [isOpen]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const placePinAt = useCallback(
    (mapInstance: mapboxgl.Map, lng: number, lat: number) => {
      if (!isValidLongitude(lng) || !isValidLatitude(lat)) {
        console.warn('[CreateFarmModal] skip pin, invalid coords', {
          lat,
          lng,
        });
        return;
      }
      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat]);
      } else {
        const el = document.createElement('div');
        el.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 2px 6px rgba(0,0,0,.5));">
            <div style="width:30px;height:30px;border-radius:50% 50% 50% 0;background:#03662c;transform:rotate(-45deg);border:3px solid #fff;"></div>
          </div>`;
        el.style.cursor = 'grab';
        const marker = new mapboxgl.Marker({
          element: el,
          draggable: true,
          anchor: 'bottom',
        })
          .setLngLat([lng, lat])
          .addTo(mapInstance);

        marker.on('dragend', () => {
          const pos = marker.getLngLat();
          setLatText(formatCoord(pos.lat));
          setLngText(formatCoord(pos.lng));
          reverseGeocode(pos.lng, pos.lat).then((result) => {
            setPinLocation({
              lat: pos.lat,
              lng: pos.lng,
              placeName: result?.placeName,
              district: result?.district,
              province: result?.province,
              country: result?.country,
            });
            setLocationSearch(
              result?.placeName ??
                `${formatCoord(pos.lat)}, ${formatCoord(pos.lng)}`,
            );
          });
        });

        markerRef.current = marker;
      }
    },
    [],
  );

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
    const parsed = parsePlaceName(feature.place_name);
    setPinLocation({ lat, lng, placeName: feature.place_name, ...parsed });
    setLatText(formatCoord(lat));
    setLngText(formatCoord(lng));
    if (mapRef.current) {
      placePinAt(mapRef.current, lng, lat);
      mapRef.current.flyTo({ center: [lng, lat], zoom: 12, duration: 800 });
    }
  };

  const applyManualCoords = useCallback(
    (latStr: string, lngStr: string) => {
      const lat = Number(latStr.trim());
      const lng = Number(lngStr.trim());
      if (!isValidLatitude(lat) || !isValidLongitude(lng)) return;

      const current = pinLocationRef.current;
      if (
        current &&
        Math.abs(current.lat - lat) < 1e-7 &&
        Math.abs(current.lng - lng) < 1e-7
      ) {
        return;
      }

      const map = mapRef.current;
      if (map) {
        placePinAt(map, lng, lat);
        map.flyTo({
          center: [lng, lat],
          zoom: Math.max(map.getZoom(), 12),
          duration: 600,
        });
      }

      reverseGeocode(lng, lat).then((result) => {
        setPinLocation({
          lat,
          lng,
          placeName: result?.placeName,
          district: result?.district,
          province: result?.province,
          country: result?.country,
        });
        setLocationSearch(
          result?.placeName ?? `${formatCoord(lat)}, ${formatCoord(lng)}`,
        );
      });
    },
    [placePinAt],
  );

  const scheduleApplyCoords = (nextLat: string, nextLng: string) => {
    if (coordsDebounceRef.current) clearTimeout(coordsDebounceRef.current);
    coordsDebounceRef.current = setTimeout(() => {
      applyManualCoords(nextLat, nextLng);
    }, 500);
  };

  const handleLatChange = (value: string) => {
    setLatText(value);
    scheduleApplyCoords(value, lngText);
  };

  const handleLngChange = (value: string) => {
    setLngText(value);
    scheduleApplyCoords(latText, value);
  };

  const handleClose = () => {
    setFarmName('');
    setLocationSearch('');
    setSuggestions([]);
    setPinLocation(null);
    setLatText('');
    setLngText('');
    onOpenChange(false);
  };

  const handleSubmit = () => {
    if (!farmName.trim() || !pinLocation) return;
    onSubmit?.({ name: farmName.trim(), location: pinLocation });
    handleClose();
  };

  const latError = coordFieldError('lat', latText);
  const lngError = coordFieldError('lng', lngText);
  const isValid =
    farmName.trim().length > 0 &&
    pinLocation !== null &&
    !latError &&
    !lngError &&
    !isSubmitting;

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
                <label
                  htmlFor="farm-name"
                  className="text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  ชื่อฟาร์ม <span className="text-red-500">*</span>
                </label>
                <input
                  id="farm-name"
                  type="text"
                  placeholder="เช่น ฟาร์มข้าวโพด หมู่ 3"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  className={inputClassName}
                />
              </div>

              {/* Location */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="farm-location-search"
                  className="text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  ที่ตั้งฟาร์ม <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 focus-within:border-[#03662c] focus-within:bg-white transition-all">
                    <SearchIcon size={15} className="text-gray-400 shrink-0" />
                    <input
                      id="farm-location-search"
                      type="text"
                      placeholder="ค้นหาสถานที่..."
                      value={locationSearch}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
                    />
                    {isSearching && (
                      <svg
                        className="h-4 w-4 animate-spin text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    )}
                    {locationSearch && !isSearching && (
                      <button
                        type="button"
                        onClick={() => {
                          setLocationSearch('');
                          setSuggestions([]);
                        }}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <XIcon size={14} />
                      </button>
                    )}
                  </div>
                  {suggestions.length > 0 && (
                    <ul className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                      {suggestions.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => handleSelectSuggestion(s)}
                          >
                            <MapPinIcon
                              size={14}
                              className="text-[#03662c] shrink-0"
                            />
                            <span className="truncate">{s.place_name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="farm-lat"
                      className="text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      ละติจูด (lat)
                    </label>
                    <input
                      id="farm-lat"
                      type="text"
                      inputMode="decimal"
                      placeholder="14.02747"
                      value={latText}
                      onChange={(e) => handleLatChange(e.target.value)}
                      onBlur={() => applyManualCoords(latText, lngText)}
                      aria-invalid={!!latError}
                      className={`${inputClassName} ${latError ? 'border-red-400 focus:border-red-500' : ''}`}
                    />
                    {latError && (
                      <p className="text-xs text-red-500">{latError}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="farm-lng"
                      className="text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      ลองจิจูด (lng)
                    </label>
                    <input
                      id="farm-lng"
                      type="text"
                      inputMode="decimal"
                      placeholder="100.78123"
                      value={lngText}
                      onChange={(e) => handleLngChange(e.target.value)}
                      onBlur={() => applyManualCoords(latText, lngText)}
                      aria-invalid={!!lngError}
                      className={`${inputClassName} ${lngError ? 'border-red-400 focus:border-red-500' : ''}`}
                    />
                    {lngError && (
                      <p className="text-xs text-red-500">{lngError}</p>
                    )}
                  </div>
                </div>

                <div className="relative mt-1 rounded-2xl overflow-hidden border border-gray-200 shadow-sm h-[300px]">
                  <div ref={mapContainerRef} className="w-full h-full" />
                  {!pinLocation && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm pointer-events-none">
                      คลิกบนแผนที่หรือกรอก lat/lng เพื่อปักหมุด
                    </div>
                  )}
                  {pinLocation && (
                    <div className="absolute bottom-3 left-3 bg-[#03662c]/90 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1.5">
                      <MapPinIcon size={12} fill="white" />
                      <span>
                        {pinLocation.lat.toFixed(5)},{' '}
                        {pinLocation.lng.toFixed(5)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Modal.Body>

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
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                )}
                {isSubmitting
                  ? 'กำลังบันทึก...'
                  : isEditMode
                    ? 'บันทึก'
                    : 'สร้างฟาร์ม'}
              </button>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
