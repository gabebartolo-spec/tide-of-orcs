/** Web Audio playback: ambient loop, two music beds crossfaded on Replant, a boss track on boss waves, SFX from sim events, ducking. Missing files are skipped silently. */
import { AMBIENT, AUDIO, BOSS_BED, Bed, CUES, Cue, MUSIC, cueFor, nextBed } from '../data/audio';
import type { SimEvent } from '../sim/events';
import { quality } from '../render/quality';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private amb!: GainNode;
  private music!: GainNode;
  private beds = new Map<Bed, GainNode>();
  private bed: Bed = MUSIC[0];
  private boss!: GainNode;
  private bossSrc: AudioBufferSourceNode | null = null;
  /** A boss wave began before the boss track finished loading; start it when the load lands. */
  private bossPending = false;
  private bossStreamed = false;
  private bufs = new Map<string, AudioBuffer | null>();
  private lastAt = new Map<Cue, number>();
  private volume = 1;
  /** Phone tier (TB-218 P5): music and ambient stream through media elements instead of resident decoded PCM (about 150 MB). */
  private streams = new Map<string, HTMLAudioElement>();
  private streaming = false;

  constructor(private base = './audio/') {}

  private started = false;
  /** Build the context and gain graph without a gesture (it stays suspended): `new AudioContext` costs about 80 ms on a phone,
   *  so main.ts calls this at idle and the first touch only has to resume (TB-218 first-touch hitch). */
  prepare(): void {
    if (this.ctx || typeof AudioContext === 'undefined') return;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain(); this.master.gain.value = this.volume; this.master.connect(this.ctx.destination);
    this.amb = this.ctx.createGain(); this.amb.gain.value = AUDIO.ambientGain; this.amb.connect(this.master);
    this.music = this.ctx.createGain(); this.music.gain.value = AUDIO.musicGain; this.music.connect(this.master);
    this.streaming = quality.q.cheap && typeof Audio !== 'undefined';
    for (const b of MUSIC) { const g = this.ctx.createGain(); g.gain.value = b === this.bed ? 1 : 0; g.connect(this.music); this.beds.set(b, g); }
    this.boss = this.ctx.createGain(); this.boss.gain.value = 0; this.boss.connect(this.music);
  }

  /** Browsers need a user gesture before audio can start. The decodes run one at a time after the gesture frame, never in it. */
  unlock(): void {
    this.prepare();
    if (!this.ctx) return;
    void this.ctx.resume();
    if (this.started) return;
    this.started = true;
    setTimeout(() => void this.startLoads(), 0);
  }

  private async startLoads(): Promise<void> {
    const gap = (): Promise<void> => new Promise((r) => setTimeout(r, 40));   // a breath between decodes keeps touch frames short
    for (const b of MUSIC) {
      const g = this.beds.get(b)!;
      if (this.streaming) { if (b === this.bed) this.stream(b, g); }
      else { const buf = await this.load(b); if (buf) this.loop(buf, g); await gap(); }
    }
    if (this.streaming) this.stream(AMBIENT, this.amb);
    else { const b = await this.load(AMBIENT); if (b) this.loop(b, this.amb); await gap(); }
    for (const [c, d] of Object.entries(CUES)) { await this.load(d.file ?? c, c); await gap(); }
    if (!this.streaming) { const buf = await this.load(BOSS_BED); if (buf && this.bossPending) this.startBoss(); }
  }

  /** Play `name` as a looping media element into `out` (created once per name, then reused). */
  private stream(name: string, out: GainNode, fromStart = false): void {
    let el = this.streams.get(name);
    if (!el) {
      el = new Audio(`${this.base}${name}.mp3`); el.loop = true; el.preload = 'auto';
      this.streams.set(name, el);
      this.ctx!.createMediaElementSource(el).connect(out);
    }
    if (fromStart) el.currentTime = 0;
    void el.play().catch(() => { /* blocked or missing file: stay silent */ });
  }
  private halt(name: string, afterSecs: number): void {
    const el = this.streams.get(name); if (!el) return;
    setTimeout(() => el.pause(), afterSecs * 1000);
  }

  /** The page went to the background (TB-218): stop the audio clock and the output. */
  suspend(): void { if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend(); }
  resume(): void { if (this.ctx && this.ctx.state !== 'running') void this.ctx.resume(); }

  setVolume(v: number): void { this.volume = v; if (this.ctx) this.master.gain.value = v; }

  consume(events: SimEvent[]): void {
    for (const e of events) {
      if (e.t === 'replant') { this.endBoss(); this.swapBed(); }
      else if (e.t === 'bossStart') this.startBoss();
      else if (e.t === 'bossEnd' || e.t === 'gameReset') this.endBoss();
      const c = cueFor(e); if (c) this.play(c);
    }
  }

  private ramp(p: AudioParam, to: number, secs: number): void {
    const now = this.ctx!.currentTime; p.cancelScheduledValues(now); p.setValueAtTime(p.value, now); p.linearRampToValueAtTime(to, now + secs);
  }

  /** Boss track from its first bar; the run's bed fades out under it. */
  private startBoss(): void {
    const ctx = this.ctx; if (!ctx) return;
    if (this.streaming) {
      this.bossPending = false; this.stream(BOSS_BED, this.boss, true); this.bossStreamed = true;
      this.ramp(this.boss.gain, 1, AUDIO.bossFade);
      this.ramp(this.beds.get(this.bed)!.gain, 0, AUDIO.bossFade);
      return;
    }
    const buf = this.bufs.get(BOSS_BED);
    if (!buf) { this.bossPending = !this.bufs.has(BOSS_BED); return; }
    this.bossPending = false;
    this.bossSrc?.stop();
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(this.boss); src.start();
    this.bossSrc = src;
    this.ramp(this.boss.gain, 1, AUDIO.bossFade);
    this.ramp(this.beds.get(this.bed)!.gain, 0, AUDIO.bossFade);
  }

  private endBoss(): void {
    this.bossPending = false;
    if (this.bossStreamed && this.ctx) {
      this.bossStreamed = false;
      this.ramp(this.boss.gain, 0, AUDIO.bossFade);
      this.ramp(this.beds.get(this.bed)!.gain, 1, AUDIO.bossFade);
      this.halt(BOSS_BED, AUDIO.bossFade); return;
    }
    const ctx = this.ctx, src = this.bossSrc; if (!ctx || !src) return;
    this.ramp(this.boss.gain, 0, AUDIO.bossFade);
    this.ramp(this.beds.get(this.bed)!.gain, 1, AUDIO.bossFade);
    src.stop(ctx.currentTime + AUDIO.bossFade); this.bossSrc = null;
  }

  /** Crossfade to the next music bed. Both beds loop from unlock, so the swap is gain only. */
  private swapBed(): void {
    const ctx = this.ctx; if (!ctx) return;
    const next = nextBed(this.bed);
    if (this.streaming) { this.stream(next, this.beds.get(next)!); this.halt(this.bed, AUDIO.crossfade); }
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

  private async load(name: string, key: string = name): Promise<AudioBuffer | null> {
    // OGG first where supported, then MP3 (Suno music exports MP3 only).
    const exts = new Audio().canPlayType('audio/ogg; codecs=vorbis') ? ['ogg', 'mp3'] : ['mp3'];
    let buf: AudioBuffer | null = null;
    for (const ext of exts) {
      try {
        const r = await fetch(`${this.base}${name}.${ext}`);
        if (r.ok) { buf = await this.ctx!.decodeAudioData(await r.arrayBuffer()); break; }
      } catch { buf = null; }
    }
    this.bufs.set(key, buf);
    return buf;
  }
}
