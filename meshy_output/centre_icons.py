"""Centre every approved icon in its square. Usage: python -P centre_icons.py <render_dir> <out_dir> [px=128] [margin=8]
Reads APPROVED.md rows, takes <render_dir>/<stem>.png (any size, transparent), crops to the visible pixels
(alpha > 8), scales to fit px - 2*margin keeping aspect, pastes centred on a px square and writes <out_dir>/<id>.webp."""
import sys, os, re
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
px = int(sys.argv[3]) if len(sys.argv) > 3 else 128
mg = int(sys.argv[4]) if len(sys.argv) > 4 else 8
here = os.path.dirname(os.path.abspath(__file__))
for line in open(os.path.join(here, 'APPROVED.md'), encoding='utf-8'):
    m = re.match(r'\|\s*([a-z0-9-]+) \(\w+\)\s*\|\s*([\w.-]+)\.glb', line)
    if not m: continue
    iid, stem = m.groups()
    im = Image.open(os.path.join(src, stem + '.png')).convert('RGBA')
    box = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    im = im.crop(box)
    k = (px - 2 * mg) / max(im.size)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    c = Image.new('RGBA', (px, px), (0, 0, 0, 0))
    c.paste(im, ((px - im.width) // 2, (px - im.height) // 2))
    c.save(os.path.join(out, iid + '.webp'), quality=90, method=6)
    print(iid, stem, im.size)
