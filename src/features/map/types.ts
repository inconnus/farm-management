/** ข้อมูลแปลงสำหรับ popup แผนที่ */
export type LandPopupData = {
  id: number | string;
  farmId?: string;
  name: string;
  type: string;
  location: string;
  image?: string;
  color?: string;
  coords: [number, number][];
};

/** รอยืนยัน → กำลังดำเนินการ → สำเร็จ */
export type TaskStatus = 'pending_confirmation' | 'in_progress' | 'done';

export type TeamMember = {
  id: string;
  name: string;
  avatarUrl?: string;
};

export type LandTask = {
  id: string;
  title: string;
  status: TaskStatus;
  assigneeId: string | null;
  /** ข้อความแสดงกำหนดเวลาแบบย่อ (เช่น วันนี้ 08:00) */
  dueLabel?: string;
  /** รายละเอียดงาน */
  description?: string;
};

/** ตั้งค่าโหลดเพิ่มเมื่อเลื่อนถึงท้ายรายการในแท็บนั้น (เช่น เรียก API แบบ cursor) */
export type TaskTabInfiniteProps = {
  hasMore?: boolean;
  onEndReached?: () => void;
  loading?: boolean;
};
