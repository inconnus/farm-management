import { Modal } from '@heroui/react';
import { SearchIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { IOTDevice } from '../data/api';

const PROVINCE_TO_REGION: Record<string, string> = {
  // Northern Region
  เชียงใหม่: 'ภาคเหนือ',
  เชียงราย: 'ภาคเหนือ',
  ลำปาง: 'ภาคเหนือ',
  ลำพูน: 'ภาคเหนือ',
  แม่ฮ่องสอน: 'ภาคเหนือ',
  น่าน: 'ภาคเหนือ',
  พะเยา: 'ภาคเหนือ',
  แพร่: 'ภาคเหนือ',
  อุตรดิตถ์: 'ภาคเหนือ',
  ตาก: 'ภาคเหนือ',
  สุโขทัย: 'ภาคเหนือ',
  พิษณุโลก: 'ภาคเหนือ',
  พิจิตร: 'ภาคเหนือ',
  เพชรบูรณ์: 'ภาคเหนือ',
  กำแพงเพชร: 'ภาคเหนือ',
  นครสวรรค์: 'ภาคเหนือ',
  อุทัยธานี: 'ภาคเหนือ',

  // Northeastern Region
  นครราชสีมา: 'ภาคตะวันออกเฉียงเหนือ',
  ขอนแก่น: 'ภาคตะวันออกเฉียงเหนือ',
  อุบลราชธานี: 'ภาคตะวันออกเฉียงเหนือ',
  อุดรธานี: 'ภาคตะวันออกเฉียงเหนือ',
  ชัยภูมิ: 'ภาคตะวันออกเฉียงเหนือ',
  บุรีรัมย์: 'ภาคตะวันออกเฉียงเหนือ',
  สุรินทร์: 'ภาคตะวันออกเฉียงเหนือ',
  ศรีสะเกษ: 'ภาคตะวันออกเฉียงเหนือ',
  ร้อยเอ็ด: 'ภาคตะวันออกเฉียงเหนือ',
  มหาสารคาม: 'ภาคตะวันออกเฉียงเหนือ',
  กาฬสินธุ์: 'ภาคตะวันออกเฉียงเหนือ',
  สกลนคร: 'ภาคตะวันออกเฉียงเหนือ',
  นครพนม: 'ภาคตะวันออกเฉียงเหนือ',
  มุกดาหาร: 'ภาคตะวันออกเฉียงเหนือ',
  ยโสธร: 'ภาคตะวันออกเฉียงเหนือ',
  อำนาจเจริญ: 'ภาคตะวันออกเฉียงเหนือ',
  เลย: 'ภาคตะวันออกเฉียงเหนือ',
  หนองคาย: 'ภาคตะวันออกเฉียงเหนือ',
  หนองบัวลำภู: 'ภาคตะวันออกเฉียงเหนือ',
  บึงกาฬ: 'ภาคตะวันออกเฉียงเหนือ',

  // Central Region
  กรุงเทพมหานคร: 'ภาคกลาง',
  นครปฐม: 'ภาคกลาง',
  นนทบุรี: 'ภาคกลาง',
  ปทุมธานี: 'ภาคกลาง',
  สมุทรปราการ: 'ภาคกลาง',
  สมุทรสาคร: 'ภาคกลาง',
  สมุทรสงคราม: 'ภาคกลาง',
  พระนครศรีอยุธยา: 'ภาคกลาง',
  อ่างทอง: 'ภาคกลาง',
  ลพบุรี: 'ภาคกลาง',
  สิงห์บุรี: 'ภาคกลาง',
  ชัยนาท: 'ภาคกลาง',
  สระบุรี: 'ภาคกลาง',
  สุพรรณบุรี: 'ภาคกลาง',
  กาญจนบุรี: 'ภาคกลาง',
  ราชบุรี: 'ภาคกลาง',
  เพชรบุรี: 'ภาคกลาง',
  ประจวบคีรีขันธ์: 'ภาคกลาง',
  นครนายก: 'ภาคกลาง',

  // Eastern
  ฉะเชิงเทรา: 'ภาคตะวันออก',
  ปราจีนบุรี: 'ภาคตะวันออก',
  สระแก้ว: 'ภาคตะวันออก',
  ชลบุรี: 'ภาคตะวันออก',
  ระยอง: 'ภาคตะวันออก',
  จันทบุรี: 'ภาคตะวันออก',
  ตราด: 'ภาคตะวันออก',

  // Southern Region
  ชุมพร: 'ภาคใต้',
  ระนอง: 'ภาคใต้',
  สุราษฎร์ธานี: 'ภาคใต้',
  พังงา: 'ภาคใต้',
  ภูเก็ต: 'ภาคใต้',
  กระบี่: 'ภาคใต้',
  ตรัง: 'ภาคใต้',
  นครศรีธรรมราช: 'ภาคใต้',
  พัทลุง: 'ภาคใต้',
  สงขลา: 'ภาคใต้',
  สตูล: 'ภาคใต้',
  ปัตตานี: 'ภาคใต้',
  ยะลา: 'ภาคใต้',
  นราธิวาส: 'ภาคใต้',
};

const getRegion = (province: string) => {
  return PROVINCE_TO_REGION[province] || 'ไม่ระบุภูมิภาค';
};

type SummaryModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  devices: IOTDevice[];
  telemetryMap: Map<string, any>;
};

