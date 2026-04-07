import { Column, Row } from '@app/layout';
import { Button, Chip, Label, Separator, Tabs } from '@heroui/react';
import { useSetAtom } from 'jotai';
import { ChevronLeft, ChevronRight, MapPinIcon } from 'lucide-react';
import { triggerSelectLandAtom } from '@store/selectionStore';
import type { Farm, Land } from '../transforms';

type Props = {
  farm: Farm;
  onBack: () => void;
};

export const FarmDetailPage = ({ farm, onBack }: Props) => {
  const triggerSelectLand = useSetAtom(triggerSelectLandAtom);

  const handleLandClick = (land: Land) => {
    triggerSelectLand(land);
  };

  return (
    <Column>
      <div className="px-2 pt-1 pb-2">
        <Row className="items-center">
          <Button
            variant="ghost"
            size="sm"
            className="gap-0.5 text-[#007AFF] px-2"
            onPress={onBack}
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
            <span className="text-[15px]">ฟาร์ม</span>
          </Button>
          <span className="flex-1 text-center text-[17px] font-semibold text-gray-900 truncate px-2">
            {farm.name}
          </span>
          <div className="w-16 shrink-0" />
        </Row>
      </div>

      <Separator />

      <Row className="items-center gap-3 px-4 py-3">
        <img
          src={farm.image}
          alt={farm.name}
          className="w-14 h-14 rounded-xl object-cover shrink-0"
        />
        <Column className="min-w-0">
          <Label className="font-semibold text-[15px]">{farm.name}</Label>
          <Label className="text-gray-400 text-[12px]">
            {farm.plotCount} แปลง
          </Label>
          <Chip className="mt-0.5">
            <MapPinIcon size={13} color="#ebebec" fill="red" />
            <Chip.Label className="text-[11px]">{farm.province}</Chip.Label>
          </Chip>
        </Column>
      </Row>

      <Separator />

      <div className="px-3 pt-2 pb-3">
        <Tabs className="w-full" variant="secondary">
          <Tabs.ListContainer>
            <Tabs.List aria-label="Farm details">
              <Tabs.Tab id="plots">
                แปลงที่ดิน <Tabs.Indicator className="bg-[#03662c]" />
              </Tabs.Tab>
              <Tabs.Tab id="analytics" className="text-white">
                Analytics <Tabs.Indicator className="bg-[#03662c]" />
              </Tabs.Tab>
              <Tabs.Tab id="reports" className="text-white">
                Reports <Tabs.Indicator className="bg-[#03662c]" />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>

          <Tabs.Panel className="p-0 pt-2" id="plots">
            <Column className="gap-1.5 bg-white/50 rounded-2xl p-2">
              {farm.lands.map((land) => (
                <Row
                  key={land.id}
                  onClick={() => handleLandClick(land)}
                  className="items-center rounded-xl p-2.5 hover:bg-black/5 transition-colors cursor-pointer"
                >
                  <div
                    className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center"
                    style={{
                      background: `${land.color}22`,
                      border: `1.5px solid ${land.color}55`,
                    }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: land.color }}
                    />
                  </div>
                  <Column className="ml-2.5 min-w-0">
                    <Label className="font-medium text-sm">{land.name}</Label>
                    <Chip
                      className="w-fit mt-0.5"
                      style={{
                        background: `${land.color}22`,
                        color: land.color,
                      }}
                    >
                      <Chip.Label className="text-[11px]">
                        {land.type}
                      </Chip.Label>
                    </Chip>
                  </Column>
                  <ChevronRight
                    size={14}
                    className="text-gray-300 ml-auto shrink-0"
                  />
                </Row>
              ))}
              {farm.lands.length === 0 && (
                <Label className="text-center text-gray-400 py-4 text-sm">
                  ยังไม่มีแปลงที่ดิน
                </Label>
              )}
            </Column>
          </Tabs.Panel>

          <Tabs.Panel className="pt-4" id="analytics">
            <p className="text-gray-500 text-sm">
              Track your metrics and analyze performance data.
            </p>
          </Tabs.Panel>
          <Tabs.Panel className="pt-4" id="reports">
            <p className="text-gray-500 text-sm">
              Generate and download detailed reports.
            </p>
          </Tabs.Panel>
        </Tabs>
      </div>
    </Column>
  );
};
