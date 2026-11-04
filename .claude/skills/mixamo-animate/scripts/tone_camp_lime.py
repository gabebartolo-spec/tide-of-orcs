"""Tone the neon lime ground patches baked into the camp building webps down to the meadow green (TB-188h).
A pixel is neon when green leads red by 15 and blue by 60 and green is above 130; its colour is pulled to MOSS by FACTOR / ADD.
Usage: python tone_camp_lime.py public/decor/camp [names...]"""
import sys, glob, os
import numpy as np
from PIL import Image

FACTOR = np.array([0.62, 0.76, 1.0]); ADD = np.array([0, 0, 12])

def tone(path):
    im = Image.open(path).convert('RGBA'); a = np.array(im)
    c = a[..., :3].astype(float)
    m = (a[..., 3] > 0) & (c[..., 1] > c[..., 0] + 15) & (c[..., 1] > c[..., 2] + 60) & (c[..., 1] > 130)
    c[m] = np.clip(c[m] * FACTOR + ADD, 0, 255); a[..., :3] = c.astype(np.uint8)
    Image.fromarray(a, 'RGBA').save(path, 'WEBP', quality=92, method=6, alpha_quality=100)
    print(os.path.basename(path), int(m.sum()))

if __name__ == '__main__' and not os.environ.get('TONE2'):
    d = sys.argv[1]; names = sys.argv[2:] or [os.path.basename(p)[:-5] for p in sorted(glob.glob(d + '/*.webp')) if not any(x in p for x in ('deer', 'banner'))]
    for n in names: tone(f'{d}/{n}.webp')

# round 2: a second pass pulls the remaining yellow-green (blue far below green) toward the meadow: red capped at 0.68 G, blue floored at 0.5 G
def tone2(path):
    im = Image.open(path).convert('RGBA'); a = np.array(im); c = a[..., :3].astype(float)
    m = (a[..., 3] > 0) & (c[..., 1] > 70) & (c[..., 1] > c[..., 0] + 10) & (c[..., 1] > c[..., 2] + 30)
    c[m, 0] = np.minimum(c[m, 0], 0.68 * c[m, 1]); c[m, 2] = np.maximum(c[m, 2], 0.5 * c[m, 1]); a[..., :3] = c.astype(np.uint8)
    Image.fromarray(a, 'RGBA').save(path, 'WEBP', quality=92, method=6, alpha_quality=100); print('tone2', os.path.basename(path), int(m.sum()))

if __name__ == '__main__' and os.environ.get('TONE2'):
    for n in [os.path.basename(p)[:-5] for p in sorted(glob.glob(sys.argv[1] + '/*.webp')) if not any(x in p for x in ('deer', 'banner'))]: tone2(f'{sys.argv[1]}/{n}.webp')
