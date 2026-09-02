export const PTZ_SPEED = 50;

export type PtzDirection = 'up' | 'right' | 'down' | 'left';

export function ptzVector(direction: PtzDirection): { pan: number; tilt: number } {
  switch (direction) {
    case 'up':
      return { pan: 0, tilt: PTZ_SPEED };
    case 'right':
      return { pan: PTZ_SPEED, tilt: 0 };
    case 'down':
      return { pan: 0, tilt: -PTZ_SPEED };
    case 'left':
      return { pan: -PTZ_SPEED, tilt: 0 };
  }
}

export const PTZ_STOP = { pan: 0, tilt: 0 };
