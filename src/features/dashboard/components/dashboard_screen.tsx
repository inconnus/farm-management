import { Row } from '@app/layout';
import {
  useIOTDevicesQuery,
  useIOTTelemetryQueries,
  useLandsQueries,
} from '@features/dashboard/hooks';
import {
  MapMarkerMount,
  MapPolygonMount,
  PolygonMarker,
} from '@features/map/components';
import { TaskLabel } from '@features/map/components/TaskLabel';
import { Button, Separator } from '@heroui/react';
import { mapInstanceAtom } from '@shared/store/mapStore';
import { DEFAULT_MAP_OVERVIEW } from 'src/const/map';
import { SidebarNav, type SidebarPage } from '@shared/ui/SidebarNav';
import { useAtomValue } from 'jotai';
import {
  MapPinIcon,
  SearchIcon,
  SproutIcon,
  ThermometerIcon,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GlowingPin } from './markers/glowing_pin';
import { SummaryModal } from './SummaryModal';

const LandTypeColor: Record<string, string> = {
  แหล่งน้ำที่ใช้รดพืช: 'rgb(75, 216, 255)',
  พื้นที่แปลงปลูก: 'rgb(63, 189, 67)',
  บ้านที่อยู่อาศัย: 'rgb(99, 87, 238)',
  ที่พักผลผลิต: 'rgb(1, 124, 3)',
  ที่เก็บสารเคมี: 'rgb(232, 177, 59)',
  อื่นๆ: 'rgb(166, 166, 166)',
};



