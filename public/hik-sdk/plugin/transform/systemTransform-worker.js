
const RECORDRTP = 0;  //录制一份未经过转封装的码流原始数据，用于定位问题
let dataType = 1;

// 字母字符串转byte数组
function stringToBytes (str) {
  var ch, st, re = [];
  for (var i = 0; i < str.length; i++) {
    ch = str.charCodeAt(i);  // get char
    st = [];                 // set up "stack"
    do {
      st.push(ch & 0xFF);    // push byte to stack
      ch = ch >> 8;          // shift value down by 1 byte
    }
    while (ch);
    // add stack contents to result
    // done because chars have "wrong" endianness
    re = re.concat(st.reverse());
  }
  // return an array of bytes
  return re;
}

// 转封装库回调函数
self.STCallBack = function (fileIndex, indexLen, data, dataLen) {
  //stFrameInfo的类型见DETAIL_FRAME_INFO
  let stFrameInfo = Module._GetDetialFrameInfo();
  let nIsMp4Index = stFrameInfo.nIsMp4Index;

  //console.log("FrameType is " + stFrameType);	
  //console.log("nIsMp4Index is " + nIsMp4Index);
  //debugger
  var pData = new Uint8Array(dataLen);
  pData.set(Module.HEAPU8.subarray(data, data + dataLen));
  if (dataType === 1) {
    postMessage({ type: "outputData", buf: pData.buffer, dType: 1, frameInfo: stFrameInfo }, [pData.buffer]);
    dataType = 2;
  } else {
    if (nIsMp4Index) {
      postMessage({ type: "outputData", buf: pData.buffer, dType: 6, frameInfo: stFrameInfo }, [pData.buffer]); //6：索引类型
    } else {
      postMessage({ type: "outputData", buf: pData.buffer, dType: 2, frameInfo: stFrameInfo }, [pData.buffer]); //2:码流
    }
  }

  //stFrameInfo的类型见DETAIL_FRAME_INFO
  //let stFrameInfo = Module._GetDetialFrameInfo();
  //let stFrameType = stFrameInfo.nFrameType;
  //let nFrameNum = stFrameInfo.nFrameNum;
  //let nTimeStamp = stFrameInfo.nTimeStamp;
  //let nIsMp4Index = stFrameInfo.nIsMp4Index;

  //console.log("FrameType is " + stFrameType);	
  //console.log("nIsMp4Index is " + nIsMp4Index);	

}

// self.Module = { memoryInitializerRequest: loadMemInitFile(), TOTAL_MEMORY: 128*1024*1024 };
// importScripts('SystemTransform.js');
importScripts('libSystemTransform.js');

self.Module['onRuntimeInitialized'] = function () {
  postMessage({ type: "loaded" });
}
var pInputData1 = null;
var dataLen = 740;
var streamType = 0;

