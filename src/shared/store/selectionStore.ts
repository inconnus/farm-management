import type { LandData } from '@shared/types/lands';
import { atom } from 'jotai';

export const triggerSelectLandAtom = atom<LandData | null>(null);

// ─── Types ───────────────────────────────────────────────────────

export type SelectedFarm = {
  id: string;
  name: string;
  province: string;
  [key: string]: unknown;
};

export type SelectedLand = LandData & {
  [key: string]: unknown;
};

export type SelectionState = {
  farm: SelectedFarm | null;
  land: SelectedLand | null;
  extra: Record<string, unknown>;
};

// ─── Base atom ───────────────────────────────────────────────────

export const selectionAtom = atom<SelectionState>({
  farm: null,
  land: null,
  extra: {},
});

// ─── Derived read atoms ──────────────────────────────────────────

export const selectedFarmAtom = atom((get) => get(selectionAtom).farm);
export const selectedLandAtom = atom((get) => get(selectionAtom).land);
export const selectionExtraAtom = atom((get) => get(selectionAtom).extra);

// ─── Write helpers ───────────────────────────────────────────────

export const selectFarmAtom = atom(
  null,
  (_get, set, farm: SelectedFarm | null) => {
    set(selectionAtom, (prev) => ({
      ...prev,
      farm,
      land: null,
    }));
  },
);

export const selectLandAtom = atom(
  null,
  (_get, set, land: SelectedLand | null) => {
    set(selectionAtom, (prev) => ({ ...prev, land }));
  },
);

export const clearSelectionAtom = atom(null, (_get, set) => {
  set(selectionAtom, { farm: null, land: null, extra: {} });
});

export const setSelectionExtraAtom = atom(
  null,
  (_get, set, extra: Record<string, unknown>) => {
    set(selectionAtom, (prev) => ({
      ...prev,
      extra: { ...prev.extra, ...extra },
    }));
  },
);