const DashboardScreen = () => {
  const { data: iotDevices } = useIOTDevicesQuery();

  // Get unique appFarmIds from iotDevices to fetch their land data
  const appFarmIds = Array.from(
    new Set(
      iotDevices?.map((device) => device.appFarmId).filter(Boolean) || [],
    ),
  );
  const landsQueries = useLandsQueries(appFarmIds);

  const appIotIds = useMemo(
    () => iotDevices?.map((device) => device.appIotId).filter(Boolean) || [],
    [iotDevices],
  );
  const telemetryQueries = useIOTTelemetryQueries(appIotIds);

  const telemetryMap = useMemo(() => {
    const map = new Map<string, any>();
    telemetryQueries.forEach((q) => {
      if (q.data?.appIotId && q.data?.telemetry) {
        map.set(q.data.appIotId, q.data.telemetry);
      }
    });
    return map;
  }, [telemetryQueries]);

  const { deviceId, orgSlug } = useParams();
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

  const filteredDevices = useMemo(() => {
    if (!iotDevices) return [];
    if (!searchTerm) return iotDevices;
    const lower = searchTerm.toLowerCase();
    return iotDevices.filter(
      (d) =>
        (d.appIotName?.toLowerCase() || '').includes(lower) ||
        (d.appIotId?.toLowerCase() || '').includes(lower) ||
        (d.province?.toLowerCase() || '').includes(lower) ||
        (d.amphur?.toLowerCase() || '').includes(lower) ||
        (d.tambon?.toLowerCase() || '').includes(lower),
    );
  }, [iotDevices, searchTerm]);

  const dashboardPolygons = useMemo(() => {
    const polygons: Array<{
      id: string;
      coords: [number, number][];
      properties: any;
      name: string;
    }> = [];

    landsQueries.forEach((query) => {
      const queryData = query.data;
      if (queryData) {
        let payloadData = queryData;
        if ((queryData as any).data) {
          payloadData = (queryData as any).data;
        }

        const payload = Array.isArray(payloadData)
          ? payloadData
          : [payloadData];

        payload.forEach((item: any, i: number) => {
          const latList = item?.latList;
          const lonList = item?.lonList;

          if (
            Array.isArray(latList) &&
            Array.isArray(lonList) &&
            latList.length === lonList.length &&
            latList.length >= 3
          ) {
            const coords = lonList.map(
              (lon: number, j: number) => [lon, latList[j]] as [number, number],
            );

            if (
              coords[0][0] !== coords[coords.length - 1][0] ||
              coords[0][1] !== coords[coords.length - 1][1]
            ) {
              coords.push([...coords[0]]);
            }

            const featureId =
              item.id || item.appLandId || `${item.appFarmId}-${i}`;

            polygons.push({
              id: featureId,
              coords,
              name: item.appLandName || item.landType || 'พื้นที่',
              properties: {
                color: LandTypeColor[item.landType] || '#0ecc59',
                isIotLand: true,
                landId: item.appLandId || featureId,
              },
            });
          }
        });
      }
    });
    return polygons;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(landsQueries.map((q) => q.data))]);

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
    if (deviceId) {
      const device = iotDevices?.find((device) => device._id === deviceId);
      if (device) {
        map.flyTo({
          center: [device.lon, device.lat],
          zoom: 15,
          duration: 1000,
        });
      } else {
        map.flyTo(DEFAULT_MAP_OVERVIEW);
      }
    } else {
      map.flyTo(DEFAULT_MAP_OVERVIEW);
    }
  }, [map, deviceId, iotDevices]);

  // ─── Pages ───────────────────────────────────────────────────

  const pages: SidebarPage[] = useMemo(
    () => [
      {
        key: 'list',
        path: '',
        render: () => (
          <div className="flex flex-col p-3 max-h-[calc(90vh)]">
            <div className="px-3 pt-1 pb-2 flex items-center justify-center ">
              <span className="text-[17px] font-semibold text-gray-900">
                อุปกรณ์ทั้งหมด ({iotDevices?.length})
              </span>
            </div>

            <Row className="items-center gap-2 bg-black/6 rounded-[10px] px-3 h-9 shrink-0">
              <SearchIcon size={14} className="text-gray-400 shrink-0" />
              <input
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                placeholder="ค้นหา (ชื่อ, ID, จังหวัด)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Row>
            <Separator className="my-2" />
            <div className="flex-1 overflow-y-auto min-h-0 pr-2 -mr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {filteredDevices?.length === 0 && (
                <div className="text-center py-6 text-gray-400 text-sm">
                  ไม่พบอุปกรณ์ที่ค้นหา
                </div>
              )}
              {filteredDevices?.map((device, index) => {
                const telemetry =
                  telemetryMap.get(device.appIotId) || device.telemetry;
                return (
                  <React.Fragment key={device._id}>
                    <div
                      className={`rounded-xl px-3 py-2.5 cursor-pointer transition-colors ${deviceId === device._id
                        ? 'bg-[#03662c]/10 '
                        : 'hover:bg-black/5'
                        }`}
                      onClick={() => {
                        if (deviceId === device._id) {
                          setOpenPopupIdSignal((p) => ({
                            id: device._id,
                            signal: p.signal + 1,
                          }));
                        } else {
                          navigate(`/${orgSlug}/dashboard/${device._id}`);
                        }
                      }}
                    >
                      {/* Row 1: status dot + name + ID */}
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`size-2 rounded-full shrink-0 ${telemetry ? 'bg-green-500' : 'bg-red-400'
                            }`}
                        />
                        <span className="text-sm font-semibold text-gray-900 truncate flex-1">
                          {device.appIotName}
                        </span>
                      </div>

                      {/* Row 2: sensor mini badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 bg-[#03a9f4]/10 text-[#0288d1] rounded-md px-1.5 py-0.5 text-[10px] font-medium">
                          <ThermometerIcon size={10} />
                          อุณหภูมิ{' '}
                          {telemetry?.sensor_ambient_temperature?.toFixed(1) ??
                            '-'}
                          °C
                        </span>
                        <span className="inline-flex items-center gap-1 bg-[#ff9800]/10 text-[#e65100] rounded-md px-1.5 py-0.5 text-[10px] font-medium">
                          💧 ความชื้น{' '}
                          {telemetry?.sensor_ambient_humid?.toFixed(1) ?? '-'}%
                        </span>
                        <span className="inline-flex items-center gap-1 bg-[#4caf50]/10 text-[#2e7d32] rounded-md px-1.5 py-0.5 text-[10px] font-medium">
                          <SproutIcon size={10} />
                          ความชื้นดิน{' '}
                          {telemetry?.sensor_soil_humid_humid?.toFixed(1) ??
                            '-'}
                          %
                        </span>
                      </div>

                      {/* Row 3: location */}
                      <div className="flex items-center gap-1 mt-1 justify-between">
                        <Row>
                          <MapPinIcon
                            size={10}
                            className="text-red-400 shrink-0"
                          />
                          <span className="text-xs text-gray-400 truncate">
                            {device?.tambon} {device?.amphur} {device?.province}
                          </span>
                        </Row>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {device.appIotId}
                        </span>
                      </div>
                    </div>
                    {index !== filteredDevices?.length - 1 && (
                      <Separator className="my-2" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            {/* Overview Button at the bottom */}
            {iotDevices && iotDevices.length > 0 && (
              <div className="mt-2 ">
                <Button
                  className="w-full bg-[#03662c] text-white hover:bg-[#03662c]/80 border border-[#03662c]/30 font-bold tracking-wider uppercase text-xs"
                  onPress={() => setIsSummaryModalOpen(true)}
                  size="lg"
                >
                  ดูภาพรวมอุปกรณ์ (Overview)
                </Button>
              </div>
            )}
          </div>
        ),
      },
    ],
    [
      filteredDevices,
      deviceId,
      iotDevices,
      searchTerm,
      telemetryMap,
      navigate,
      setOpenPopupIdSignal,
      setIsSummaryModalOpen,
    ],
  );

  // ─── Render ──────────────────────────────────────────────────

  return (
    <>
      <SidebarNav
        basePath={`/${orgSlug}/dashboard`}
        pages={pages}
        className="absolute right-0 pointer-events-auto bg-white/85 backdrop-blur-xl m-3 rounded-3xl border border-gray-200 shadow-xl w-[380px] max-h-[calc(90vh)] overflow-hidden"
      >
        {/* Map markers */}
        {filteredDevices?.map((device) => {
          const telemetry = telemetryMap.get(device.appIotId) || device.telemetry;
          return (
            <MapMarkerMount
              key={device._id}
              lat={device.lat}
              lng={device.lon}
              closePopupSignal={closePopupSignal}
              openPopupSignal={
                openPopupIdSignal.id === device._id ? openPopupIdSignal.signal : 0
              }
              popup={
                <div className="p-3.5 bg-white text-gray-800 min-w-[240px] rounded-xl shadow-lg relative font-sans border border-gray-100">
                  <div className="mb-3 pr-6 text-left">
                    <h3 className="font-bold tracking-wide uppercase text-xs">
                      {device.appIotName || 'Unknown Device'}
                    </h3>
                  </div>

                  <div className="flex justify-between mb-3 text-center gap-2">
                    <div>
                      <div className="text-xl text-[#f44336] font-medium leading-none">
                        {telemetry?.sensor_ambient_temperature?.toFixed(1) || '-'}
                      </div>
                      <div className="mt-1 h-4 border-b border-gray-200">
                        <svg width="40" height="16" viewBox="0 0 40 16">
                          <path
                            d="M0,8 Q10,16 20,8 T40,8"
                            fill="none"
                            stroke="#f44336"
                            strokeWidth="1.5"
                          />
                        </svg>
                      </div>
                      <span className="text-gray-400 block mt-1 text-[9px] font-bold uppercase">
                        TEMP °C
                      </span>
                    </div>
                    <div>
                      <div className="text-xl text-[#f59e0b] font-medium leading-none">
                        {telemetry?.sensor_ambient_humid?.toFixed(1) || '-'}
                      </div>
                      <div className="mt-1 h-4 border-b border-gray-200">
                        <svg width="40" height="16" viewBox="0 0 40 16">
                          <path
                            d="M0,12 Q10,4 20,12 T40,12"
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="1.5"
                          />
                        </svg>
                      </div>
                      <span className="text-gray-400 block mt-1 text-[9px] font-bold uppercase">
                        HUMID %
                      </span>
                    </div>
                    <div>
                      <div className="text-xl text-[#0ea5e9] font-medium leading-none">
                        {telemetry?.sensor_soil_humid_humid?.toFixed(1) || '-'}
                      </div>
                      <div className="mt-1 h-4 border-b border-gray-200">
                        <svg width="40" height="16" viewBox="0 0 40 16">
                          <path
                            d="M0,4 Q10,12 20,4 T40,4"
                            fill="none"
                            stroke="#0ea5e9"
                            strokeWidth="1.5"
                          />
                        </svg>
                      </div>
                      <span className="text-gray-400 block mt-1 text-[9px] font-bold uppercase">
                        SOIL M.%
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-2 text-left">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-500 flex-1 text-[10px]">
                        Sensor
                      </span>
                      <span className="text-gray-500 w-[35px] text-right text-[10px]">
                        pH
                      </span>
                      <span className="text-gray-500 w-[35px] text-right text-[10px]">
                        EC
                      </span>
                      <span className="text-gray-500 w-[35px] text-right text-[10px]">
                        V_IN
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-900 font-medium flex-1 text-[11px] overflow-hidden text-ellipsis whitespace-nowrap">
                        {device.appIotId}
                      </span>
                      <span className="text-[#f44336] font-medium w-[35px] text-right text-[11px]">
                        {(
                          telemetry?.sensor_soil_humid_ph ??
                          telemetry?.sensor_soil_humid_ph
                        )?.toFixed(1) || '-'}
                      </span>
                      <span className="text-[#f59e0b] font-medium w-[35px] text-right text-[11px]">
                        {(
                          telemetry?.sensor_soil_humid_ec ??
                          telemetry?.sensor_soil_humid_ec
                        )?.toFixed(1) || '-'}
                      </span>
                      <span className="text-[#0ea5e9] font-medium w-[35px] text-right text-[11px]">
                        {telemetry?.sensor_voltage_v_in?.toFixed(1) || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              }
              onClick={() => {
                navigate(`/${orgSlug}/dashboard/${device._id}`);
              }}
            >
              <GlowingPin isOnline={!!telemetry} />
            </MapMarkerMount>
          );
        })}

        {/* Polygon markers */}
        {dashboardPolygons.map((poly) => (
          <React.Fragment key={poly.id}>
            <MapPolygonMount
              id={poly.id}
              coords={poly.coords}
              properties={poly.properties}
            />
            <PolygonMarker coords={poly.coords}>
              <TaskLabel name={poly.name} />
            </PolygonMarker>
          </React.Fragment>
        ))}

        <SummaryModal
          isOpen={isSummaryModalOpen}
          onOpenChange={setIsSummaryModalOpen}
          devices={iotDevices || []}
          telemetryMap={telemetryMap}
        />
      </SidebarNav>
    </>
  );
};
export default DashboardScreen;
