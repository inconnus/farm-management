/** ข้อมูลแปลงที่ดิน — ใช้ร่วมกันระหว่าง map, selection store และ farm detail */
export type LandData = {
  id: string;
  farmId?: string;
  name: string;
  type: string;
  location: string;
  image: string;
  color: string;
  coords: [number, number][];
};
