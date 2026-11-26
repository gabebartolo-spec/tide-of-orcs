"""Launch trailer take 2 (TB-277): cut, composite and mix from the shots in out2/shots.

Time runs on music B's measured beat grid (beats.json, librosa, 91.3 BPM). The trailer starts on beat 16 of the track (the
first hard downbeat, 10.70 s in) and plays straight to beat 120, then splices to beat 168 (the outro hits) and plays to the
song's own ending, so the cut ends on the track's final chord. The track's built-in break (beats 98-103) is where the wall falls.

Trailer beat k (0-based) is music beat 16 + k up to k = 104, then 168 + (k - 104). A bar is 4 beats (2.63 s).
Each EDL row: shot, start and end in trailer beats, the source in-frame (a number, or an event in the shot's meta.json to put on a
given beat), a crop path for page shots, and an optional caption. Video goes out as 1920x1080 30 fps H.264; audio is music B with
the game's own SFX from each shot's logged events, levelled to -14 LUFS.

Usage: python3 edit2.py [--preview] [--from K --to K]   (writes out2/cut/trailer.mp4)
"""
import json, os, subprocess, sys, math
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SHOTS = os.path.join(HERE, 'out2', 'shots')
CUT = os.path.join(HERE, 'out2', 'cut')
AUD = os.path.join(ROOT, 'public', 'audio')
FPS, W, H, SR = 30, 1920, 1080, 48000
BT = json.load(open(os.path.join(HERE, 'beats.json')))
SPLICE_K, SPLICE_TO = 104, 168            # trailer beat 104 = music beat 120 -> music beat 168
MUSIC_END = 119.6


def music_beat(k):
    return 16 + k if k <= SPLICE_K else SPLICE_TO + (k - SPLICE_K)


def T(k):
    """Trailer time (s) of trailer beat k (fractional k allowed)."""
    k0 = math.floor(k); f = k - k0
    def t(kk):
        b = music_beat(kk)
        base = BT[b] - BT[16] if kk <= SPLICE_K else (BT[120] - BT[16]) + (BT[b] - BT[SPLICE_TO])
        return base
    return t(k0) + f * (t(k0 + 1) - t(k0)) if f else t(k0)


TOTAL = (BT[120] - BT[16]) + (MUSIC_END - BT[SPLICE_TO])
NFRAMES = int(round(TOTAL * FPS))
fr = lambda t: int(round(t * FPS))

# ---------------- the cut ----------------
# in: int source frame, or ('ev', type, k) = put the shot's first `type` event (after frame `after`) on trailer beat k.
# crop (page shots, 3840x2160 sources): (cx0, cy0, w0) -> (cx1, cy1, w1) in source px, eased; w is the crop width (16:9).
EDL = [
    # arrival: the plain, the tide, the elf, the strike
    dict(shot='s01a_band', k=(0, 4), inf=20),   # the hook: the tide close, from the first frame
    dict(shot='s01b_wide', k=(4, 8), inf=10),
    dict(shot='s02_elf', k=(8, 12), inf=('loose', 9.0)),
    dict(shot='s03_strike', k=(12, 16), inf=('impact', 13.0)),
    # grow: the tree, the wolf, companions (2-beat cuts), armoury (a bar each)
    dict(shot='d04_grove', k=(16, 20), inf=('buy', 17.0), page=True, crop=((1920, 1125, 3680), (1920, 1125, 3680))),  # crop drops the legend strip
    dict(shot='s05_wolf', k=(20, 24), inf=10),
    dict(shot='s06a_bite', k=(24, 26), inf=('bite', 24.6)),
    dict(shot='s06b_hawk', k=(26, 28), inf=('hawkDive', 27.4), after=55),
    dict(shot='s06d_knives', k=(28, 32), inf=('knife', 28.3), after=60),
    dict(shot='s07a_fire', k=(32, 36), inf=16),
    dict(shot='s07b_frost', k=(36, 40), inf=('shatter', 39.4), after=135),
    dict(shot='s07c_storm', k=(40, 44), inf=20),
    # hold: section B of the track
    dict(shot='s08_hold', k=(44, 50), inf=2),
    dict(shot='s08b_melee', k=(50, 56), inf=90),
    dict(shot='s09a_tide', k=(56, 60), inf=15),
    dict(shot='s09b_splinter', k=(60, 64), inf=15),
    dict(shot='s10a_boss', k=(64, 68), inf=30),
    dict(shot='s10b_wall', k=(68, 74), inf=20),
    dict(shot='s10c_close', k=(74, 80), inf=40),
    # fall: the track's break
    dict(shot='s11_fall', k=(80, 88), inf=('barricadeFell', 82.25), fallgrade=82.25),  # the field stills and greys, as the game's own fallen dim
    # return
    dict(shot='d10a_paths', k=(88, 92), inf=10, page=True, crop=((1920, 1080, 3840), (1920, 1060, 3700))),
    dict(shot='d10b_camp', k=(92, 98), inf=10, page=True, crop=((1150, 1200, 2000), (1100, 1220, 1700))),   # lodge and forge
    dict(shot='d10b_camp', k=(98, 104), inf=100, page=True, crop=((2750, 1440, 1800), (2850, 1400, 1600))),  # hall and training yard
    # march again (after the splice, on the outro hits)
    dict(shot='s12a_late', k=(104, 112), inf=30),
    dict(shot='s13_end', k=(112, 999), inf=10, end=True),
]

