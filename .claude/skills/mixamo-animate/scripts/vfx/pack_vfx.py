# TB-262: render_vfx.py frames -> one horizontal strip per kind in public/vfx (FLIPBOOK n x px), webp.
# Usage: python pack_vfx.py <renderdir> <public/vfx> [kinds]
import sys, os, glob
import numpy as np
from PIL import Image
EDGE = 10  # alpha fades to 0 over the outer EDGE px (as lit_render.edge_ramp): the soft ground shadow and a falling splinter never end on a cut


def ramp(f):
    a = np.asarray(f).astype(np.float32); h, w = a.shape[:2]
    y = np.minimum(np.arange(h), np.arange(h)[::-1])[:, None]; x = np.minimum(np.arange(w), np.arange(w)[::-1])[None, :]
    a[..., 3] *= np.clip(np.minimum(y, x) / EDGE, 0, 1); return Image.fromarray(a.astype(np.uint8), 'RGBA')


src, out = sys.argv[1], sys.argv[2]
kinds = sys.argv[3].split(',') if len(sys.argv) > 3 else ['impact', 'slam', 'death', 'shatter', 'walldust']
for k in kinds:
    fr = [ramp(Image.open(p).convert('RGBA')) for p in sorted(glob.glob(os.path.join(src, k, 'f_*.png')))]
    w, h = fr[0].size; s = Image.new('RGBA', (w * len(fr), h))
    for i, f in enumerate(fr): s.paste(f, (i * w, 0))
    s.save(os.path.join(out, k + '.webp'), 'WEBP', quality=90, method=6); print('PACK', k, len(fr), w)
