/**
 * Hik-Partner / Ezviz UIKit player wrapper
 * ต้องมี: JSPlugin, jQuery ($)
 */

var oPlugin = null;
var iWind = 0;
/** session เปลี่ยนเมื่อ destroy — กัน ajax/play ค้างจากรอบก่อน */
var activeSession = 0;
/** คิว teardown → init ไม่ชนกัน (สำคัญบน prod เมื่อเปิด popup ซ้ำ) */
var pluginLifecycle = Promise.resolve();
var TEARDOWN_GAP_MS = 200;

var EZVIZ_ENV = {
  domain: 'https://isgpopen.ezvizlife.com',
};

var API_LIVE_ADDRESS =
  'https://isgp.hik-partner.com/api/hpcgw/v1/device/live/address/get';
var API_TALK_URL = 'https://isgp.hik-partner.com/api/lapp/live/talk/url';

function swallowPluginResult(result) {
  if (result && typeof result.then === 'function') {
    return result.catch((err) => {
      if (err !== undefined) {
        console.warn('[HPPUIKit] plugin async:', err);
      }
    });
  }
  return Promise.resolve();
}

function callPlugin(plugin, method, args) {
  if (!plugin) {
    return Promise.resolve();
  }
  var fn = plugin[method];
  if (typeof fn !== 'function') {
    return Promise.resolve();
  }
  try {
    return swallowPluginResult(fn.apply(plugin, args || []));
  } catch (e) {
    return Promise.resolve();
  }
}

function teardownPluginAsync() {
  var plugin = oPlugin;
  var wind = iWind;
  oPlugin = null;
  iWind = 0;
  if (!plugin) {
    return Promise.resolve();
  }
  return callPlugin(plugin, 'JS_Stop', [wind])
    .then(() => callPlugin(plugin, 'JS_DestroyWorker', []))
    .then(
      () =>
        new Promise((resolve) => {
          setTimeout(resolve, TEARDOWN_GAP_MS);
        }),
    );
}

function scheduleTeardown() {
  pluginLifecycle = pluginLifecycle.then(teardownPluginAsync).catch(() => {});
  return pluginLifecycle;
}

function decodeTicket(ticket) {
  if (!ticket) {
    return '';
  }
  try {
    return window.atob(ticket);
  } catch (e) {
    return ticket;
  }
}

function notifyPlayError(p, message) {
  if (p.onPlayError) {
    p.onPlayError(message);
  } else {
    console.error('[HPPUIKit]', message);
  }
}

function markStreamStarted(p) {
  if (p.onStreamStart) {
    p.onStreamStart();
  }
}

/** เรียก JS_Play และกลืน promise reject ว่างจาก jsPlugin */
function invokeJSPlay(playArgs, p) {
  if (!oPlugin) {
    if (p) {
      notifyPlayError(p, 'JSPlugin ยังไม่พร้อม');
    }
    return null;
  }
  return callPlugin(oPlugin, 'JS_Play', playArgs).catch((e) => {
    if (p) {
      notifyPlayError(p, e && e.message ? e.message : 'JS_Play failed');
    }
    return undefined;
  });
}

function startPlayFromResponse(p, res, extraPlayArgs) {
  if (!res || !res.data || !res.data.url) {
    notifyPlayError(
      p,
      (res && (res.msg || res.message)) ||
        'API ไม่คืน URL สตรีม (ตรวจ token / device / code)',
    );
    return;
  }

  var playOpts = {
    playURL: res.data.url,
    ezuikit: true,
    env: EZVIZ_ENV,
    accessToken: decodeTicket(res.data.ticket),
  };

  var args = [res.data.url, playOpts, iWind];
  if (extraPlayArgs && extraPlayArgs.length) {
    args = args.concat(extraPlayArgs);
  }

  var pending = invokeJSPlay(args, p);
  if (pending && typeof pending.then === 'function') {
    pending
      .then(() => {
        markStreamStarted(p);
      })
      .catch(() => {
        markStreamStarted(p);
      });
  } else {
    markStreamStarted(p);
  }
}