CAPTIONS = {
    'c01': 'The tide comes from the east.',
    'c02': 'Aim. The bow does the rest.',
    'c03': 'Grow the grove.',
    'c06': 'Hold the line.',
    'c08': 'Every 25 waves, a champion.',
    'c09': 'One day the wall will fall.',
    'c10': "That day isn't a loss.",
}
FONT = os.path.join(ROOT, 'src', 'ui', 'fonts')


def load_meta(shot):
    p = os.path.join(SHOTS, shot, 'meta.json')
    return json.load(open(p)) if os.path.exists(p) else None


def src_frames(shot):
    d = os.path.join(SHOTS, shot)
    return sorted(f for f in os.listdir(d) if f.endswith('.jpg'))


def resolve_in(row):
    inf = row.get('inf', 0)
    if isinstance(inf, int):
        return inf
    typ, k = inf
    start_t = T(row['k'][0])
    if typ == 'buy':
        j = json.load(open(os.path.join(SHOTS, row['shot'] + '.json')))['buyAt']
        return j - fr(T(k) - start_t)
    meta = load_meta(row['shot'])
    after = row.get('after', 3)
    for i, m in enumerate(meta):
        if i < after:
            continue
        if any((e['t'] if isinstance(e, dict) else e) == typ for e in m['ev']):
            return max(0, i - fr(T(k) - start_t))
    print(f"  ! {row['shot']}: no '{typ}' event, using frame 0")
    return 0


# ---------------- picture ----------------
CAPS = [  # (png, start beat, end beat): captions sit over the cut, not over a shot, so one may run across a cut
    ('c01', 0.5, 3.6), ('c02', 8.5, 15.5), ('c03', 16.5, 23.5), ('c06', 48.5, 55.5), ('c08', 64.5, 71.0),
    ('c09', 82.6, 87.6), ('c10', 88.5, 95.5),
]
MANUAL_SFX = [  # (trailer beat, cue, gain): sounds for page shots and moments recorded before the shot began
    (17.0, 'bought', 0.8), (44.0, 'rallyHorn', 0.75), (64.0, 'bossRoar', 1.0), (88.0, 'replant', 0.8),
]
HITS = [  # (trailer beat, shake px, frames, flash): the roar and the fall land in the picture too
    (64.0, 9, 14, 0.0), (82.25, 16, 20, 0.35),
]
END_K = 112             # the final hit: the end card fades up over the plate
CAP_FADE = 7          # frames in and out
CAP_DRIFT = 10        # px the line rises over its life
_cache = {}


def png(name):
    if name not in _cache:
        _cache[name] = Image.open(os.path.join(HERE, 'out2', 'captions', name + '.png')).convert('RGBA')
    return _cache[name]


def ease(u):
    u = max(0.0, min(1.0, u)); return u * u * (3 - 2 * u)


def frame_for(row, j):
    """Output frame j of the cut, from this row's shot."""
    files = row['_files']; i = row['in'] + (j - row['_j0'])
    if i >= len(files):
        if not row.get('_warned'):
            print(f"  ! {row['shot']}: ran out of frames ({len(files)}), holding the last"); row['_warned'] = True
        i = len(files) - 1
    im = Image.open(os.path.join(SHOTS, row['shot'], files[i])).convert('RGB')
    if row.get('page'):
        sw, sh = im.size
        c = row.get('crop')
        if c:
            u = ease((j - row['_j0']) / max(1, row['_j1'] - row['_j0'] - 1))
            (x0, y0, w0), (x1, y1, w1) = c
            cx, cy, cw = x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, w0 + (w1 - w0) * u
            ch = cw * 9 / 16; l = max(0, min(sw - cw, cx - cw / 2)); t = max(0, min(sh - ch, cy - ch / 2))
            im = im.crop((round(l), round(t), round(l + cw), round(t + ch)))
        im = im.resize((W, H), Image.LANCZOS)
    elif im.size != (W, H):
        im = im.resize((W, H), Image.LANCZOS)
    return im


