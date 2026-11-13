# TB-260: cut render_trees.py frames into the treeline sprites, one depth grade per row distance.
# Usage: python pack_trees.py <renderdir> <public/decor> [mix,mix,...]
# Each kind is cropped to its alpha (>8) plus 2 px and scaled to 44 px per model unit of height (the bush to 256 px), then written as
# tree_<kind>.webp (the nearest row) and tree_<kind>_d<i>.webp for i = 1.. : the colour mixed `mix[i-1]` toward the palette's woodDeep
# (#2f4838), the wood's shade, alpha untouched. Default mixes 0.22,0.36,0.48 (row 1, 2, 3+ behind the nearest; TREELINE.depth).
import sys, os
import numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
MIX = [float(x) for x in (sys.argv[3] if len(sys.argv) > 3 else '0.22,0.36,0.48').split(',')]
HEIGHTS = {'oak_green_1': 6.25, 'oak_green_2': 6.94, 'pine_1': 7.35, 'pine_2': 8.95, 'pine_3': 10.57, 'spruce_2': 5.31, 'spruce_3': 5.17}  # TREELINE.heights
PXU, BUSH_H = 44, 256
SHADE = np.array([0x2f, 0x48, 0x38], np.float32)  # palette woodDeep
for k in [*HEIGHTS, 'bush']:
    im = Image.open(os.path.join(src, k + '.png')).convert('RGBA')
    x0, y0, x1, y1 = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    im = im.crop((max(0, x0 - 2), max(0, y0 - 2), min(im.width, x1 + 2), min(im.height, y1 + 2)))
    h = BUSH_H if k == 'bush' else round(HEIGHTS[k] * PXU); w = round(im.width * h / im.height)
    a = np.asarray(im.resize((w, h), Image.LANCZOS)).astype(np.float32)
    for i, m in enumerate([0.0, *MIX]):
        b = a.copy(); b[..., :3] = b[..., :3] * (1 - m) + SHADE * m
        name = f'tree_{k}.webp' if i == 0 else f'tree_{k}_d{i}.webp'
        Image.fromarray(np.clip(b, 0, 255).astype(np.uint8), 'RGBA').save(os.path.join(out, name), 'WEBP', quality=88, method=6)
    print('PACK', k, w, h)