onmessage = function (e) {
  var data = e.data;
  if ("create" === data.type) {
    streamType = data.streamType;
    console.log("recode type(0 is rtp ,1 is ps):" + RECORDRTP);
    if (RECORDRTP) {
      postMessage({ type: "created" });
      postMessage({ type: "outputData", buf: data.buf, dType: 1 }, [data.buf]);
    } else {
      var iHeadLen = data.len;
      // var pHead = Module._malloc(iHeadLen);

      // var aData = Module.HEAPU8.subarray(pHead, pHead + iHeadLen);
      // aData.set(new Uint8Array(data.buf));

      var pHeadData = Module._malloc(iHeadLen);
      if (pHeadData === null) {
        console.log("inputdata malloc failed!!!");
        return -1;
      }
      let inputData = new Uint8Array(data.buf);
      Module.writeArrayToMemory(inputData, pHeadData);
      inputData = null;

      var iTransType = data.packType;//目标格式 RTP->PS RTP->MP4
      var iRet = Module._CreatHandle(pHeadData, iTransType, iHeadLen);
      if (iRet != 0) {
        console.log("_CreatHandle failed!");
      } else {
        if (data.options && data.options.pKeyData) {
          var secretInfo = data.options;
          var keyLen = secretInfo.nKeyLen;
          var pKeyData = Module._malloc(keyLen);
          if (pKeyData === null) {
            console.log("setEncryptKey malloc failed!!!");
            return -1;
          }
          var nKeySize = secretInfo.pKeyData.length
          var bufData = stringToBytes(secretInfo.pKeyData);
      
          let inputData = new Uint8Array(bufData);
          Module.writeArrayToMemory(inputData, pKeyData);
          inputData = null;
          
          var iRet = Module._SysTransSetEncryptKey(secretInfo.nKeyType, pKeyData, keyLen, nKeySize);
          if (iRet != 0) {
            console.log("_SysTransSetEncryptKey failed!");
          }
          if (pKeyData != null) {
            Module._free(pKeyData);
            pKeyData = null;
          }
        }
        iRet = Module._SysTransRegisterDataCallBack();
        if (iRet != 0) {
          console.log("_SysTransRegisterDataCallBack Failed:" + iRet);
        }

        iRet = Module._SysTransStart(null, null);
        if (iRet != 0) {
          console.log("_SysTransStart Failed:" + iRet);
        }
        postMessage({ type: "created" });
      }
      if (pHeadData != null) {
        Module._free(pHeadData);
        pHeadData = null;
      }
        }

    } else if ("inputData" === data.type) {
        // console.log("inputData 11");
    // console.log("inputdata type(0 is rtp ,1 is ps):"+ RECORDRTP);
    if (RECORDRTP) {
      var aFileData = new Uint8Array(data.buf);  // 拷贝一份
      var iBufferLen = aFileData.length;
      var szBufferLen = iBufferLen.toString(16);
      if (szBufferLen.length === 1) {
        szBufferLen = "000" + szBufferLen;
      } else if (szBufferLen.length === 2) {
        szBufferLen = "00" + szBufferLen;
      } else if (szBufferLen.length === 3) {
        szBufferLen = "0" + szBufferLen;
      }
      var aData = [0, 0, parseInt(szBufferLen.substring(0, 2), 16), parseInt(szBufferLen.substring(2, 4), 16)];
      for (var iIndex = 0, iDataLength = aFileData.length; iIndex < iDataLength; iIndex++) {
        aData[iIndex + 4] = aFileData[iIndex]
      }
      var dataUint8 = new Uint8Array(aData);
            postMessage({ type: "outputData", buf: dataUint8.buffer, dType: 2 }, [dataUint8.buffer]);
        } else {
            var iDataLen = data.len;
             //console.log("inputdata malloc iDataLen:"+iDataLen);
             
            // var pData = Module._malloc(iDataLen);

      // var aData = Module.HEAPU8.subarray(pData, pData + iDataLen);
      // aData.set(new Uint8Array(data.buf))
      if (pInputData1 === null || iDataLen > dataLen) {
        if (pInputData1 != null) {
          Module._free(pInputData1);
          pInputData1 = null;
        }
        pInputData1 = Module._malloc(iDataLen);
        dataLen = iDataLen;
      }
      let inputData = new Uint8Array(data.buf);
      Module.writeArrayToMemory(inputData, pInputData1);
      inputData = null;

      var iRet = Module._SysTransInputData(0, pInputData1, iDataLen);
      if (iRet != 0) {
        //console.log("_ST_InputData failed!");// 一开始会有一些失败，但是不影响后面的文件存储
      }


    }
  } else if ("release" === data.type) {
    console.log("release systemTransform");
    if (pInputData1 != null) {
      Module._free(pInputData1);
      pInputData1 = null;
    }
    var iRet = Module._SysTransStop();
    if (iRet != 0) {
      console.log("_SysTransStop failed!");
    }
    Module._SysTransRelease();
    if (iRet != 0) {
      console.log("_SysTransRelease failed!");
    }

    close();
  }
};