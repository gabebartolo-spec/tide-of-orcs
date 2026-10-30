/** Render-side particles and floating text, fed by sim events. Never touches sim state. */
interface Part { x: number; y: number; vx: number; vy: number; life: number; c: string; r: number }
interface Txt { x: number; y: number; s: string; c: string; life: number }

export class Particles {
  private parts: Part[] = [];
  private texts: Txt[] = [];

  burst(x: number, y: number, c: string, n: number, sp: number): void {
    for (let i = 0; i < n && this.parts.length < 800; i++) {
      const a = Math.random() * 6.28, v = sp * (0.3 + Math.random());
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5 + Math.random() * 0.4, c, r: 1.5 + Math.random() * 2 });
    }
  }
  text(x: number, y: number, s: string, c: string): void { if (this.texts.length < 120) this.texts.push({ x, y, s, c, life: 0.9 }); }

  update(dt: number): void {
    for (let i = this.parts.length - 1; i >= 0; i--) { const p = this.parts[i]!; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; if (p.life <= 0) this.parts.splice(i, 1); }
    for (let i = this.texts.length - 1; i >= 0; i--) { const t = this.texts[i]!; t.life -= dt; t.y -= 28 * dt; if (t.life <= 0) this.texts.splice(i, 1); }
  }

  draw(g: CanvasRenderingContext2D): void {
    for (const p of this.parts) { g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.c; g.fillRect(p.x, p.y, p.r, p.r); }
    g.globalAlpha = 1; g.font = '700 12px "Atkinson Hyperlegible", sans-serif'; g.textAlign = 'center';
    for (const t of this.texts) { g.globalAlpha = Math.min(1, t.life * 1.5); g.fillStyle = t.c; g.fillText(t.s, t.x, t.y); }
    g.globalAlpha = 1;
  }
}
