import { Column, Row } from '@app/layout';
import { HourglassIcon } from 'lucide-react';

type Props = {
  name: string;
  taskCount?: number;
};

export const TaskLabel = ({ name, taskCount = 0 }: Props) => {
  return (
    <Column className="px-2 py-1 text-center truncate text-white gap-1 items-center">
      <Row className="items-center gap-1">
        {/* <img
          src="https://kkndpqqmsswhgnupsznq.supabase.co/storage/v1/object/public/Public/durian.png"
          alt="profile"
          className="w-3 h-3 rounded-lg object-cover"
        /> */}
        <span className="text-sm stroke-black stroke-3">{name}</span>
      </Row>
      {taskCount > 0 && (
        <Row className="items-center gap-1 rounded-full shadow-md text-[12px] text-white border bg-black/40 border-white/20 backdrop-blur-sm px-2 py-0.5 w-fit whitespace-nowrap">
          <HourglassIcon size={12} color="#ffca24" />
          <span>{taskCount} งาน</span>
        </Row>
      )}
    </Column>
  );
};
