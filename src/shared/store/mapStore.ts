import type MapboxDraw from '@mapbox/mapbox-gl-draw';
import { atom } from 'jotai';
import type { Map } from 'mapbox-gl';

// Atom for storing the map instance
export const mapInstanceAtom = atom<Map | null>(null);

// Atom for storing the draw instance
export const drawInstanceAtom = atom<MapboxDraw | null>(null);

// Atom for image edit mode (toggles marker visibility)
export const isImageEditModeAtom = atom<boolean>(true);

// Atom for polygon edit mode (toggles select/drag/edit features)
export const isPolygonEditModeAtom = atom<boolean>(false);
