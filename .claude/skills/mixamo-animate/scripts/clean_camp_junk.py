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
BOXES = {'bowyer1': [(0, 1137, 0, 45)], 'bowyer3': [(560, 760, 0, 140)], 'kitchen3': [(570, 650, 0, 75)], 'forge3': [(1085, 1140, 770, 900)]}
# soft shadow smear beside the grindstone: name -> (x0, x1, y0, y1, ramp); soft dark pixels fade out left of x1 - ramp and ramp back in
# over the last `ramp` px, near-black opaque ones left of x1 - ramp (the wheel pole) go
SMEAR = {'forge3': (250, 620, 680, 1060, 110)}

# near-black prop faces that read as a black slab: name -> (x0, x1, y0, y1, gain); opaque pixels below 110 are brightened by gain
LIFT = {'forge3': (1130, 1225, 780, 935, 2.2)}

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
    if (sm := SMEAR.get(os.path.basename(path)[:-5])):
        x0, x1, y0, y1, rp = sm; r = a[y0:y1, x0:x1]; mx = r[..., :3].max(2)
        m = np.clip((np.arange(x0, x1) - (x1 - rp)) / rp, 0, 1)[None, :]
        soft = (r[..., 3] < 250) & (mx < 110); r[..., 3] = np.where(soft, r[..., 3] * m, r[..., 3]).astype(np.uint8)
        r[(mx < 45) & (m[0] == 0)[None, :] & (r[..., 3] >= 250), 3] = 0
    if (lf := LIFT.get(os.path.basename(path)[:-5])):
        x0, x1, y0, y1, g = lf; r = a[y0:y1, x0:x1]; k = (r[..., 3] > 200) & (r[..., :3].max(2) < 110)
        r[..., :3][k] = np.minimum(r[..., :3][k].astype(float) * g, 255).astype(np.uint8)
    far = ~ndi.binary_dilation(a[..., 3] >= 200, iterations=30)  # faint haze far from any solid pixel
    a[far, 3] = 0
    Image.fromarray(a, 'RGBA').save(path, 'WEBP', quality=92, method=6, alpha_quality=100)
    print(os.path.basename(path), 'junk comps', count, 'px', int((fr | junk).sum()))

if __name__ == '__main__':
    d = sys.argv[1]; names = sys.argv[2:] or [os.path.basename(p)[:-5] for p in sorted(glob.glob(d + '/*.webp')) if not any(x in p for x in ('deer', 'banner'))]
    for nme in names: clean(f'{d}/{nme}.webp')
