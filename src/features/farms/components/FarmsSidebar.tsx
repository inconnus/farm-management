import { Column } from '@app/layout';
import { useDevicesQuery } from '@features/devices/hooks/useDevicesQuery';
import {
  CameraMarker,
  SolarCellMarker,
  toCameraData,
  toSolarCellData,
  type CameraData,
  type SolarCellData,
} from '@features/map/components';
import { devicePopupAtom } from '@features/map/store/devicePopupAtom';
import * as turf from '@turf/turf';
import { useAtomValue, useSetAtom } from 'jotai';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { mapInstanceAtom } from '@store/mapStore';
import { selectFarmAtom, selectLandAtom } from '@store/selectionStore';
import { FarmDetailPage } from './FarmDetailPage';
import { FarmListPage } from './FarmListPage';
import { toFarm } from '../transforms';
import { useFarmsQuery } from '../hooks/useFarmsQuery';

const IOS_EASE = [0.25, 0.46, 0.45, 0.94] as const;
const DURATION = 0.38;

const pageVariants = {
  initial: (dir: number) => ({
    x: dir > 0 ? '100%' : '-25%',
    opacity: dir > 0 ? 1 : 0,
  }),
  animate: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? '-25%' : '100%',
    opacity: dir > 0 ? 0 : 1,
  }),
};

const pageTransition = { duration: DURATION, ease: IOS_EASE };

export const FarmsSidebar = () => {
  const [searchText, setSearchText] = useState('');
  const [direction, setDirection] = useState(1);
  const mapInstance = useAtomValue(mapInstanceAtom);
  const selectFarm = useSetAtom(selectFarmAtom);
  const selectLand = useSetAtom(selectLandAtom);
  const setDevicePopup = useSetAtom(devicePopupAtom);
  const navigate = useNavigate();
  const { farmId } = useParams();

  const { data: dbDevices } = useDevicesQuery();
  const cameras = useMemo<CameraData[]>(() => {
    if (!dbDevices) return [];
    return dbDevices
      .filter((d) => d.device_type === 'camera')
      .map(toCameraData);
  }, [dbDevices]);

  const solarCells = useMemo<SolarCellData[]>(() => {
    if (!dbDevices) return [];
    return dbDevices
      .filter((d) => d.device_type === 'solar_cell')
      .map(toSolarCellData);
  }, [dbDevices]);

  const { data: dbFarms = [], isLoading } = useFarmsQuery();
  const farms = useMemo(() => dbFarms.map(toFarm), [dbFarms]);

  const selectedFarm = useMemo(
    () => farms.find((f) => f.id === farmId),
    [farms, farmId],
  );
  const isDetail = !!selectedFarm;

  useEffect(() => {
    if (selectedFarm) {
      selectFarm({
        id: selectedFarm.id,
        name: selectedFarm.name,
        province: selectedFarm.province,
      });
    } else {
      selectFarm(null);
    }
  }, [selectedFarm, selectFarm]);

  const filteredFarms = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return farms;
    return farms.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.province.toLowerCase().includes(q),
    );
  }, [searchText, farms]);

  const goToFarm = (id: string) => {
    setDirection(1);
    navigate(`/farms/${id}`);
  };
  const goBack = () => {
    setDirection(-1);
    selectLand(null);
    navigate('/farms');
  };

  const listRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState<number>(0);

  useEffect(() => {
    const el = isDetail ? detailRef.current : listRef.current;
    if (!el) return;
    setPanelHeight(el.offsetHeight);
    const ro = new ResizeObserver(() => setPanelHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [isDetail, selectedFarm, filteredFarms]);

  useEffect(() => {
    if (!mapInstance) return;
    if (selectedFarm) {
      const polygons = selectedFarm.lands
        .filter((l) => l.coords.length >= 3)
        .map((l) => {
          const ring = [...l.coords];
          const [first, last] = [ring[0], ring[ring.length - 1]];
          if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);
          return turf.polygon([ring]);
        });
      if (polygons.length > 0) {
        const [w, s, e, n] = turf.bbox(turf.featureCollection(polygons));
        mapInstance.fitBounds(
          [
            [w, s],
            [e, n],
          ],
          {
            padding: { top: 60, bottom: 60, left: 400, right: 60 },
            duration: 1000,
            essential: true,
          },
        );
      }
      return;
    }
    mapInstance.flyTo({
      center: [101.4918194, 12.5352438],
      zoom: 5,
      duration: 1000,
    });
  }, [selectedFarm, mapInstance]);

  return (
    <Column className="pointer-events-auto bg-white/85 backdrop-blur-xl m-3 pt-1 rounded-3xl border border-gray-200 shadow-xl w-[400px] max-h-[calc(100vh-24px)] overflow-hidden">
      <motion.div
        className="relative overflow-hidden"
        animate={{ height: panelHeight || 'auto' }}
        transition={pageTransition}
      >
        <AnimatePresence initial={false} mode="sync" custom={direction}>
          {!isDetail ? (
            <motion.div
              key="list"
              ref={listRef}
              custom={direction}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                willChange: 'transform, opacity',
              }}
            >
              <FarmListPage
                farms={filteredFarms}
                searchText={searchText}
                onSearchChange={setSearchText}
                onSelectFarm={goToFarm}
                isLoading={isLoading}
              />
            </motion.div>
          ) : (
            <motion.div
              key={`detail-${farmId}`}
              ref={detailRef}
              custom={direction}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                willChange: 'transform, opacity',
              }}
            >
              <FarmDetailPage farm={selectedFarm} onBack={goBack} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <Outlet />
      {cameras.map((c) => (
        <CameraMarker
          key={c.id}
          camera={c}
          onClick={(cam) =>
            setDevicePopup({
              type: 'camera',
              lngLat: [cam.lng, cam.lat],
              camera: cam,
            })
          }
        />
      ))}
      {solarCells.map((sc) => (
        <SolarCellMarker
          key={sc.id}
          device={sc}
          onClick={(d) =>
            setDevicePopup({
              type: 'solar',
              lngLat: [d.lng, d.lat],
              solar: d,
            })
          }
        />
      ))}
    </Column>
  );
};