def overlay_caps(im, j):
    t = j / FPS
    for name, k0, k1 in CAPS:
        a, b = fr(T(k0)), fr(T(k1))
        if not (a <= j < b):
            continue
        alpha = min(1.0, (j - a) / CAP_FADE, (b - 1 - j) / CAP_FADE)
        alpha = ease(alpha)
        dy = round(CAP_DRIFT * (1 - (j - a) / max(1, b - a)))
        cap = png(name)
        if alpha < 1:
            cap = cap.copy(); cap.putalpha(cap.getchannel('A').point(lambda v: int(v * alpha)))
        base = im.convert('RGBA'); layer = Image.new('RGBA', (W, H)); layer.paste(cap, (0, dy - CAP_DRIFT // 2))
        im = Image.alpha_composite(base, layer).convert('RGB')
    return im


def end_card(im, j):
    """The plate dims, the title and the call to action fade up on the final hit; the last second fades to black."""
    j0 = fr(T(END_K)); u = ease((j - j0) / 14)
    if u > 0:
        from PIL import ImageFilter
        im = Image.blend(im, im.filter(ImageFilter.GaussianBlur(6)), u)   # the plate falls out of focus so the title owns the frame
    im = Image.eval(im, lambda v, a=1 - 0.62 * u: int(v * a))
    a = ease((j - j0 - 4) / 16)
    if a > 0:
        card = png('end')
        if a < 1:
            card = card.copy(); card.putalpha(card.getchannel('A').point(lambda v: int(v * a)))
        im = Image.alpha_composite(im.convert('RGBA'), card).convert('RGB')
    out = (NFRAMES - 1 - j) / 27
    if out < 1:
        im = Image.eval(im, lambda v, a=ease(out): int(v * a))
    return im


def fall_grade(im, j, k):
    """After the wall falls the run freezes; the plate drains to a cold, dim grey over a second and a half (the game dims the field too)."""
    d = j - fr(T(k))
    u = 0.6 * ease(d / 10) + 0.4 * ease((d - 10) / 50)
    if d < 0:
        return im
    from PIL import ImageEnhance
    im = ImageEnhance.Color(im).enhance(1 - 0.65 * u)
    return ImageEnhance.Brightness(im).enhance(1 - 0.45 * u)


def hit(im, j):
    """Shake (and a pale flash) on the big hits: the plate is scaled up a touch so the shake never shows an edge."""
    import random
    for k, amp, n, flash in HITS:
        d = j - fr(T(k))
        if not 0 <= d < n:
            continue
        a = amp * (1 - d / n) ** 2; r = random.Random(j * 7919)
        dx, dy = r.uniform(-a, a), r.uniform(-a, a)
        m = 1 + 2 * amp / W
        big = im.resize((round(W * m), round(H * m)), Image.BILINEAR)
        l, t = (big.width - W) / 2 + dx, (big.height - H) / 2 + dy
        im = big.crop((round(l), round(t), round(l) + W, round(t) + H))
        if flash and d < 5:
            im = Image.blend(im, Image.new('RGB', (W, H), (235, 230, 215)), flash * (1 - d / 5))
    return im


def render_video(path, j_from=0, j_to=None):
    j_to = NFRAMES if j_to is None else j_to
    ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                           '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path], stdin=subprocess.PIPE)
    for j in range(j_from, j_to):
        row = next((r for r in EDL if r['_j0'] <= j < r['_j1']), None)
        im = frame_for(row, j) if row else Image.new('RGB', (W, H))
        if row and row.get('fallgrade'):
            im = fall_grade(im, j, row['fallgrade'])
        im = hit(im, j)
        im = overlay_caps(im, j)
        if row and row.get('end'):
            im = end_card(im, j)
        if j < 4:
            im = Image.eval(im, lambda v, a=(j + 1) / 5: int(v * a))
        ff.stdin.write(im.tobytes())
        if j % 150 == 0:
            print(f'  frame {j}/{j_to}', flush=True)
    ff.stdin.close(); ff.wait()


def main():
    preview = '--preview' in sys.argv
    os.makedirs(CUT, exist_ok=True)
    print(f'total {TOTAL:.2f} s, {NFRAMES} frames')
    for r in EDL:
        r['in'] = resolve_in(r); r['_j0'] = fr(T(r['k'][0])); r['_j1'] = NFRAMES if r['k'][1] >= 999 else fr(T(r['k'][1])); r['_files'] = src_frames(r['shot'])
        print(f"  {r['shot']:14s} k {r['k'][0]:>3}-{r['k'][1]:<3} T {T(r['k'][0]):6.2f}-{r['_j1'] / FPS:6.2f}  in {r['in']:4d}  uses {r['in']}..{r['in'] + r['_j1'] - r['_j0'] - 1} of {len(r['_files'])}")
    pic, mix, out = (os.path.join(CUT, n) for n in ('picture.mp4', 'mix.wav', 'trailer.mp4'))
    if '--no-video' not in sys.argv:
        render_video(pic, 0, NFRAMES)
    import audio2
    manual = [(T(k), c, g) for k, c, g in MANUAL_SFX]
    hits = audio2.build(EDL, TOTAL, BT, manual, out=mix)
    json.dump([(round(t, 3), c, round(g, 2)) for t, c, g in sorted(hits)], open(os.path.join(CUT, 'sfx.json'), 'w'))
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', pic, '-i', mix, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000',
                    '-shortest', '-movflags', '+faststart', out], check=True)
    print('wrote', out)


if __name__ == '__main__':
    main()
