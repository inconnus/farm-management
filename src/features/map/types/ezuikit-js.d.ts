declare module 'ezuikit-js' {
  export type EZUIKitHandleError = (error: {
    type?: string;
    data?: { nErrorCode?: number };
  }) => void;

  export type EZUIKitPlayerOptions = {
    id: string;
    url: string;
    accessToken: string;
    width: number;
    height: number;
    template?: string;
    scaleMode?: number;
    staticPath?: string;
    language?: string;
    env?: { domain?: string };
    handleError?: EZUIKitHandleError;
    loggerOptions?: Record<string, unknown>;
    streamInfoCBType?: number;
  };

  export class EZUIKitPlayer {
    static readonly EVENTS: {
      readonly videoInfo: string;
      readonly audioInfo: string;
      readonly firstFrameDisplay: string;
      readonly streamInfoCB: string;
      [key: string]: string;
    };

    constructor(options: EZUIKitPlayerOptions);
    eventEmitter: {
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      off: (event: string, callback: (...args: unknown[]) => void) => void;
    };
    play: () => void;
    stop: () => void;
    destroy: () => void;
    openSound: () => void;
    closeSound: () => void;
    reSize: (width: number, height: number) => void;
  }
}
