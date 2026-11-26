"""TB-278 unified look: bake a dark ink outline round every sprite frame in public/sprites (and half/), so the
characters sit in the director's inked battlefield. Each frame is dilated inside its own atlas rect only.
Usage: python3 scripts/look/ink_outline.py [px_full] [--dry out.png]  (reads the pristine sheets from git HEAD)."""
import json, subprocess, sys, io
from PIL import Image, ImageFilter
import numpy as np

INK = (34, 36, 28)        # the targets' line colour
R_FULL = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 3
ROOT = 'public/sprites'

def git_img(path):
    return Image.open(io.BytesIO(subprocess.check_output(['git', 'show', f'HEAD:{path}']))).convert('RGBA')

def ink(frame, r):
    a = np.array(frame)
    alpha = Image.fromarray(a[:, :, 3])
    grown = np.array(alpha.filter(ImageFilter.MaxFilter(2 * r + 1))).astype(np.float32) / 255
    out = np.zeros_like(a)
    out[:, :, :3] = INK
    out[:, :, 3] = (grown * 255).astype(np.uint8)
    base = Image.fromarray(out); base.alpha_composite(frame)
    return base

atlas = json.load(open(f'{ROOT}/atlas.json'))
rects = {}
for anim in atlas['anims'].values():
    for f in anim['frames']:
        rects.setdefault(anim['image'], set()).add(tuple(f[:4]))
for sheet, rs in sorted(rects.items()):
    for sub, scale in (('', 1), ('half/', 0.5)):
        path = f'{ROOT}/{sub}{sheet}'
        try: im = git_img(path)
        except subprocess.CalledProcessError: continue
        k = im.width / Image.open(f'{ROOT}/{sheet}').width if sub else 1
        r = max(1, round(R_FULL * (scale if sub else 1)))
        for (x, y, w, h) in rs:
            box = tuple(round(v * (0.5 if sub else 1)) for v in (x, y, x + w, y + h))
            im.paste(ink(im.crop(box), r), box[:2])
        im.save(path, quality=92, method=6)
        print(path, r)
