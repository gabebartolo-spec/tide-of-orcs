"""Tone the neon lime ground patches baked into the camp building webps down to the meadow green (TB-188h).
A pixel is neon when green leads red by 40 and blue by 80 and green is above 150; its colour is pulled to MOSS by FACTOR / ADD.
Usage: python tone_camp_lime.py public/decor/camp [names...]"""
import sys, glob, os
import numpy as np
from PIL import Image

FACTOR = np.array([0.72, 0.78, 1.0]); ADD = np.array([0, 0, 40])

def tone(path):
    im = Image.open(path).convert('RGBA'); a = np.array(im)
    c = a[..., :3].astype(float)
    m = (a[..., 3] > 0) & (c[..., 1] > c[..., 0] + 40) & (c[..., 1] > c[..., 2] + 80) & (c[..., 1] > 150)
    c[m] = np.clip(c[m] * FACTOR + ADD, 0, 255); a[..., :3] = c.astype(np.uint8)
    Image.fromarray(a, 'RGBA').save(path, 'WEBP', quality=92, method=6, alpha_quality=100)
    print(os.path.basename(path), int(m.sum()))

if __name__ == '__main__':
    d = sys.argv[1]; names = sys.argv[2:] or [os.path.basename(p)[:-5] for p in sorted(glob.glob(d + '/*.webp')) if not any(x in p for x in ('deer', 'banner'))]
    for n in names: tone(f'{d}/{n}.webp')
