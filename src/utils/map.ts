export const landToLatLng = (lat: number[], lon: number[]) => {
  const latLng = Array.from({ length: lat.length }, (_, i) => [lat[i], lon[i]]);
  return latLng;
};
