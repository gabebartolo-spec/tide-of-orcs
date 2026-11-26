"""Review sheet: every `step` frames of a shot at 640x360, labelled with frame number, for a first look before full-size checks."""
import sys, glob
from PIL import Image, ImageDraw
d, step = sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 15
fs = sorted(glob.glob(f'{d}/*.jpg'))[::step]
cols = 3; W, H = 640, 360
S = Image.new('RGB', (W * cols, H * ((len(fs) + cols - 1) // cols)))
for i, f in enumerate(fs):
    im = Image.open(f).resize((W, H)); ImageDraw.Draw(im).text((8, 6), f.split('/')[-1], fill=(255, 255, 0))
    S.paste(im, ((i % cols) * W, (i // cols) * H))
S.save(sys.argv[3] if len(sys.argv) > 3 else f'{d}_sheet.jpg', quality=85)
