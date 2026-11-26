# TB-250 wall cosmetics: crop wall_standard.py / wall_post.py renders to their pixels, scale them to the field's size and write
# public/decor/<name>.webp, printing each WALL_DECOR_ART row for src/data/presentation.ts (image size, foot and top in px of the
# written image, px per post width for posts). python post_wall_decor.py <render dir> <repo> <name>...
import sys, json, os
from PIL import Image

src, repo, names = sys.argv[1], sys.argv[2], sys.argv[3:]
MAXH = {'wall_banner': 420, 'wall_post': 640}       # the drawn height is ~120 css px (standard) / ~300 css px (post) at 1080p: 2x for DPR 2
for n in names:
    im = Image.open(os.path.join(src, n + '.png')).convert('RGBA'); meta = json.load(open(os.path.join(src, n + '.json')))
    a = im.getchannel('A').point(lambda v: 255 if v > 6 else 0); x0, y0, x1, y1 = a.getbbox()
    x0, y0, x1, y1 = max(0, x0 - 2), max(0, y0 - 2), min(im.width, x1 + 2), min(im.height, y1 + 2)
    im = im.crop((x0, y0, x1, y1)); k = min(1.0, MAXH[n.rsplit('_', 1)[0]] / im.height)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    im.save(os.path.join(repo, 'public', 'decor', n + '.webp'), 'WEBP', quality=90, method=6)
    pt = lambda p: [round((p[0] - x0) * k, 1), round((p[1] - y0) * k, 1)]
    row = {'w': im.width, 'h': im.height, 'foot': pt(meta['foot'])}
    if 'top' in meta: row['top'] = pt(meta['top']); row['unit'] = round(meta['pxPerUnit'] * k, 2)
    print(f"  {n}: {{ w: {row['w']}, h: {row['h']}, foot: {row['foot']}" + (f", top: {row['top']}, unit: {row['unit']}" if 'top' in row else '') + ' },')
