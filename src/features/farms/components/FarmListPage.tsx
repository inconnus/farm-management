import { Column, Row } from '@app/layout';
import { FarmMarker, FarmSatelliteImage } from '@features/map/components';
import { Button, Chip, Label, Separator } from '@heroui/react';
import { DropdownMenu } from '@shared/ui/DropdownMenu';
import * as turf from '@turf/turf';
import { ChevronRight, MapPinIcon, PlusIcon, SearchIcon } from 'lucide-react';
import type { Farm } from '../transforms';

type Props = {
  farms: Farm[];
  searchText: string;
  onSearchChange: (v: string) => void;
  onSelectFarm: (id: string) => void;
  isLoading?: boolean;
};

export const FarmListPage = ({
  farms,
  searchText,
  onSearchChange,
  onSelectFarm,
  isLoading,
}: Props) => {
  return (
    <Column className="flex flex-col p-3 max-h-[calc(90vh)] ">
      <div className="px-3 pt-1 pb-2 flex items-center justify-center">
        <div className="w-1 shrink-0" />
        <span className="text-[17px] font-semibold text-gray-900">
          ฟาร์มทั้งหมด
        </span>
      </div>

      <Row className="items-center gap-2 bg-black/6 rounded-[10px] px-3 h-9">
        <SearchIcon size={14} className="text-gray-400 shrink-0" />
        <input
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
          placeholder="ค้นหา"
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </Row>

      <Separator className="my-2" />

      <Column className="flex-1 overflow-y-auto min-h-0 pr-2 -mr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {isLoading ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <svg
              className="h-6 w-6 animate-spin text-green-600"
              fill="none"
              viewBox="0 0 24 24"
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
            <Label className="text-gray-400 text-sm">กำลังโหลดฟาร์ม...</Label>
          </div>
        ) : (
          <>
            {farms.map((farm) => {
              // const {lat,lng} = turf.bbox(turf.featureCollection(farm.lands.map((land) => turf.polygon(land.coords))))
              const polygons = farm.lands
                .filter((l) => l.coords.length >= 3)
                .map((l) => {
                  const ring = [...l.coords];
                  const [first, last] = [ring[0], ring[ring.length - 1]];
                  if (first[0] !== last[0] || first[1] !== last[1])
                    ring.push(first);
                  return turf.polygon([ring]);
                });
              const collection = turf.featureCollection(polygons);
              const [lng, lat] = turf.centroid(collection).geometry.coordinates;
              return (
                <>
                  <button
                    key={farm.id}
                    type="button"
                    className="w-full flex items-center gap-3 p-2  rounded-2xl hover:bg-black/5 transition-colors text-left cursor-pointer"
                    onClick={() => onSelectFarm(farm.id)}
                  >
                    <FarmSatelliteImage
                      lands={farm.lands}
                      fallbackSrc={farm.image}
                      width={56}
                      height={56}
                      padding={15}
                      alt={farm.name}
                      className="w-14 h-14 rounded-xl object-cover shrink-0"
                    />
                    <Column className="flex-1 min-w-0 items-start">
                      <span className="font-medium text-[15px]">
                        {farm.name}
                      </span>
                      <span className="text-gray-400 text-[12px]">
                        {farm.plotCount} แปลง
                      </span>
                      <Chip className="mt-0.5">
                        <MapPinIcon size={13} color="#ebebec" fill="red" />
                        <Chip.Label className="text-[11px]">
                          {farm.province}
                        </Chip.Label>
                      </Chip>
                    </Column>
                    <ChevronRight
                      size={15}
                      className="text-gray-300 shrink-0"
                    />
                    <DropdownMenu />
                  </button>
                  <FarmMarker
                    key={farm.id}
                    farm={{
                      id: farm.id,
                      name: farm.name,
                      image: farm.image,
                      lands: farm.lands,
                      lat,
                      lng,
                    }}
                    onClick={() => onSelectFarm(farm.id)}
                  />
                </>
              );
            })}
            {farms.length === 0 && (
              <Label className="text-center text-gray-400 py-6">
                {searchText ? 'ไม่พบฟาร์มที่ค้นหา' : 'ยังไม่มีฟาร์ม'}
              </Label>
            )}
          </>
        )}
      </Column>
      <div className="mt-2 ">
        <Button
          className="w-full bg-[#03662c] text-white hover:bg-[#03662c]/80 border border-[#03662c]/30 font-bold tracking-wider uppercase text-xs"
          // onPress={() => setIsSummaryModalOpen(true)}
          size="lg"
        >
          ดูภาพรวมอุปกรณ์ (Overview)
        </Button>
      </div>
    </Column>
  );
};
