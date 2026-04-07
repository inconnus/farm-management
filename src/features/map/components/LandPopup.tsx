import mapboxgl from 'mapbox-gl';
import { type ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

type MapPopupProps = {
  map: mapboxgl.Map;
  lngLat: [number, number];
  targetLngLat?: [number, number];
  children: ReactNode;
};

/** Portal เนื้อหาเข้า Mapbox Popup + จัดตำแหน่ง tip ตามขอบแปลง */
export const MapPopup = ({
  map,
  lngLat,
  targetLngLat,
  children,
}: MapPopupProps) => {
  const container = useRef(document.createElement('div'));

  useEffect(() => {
    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: '450px',
      className: 'custom-popup-portal',
      offset: 0,
      anchor: 'left',
    })
      .setLngLat(lngLat)
      .setDOMContent(container.current)
      .addTo(map);

    if (targetLngLat) {
      const updateTipPosition = () => {
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
        popup.remove();
      };
    }

    return () => {
      popup.remove();
    };
  }, [map, lngLat, targetLngLat]);

  return createPortal(children, container.current);
};
