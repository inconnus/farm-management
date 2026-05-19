/** Hikvision ISGP / HPP UIKit player (demo-isgp-prod2.0) */
export type HikCameraParams = {
  accessToken: string;
  deviceSerial: string;
  channelNo?: number | string;
  code?: string;
  /** 1 = HD, 2 = Smooth */
  quality?: number;
  /** 2 = local playback, 3 = cloud playback */
  method?: number;
};

export type HPPUIKitPlayerOptions = HikCameraParams & {
  wndId: string;
  width: number | string;
  height: number | string;
  pluginPath: string;
  pluginErrorHandler?: (
    iWndIndex: number,
    iErrorCode: number,
    oError: unknown,
  ) => void;
  performanceLack?: () => void;
};

export type HPPUIKitPlayerInstance = {
  realplay: () => void;
  playback: (
    szStartDate: string,
    szEndDate: string,
    szStartDate1: string,
    szEndDate1: string,
  ) => void;
  stop: () => unknown;
  destroy: () => unknown;
  resize: (width: number | string, height: number | string) => unknown;
  openSound: () => unknown;
  closeSound: () => unknown;
  getVolume: () => unknown;
  setVolume: (volume: number) => unknown;
  fullScreen: () => unknown;
  capturePicture: (type: string) => unknown;
};

declare global {
  interface Window {
    HPPUIKitPlayer?: new (
      options: HPPUIKitPlayerOptions,
    ) => HPPUIKitPlayerInstance;
    JSPlugin?: unknown;
    jQuery?: unknown;
  }
}

export {};
