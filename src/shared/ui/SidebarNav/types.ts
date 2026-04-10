import type { ReactNode } from 'react';

/** Navigation API ที่ส่งเข้า render function ของแต่ละ page */
export type SidebarNavAPI = {
  /** Push ไปหน้าถัดไป — pageKey ต้องตรงกับ key ของ SidebarPage */
  push: (pageKey: string) => void;
  /** Pop กลับหน้าก่อนหน้า */
  pop: () => void;
  /** ความลึกของ stack (0 = root) */
  depth: number;
  /** Page key ที่กำลังแสดงอยู่ */
  currentKey: string;
};

/** หน้าที่สามารถแสดงใน SidebarNav */
export type SidebarPage = {
  /** Unique key — ใช้สำหรับ push() และ AnimatePresence */
  key: string;
  /**
   * URL path segment (relative to basePath).
   * ใช้ `:param` สำหรับ dynamic segment เช่น `:farmId`
   * ใช้ `''` สำหรับ root page
   */
  path: string;
  /** Render function — รับ nav API เพื่อเรียก push/pop ได้ตรงๆ */
  render: (nav: SidebarNavAPI) => ReactNode;
};

export type SidebarNavProps = {
  /** Base URL path เช่น "/farms" */
  basePath: string;
  /** รายการหน้าทั้งหมด — หน้าแรกคือ root */
  pages: SidebarPage[];
  /** Content ที่ render นอก animated area (เช่น map markers) */
  children?: ReactNode;
  /** className ของ container */
  className?: string;
  /** Callback เมื่อเปลี่ยนหน้า */
  onPageChange?: (pageKey: string, direction: 'push' | 'pop') => void;
};
