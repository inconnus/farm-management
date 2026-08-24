import { expect, test } from '@rstest/core';
import { toValidLngLat } from '../src/features/map/utils/lngLat';

test('returns [lng, lat] when both values are in range', () => {
  expect(toValidLngLat(101.49, 12.53)).toEqual([101.49, 12.53]);
});

test('swaps values when lat looks like longitude', () => {
  const warn = console.warn;
  console.warn = () => {};
  expect(toValidLngLat(12.53, 101.49)).toEqual([101.49, 12.53]);
  console.warn = warn;
});

test('skips marker when lat is invalid and not a swap', () => {
  const warn = console.warn;
  console.warn = () => {};
  expect(toValidLngLat(101.49, Number.NaN)).toBeNull();
  expect(toValidLngLat(200, 12.53)).toBeNull();
  expect(toValidLngLat(undefined, 12.53)).toBeNull();
  console.warn = warn;
});

test('warning includes marker id and invalid field', () => {
  const messages: string[] = [];
  const warn = console.warn;
  console.warn = (message: unknown) => {
    messages.push(String(message));
  };
  toValidLngLat(101.49, Number.NaN, {
    source: 'MapMarkerMount',
    id: 'device-1',
  });
  console.warn = warn;
  expect(messages[0]).toContain('id=device-1');
  expect(messages[0]).toContain('invalid=lat');
});
