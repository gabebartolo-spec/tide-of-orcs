"""Remove the floating black keying junk (tree-shadow streaks and blobs that survived the backdrop key) from the camp building webps.
A dark opaque component is junk when it is not the largest one (the building plus its contact shadow) and the ring around it is
mostly empty (the building's own dark windows and doors are ringed by lit art). Its soft fringe goes with it. Alpha-only edit.
Usage: python clean_camp_junk.py public/decor/camp [names...]"""
import sys, glob, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

DARK, ALPHA, RING, LIGHTFRAC, FRINGE = 55, 100, 12, 0.15, 10
# junk that still touches the art after the pass: name -> (x0, x1, y0, y1) boxes, where dark or soft pixels go
BOXES = {'bowyer1': [(0, 1137, 0, 45)], 'bowyer3': [(560, 760, 0, 140)], 'kitchen3': [(570, 650, 0, 75)]}

def clean(path):
    im = Image.open(path).convert('RGBA'); a = np.array(im)
    dark = (a[..., 3] > ALPHA) & (a[..., :3].max(2) < DARK)
    lit = (a[..., 3] > ALPHA) & (a[..., :3].max(2) >= DARK)
    lab, n = ndi.label(dark); sizes = ndi.sum(dark, lab, range(1, n + 1)); main = int(np.argmax(sizes)) + 1
    junk = np.zeros(dark.shape, bool); count = 0
    for i, s in enumerate(ndi.find_objects(lab), 1):
        if i == main or sizes[i - 1] < 20: continue
        pad = tuple(slice(max(0, sl.start - RING - 1), sl.stop + RING + 1) for sl in s)
        m = lab[pad] == i; ring = ndi.binary_dilation(m, iterations=RING) & ~m
        if lit[pad][ring].mean() < LIGHTFRAC: junk[pad] |= m; count += 1
    fr = ndi.binary_dilation(junk, iterations=FRINGE) & ((a[..., :3].max(2) < 110) | (a[..., 3] < 230))
    a[fr | junk, 3] = 0
    for x0, x1, y0, y1 in BOXES.get(os.path.basename(path)[:-5], []):
        r = a[y0:y1, x0:x1]; r[(r[..., :3].max(2) < 110) | (r[..., 3] < 230), 3] = 0
    far = ~ndi.binary_dilation(a[..., 3] >= 200, iterations=30)  # faint haze far from any solid pixel
    a[far, 3] = 0
    Image.fromarray(a, 'RGBA').save(path, 'WEBP', quality=92, method=6, alpha_quality=100)
    print(os.path.basename(path), 'junk comps', count, 'px', int((fr | junk).sum()))

if __name__ == '__main__':
    d = sys.argv[1]; names = sys.argv[2:] or [os.path.basename(p)[:-5] for p in sorted(glob.glob(d + '/*.webp')) if not any(x in p for x in ('deer', 'banner'))]
    for nme in names: clean(f'{d}/{nme}.webp')
