import { atom } from 'jotai';
import type { Map } from 'mapbox-gl';

// Atom for storing the map instance
export const mapInstanceAtom = atom<Map | null>(null);

// Atom for image edit mode (toggles marker visibility)
export const isImageEditModeAtom = atom<boolean>(true);
