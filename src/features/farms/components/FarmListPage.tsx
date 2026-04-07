import { Column, Row } from '@app/layout';
import { DropdownMenu } from '@shared/ui/DropdownMenu';
import { Button, Chip, Label, Separator } from '@heroui/react';
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
    <Column>
      <div className="px-3 pt-2 pb-2 flex items-center justify-between">
        <div className="w-1 shrink-0" />
        <span className="text-[17px] font-semibold text-gray-900">
          ฟาร์มทั้งหมด
        </span>
        <Button isIconOnly variant="primary" size="sm">
          <PlusIcon size={16} />
        </Button>
      </div>

      <div className="px-3 pb-2">
        <Row className="items-center gap-2 bg-black/6 rounded-[10px] px-3 h-9">
          <SearchIcon size={14} className="text-gray-400 shrink-0" />
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
            placeholder="ค้นหา"
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </Row>
      </div>

      <Separator />

      <Column className="p-2 gap-0.5">
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
            {farms.map((farm) => (
              <button
                key={farm.id}
                type="button"
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-black/5 transition-colors text-left cursor-pointer"
                onClick={() => onSelectFarm(farm.id)}
              >
                <img
                  src={farm.image}
                  alt={farm.name}
                  className="w-12 h-12 rounded-xl object-cover shrink-0"
                />
                <Column className="flex-1 min-w-0 items-start">
                  <Label className="font-medium text-[15px]">{farm.name}</Label>
                  <Label className="text-gray-400 text-[12px]">
                    {farm.plotCount} แปลง
                  </Label>
                  <Chip className="mt-0.5">
                    <MapPinIcon size={13} color="#ebebec" fill="red" />
                    <Chip.Label className="text-[11px]">
                      {farm.province}
                    </Chip.Label>
                  </Chip>
                </Column>
                <ChevronRight size={15} className="text-gray-300 shrink-0" />
                <DropdownMenu />
              </button>
            ))}
            {farms.length === 0 && (
              <Label className="text-center text-gray-400 py-6">
                {searchText ? 'ไม่พบฟาร์มที่ค้นหา' : 'ยังไม่มีฟาร์ม'}
              </Label>
            )}
          </>
        )}
      </Column>
    </Column>
  );
};
