import { Row } from '@app/layout';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Button, Separator } from '@heroui/react';
import { SearchIcon, CctvIcon, MapPinIcon } from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';
import { MapMarkerMount, CameraPopup } from '@features/map/components';
import { mapInstanceAtom } from '@shared/store/mapStore';
import { useAtomValue } from 'jotai';
import { useNavigate, useParams } from 'react-router-dom';
import { SidebarNav, type SidebarPage } from '@shared/ui/SidebarNav';
import CAMERA from '../../../data/camera';
import { DEFAULT_MAP_OVERVIEW } from 'src/const/map';

const CameraScreen = () => {
    // Get unique appFarmIds from iotDevices to fetch their land data

    const { deviceId } = useParams();
    const map = useAtomValue(mapInstanceAtom);
    const navigate = useNavigate();
    const [closePopupSignal, setClosePopupSignal] = useState(0);
    const [openPopupIdSignal, setOpenPopupIdSignal] = useState<{
        id: string;
        signal: number;
    }>({ id: '', signal: 0 });
    const prevDeviceIdRef = useRef<string | undefined>(undefined);
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const filteredDevices = useMemo(() => {
        if (!CAMERA) return [];
        if (!debouncedSearchTerm) return CAMERA;
        const lower = debouncedSearchTerm.toLowerCase();
        return CAMERA.filter(
            (d) =>
                (d.name?.toLowerCase() || '').includes(lower) ||
                (d.description?.toLowerCase() || '').includes(lower),
        );
    }, [CAMERA, debouncedSearchTerm]);

    useEffect(() => {
        const prev = prevDeviceIdRef.current;
        prevDeviceIdRef.current = deviceId;
        if (prev === undefined) {
            if (deviceId) {
                setOpenPopupIdSignal((p) => ({ id: deviceId, signal: p.signal + 1 }));
            }
            return;
        }
        if (prev !== deviceId) {
            setClosePopupSignal((n) => n + 1);
            if (deviceId) {
                setOpenPopupIdSignal((p) => ({ id: deviceId, signal: p.signal + 1 }));
            }
        }
    }, [deviceId]);

    useEffect(() => {
        if (!map) return;

        if (!deviceId) {
            map.flyTo(DEFAULT_MAP_OVERVIEW);
            return;
        }

        const device = CAMERA.find((d) => d.id.toString() === deviceId);
        if (device) {
            map.flyTo({
                center: [parseFloat(device.lng), parseFloat(device.lat)],
                zoom: 15,
                duration: 1200,
                essential: true,
            });
        } else {
            map.flyTo(DEFAULT_MAP_OVERVIEW);
        }
    }, [map, deviceId]);

    // ─── Pages ───────────────────────────────────────────────────

    const pages: SidebarPage[] = useMemo(
        () => [
            {
                key: 'list',
                path: '',
                render: () => (
                    <div className="flex flex-col p-3 max-h-[calc(90vh)]">
                        <div className="px-3 pt-1 pb-2 flex items-center justify-center">
                            <span className="text-[17px] font-semibold text-gray-900">
                                กล้องจราจรทั้งหมด ({CAMERA?.length})
                            </span>
                        </div>

                        <Row className="items-center gap-2 bg-black/6 rounded-[10px] px-3 h-9 shrink-0">
                            <SearchIcon size={14} className="text-gray-400 shrink-0" />
                            <input
                                className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                                placeholder="ค้นหา (ชื่อ, รหัส, สถานที่)..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </Row>
                        <Separator className="my-2" />
                        <div className="h-[calc(90vh-195px)]">
                            {filteredDevices?.length === 0 ? (
                                <div className="text-center py-6 text-gray-400 text-sm">
                                    ไม่พบกล้องที่ค้นหา
                                </div>
                            ) : (
                                <Virtuoso
                                    style={{ height: '100%' }}
                                    className="pr-2 -mr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                                    data={filteredDevices || []}
                                    itemContent={(index, device) => {
                                        const isSelected = deviceId === device.id?.toString();
                                        return (
                                            <div className="pb-1">
                                                <div
                                                    className={`rounded-xl px-3 py-2.5 cursor-pointer transition-colors ${
                                                        isSelected ? 'bg-[#03662c]/10' : 'hover:bg-black/5'
                                                    }`}
                                                    onClick={() => navigate(`/camera/${device.id}`)}
                                                >
                                                    {/* Row 1: status dot + name */}
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="size-2 rounded-full shrink-0 bg-green-500 animate-pulse" />
                                                        <span className="text-sm font-semibold text-gray-900 truncate flex-1">
                                                            {device.name}
                                                        </span>
                                                    </div>

                                                    {/* Row 2: badges */}
                                                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                                        <span className="inline-flex items-center gap-1 bg-[#03a9f4]/10 text-[#0288d1] rounded-md px-1.5 py-0.5 text-[10px] font-medium">
                                                            <CctvIcon size={10} />
                                                            {device.label}
                                                        </span>
                                                        {isSelected && (
                                                            <span className="inline-flex items-center bg-green-500/10 text-green-700 rounded-md px-1.5 py-0.5 text-[10px] font-medium">
                                                                ● กำลังดู
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Row 3: description */}
                                                    {device.description ? (
                                                        <div className="flex items-start gap-1">
                                                            <MapPinIcon size={10} className="text-red-400 shrink-0 mt-0.5" />
                                                            <span className="text-xs text-gray-400 line-clamp-2 flex-1">
                                                                {device.description}
                                                            </span>
                                                        </div>
                                                    ) : null}
                                                </div>
                                                {index !== filteredDevices?.length - 1 && (
                                                    <Separator className="my-2" />
                                                )}
                                            </div>
                                        );
                                    }}
                                />
                            )}
                        </div>
                    </div>
                ),
            },
        ],
        [
            filteredDevices,
            deviceId,
            CAMERA,
            searchTerm,
            navigate,
            setOpenPopupIdSignal,
            setIsSummaryModalOpen,
        ],
    );

    useEffect(() => {
        if (!map || !CAMERA) return;

        const sourceId = 'camera-source';
        const layerId = 'camera-layer';
        const iconId = 'camera-custom-icon';

        const handleLayerClick = (e: any) => {
            const features = map.queryRenderedFeatures(e.point, { layers: [layerId] });
            if (features.length > 0) {
                const id = features[0].properties?.id;
                if (id) {
                    navigate(`/camera/${id}`);
                }
            }
        };

        const handleMouseEnter = () => {
            map.getCanvas().style.cursor = 'pointer';
        };

        const handleMouseLeave = () => {
            map.getCanvas().style.cursor = '';
        };

        const addLayer = () => {
            if (!map || !map.isStyleLoaded() || map.getLayer(layerId)) return;

            const geojson = {
                type: 'FeatureCollection',
                features: CAMERA.map((device) => ({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(device.lng), parseFloat(device.lat)],
                    },
                    properties: {
                        id: device.id,
                        title: device.name,
                    },
                })),
            };

            if (!map.getSource(sourceId)) {
                map.addSource(sourceId, {
                    type: 'geojson',
                    data: geojson as any,
                });
            }

            // Find first label layer to insert below
            const layers = map.getStyle().layers;
            const labelLayerId = layers?.find(
                (l: any) => l.type === 'symbol' && (l.id.includes('label') || l.id.includes('place'))
            )?.id;

            map.addLayer({
                id: layerId,
                type: 'symbol',
                source: sourceId,
                layout: {
                    'icon-image': iconId,
                    'icon-size': 0.5,
                    'icon-optional': true,
                    'text-optional': true,
                    'icon-ignore-placement': false,
                    'icon-allow-overlap': false,
                    'symbol-sort-key': 10,
                    'text-field': ['get', 'title'],
                    'text-offset': [0, 1.5],
                    'text-anchor': 'top',
                    'text-size': 12,
                },
                paint: {
                    'text-color': '#ffffff',
                    'text-halo-color': '#111827',
                    'text-halo-width': 1,
                },
            }, labelLayerId);

            map.on('click', layerId, handleLayerClick);
            map.on('mouseenter', layerId, handleMouseEnter);
            map.on('mouseleave', layerId, handleMouseLeave);
        };

        const setup = () => {
            if (!map || !map.isStyleLoaded()) return;

            if (!map.hasImage(iconId)) {
                map.loadImage('/images/camera.png', (error, image) => {
                    if (error || !image || !map) return;
                    if (!map.hasImage(iconId)) {
                        map.addImage(iconId, image);
                        addLayer();
                    }
                });
            } else {
                addLayer();
            }
        };

        // Listen for both style.load and idle for maximum reliability
        map.on('style.load', setup);
        map.on('idle', setup);

        // Initial setup if style is already loaded
        if (map.isStyleLoaded()) {
            setup();
        }

        return () => {
            if (map) {
                map.off('style.load', setup);
                map.off('idle', setup);
                if (map.getLayer(layerId)) {
                    map.off('click', layerId, handleLayerClick);
                    map.off('mouseenter', layerId, handleMouseEnter);
                    map.off('mouseleave', layerId, handleMouseLeave);
                    map.removeLayer(layerId);
                }
                if (map.getSource(sourceId)) {
                    map.removeSource(sourceId);
                }
                if (map.hasImage(iconId)) {
                    map.removeImage(iconId);
                }
            }
        };
    }, [map, navigate]);

    // ─── Render ──────────────────────────────────────────────────

    // ─── Selected camera for popup ────────────────────────────────
    const selectedCamera = useMemo(
        () => (deviceId ? CAMERA.find((d) => d.id.toString() === deviceId) : undefined),
        [deviceId],
    );

    return (
        <SidebarNav
            basePath="/camera"
            pages={pages}
            className="pointer-events-auto bg-white/85 backdrop-blur-xl m-3 rounded-3xl border border-gray-200 shadow-xl w-[380px] max-h-[calc(90vh)] overflow-hidden"
        >
            {/* Show popup for the selected camera only */}
            {selectedCamera && (
                <MapMarkerMount
                    key={selectedCamera.id}
                    lat={parseFloat(selectedCamera.lat)}
                    lng={parseFloat(selectedCamera.lng)}
                    openPopupSignal={1}
                    popup={
                        <CameraPopup
                            url={selectedCamera.site_code}
                            camera={{
                                id: selectedCamera.id.toString(),
                                name: selectedCamera.name,
                                lat: parseFloat(selectedCamera.lat),
                                lng: parseFloat(selectedCamera.lng),
                            }}
                        />
                    }
                >
                    <button
                        type="button"
                        className="group flex flex-col items-center gap-1 cursor-pointer transition-transform hover:scale-110"
                    >
                        <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-green-600 border-2 border-white text-white shadow-lg backdrop-blur-sm">
                            <CctvIcon size={16} />
                        </div>
                    </button>
                </MapMarkerMount>
            )}
        </SidebarNav>
    );
};
export default CameraScreen;
