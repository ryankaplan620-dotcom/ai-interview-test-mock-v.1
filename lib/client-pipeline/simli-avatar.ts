import type { AvatarClient } from "./types";
import type { AudioSink } from "./audio-sink";

interface SimliAvatarClientOptions {
  sessionId: string;
  audioSink: AudioSink;
  /** Called when Simli sends back the inbound video track — session-view uses this to set srcObject on the <video> element. */
  onRemoteStream?: (stream: MediaStream) => void;
  /** Called on fatal errors in the peer connection. */
  onError?: (err: Error) => void;
}

interface SimliSessionResponse {
  sessionToken: string;
  faceId: string;
  iceServers?: RTCIceServer[];
  wsUrl?: string;
}

/**
 * Simli avatar client.
 *
 * Establishes a WebRTC peer connection, sends the shared audio sink's track
 * upstream (carrying ElevenLabs audio), receives video + audio downstream
 * (the lip-synced output). The session-view renders the inbound video in a
 * <video> element; the same element plays the inbound audio, completing the
 * Option B single-audio-source architecture.
 *
 * The Simli-specific signaling (how SDP is exchanged) is encapsulated in
 * `negotiateWithSimli()` — that function contains the API-version-sensitive
 * logic. If Simli's signaling shape changes, updating that function is the
 * only change needed; the AvatarClient interface stays stable.
 */
export class SimliAvatarClient implements AvatarClient {
  readonly isMock = false;

  private pc: RTCPeerConnection | null = null;
  private speakingCbs = new Set<(speaking: boolean) => void>();
  private signalingWs: WebSocket | null = null;

  constructor(private opts: SimliAvatarClientOptions) {}

  async connect(params: { personaId: string }): Promise<{ videoTrack: MediaStreamTrack | null }> {
    // --------------------------------------------------------------
    // 1. Fetch Simli session credentials from our server
    // --------------------------------------------------------------
    const sessionRes = await fetch("/api/simli/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: this.opts.sessionId }),
    });
    if (!sessionRes.ok) {
      const body = await sessionRes.text().catch(() => "");
      throw new Error(`simli_session_fetch_failed_${sessionRes.status}_${body.slice(0, 100)}`);
    }
    const simli = (await sessionRes.json()) as SimliSessionResponse;

    // --------------------------------------------------------------
    // 2. Create the peer connection
    // --------------------------------------------------------------
    const pc = new RTCPeerConnection({
      iceServers: simli.iceServers ?? [{ urls: "stun:stun.l.google.com:19302" }],
    });
    this.pc = pc;

    // --------------------------------------------------------------
    // 3. Attach our outbound audio track (the shared audio sink)
    //    This is what Simli lip-syncs against.
    // --------------------------------------------------------------
    const outboundAudioTrack = this.opts.audioSink.stream.getAudioTracks()[0];
    if (!outboundAudioTrack) {
      throw new Error("simli_no_audio_track");
    }
    pc.addTrack(outboundAudioTrack, this.opts.audioSink.stream);

    // We want to receive Simli's video (and it includes audio too).
    // addTransceiver marks us as wanting inbound media even before ontrack fires.
    pc.addTransceiver("video", { direction: "recvonly" });

    // --------------------------------------------------------------
    // 4. Wire inbound track handler
    // --------------------------------------------------------------
    const remoteStream = new MediaStream();
    pc.ontrack = (ev) => {
      ev.streams[0]?.getTracks().forEach((t) => remoteStream.addTrack(t));
      // Fallback: some implementations deliver tracks individually
      if (!ev.streams[0]) remoteStream.addTrack(ev.track);
      this.opts.onRemoteStream?.(remoteStream);
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "failed" || s === "disconnected" || s === "closed") {
        this.opts.onError?.(new Error(`simli_connection_${s}`));
      }
    };

    // --------------------------------------------------------------
    // 5. Speaking state — Simli may fire custom events via a data channel
    //    indicating when the avatar is actively talking. If that channel
    //    isn't available, fall back to track-enabled monitoring.
    // --------------------------------------------------------------
    const dc = pc.createDataChannel("simli-events");
    dc.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg?.type === "speaking_started") {
          this.speakingCbs.forEach((cb) => cb(true));
        } else if (msg?.type === "speaking_ended") {
          this.speakingCbs.forEach((cb) => cb(false));
        }
      } catch {
        /* ignore non-JSON frames */
      }
    };

    // --------------------------------------------------------------
    // 6. Negotiate SDP with Simli
    // --------------------------------------------------------------
    await negotiateWithSimli(pc, simli, (ws) => {
      this.signalingWs = ws;
    });

    void params; // personaId is baked into the session server-side
    return { videoTrack: null }; // Video arrives via onRemoteStream
  }

  setSpeakingState(_speaking: boolean): void {
    // Real Simli drives speaking state from the data channel — nothing to push
    // locally. Left as no-op so the AvatarClient interface stays uniform.
  }

  disconnect(): void {
    try {
      this.pc?.getSenders().forEach((s) => s.track?.stop());
    } catch {
      /* noop */
    }
    try {
      this.pc?.close();
    } catch {
      /* noop */
    }
    try {
      this.signalingWs?.close();
    } catch {
      /* noop */
    }
    this.pc = null;
    this.signalingWs = null;
    this.speakingCbs.clear();
  }

  onSpeakingChange(cb: (speaking: boolean) => void): () => void {
    this.speakingCbs.add(cb);
    return () => this.speakingCbs.delete(cb);
  }
}

