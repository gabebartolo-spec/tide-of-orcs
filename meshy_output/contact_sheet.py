"""Tile labelled images into contact sheets for screening. Usage: contact_sheet.py <out_prefix> <cell_px> <cols> <per_sheet> img1 img2 ...
Labels come from the file stem. Writes <out_prefix>_1.png, _2.png ..."""
import sys, os
from PIL import Image, ImageDraw
pre, cell, cols, per = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
files = sys.argv[5:]
for n, start in enumerate(range(0, len(files), per), 1):
    chunk = files[start:start + per]
    rows = (len(chunk) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * cell, rows * (cell + 18)), (230, 226, 216))
    dr = ImageDraw.Draw(sheet)
    for i, f in enumerate(chunk):
        im = Image.open(f).convert('RGB'); im.thumbnail((cell, cell))
        x, y = (i % cols) * cell, (i // cols) * (cell + 18)
        sheet.paste(im, (x + (cell - im.width) // 2, y))
        dr.text((x + 4, y + cell + 2), os.path.splitext(os.path.basename(f))[0][:40], fill=(30, 30, 30))
    sheet.save(f'{pre}_{n}.png'); print('WROTE', f'{pre}_{n}.png', len(chunk))
