# previews.py <frames root (game/, front/)> <out dir> <strike frame> : TB-212 round 3 review previews from render_orc.py frames.
# transition_walk_to_attack.png: last walk frames, then the attack's LK lead-in frames (argv 4, default 10), with the silhouette step (alpha IoU distance) per pair vs the median.
# front_attack_sheet.png: every attack frame (front, native ortho) in 256 px cells; grip_strike_2x.png: 2x crops of the fist at the strike, game + front.
import sys, os, re, json, statistics
from PIL import Image, ImageDraw
R, O, ST = sys.argv[1], sys.argv[2], int(sys.argv[3]); LK = int(sys.argv[4]) if len(sys.argv) > 4 else 10; os.makedirs(O, exist_ok=True); BG = (124, 150, 118, 255)
def fr(view, key, raw=False):
    d = os.path.join(R, view); fs = sorted((int(m.group(1)), f) for f in os.listdir(d) if (m := re.fullmatch(re.escape(key) + r"_(\d+)\.png", f)))
    return [(lambda im: im if raw else norm(im, key))(Image.open(os.path.join(d, f)).convert("RGBA")) for _, f in fs]
AN = json.load(open(os.path.join(R, "game", "anchors.json"), encoding="utf-8-sig")); REF = AN["orc.grunt"]  # same camera geometry front and game
def norm(im, key):  # anims render at their own ortho (attack 5.0); rescale to the walk's ortho about the anchor so the comparison has one scale, as pack_sprites does in game
    ax, ay, o = AN[key]; k = o / REF[2]
    if abs(k - 1) < 1e-6: return im
    big = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS); c = Image.new("RGBA", im.size, (0, 0, 0, 0))
    c.alpha_composite(big, (round(REF[0] - ax * k), round(REF[1] - ay * k))) if REF[0] - ax * k >= 0 and REF[1] - ay * k >= 0 else c.paste(big, (round(REF[0] - ax * k), round(REF[1] - ay * k)), big); return c
def step(a, b):  # 1 - IoU of the opaque masks
    A = a.getchannel("A").point(lambda v: 255 if v > 8 else 0); B = b.getchannel("A").point(lambda v: 255 if v > 8 else 0)
    from PIL import ImageChops
    i = ImageChops.multiply(A, B).histogram()[255]; u = ImageChops.lighter(A, B).histogram()[255]; return 1 - i / max(1, u)
def cell(im, box, sc=1, label=""):
    c = Image.new("RGBA", ((box[2] - box[0]) * sc, (box[3] - box[1]) * sc), BG); c.alpha_composite(im.crop(box).resize(c.size, Image.LANCZOS))
    ImageDraw.Draw(c).text((4, 4), label, fill=(0, 0, 0, 255)); return c
def grid(cells, cols, title):
    w, h = cells[0].size; s = Image.new("RGBA", (cols * w, (len(cells) + cols - 1) // cols * h + 24), (30, 30, 30, 255)); ImageDraw.Draw(s).text((6, 6), title, fill=(255, 255, 255, 255))
    for i, c in enumerate(cells): s.paste(c, ((i % cols) * w, 24 + (i // cols) * h))
    return s
for view in ("game", "front"):
    W, A = fr(view, "orc.grunt"), fr(view, "orc.grunt.attack")
    med = statistics.median([step(W[i], W[i + 1]) for i in range(len(W) - 1)] + [step(A[i], A[i + 1]) for i in range(len(A) - 1)])
    gaps = [step(w, A[0]) / med for w in W]; print(view, "median step %.3f" % med, "walk[0]->attack[0] %.2fx" % gaps[0], "worst phase %d %.2fx" % (max(range(len(W)), key=lambda i: gaps[i]), max(gaps)), "lead-in steps", ["%.2f" % (step(A[i], A[i + 1]) / med) for i in range(LK + 1)])
    seq = [(W[i], "walk %d" % i) for i in (len(W) - 2, len(W) - 1, 0)] + [(A[i], "attack %d%s" % (i, " (lead-in)" if i < LK else "")) for i in range(LK + 4)]
    grid([cell(im, (96, 40, 416, 420), 1, l + ("  step %.2fx" % (step(seq[j - 1][0], im) / med) if j else "")) for j, (im, l) in enumerate(seq)], 7,
         f"{view}: walk -> attack (walk 0 = first lead-in source); step = silhouette change vs median frame step {med:.3f}").convert("RGB").save(os.path.join(O, f"transition_walk_to_attack_{view}.png"))
F = fr("front", "orc.grunt.attack", True); grid([cell(im, (56, 0, 456, 470), 1, str(i)) for i, im in enumerate(F)], 10, "front attack, native ortho %.1f, every frame (0-%d lead-in)" % (AN["orc.grunt.attack"][2], LK - 1)).convert("RGB").save(os.path.join(O, "front_attack_sheet.png"))
for view in ("game", "front"):
    im = fr(view, "orc.grunt.attack")[ST]; b = im.getchannel("A").getbbox(); print(view, "strike bbox", b)
    cell(im, b, 2, f"{view} strike frame {ST}, 2x").convert("RGB").save(os.path.join(O, f"grip_strike_2x_{view}.png"))