/**
 * สร้าง/รีเซ็ต JSPlugin และผูก window callbacks
 * @param {Object} params
 * @param {string} params.wndId       - element id ของ container
 * @param {number} [params.width=600]
 * @param {number} [params.height=400]
 * @param {string} params.pluginPath - base path ของ plugin assets
 * @param {Function} [params.pluginErrorHandler]
 * @param {Function} [params.performanceLack]
 */
function initPlugin(params) {
  return scheduleTeardown().then(() => {
    oPlugin = new JSPlugin({
      szId: params.wndId,
      iWidth: params.width || 600,
      iHeight: params.height || 400,
      iMaxSplit: 1,
      iCurrentSplit: 1,
      szBasePath: params.pluginPath,
      oStyle: {
        border: '#343434',
        borderSelect: 'red',
        background: '#4C4B4B',
      },
    });

    oPlugin.JS_SetWindowControlCallback({
      windowEventSelect: (windowIndex) => {
        iWind = windowIndex;
      },

      pluginErrorHandler: (iWndIndex, iErrorCode, oError) => {
        if (params.pluginErrorHandler) {
          params.pluginErrorHandler(iWndIndex, iErrorCode, oError);
        }
      },

      windowEventOver: () => {},
      windowEventOut: () => {},
      windowEventUp: () => {},
      windowFullCcreenChange: () => {}, // ชื่อเดิมจาก SDK (สะกดผิด FullCcreen)
      firstFrameDisplay: () => {
        if (params.onFirstFrame) {
          params.onFirstFrame();
        }
      },

      performanceLack: () => {
        if (params.performanceLack) {
          params.performanceLack();
        }
      },
    });
  });
}

/**
 * @typedef {Object} HPPUIKitPlayerParams
 * @property {string} wndId
 * @property {number} [width]
 * @property {number} [height]
 * @property {string} pluginPath
 * @property {string} accessToken
 * @property {string} deviceSerial
 * @property {number} [channelNo=1]
 * @property {string} [code='']
 * @property {number} [quality=1]
 * @property {string} [method] - ใช้กับ playback (type ใน request body)
 * @property {Function} [pluginErrorHandler]
 * @property {Function} [performanceLack]
 */

