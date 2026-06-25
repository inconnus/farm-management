import mapboxgl from 'mapbox-gl';
import { vehiclePopupLiveLngLatRef } from '@features/map/store/vehiclePopupLivePositionRef';
import { type ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

type MapPopupProps = {
  map: mapboxgl.Map;
  lngLat: [number, number];
  targetLngLat?: [number, number];
  /** ตามตำแหน่ง live จาก vehicle animation (อ่านจาก ref ทุก frame) */
  followLivePosition?: boolean;
  children: ReactNode;
};

/** Portal เนื้อหาเข้า Mapbox Popup + จัดตำแหน่ง tip ตามขอบแปลง */
export const MapPopup = ({
  map,
  lngLat,
  targetLngLat,
  followLivePosition = false,
  children,
}: MapPopupProps) => {
  const container = useRef(document.createElement('div'));
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const lngLatRef = useRef(lngLat);
  lngLatRef.current = lngLat;

  useEffect(() => {
    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: '450px',
      className: 'custom-popup-portal',
      offset: 0,
      anchor: 'left',
    })
      .setLngLat(lngLatRef.current)
      .setDOMContent(container.current)
      .addTo(map);

    popupRef.current = popup;

    return () => {
      popup.remove();
      popupRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    popupRef.current?.setLngLat(lngLat);
  }, [lngLat]);

  useEffect(() => {
    if (!followLivePosition) {
      vehiclePopupLiveLngLatRef.current = null;
      return;
    }

    vehiclePopupLiveLngLatRef.current = lngLatRef.current;

    let raf = 0;
    const tick = () => {
      const pos = vehiclePopupLiveLngLatRef.current;
      if (pos) popupRef.current?.setLngLat(pos);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      vehiclePopupLiveLngLatRef.current = null;
    };
  }, [followLivePosition, map]);

  useEffect(() => {
    if (!targetLngLat) return;

    const updateTipPosition = () => {
      const popup = popupRef.current;
      if (!popup) return;

      const popupContent = popup
        .getElement()
        ?.querySelector('.mapboxgl-popup-content');
      const popupTip = popup
        .getElement()
        ?.querySelector('.mapboxgl-popup-tip') as HTMLElement;
      if (popupContent && popupTip) {
        const contentRect = popupContent.getBoundingClientRect();
        const targetPoint = map.project(targetLngLat);
        const yOffset =
          targetPoint.y - (contentRect.top + contentRect.height / 2);
        const maxOffset = contentRect.height / 2 - 20;
        const clampedOffset = Math.max(
          -maxOffset,
          Math.min(maxOffset, yOffset),
        );
        popupTip.style.transform = `translateY(${Math.round(clampedOffset)}px)`;
      }
    };

    updateTipPosition();
    map.on('move', updateTipPosition);
    map.on('zoom', updateTipPosition);

    return () => {
      map.off('move', updateTipPosition);
      map.off('zoom', updateTipPosition);
    };
  }, [map, targetLngLat, lngLat]);

  return createPortal(children, container.current);
};
