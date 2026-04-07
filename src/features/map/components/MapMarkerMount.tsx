import { mapInstanceAtom } from '@store/mapStore';
import { useAtomValue } from 'jotai';
import mapboxgl from 'mapbox-gl';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

type MapMarkerMountProps = {
  lat: number;
  lng: number;
  children?: ReactNode;
  popup?: ReactNode;
  onClick?: () => void;
  /** Increment (e.g. when parent route changes) to close an open marker popup without remounting the marker. */
  closePopupSignal?: number;
  /** Increment to forcefully open the popup programmatically. */
  openPopupSignal?: number;
};

export function MapMarkerMount({
  lat,
  lng,
  children,
  popup,
  onClick,
  closePopupSignal = 0,
  openPopupSignal = 0,
}: MapMarkerMountProps) {
  const map = useAtomValue(mapInstanceAtom);
  const [markerNode] = useState(() => document.createElement('div'));
  /** DOM node passed to Mapbox Popup.setDOMContent — portal target for `popup` (same React tree, no nested root). */
  const [popupContainer, setPopupContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  const hasPopup = popup != null;
  const hasCustomMarker = children != null;

  // useLayoutEffect so cleanup runs in the layout phase; avoid flushSync in cleanup (React 19 warns).
  useLayoutEffect(() => {
    if (!map) return;

    const marker = new mapboxgl.Marker({
      element: hasCustomMarker ? markerNode : undefined,
      anchor: 'center',
    }).setLngLat([lng, lat]);

    markerRef.current = marker;

    const el = marker.getElement();
    el.style.cursor = 'pointer';

    if (hasPopup) {
      const mount = document.createElement('div');
      setPopupContainer(mount);
      marker.setPopup(
        new mapboxgl.Popup({
          anchor: 'bottom',
          closeButton: false,
          className: 'custom-marker-popup',
        }).setDOMContent(mount),
      );
    }

    marker.addTo(map);

    const stop = (e: Event) => e.stopPropagation();
    const onMarkerClick = (e: MouseEvent) => {
      e.stopPropagation();
      onClick?.();
      if (marker.getPopup()) {
        marker.togglePopup();
      }
    };
    el.addEventListener('mousedown', stop);
    el.addEventListener('pointerdown', stop);
    el.addEventListener('click', onMarkerClick);

    return () => {
      el.removeEventListener('mousedown', stop);
      el.removeEventListener('pointerdown', stop);
      el.removeEventListener('click', onMarkerClick);
      setPopupContainer(null);
      marker.getPopup()?.remove();
      marker.remove();
      markerRef.current = null;
    };
  }, [map, lat, lng, markerNode, hasPopup, hasCustomMarker]);

  useEffect(() => {
    if (!closePopupSignal) return;
    markerRef.current?.getPopup()?.remove();
  }, [closePopupSignal]);

  useEffect(() => {
    if (!openPopupSignal) return;
    const popupObj = markerRef.current?.getPopup();
    if (popupObj && !popupObj.isOpen()) {
      markerRef.current?.togglePopup();
    }
  }, [openPopupSignal]);

  return (
    <>
      {createPortal(children, markerNode)}
      {popupContainer != null && popup != null
        ? createPortal(popup, popupContainer)
        : null}
    </>
  );
}