var HPPUIKitPlayer = (() => {
  function HPPUIKitPlayer(params) {
    this.params = params;
    this._session = ++activeSession;
    this._ready = initPlugin(params);
  }

  HPPUIKitPlayer.prototype.whenReady = function () {
    return this._ready;
  };

  /** สตรีมสด */
  HPPUIKitPlayer.prototype.realplay = function () {
    var p = this.params;
    var session = this._session;

    this._ready.then(() => {
      if (session !== activeSession || !oPlugin) {
        return;
      }

      $.ajax({
        type: 'post',
        url: API_LIVE_ADDRESS,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + p.accessToken,
        },
        data: JSON.stringify({
          deviceSerial: p.deviceSerial,
          channelNo: p.channelNo || 1,
          code: p.code || '',
          quality: p.quality || 1,
        }),
        success: (res) => {
          if (session !== activeSession || !oPlugin) {
            return;
          }
          startPlayFromResponse(p, res);
        },
        error: (xhr) => {
          if (session !== activeSession) {
            return;
          }
          var msg =
            (xhr.responseJSON &&
              (xhr.responseJSON.msg || xhr.responseJSON.message)) ||
            xhr.statusText ||
            'เรียก API สตรีมไม่สำเร็จ';
          notifyPlayError(p, msg + (xhr.status ? ' (' + xhr.status + ')' : ''));
        },
      });
    });
  };

  /**
   * เล่นย้อนหลัง
   * @param {*} startMode - พารามิเตอร์ที่ส่งต่อให้ JS_Play (อาร์กิวเมนต์ที่ 4)
   * @param {*} endMode   - พารามิเตอร์ที่ส่งต่อให้ JS_Play (อาร์กิวเมนต์ที่ 5)
   * @param {string} [startTime='']
   * @param {string} [stopTime='']
   */
  HPPUIKitPlayer.prototype.playback = function (
    startMode,
    endMode,
    startTime,
    stopTime,
  ) {
    var p = this.params;
    var session = this._session;

    this._ready.then(() => {
      if (session !== activeSession || !oPlugin) {
        return;
      }

      $.ajax({
        type: 'post',
        url: API_LIVE_ADDRESS,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + p.accessToken,
        },
        data: JSON.stringify({
          deviceSerial: p.deviceSerial,
          channelNo: p.channelNo || 1,
          code: p.code || '',
          quality: p.quality || 1,
          startTime: startTime || '',
          stopTime: stopTime || '',
          type: p.method,
        }),
        success: (res) => {
          if (session !== activeSession || !oPlugin) {
            return;
          }
          startPlayFromResponse(p, res, [startMode, endMode]);
        },
        error: (xhr) => {
          if (session !== activeSession) {
            return;
          }
          var msg =
            (xhr.responseJSON &&
              (xhr.responseJSON.msg || xhr.responseJSON.message)) ||
            xhr.statusText ||
            'เรียก API playback ไม่สำเร็จ';
          notifyPlayError(p, msg + (xhr.status ? ' (' + xhr.status + ')' : ''));
        },
      });
    });
  };

  /** เปิดไมค์สองทาง */
  HPPUIKitPlayer.prototype.startTalk = function () {
    var p = this.params;

    $.ajax({
      type: 'post',
      url: API_TALK_URL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + p.accessToken,
      },
      data: JSON.stringify({
        deviceSerial: p.deviceSerial,
        channelNo: p.channelNo || 1,
      }),
      success: (res) => {
        if (!res.data) {
          return;
        }

        // โค้ดเดิมส่ง szStartDate, szEndDate (ตัวแปร global ภายนอก ถ้ามี)
        oPlugin.JS_StartTalk(
          res.data.url,
          {
            playURL: res.data.url,
            ezuikit: true,
            env: EZVIZ_ENV,
            accessToken: res.data.ticket, // talk ไม่ใช้ atob เหมือน live
          },
          iWind,
          typeof szStartDate !== 'undefined' ? szStartDate : undefined,
          typeof szEndDate !== 'undefined' ? szEndDate : undefined,
        );
      },
      error: (xhr, status, err) => {
        console.log(xhr, status, err);
      },
    });
  };

  HPPUIKitPlayer.prototype.stop = () => {
    if (!oPlugin) {
      return Promise.resolve();
    }
    return callPlugin(oPlugin, 'JS_Stop', [iWind]);
  };

  HPPUIKitPlayer.prototype.openSound = () => oPlugin.JS_OpenSound(iWind);

  HPPUIKitPlayer.prototype.closeSound = () => oPlugin.JS_CloseSound(iWind);

  HPPUIKitPlayer.prototype.getVolume = () => oPlugin.JS_GetVolume(iWind);

  HPPUIKitPlayer.prototype.setVolume = (volume) =>
    oPlugin.JS_SetVolume(iWind, volume);

  HPPUIKitPlayer.prototype.resize = (width, height) =>
    oPlugin.JS_Resize(width, height);

  HPPUIKitPlayer.prototype.fullScreen = () =>
    oPlugin.JS_FullScreenDisplay(true);

  HPPUIKitPlayer.prototype.capturePicture = (fileName) =>
    oPlugin.JS_CapturePicture(iWind, 'img', fileName);

  HPPUIKitPlayer.prototype.fast = () => oPlugin.JS_Fast(iWind);

  HPPUIKitPlayer.prototype.slow = () => oPlugin.JS_Slow(iWind);

  HPPUIKitPlayer.prototype.stopTalk = () => oPlugin.JS_StopTalk();

  HPPUIKitPlayer.prototype.destroy = () => {
    activeSession += 1;
    return scheduleTeardown();
  };

  return HPPUIKitPlayer;
})();
