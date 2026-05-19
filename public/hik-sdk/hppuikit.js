/**
 * Hik-Partner / Ezviz UIKit player wrapper
 * ต้องมี: JSPlugin, jQuery ($)
 */

var oPlugin = null;
var iWind = 0;

var EZVIZ_ENV = {
  domain: 'https://isgpopen.ezvizlife.com',
};

var API_LIVE_ADDRESS =
  'https://isgp.hik-partner.com/api/hpcgw/v1/device/live/address/get';
var API_TALK_URL =
  'https://isgp.hik-partner.com/api/lapp/live/talk/url';

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
  if (oPlugin) {
    oPlugin = null;
  }

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
    firstFrameDisplay: function () {},

    performanceLack: function () {
      if (params.performanceLack) {
        params.performanceLack();
      }
    },
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
    initPlugin(params);
  }

  /** สตรีมสด */
  HPPUIKitPlayer.prototype.realplay = function () {
    var self = this;
    var p = this.params;

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
        if (!res.data) {
          return;
        }

        oPlugin.JS_Play(
          res.data.url,
          {
            playURL: res.data.url,
            ezuikit: true,
            env: EZVIZ_ENV,
            accessToken: window.atob(res.data.ticket),
          },
          iWind
        );
      },
      error: function (xhr, status, err) {
        console.log(xhr, status, err);
      },
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
    var self = this;
    var p = this.params;

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
        if (!res.data) {
          return;
        }

        oPlugin.JS_Play(
          res.data.url,
          {
            playURL: res.data.url,
            ezuikit: true,
            env: EZVIZ_ENV,
            accessToken: window.atob(res.data.ticket),
          },
          iWind,
          startMode,
          endMode
        );
      },
      error: function (xhr, status, err) {
        console.log(xhr, status, err);
      },
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
    return oPlugin.JS_Stop(iWind);
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
    return oPlugin.JS_DestroyWorker();
  };

  return HPPUIKitPlayer;
})();