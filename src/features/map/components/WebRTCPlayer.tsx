import { Column } from '@app/layout';
import { LoaderCircleIcon, WifiOffIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type WebRTCPlayerProps = {
  url: string;
};

type ConnectionState = 'connecting' | 'connected' | 'failed';

const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

export const WebRTCPlayer = ({ url }: WebRTCPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<ConnectionState>('connecting');

  useEffect(() => {
    let cancelled = false;
    let pc: RTCPeerConnection | null = null;
    let ws: WebSocket | null = null;

    const cleanup = () => {
      ws?.close();
      pc?.close();
      ws = null;
      pc = null;
    };

    const fail = () => {
      if (!cancelled) setState('failed');
      cleanup();
    };

    const wsUrl = url.startsWith('ws')
      ? url
      : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${url}`;

    ws = new WebSocket(wsUrl);

    const timeout = setTimeout(() => {
      console.warn('[WebRTCPlayer] connection timeout');
      fail();
    }, 15000);

    ws.onopen = async () => {
      try {
        pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

        pc.ontrack = (ev) => {
          if (videoRef.current && ev.streams[0]) {
            videoRef.current.srcObject = ev.streams[0];
          }
        };

        pc.onconnectionstatechange = () => {
          if (cancelled) return;
          const s = pc!.connectionState;
          if (s === 'connected') {
            clearTimeout(timeout);
            setState('connected');
          } else if (s === 'failed' || s === 'disconnected' || s === 'closed') {
            fail();
          }
        };

        pc.onicecandidate = (ev) => {
          if (!ws || ws.readyState !== WebSocket.OPEN) return;
          const value = ev.candidate ? ev.candidate.candidate : '';
          ws.send(JSON.stringify({ type: 'webrtc/candidate', value }));
        };

        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        ws.send(JSON.stringify({ type: 'webrtc/offer', value: offer.sdp }));
      } catch (e) {
        console.error('[WebRTCPlayer] offer error', e);
        fail();
      }
    };

    let remoteSet = false;
    const pendingCandidates: string[] = [];

    ws.onmessage = async (ev) => {
      if (!pc) return;
      try {
        const msg = JSON.parse(ev.data);

        if (msg.type === 'webrtc/answer') {
          await pc.setRemoteDescription({ type: 'answer', sdp: msg.value });
          remoteSet = true;
          for (const c of pendingCandidates) {
            await pc.addIceCandidate({ candidate: c, sdpMid: '0' });
          }
          pendingCandidates.length = 0;
        } else if (msg.type === 'webrtc/candidate' && msg.value) {
          if (remoteSet) {
            await pc.addIceCandidate({ candidate: msg.value, sdpMid: '0' });
          } else {
            pendingCandidates.push(msg.value);
          }
        }
      } catch (e) {
        console.error('[WebRTCPlayer] message error', e);
      }
    };

    ws.onerror = (e) => {
      console.error('[WebRTCPlayer] ws error', e);
      clearTimeout(timeout);
      fail();
    };

    ws.onclose = (ev) => {
      console.warn('[WebRTCPlayer] ws closed', ev.code, ev.reason);
      clearTimeout(timeout);
      if (!cancelled && state !== 'connected') fail();
    };

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      cleanup();
    };
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state === 'failed') {
    return (
      <Column className="items-center justify-center h-full gap-3 text-red-400/80">
        <WifiOffIcon size={48} />
        <span className="text-sm">ไม่สามารถเชื่อมต่อ stream ได้</span>
        <span className="text-xs text-white/20">ตรวจสอบ URL หรือสัญญาณกล้อง</span>
      </Column>
    );
  }

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain bg-black"
      />
      {state === 'connecting' && (
        <Column className="absolute inset-0 items-center justify-center gap-2 text-white/50 bg-black/40">
          <LoaderCircleIcon size={32} className="animate-spin" />
          <span className="text-sm">กำลังเชื่อมต่อ...</span>
        </Column>
      )}
    </div>
  );
};
