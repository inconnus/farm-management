import { Column, Row } from '@app/layout';
import { useCamerasQuery } from '@features/dashboard/hooks';
import { CameraMarker } from '@features/map/components';
import { devicePopupAtom } from '@features/map/store/devicePopupAtom';
import { Chip, Separator } from '@heroui/react';
import { mapInstanceAtom } from '@shared/store/mapStore';
import { SidebarNav, type SidebarPage } from '@shared/ui/SidebarNav';
import { useAtomValue, useSetAtom } from 'jotai';
import { CctvIcon, ChevronRight, MapPinIcon, SearchIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DEFAULT_MAP_OVERVIEW } from 'src/const/map';

const KasetkornCameraScreen = () => {
  const { data: cameras = [], isLoading } = useCamerasQuery();
  const { deviceId, orgSlug } = useParams();
  const map = useAtomValue(mapInstanceAtom);
  const setDevicePopup = useSetAtom(devicePopupAtom);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const prevDeviceIdRef = useRef<string | undefined>(undefined);

  const filteredCameras = useMemo(() => {
    if (!searchTerm.trim()) return cameras;
    const lower = searchTerm.toLowerCase();
    return cameras.filter(
      (cam) =>
        cam.name.toLowerCase().includes(lower) ||
        (cam.province?.toLowerCase() || '').includes(lower) ||
        (cam.amphur?.toLowerCase() || '').includes(lower) ||
        (cam.tambon?.toLowerCase() || '').includes(lower),
    );
  }, [cameras, searchTerm]);

  useEffect(() => {
    const prev = prevDeviceIdRef.current;
    prevDeviceIdRef.current = deviceId;
    if (prev === deviceId) return;

    setDevicePopup(null);
    if (!deviceId) {
      map?.flyTo(DEFAULT_MAP_OVERVIEW);
      return;
    }

    const camera = cameras.find((cam) => cam.id === deviceId);
    if (!camera) {
      map?.flyTo(DEFAULT_MAP_OVERVIEW);
      return;
    }

    map?.flyTo({
      center: [camera.lng, camera.lat],
      zoom: 17,
      duration: 1200,
      essential: true,
    });
    setDevicePopup({
      type: 'camera',
      lngLat: [camera.lng, camera.lat],
      camera,
    });
  }, [cameras, deviceId, map, setDevicePopup]);

  useEffect(() => {
    return () => setDevicePopup(null);
  }, [setDevicePopup]);

  const pages: SidebarPage[] = useMemo(
    () => [
      {
        key: 'list',
        path: '',
        render: () => (
          <div className="flex flex-col p-3 max-h-[calc(90vh)]">
            <div className="px-3 pt-1 pb-2 flex items-center justify-center">
              <span className="text-[17px] font-semibold text-gray-900">
                กล้องทั้งหมด ({cameras.length})
              </span>
            </div>

            <Row className="items-center gap-2 bg-black/6 rounded-[10px] px-3 h-9 shrink-0">
              <SearchIcon size={14} className="text-gray-400 shrink-0" />
              <input
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                placeholder="ค้นหา (ชื่อ, จังหวัด, อำเภอ)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Row>
            <Separator className="my-2" />
            <Column className="flex-1 min-h-0 overflow-y-auto gap-1 camera-list-scroll pr-2 -mr-2">
              {isLoading ? (
                <span className="text-center text-gray-400 py-6 text-sm">
                  กำลังโหลดกล้อง...
                </span>
              ) : filteredCameras.length === 0 ? (
                <span className="text-center text-gray-400 py-6 text-sm">
                  {searchTerm ? 'ไม่พบกล้องที่ค้นหา' : 'ยังไม่มีกล้อง'}
                </span>
              ) : (
                filteredCameras.map((cam) => {
                  const isSelected = deviceId === cam.id;
                  return (
                    <Row
                      key={cam.id}
                      onClick={() => {
                        navigate(`/${orgSlug}/iot-cameras/${cam.id}`);
                      }}
                      className={`items-center rounded-xl p-2.5 transition-colors cursor-pointer shrink-0 ${
                        isSelected ? 'bg-[#03662c]/10' : 'hover:bg-black/5'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center bg-gray-100 border border-gray-200 relative">
                        <CctvIcon size={16} className="text-gray-600" />
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 border border-white" />
                      </div>
                      <Column className="ml-2.5 min-w-0 flex-1">
                        <span className="font-medium text-sm truncate">
                          {cam.name}
                        </span>
                        <Chip className="w-fit mt-0.5 bg-gray-100">
                          <Chip.Label className="text-[11px] text-gray-500">
                            {cam.tambon && cam.amphur
                              ? `${cam.tambon}, ${cam.amphur}`
                              : cam.province || 'กล้อง'}
                          </Chip.Label>
                        </Chip>
                        {cam.province ? (
                          <Row className="items-start gap-1 mt-1">
                            <MapPinIcon
                              size={10}
                              className="text-red-400 shrink-0 mt-0.5"
                            />
                            <span className="text-xs text-gray-400 line-clamp-1">
                              {cam.province}
                            </span>
                          </Row>
                        ) : null}
                      </Column>
                      <ChevronRight
                        size={14}
                        className="text-gray-300 ml-auto shrink-0"
                      />
                    </Row>
                  );
                })
              )}
            </Column>
          </div>
        ),
      },
    ],
    [
      cameras.length,
      deviceId,
      filteredCameras,
      isLoading,
      navigate,
      orgSlug,
      searchTerm,
    ],
  );

  return (
    <SidebarNav
      basePath={`/${orgSlug}/iot-cameras`}
      pages={pages}
      className="absolute right-0 pointer-events-auto bg-white/85 backdrop-blur-xl m-3 rounded-3xl border border-gray-200 shadow-xl w-[380px] max-h-[calc(90vh)] overflow-hidden"
    >
      {filteredCameras.map((cam) => (
        <CameraMarker
          key={cam.id}
          camera={cam}
          onClick={(c) => navigate(`/${orgSlug}/iot-cameras/${c.id}`)}
        />
      ))}
    </SidebarNav>
  );
};

export default KasetkornCameraScreen;