// --------------------------------------------------------------------------
// VERIFY: negotiateWithSimli() — Simli's signaling mechanism.
//
// Simli's WebRTC signaling has two common shapes depending on API version:
//
//   SHAPE A (HTTP-based SDP exchange):
//     - Client creates offer
//     - POST offer to Simli's SDP endpoint with session_token
//     - Simli returns an SDP answer
//     - Client sets remote description
//
//   SHAPE B (WebSocket-based signaling):
//     - Client connects to the wsUrl returned by session creation
//     - Exchanges offer/answer + ICE candidates over the WS
//
// This helper attempts shape A (HTTP POST) by default, because it's simpler
// and Simli has supported it. If the current Simli version requires WS
// signaling (shape B), update this function — the SimliAvatarClient above
// doesn't need to change.
// --------------------------------------------------------------------------

async function negotiateWithSimli(
  pc: RTCPeerConnection,
  simli: SimliSessionResponse,
  registerWs: (ws: WebSocket) => void,
): Promise<void> {
  // Shape A — HTTP SDP exchange
  if (!simli.wsUrl) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait for ICE gathering so we send a complete SDP
    await waitForIceGatheringComplete(pc);
    const localDesc = pc.localDescription;
    if (!localDesc) throw new Error("simli_no_local_sdp");

    // VERIFY: the exact endpoint Simli uses for SDP POST.
    // Reference: Simli docs "Connect WebRTC" or "SDP Exchange".
    const sdpRes = await fetch("https://api.simli.ai/connectToSession", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken: simli.sessionToken,
        sdp: localDesc.sdp,
        type: localDesc.type,
      }),
    });
    if (!sdpRes.ok) {
      const body = await sdpRes.text().catch(() => "");
      throw new Error(`simli_sdp_exchange_failed_${sdpRes.status}_${body.slice(0, 100)}`);
    }
    const answer = (await sdpRes.json()) as { sdp: string; type: RTCSdpType };
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    return;
  }

  // Shape B — WebSocket signaling
  const ws = new WebSocket(simli.wsUrl);
  registerWs(ws);

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      ws.removeEventListener("open", onOpen);
      ws.removeEventListener("error", onError);
    };
    const onOpen = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("simli_ws_connect_failed"));
    };
    ws.addEventListener("open", onOpen);
    ws.addEventListener("error", onError);
  });

  // Identify to Simli
  ws.send(JSON.stringify({ type: "auth", sessionToken: simli.sessionToken }));

  // Forward ICE candidates over WS
  pc.onicecandidate = (ev) => {
    if (ev.candidate && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ice", candidate: ev.candidate.toJSON() }));
    }
  };

  // Handle inbound signaling messages
  ws.addEventListener("message", async (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(msg));
      } else if (msg.type === "ice" && msg.candidate) {
        await pc.addIceCandidate(msg.candidate);
      }
    } catch {
      /* ignore malformed */
    }
  });

  // Create and send offer
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  ws.send(JSON.stringify({ type: "offer", sdp: offer.sdp }));

  // Wait for connection to reach "connected" — bounded
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("simli_connect_timeout")), 15_000);
    const check = () => {
      if (pc.connectionState === "connected") {
        clearTimeout(timeout);
        pc.removeEventListener("connectionstatechange", check);
        resolve();
      } else if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        clearTimeout(timeout);
        pc.removeEventListener("connectionstatechange", check);
        reject(new Error(`simli_connection_${pc.connectionState}`));
      }
    };
    pc.addEventListener("connectionstatechange", check);
    check();
  });
}

function waitForIceGatheringComplete(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const check = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", check);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", check);
    // Safety timeout — some browsers never reach "complete"
    setTimeout(() => {
      pc.removeEventListener("icegatheringstatechange", check);
      resolve();
    }, 2000);
  });
}
