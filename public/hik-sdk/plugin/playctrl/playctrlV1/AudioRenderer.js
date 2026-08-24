/**
 * Created by wangweijie5 on 2016/12/16.
 */

var _createClass = (() => {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ('value' in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }
  return (Constructor, protoProps, staticProps) => {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
})();

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError('Cannot call a class as a function');
  }
}

var __instance = (() => {
  var instance = void 0;
  return (newInstance) => {
    if (newInstance) instance = newInstance;
    return instance;
  };
})();

var AudioRenderer = (() => {
  function AudioRenderer() {
    _classCallCheck(this, AudioRenderer);

    if (__instance()) return __instance();

    // 确保只有单例
    if (AudioRenderer.unique !== undefined) {
      return AudioRenderer.unique;
    }

    AudioRenderer.unique = this;

    this.oAudioContext = null;
    this.currentVolume = 0.8; // 初始音量
    this.bSetVolume = false;
    this.gainNode = null;
    this.iWndNum = -1; // 窗口号
    this.mVolumes = new Map(); // 用于存储所有音量

    // Init AudioContext
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    this.oAudioContext = new AudioContext();

    this.writeString = (view, offset, string) => {
      for (var i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    this.setBufferToDataview = (output, offset, input) => {
      for (var i = 0; i < input.length; i++, offset++) {
        output.setUint8(offset, input[i]);
      }
    };

    __instance(this);
  }

  /**
   * @synopsis 音频播放
   *
   *  @param dataBuf [IN] 音频缓存
   *  @param dataLen [IN] 缓存长度
   *  @param audioInfo [IN] 音频参数
   *
   * @returns 状态码
   */

  _createClass(AudioRenderer, [
    {
      key: 'Play',
      value: function Play(dataBuf, dataLen, audioInfo) {
        var bufferData = new ArrayBuffer(44 + dataLen);
        var viewTalk = new DataView(bufferData);
        var sampleRates = audioInfo.samplesPerSec;
        var channels = audioInfo.channels;
        var bitsPerSample = audioInfo.bitsPerSample;

        //console.log("audiorender sampleRates"+sampleRates+"channels:"+channels+"bitsPerSample:"+bitsPerSample);

        /* RIFF identifier */
        this.writeString(viewTalk, 0, 'RIFF');
        /* file length */
        viewTalk.setUint32(4, 32 + dataLen * 2, true);
        /* RIFF type */
        this.writeString(viewTalk, 8, 'WAVE');
        /* format chunk identifier */
        this.writeString(viewTalk, 12, 'fmt ');
        /* format chunk length */
        viewTalk.setUint32(16, 16, true);
        /* sample format (raw) */
        viewTalk.setUint16(20, 1, true);
        /* channel count */
        viewTalk.setUint16(22, channels, true);
        /* sample rate */
        viewTalk.setUint32(24, sampleRates, true);
        /* byte rate (sample rate * block align) */
        viewTalk.setUint32(28, sampleRates * 2, true);
        /* block align (channel count * bytes per sample)/8 */
        viewTalk.setUint16(32, (channels * bitsPerSample) / 8, true);
        /* bits per sample */
        viewTalk.setUint16(34, bitsPerSample, true);
        /* data chunk identifier */
        this.writeString(viewTalk, 36, 'data');
        /* data chunk length */
        viewTalk.setUint32(40, dataLen, true);
        this.setBufferToDataview(viewTalk, 44, dataBuf);
        this.oAudioContext.decodeAudioData(
          viewTalk.buffer,
          (buffer) => {
            var bufferSource = this.oAudioContext.createBufferSource();
            if (bufferSource == null) {
              return -1;
            }

            bufferSource.buffer = buffer;
            bufferSource.start(0);

            if (this.gainNode == null || this.bSetVolume) {
              this.gainNode = this.oAudioContext.createGain();
              // self.gainNode.gain.value = self.currentVolume;
              // // self.currentVolume = self.gainNode.gain.value;
              // self.gainNode.connect(self.oAudioContext.destination);

              this.bSetVolume = false;
            }

            this.gainNode.gain.value = this.currentVolume;
            // self.currentVolume = self.gainNode.gain.value;
            this.gainNode.connect(this.oAudioContext.destination);

            bufferSource.connect(this.gainNode);
          },
          (e) => {
            console.log('decode error');
            return -1;
          },
        );

        return 0;
      },

      /**
       * @synopsis 停止播放
       *
       * @returns 返回音量
       */
    },
    {
      key: 'Stop',
      value: function Stop() {
        if (this.gainNode != null) {
          this.gainNode.disconnect();
          this.gainNode = null;
        }

        // this.oAudioContext.close();

        // AudioRenderer.unique = undefined;
        // __instance() = null;
        return true;
      },

      /**
       * @synopsis 设置音量
       *
       *  @param iVolume [IN] 音量
       *
       * @returns 状态码
       */
    },
    {
      key: 'SetVolume',
      value: function SetVolume(iVolume) {
        this.bSetVolume = true;
        this.currentVolume = iVolume;

        // 储存当前窗口设置音量值
        this.mVolumes.set(this.iWndNum, iVolume);
        return true;
      },

      /**
       * @synopsis 设置窗口号
       *
       *  @param iWndNum [IN] 窗口号
       *
       * @returns 状态码
       */
    },
    {
      key: 'SetWndNum',
      value: function SetWndNum(iWndNum) {
        this.iWndNum = iWndNum;

        // 获取当前窗口设置音量值
        var iVolume = this.mVolumes.get(iWndNum);
        if (iVolume == undefined) {
          iVolume = 0.8; // 默认音量
        }
        this.currentVolume = iVolume;

        return true;
      },

      /**
       * @synopsis 获取音量
       *
       * @returns 返回音量
       */
    },
    {
      key: 'GetVolume',
      value: function GetVolume() {
        // 获取当前窗口设置音量值
        var iVolume = this.mVolumes.get(this.iWndNum);
        if (iVolume == undefined) {
          iVolume = 0.8; // 默认音量
        }

        return iVolume;
      },
    },
  ]);

  return AudioRenderer;
})();
//# sourceMappingURL=AudioRenderer.js.map
