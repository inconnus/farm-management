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
var API_TALK_URL =
  'https://isgp.hik-partner.com/api/lapp/live/talk/url';

function swallowPluginResult(result) {
  if (result && typeof result.then === 'function') {
    return result.catch(function (err) {
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
    .then(function () {
      return callPlugin(plugin, 'JS_DestroyWorker', []);
    })
    .then(function () {
      return new Promise(function (resolve) {
        setTimeout(resolve, TEARDOWN_GAP_MS);
      });
    });
}

function scheduleTeardown() {
  pluginLifecycle = pluginLifecycle
    .then(teardownPluginAsync)
    .catch(function () {});
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
  return callPlugin(oPlugin, 'JS_Play', playArgs).catch(function (e) {
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
      .then(function () {
        markStreamStarted(p);
      })
      .catch(function () {
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
  return scheduleTeardown().then(function () {
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
      windowEventSelect: function (windowIndex) {
        iWind = windowIndex;
      },

      pluginErrorHandler: function (iWndIndex, iErrorCode, oError) {
        if (params.pluginErrorHandler) {
          params.pluginErrorHandler(iWndIndex, iErrorCode, oError);
        }
      },

      windowEventOver: function () {},
      windowEventOut: function () {},
      windowEventUp: function () {},
      windowFullCcreenChange: function () {}, // ชื่อเดิมจาก SDK (สะกดผิด FullCcreen)
      firstFrameDisplay: function () {
        if (params.onFirstFrame) {
          params.onFirstFrame();
        }
      },

      performanceLack: function () {
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

var HPPUIKitPlayer = (function () {
  'use strict';

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

    this._ready.then(function () {
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
        success: function (res) {
          if (session !== activeSession || !oPlugin) {
            return;
          }
          startPlayFromResponse(p, res);
        },
        error: function (xhr) {
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
    stopTime
  ) {
    var p = this.params;
    var session = this._session;

    this._ready.then(function () {
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
        success: function (res) {
          if (session !== activeSession || !oPlugin) {
            return;
          }
          startPlayFromResponse(p, res, [startMode, endMode]);
        },
        error: function (xhr) {
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
      success: function (res) {
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
          typeof szEndDate !== 'undefined' ? szEndDate : undefined
        );
      },
      error: function (xhr, status, err) {
        console.log(xhr, status, err);
      },
    });
  };

  HPPUIKitPlayer.prototype.stop = function () {
    if (!oPlugin) {
      return Promise.resolve();
    }
    return callPlugin(oPlugin, 'JS_Stop', [iWind]);
  };

  HPPUIKitPlayer.prototype.openSound = function () {
    return oPlugin.JS_OpenSound(iWind);
  };

  HPPUIKitPlayer.prototype.closeSound = function () {
    return oPlugin.JS_CloseSound(iWind);
  };

  HPPUIKitPlayer.prototype.getVolume = function () {
    return oPlugin.JS_GetVolume(iWind);
  };

  HPPUIKitPlayer.prototype.setVolume = function (volume) {
    return oPlugin.JS_SetVolume(iWind, volume);
  };

  HPPUIKitPlayer.prototype.resize = function (width, height) {
    return oPlugin.JS_Resize(width, height);
  };

  HPPUIKitPlayer.prototype.fullScreen = function () {
    return oPlugin.JS_FullScreenDisplay(true);
  };

  HPPUIKitPlayer.prototype.capturePicture = function (fileName) {
    return oPlugin.JS_CapturePicture(iWind, 'img', fileName);
  };

  HPPUIKitPlayer.prototype.fast = function () {
    return oPlugin.JS_Fast(iWind);
  };

  HPPUIKitPlayer.prototype.slow = function () {
    return oPlugin.JS_Slow(iWind);
  };

  HPPUIKitPlayer.prototype.stopTalk = function () {
    return oPlugin.JS_StopTalk();
  };

  HPPUIKitPlayer.prototype.destroy = function () {
    activeSession += 1;
    return scheduleTeardown();
  };

  return HPPUIKitPlayer;
})();