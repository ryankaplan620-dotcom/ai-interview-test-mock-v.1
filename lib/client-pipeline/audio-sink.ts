/**
 * Shared audio sink.
 *
 * In Option B (audio routed only through Tavus's WebRTC track), there is a
 * single audio source — an AudioContext-owned MediaStreamDestination that the
 * TTS client writes PCM into and the Tavus avatar publishes outbound over
 * WebRTC. The user hears audio via the remote track Tavus returns, not via
 * local speakers.
 *
 * This module owns the AudioContext lifetime and the scheduling cursor so
 * PCM chunks from ElevenLabs queue up seamlessly with no gaps or overlap.
 */

export interface AudioSink {
  /**
   * MediaStream whose audio track is fed by pushPcm(). The avatar client
   * attaches `stream.getAudioTracks()[0]` as an outbound WebRTC sender.
   */
  readonly stream: MediaStream;

  /**
   * Push a chunk of 16-bit signed PCM at the sink's sample rate. Chunks are
   * scheduled back-to-back — concatenated audio plays without gaps.
   */
  pushPcm(pcm: Int16Array): void;

  /**
   * Time in ms until the last-queued chunk finishes playing. Used by the
   * TTS client to resolve `speak()` at the right moment.
   */
  msUntilQueueDrained(): number;

  /**
   * Drop all queued audio immediately. Called on turn cancellation.
   */
  flush(): void;

  /**
   * Tear down the AudioContext. Idempotent.
   */
  close(): void;

  /** Sample rate the sink expects. */
  readonly sampleRate: number;
}

interface CreateAudioSinkOptions {
  /** Sample rate of the incoming PCM. ElevenLabs pcm_22050 → 22050. */
  sampleRate: number;
}

export async function createAudioSink(opts: CreateAudioSinkOptions): Promise<AudioSink> {
  // Important: AudioContext sample rate is fixed at construction. Setting
  // sampleRate here matches the incoming PCM so no resampling is needed.
  // Browsers cap the allowable range — if the requested rate isn't supported,
  // we fall back to the default and resample ourselves on push.
  let ctx: AudioContext;
  try {
    ctx = new AudioContext({ sampleRate: opts.sampleRate });
  } catch {
    ctx = new AudioContext();
  }

  // Some browsers (Safari, iOS) start contexts suspended until user gesture.
  // The session-view's Start-call button provides the gesture context, so
  // resume() here is safe.
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      /* will retry on first push */
    }
  }

  const destination = ctx.createMediaStreamDestination();

  // Scheduling cursor — monotonically increasing AudioContext time at which
  // the next chunk should start. `start(t)` on an AudioBufferSourceNode
  // schedules playback at absolute AudioContext time t.
  let nextStartTime = 0;

  const needsResample = ctx.sampleRate !== opts.sampleRate;

  function pushPcm(pcm: Int16Array): void {
    if (pcm.length === 0) return;
    if (ctx.state === "suspended") void ctx.resume();

    // Convert int16 → float32 [-1, 1]
    const input = int16ToFloat32(pcm);
    const output = needsResample
      ? linearResample(input, opts.sampleRate, ctx.sampleRate)
      : input;

    const buffer = ctx.createBuffer(1, output.length, ctx.sampleRate);
    buffer.getChannelData(0).set(output);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(destination);

    const now = ctx.currentTime;
    const startAt = Math.max(now, nextStartTime);
    source.start(startAt);
    nextStartTime = startAt + buffer.duration;
  }

  function msUntilQueueDrained(): number {
    const remaining = nextStartTime - ctx.currentTime;
    return remaining > 0 ? remaining * 1000 : 0;
  }

  function flush(): void {
    // Can't cancel already-scheduled sources individually without tracking
    // each one. Reset the cursor so future pushes queue from "now".
    nextStartTime = ctx.currentTime;
  }

  function close(): void {
    try {
      destination.disconnect();
    } catch {
      /* noop */
    }
    if (ctx.state !== "closed") {
      void ctx.close().catch(() => {
        /* noop */
      });
    }
  }

  return {
    stream: destination.stream,
    pushPcm,
    msUntilQueueDrained,
    flush,
    close,
    sampleRate: ctx.sampleRate,
  };
}

// --------------------------------------------------------------------------
// PCM helpers
// --------------------------------------------------------------------------

function int16ToFloat32(src: Int16Array): Float32Array {
  const out = new Float32Array(src.length);
  for (let i = 0; i < src.length; i++) {
    const v = src[i];
    out[i] = v < 0 ? v / 32768 : v / 32767;
  }
  return out;
}

/** Linear resample — good enough for speech, much cheaper than sinc. */
function linearResample(src: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return src;
  const ratio = fromRate / toRate;
  const outLength = Math.floor(src.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcPos = i * ratio;
    const i0 = Math.floor(srcPos);
    const i1 = Math.min(i0 + 1, src.length - 1);
    const t = srcPos - i0;
    out[i] = src[i0] * (1 - t) + src[i1] * t;
  }
  return out;
}
