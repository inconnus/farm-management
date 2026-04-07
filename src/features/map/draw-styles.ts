const blue = '#3bb2d0';
const orange = '#fbb03b';
const white = '#fff';

export const customDrawStyles = [
  // 1. Polygon Fill — ซ่อนการเติมสีเฉพาะตอน select เพื่อเห็นแผนที่จริงใต้แปลงที่เลือก
  {
    id: 'gl-draw-polygon-fill',
    type: 'fill',
    filter: ['all', ['==', '$type', 'Polygon']],
    paint: {
      'fill-color': [
        'coalesce',
        ['get', 'user_color'],
        ['case', ['==', ['get', 'active'], 'true'], orange, white],
      ],
      'fill-opacity': [
        'case',
        ['==', ['get', 'user_selected'], 'true'],
        0,
        0.1,
      ],
    },
  },

  // 2. เงาเมื่อเลือกแปลง (วาดก่อนเส้นขอบจริง = อยู่ด้านล่าง)
  {
    id: 'gl-draw-polygon-selected-shadow',
    type: 'line',
    filter: [
      'all',
      ['==', '$type', 'Polygon'],
      ['==', ['get', 'user_selected'], 'true'],
    ],
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': '#000000',
      'line-opacity': 0.45,
      'line-width': 16,
      'line-blur': 10,
    },
  },

  // 3. Lines / Polygon Borders — ใช้สีจริงของแปลง (user_color) ทั้งปกติและเลือก
  {
    id: 'gl-draw-lines',
    type: 'line',
    filter: ['any', ['==', '$type', 'LineString'], ['==', '$type', 'Polygon']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': [
        'coalesce',
        ['get', 'user_color'],
        ['case', ['==', ['get', 'active'], 'true'], orange, blue],
      ],
      'line-dasharray': [
        'case',
        ['==', ['get', 'active'], 'true'],
        [0.2, 2],
        [2, 0],
      ],
      'line-width': ['case', ['==', ['get', 'user_selected'], 'true'], 3, 2],
      'line-opacity': 1,
    },
  },
  // 4. Point Styles
  {
    id: 'gl-draw-point-outer',
    type: 'circle',
    filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'feature']],
    paint: {
      'circle-radius': ['case', ['==', ['get', 'active'], 'true'], 7, 5],
      'circle-color': white,
    },
  },
  {
    id: 'gl-draw-point-inner',
    type: 'circle',
    filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'feature']],
    paint: {
      'circle-radius': ['case', ['==', ['get', 'active'], 'true'], 5, 3],
      'circle-color': [
        'coalesce',
        ['get', 'user_color'],
        ['case', ['==', ['get', 'active'], 'true'], orange, blue],
      ],
    },
  },
  // 5. Vertex Styles (จุดมุมขณะแก้ไข)
  {
    id: 'gl-draw-vertex-outer',
    type: 'circle',
    filter: [
      'all',
      ['==', '$type', 'Point'],
      ['==', 'meta', 'vertex'],
      ['!=', 'mode', 'simple_select'],
    ],
    paint: {
      'circle-radius': ['case', ['==', ['get', 'active'], 'true'], 7, 5],
      'circle-color': white,
    },
  },
  {
    id: 'gl-draw-vertex-inner',
    type: 'circle',
    filter: [
      'all',
      ['==', '$type', 'Point'],
      ['==', 'meta', 'vertex'],
      ['!=', 'mode', 'simple_select'],
    ],
    paint: {
      'circle-radius': ['case', ['==', ['get', 'active'], 'true'], 5, 3],
      'circle-color': orange,
    },
  },
  // 6. Midpoint Styles (จุดกึ่งกลาง)
  {
    id: 'gl-draw-midpoint',
    type: 'circle',
    filter: ['all', ['==', 'meta', 'midpoint']],
    paint: {
      'circle-radius': 3,
      'circle-color': orange,
    },
  },
];
