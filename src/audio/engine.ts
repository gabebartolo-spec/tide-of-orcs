/** Web Audio playback: ambient loop, SFX from sim events, ducking. Missing files are skipped silently. */
import { AMBIENT, AUDIO, CUES, Cue, cueFor } from '../data/audio';
import type { SimEvent } from '../sim/events';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private amb!: GainNode;
  private bufs = new Map<string, AudioBuffer | null>();
  private lastAt = new Map<Cue, number>();
  private volume = 1;

  constructor(private base = './audio/') {}

  /** Browsers need a user gesture before audio can start. */
  unlock(): void {
    if (this.ctx) { void this.ctx.resume(); return; }
    if (typeof AudioContext === 'undefined') return;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain(); this.master.gain.value = this.volume; this.master.connect(this.ctx.destination);
    this.amb = this.ctx.createGain(); this.amb.gain.value = AUDIO.ambientGain; this.amb.connect(this.master);
    for (const c of Object.keys(CUES)) void this.load(c);
    void this.load(AMBIENT).then((b) => { if (b) this.startAmbient(b); });
  }

  setVolume(v: number): void { this.volume = v; if (this.ctx) this.master.gain.value = v; }

  consume(events: SimEvent[]): void { for (const e of events) { const c = cueFor(e); if (c) this.play(c); } }

  play(cue: Cue): void {
    const ctx = this.ctx; if (!ctx || ctx.state !== 'running') return;
    const buf = this.bufs.get(cue); if (!buf) return;
    const def = CUES[cue], now = ctx.currentTime;
    if (now - (this.lastAt.get(cue) ?? -Infinity) < def.gap) return;
    this.lastAt.set(cue, now);
    const src = ctx.createBufferSource(); src.buffer = buf;
    src.playbackRate.value = 1 + (Math.random() * 2 - 1) * AUDIO.pitchJitter;
    const g = ctx.createGain(); g.gain.value = def.gain * AUDIO.sfxGain;
    src.connect(g).connect(this.master); src.start();
    if (def.duck) this.duck(now);
  }

  private duck(now: number): void {
    const p = this.amb.gain; p.cancelScheduledValues(now);
    p.setValueAtTime(AUDIO.duckGain, now); p.linearRampToValueAtTime(AUDIO.ambientGain, now + AUDIO.duckRelease);
  }

  private startAmbient(b: AudioBuffer): void {
    const src = this.ctx!.createBufferSource(); src.buffer = b; src.loop = true; src.connect(this.amb); src.start();
  }

  private async load(name: string): Promise<AudioBuffer | null> {
    const ext = new Audio().canPlayType('audio/ogg; codecs=vorbis') ? 'ogg' : 'mp3';
    let buf: AudioBuffer | null = null;
    try {
      const r = await fetch(`${this.base}${name}.${ext}`);
      if (r.ok) buf = await this.ctx!.decodeAudioData(await r.arrayBuffer());
    } catch { buf = null; }
    this.bufs.set(name, buf);
    return buf;
  }
}
