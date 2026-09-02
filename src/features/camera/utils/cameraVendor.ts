/** Ezviz / Veepai (Ezviz): serial 9 ตัว alphanumeric เช่น GK2156266 */
const EZVIZ_SERIAL_PATTERN = /^[A-Za-z0-9]{9}$/;

export function isEzvizCamera(deviceSerial: string | undefined | null): boolean {
  const id = deviceSerial?.trim() ?? '';
  return EZVIZ_SERIAL_PATTERN.test(id);
}
