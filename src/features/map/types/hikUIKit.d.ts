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
  onFirstFrame?: () => void;
  /** เรียกเมื่อ API คืน URL และสั่ง JS_Play แล้ว */
  onStreamStart?: () => void;
  onPlayError?: (message: string) => void;
};

export type HPPUIKitPlayerInstance = {
  realplay: () => void;
  whenReady?: () => Promise<void>;
  playback: (
    szStartDate: string,
    szEndDate: string,
    szStartDate1: string,
    szEndDate1: string,
  ) => void;
  stop: () => Promise<void>;
  destroy: () => Promise<void>;
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
    JSPlugin?: new (options: Record<string, unknown>) => {
      JS_Play: (...args: unknown[]) => unknown;
      JS_Stop: (index: number) => unknown;
      JS_Resize: (w: number | string, h: number | string) => unknown;
      JS_SetWindowControlCallback: (callbacks: Record<string, unknown>) => void;
      JS_DestroyWorker: () => unknown;
    };
    jQuery?: {
      ajax: (options: Record<string, unknown>) => void;
    };
  }
}

export {};