export const SummaryModal = ({
  isOpen,
  onOpenChange,
  devices,
  telemetryMap,
}: SummaryModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('ทั้งหมด');

  const { stats, provinceData } = useMemo(() => {
    let onlineCount = 0;
    let offlineCount = 0;
    const pMap: Record<string, any> = {};

    devices.forEach((device) => {
      const hasTelemetry =
        telemetryMap.has(device.appIotId) || !!device.telemetry;
      const online = hasTelemetry;

      if (online) onlineCount++;
      else offlineCount++;

      const prov = device.province || 'ไม่ระบุจังหวัด';
      if (!pMap[prov]) {
        pMap[prov] = {
          province: prov,
          region: getRegion(prov),
          online: 0,
          offline: 0,
          total: 0,
        };
      }
      pMap[prov].total++;
      if (online) pMap[prov].online++;
      else pMap[prov].offline++;
    });

    return {
      stats: {
        online: onlineCount,
        offline: offlineCount,
        total: devices.length,
      },
      provinceData: Object.values(pMap).sort(
        (a: any, b: any) => b.total - a.total,
      ),
    };
  }, [devices, telemetryMap]);

  const filteredTableData = useMemo(() => {
    return provinceData.filter((row) => {
      const matchesSearch = row.province
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesRegion =
        regionFilter === 'ทั้งหมด' || row.region === regionFilter;
      return matchesSearch && matchesRegion;
    });
  }, [provinceData, searchTerm, regionFilter]);

  const onlinePercent =
    stats.total > 0 ? (stats.online / stats.total) * 100 : 0;

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-4xl bg-white text-gray-800 border border-gray-200 shadow-2xl">
            <Modal.CloseTrigger className="hover:bg-gray-100" />
            <Modal.Header className="border-b border-gray-100">
              <Modal.Heading className="font-bold uppercase tracking-wider text-gray-800">
                สรุปข้อมูลวิเคราะห์
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="pb-8">
              {/* SECTION 1: 3 Grid Layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                {/* Online */}
                <div className="bg-gray-50 border border-gray-100 rounded-2xl relative overflow-hidden flex flex-col justify-center p-6 shadow-sm">
                  <div className="absolute top-0 left-0 w-full border-t-4 border-[#10b981]" />
                  <span className="text-gray-500 uppercase tracking-widest text-xs mb-2 font-semibold">
                    อุปกรณ์ที่ออนไลน์
                  </span>
                  <div className="text-4xl font-extrabold text-[#10b981]">
                    {stats.online}
                  </div>
                  <span className="text-gray-400 text-xs mt-2">
                    การเชื่อมต่อที่ทำงานแบบเรียลไทม์
                  </span>
                </div>
                {/* Offline */}
                <div className="bg-gray-50 border border-gray-100 rounded-2xl relative overflow-hidden flex flex-col justify-center p-6 shadow-sm">
                  <div className="absolute top-0 left-0 w-full border-t-4 border-[#ef4444]" />
                  <span className="text-gray-500 uppercase tracking-widest text-xs mb-2 font-semibold">
                    อุปกรณ์ที่ออฟไลน์
                  </span>
                  <div className="text-4xl font-extrabold text-[#ef4444]">
                    {stats.offline}
                  </div>
                  <span className="text-gray-400 text-xs mt-2">
                    อุปกรณ์ที่ไม่สามารถติดต่อได้ในขณะนี้
                  </span>
                </div>
                {/* Chart */}
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col items-center relative">
                  <span className="text-gray-500 uppercase tracking-widest text-xs mb-4 font-semibold w-full text-left">
                    การเชื่อมต่ออุปกรณ์
                  </span>

                  <div className="flex gap-4 items-center">
                    <div className="relative flex justify-center items-center w-32 h-32">
                      <div
                        className="w-full h-full rounded-full"
                        style={{
                          background: `conic-gradient(#10b981 ${onlinePercent}%, #ef4444 ${onlinePercent}% 100%)`,
                        }}
                      />
                      {/* Donut hole */}
                      <div className="absolute w-[84px] h-[84px] bg-gray-50 rounded-full flex flex-col items-center justify-center">
                        <span className="text-gray-800 font-bold text-xl leading-none">
                          {stats.total}
                        </span>
                        <span className="text-gray-500 text-[10px]">อุปกรณ์</span>
                      </div>
                    </div>
                    {/* Legend */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#10b981]" />
                        <span className="text-gray-600 text-sm">ออนไลน์</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
                        <span className="text-gray-600 text-sm">ออฟไลน์</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Table Section */}
              <h3 className="text-gray-800 font-bold text-lg mt-6 mb-2">
                การกระจายฮาร์ดแวร์ตามภูมิภาค
              </h3>
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                {/* Controls */}
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-4 items-center rounded-t-2xl">
                  <div className="flex items-center bg-white rounded-lg px-3 py-2 w-full sm:max-w-xs border border-gray-200 hover:border-gray-300 transition-colors shadow-sm">
                    <SearchIcon size={16} className="text-gray-400 mr-2" />
                    <input
                      type="text"
                      placeholder="ค้นหาด้วยชื่อจังหวัด..."
                      className="bg-transparent text-gray-800 text-sm outline-none w-full placeholder:text-gray-400"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <select
                    className="bg-white text-gray-800 text-sm rounded-lg px-3 py-2 outline-none border border-gray-200 hover:border-gray-300 transition-colors sm:w-48 appearance-none shadow-sm"
                    value={regionFilter}
                    onChange={(e) => setRegionFilter(e.target.value)}
                    style={{
                      backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center',
                      backgroundSize: '16px',
                      paddingRight: '40px',
                    }}
                  >
                    <option value="ทั้งหมด">ภูมิภาคทั้งหมด</option>
                    <option value="ภาคเหนือ">ภาคเหนือ</option>
                    <option value="ภาคตะวันออกเฉียงเหนือ">
                      ภาคตะวันออกเฉียงเหนือ
                    </option>
                    <option value="ภาคกลาง">ภาคกลาง</option>
                    <option value="ภาคตะวันออก">ภาคตะวันออก</option>
                    <option value="ภาคใต้">ภาคใต้</option>
                  </select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-100 border-b border-gray-200 text-gray-700 font-bold sticky top-0 z-10">
                      <tr>
                        <th className="p-4">สถานที่ / จังหวัด</th>
                        <th className="p-4">ภูมิภาค</th>
                        <th className="p-4 text-center">ออนไลน์</th>
                        <th className="p-4 text-center">ออฟไลน์</th>
                        <th className="p-4 text-center">ติดตั้งทั้งหมด</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTableData.length > 0 ? (
                        filteredTableData.map((row: any, i: number) => (
                          <tr
                            key={i}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                          >
                            <td className="p-4 text-gray-800 font-medium">
                              {row.province}
                            </td>
                            <td className="p-4">
                              <div className="inline-block px-3 py-1 bg-gray-100 border border-gray-200 text-gray-600 rounded-full text-xs">
                                {row.region}
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              {row.online > 0 ? (
                                <span className="text-[#10b981] font-bold">
                                  {row.online}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              {row.offline > 0 ? (
                                <span className="text-[#ef4444] font-bold">
                                  {row.offline}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="p-4 text-center text-gray-800">
                              {row.total}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-8 text-center text-gray-500"
                          >
                            ไม่พบอุปกรณ์สำหรับเงื่อนไขการกรองนี้
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
