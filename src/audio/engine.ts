/** Web Audio playback: ambient loop, two music beds crossfaded on Replant, a boss track on boss waves, SFX from sim events, ducking. Missing files are skipped silently. */
import { AMBIENT, AUDIO, BOSS_BED, Bed, CUES, Cue, MUSIC, cueFor, nextBed } from '../data/audio';
import type { SimEvent } from '../sim/events';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private amb!: GainNode;
  private music!: GainNode;
  private beds = new Map<Bed, GainNode>();
  private bed: Bed = MUSIC[0];
  private boss!: GainNode;
  private bossSrc: AudioBufferSourceNode | null = null;
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
    this.music = this.ctx.createGain(); this.music.gain.value = AUDIO.musicGain; this.music.connect(this.master);
    for (const b of MUSIC) {
      const g = this.ctx.createGain(); g.gain.value = b === this.bed ? 1 : 0; g.connect(this.music); this.beds.set(b, g);
      void this.load(b).then((buf) => { if (buf) this.loop(buf, g); });
    }
    this.boss = this.ctx.createGain(); this.boss.gain.value = 0; this.boss.connect(this.music);
    void this.load(BOSS_BED);
    for (const c of Object.keys(CUES)) void this.load(c);
    void this.load(AMBIENT).then((b) => { if (b) this.loop(b, this.amb); });
  }

  setVolume(v: number): void { this.volume = v; if (this.ctx) this.master.gain.value = v; }

  consume(events: SimEvent[]): void {
    for (const e of events) {
      if (e.t === 'replant') { this.endBoss(); this.swapBed(); }
      else if (e.t === 'bossStart') this.startBoss();
      else if (e.t === 'bossEnd') this.endBoss();
      const c = cueFor(e); if (c) this.play(c);
    }
  }

  private ramp(p: AudioParam, to: number, secs: number): void {
    const now = this.ctx!.currentTime; p.cancelScheduledValues(now); p.setValueAtTime(p.value, now); p.linearRampToValueAtTime(to, now + secs);
  }

  /** Boss track from its first bar; the run's bed fades out under it. */
  private startBoss(): void {
    const ctx = this.ctx, buf = this.bufs.get(BOSS_BED); if (!ctx || !buf) return;
    this.bossSrc?.stop();
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(this.boss); src.start();
    this.bossSrc = src;
    this.ramp(this.boss.gain, 1, AUDIO.bossFade);
    this.ramp(this.beds.get(this.bed)!.gain, 0, AUDIO.bossFade);
  }

  private endBoss(): void {
    const ctx = this.ctx, src = this.bossSrc; if (!ctx || !src) return;
    this.ramp(this.boss.gain, 0, AUDIO.bossFade);
    this.ramp(this.beds.get(this.bed)!.gain, 1, AUDIO.bossFade);
    src.stop(ctx.currentTime + AUDIO.bossFade); this.bossSrc = null;
  }

  /** Crossfade to the next music bed. Both beds loop from unlock, so the swap is gain only. */
  private swapBed(): void {
    const ctx = this.ctx; if (!ctx) return;
    const next = nextBed(this.bed);
    for (const [b, g] of this.beds) this.ramp(g.gain, b === next ? 1 : 0, AUDIO.crossfade);
    this.bed = next;
  }

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
    for (const [p, low, full] of [[this.amb.gain, AUDIO.duckGain, AUDIO.ambientGain], [this.music.gain, AUDIO.musicDuckGain, AUDIO.musicGain]] as const) {
      p.cancelScheduledValues(now); p.setValueAtTime(low, now); p.linearRampToValueAtTime(full, now + AUDIO.duckRelease);
    }
  }

  private loop(b: AudioBuffer, out: GainNode): void {
    const src = this.ctx!.createBufferSource(); src.buffer = b; src.loop = true; src.connect(out); src.start();
  }

  private async load(name: string): Promise<AudioBuffer | null> {
    // OGG first where supported, then MP3 (Suno music exports MP3 only).
    const exts = new Audio().canPlayType('audio/ogg; codecs=vorbis') ? ['ogg', 'mp3'] : ['mp3'];
    let buf: AudioBuffer | null = null;
    for (const ext of exts) {
      try {
        const r = await fetch(`${this.base}${name}.${ext}`);
        if (r.ok) { buf = await this.ctx!.decodeAudioData(await r.arrayBuffer()); break; }
      } catch { buf = null; }
    }
    this.bufs.set(name, buf);
    return buf;
  }
}
