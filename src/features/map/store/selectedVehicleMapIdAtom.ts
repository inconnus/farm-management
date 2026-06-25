import { atom } from 'jotai';

/** id รถไถที่เลือกจากแท็บงานอัตโนมัติ — แสดง path/marker บนแผนที่เมื่อมีค่า */
export const selectedVehicleMapIdAtom = atom<string | null>(null);
