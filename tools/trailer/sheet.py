#!/usr/bin/env python3
import sys, os
from PIL import Image
# contact sheet: for each shot dir, 4 frames evenly spaced
dirs = sys.argv[2:]; out = sys.argv[1]; W, H = 480, 270
rows = []
for d in dirs:
    fs = sorted(os.listdir(d)); idx = [int(i*(len(fs)-1)/3) for i in range(4)]
    rows.append([Image.open(os.path.join(d, fs[i])).resize((W, H)) for i in idx])
s = Image.new('RGB', (W*4, H*len(rows)))
for r, row in enumerate(rows):
    for c, im in enumerate(row): s.paste(im, (c*W, r*H))
s.save(out)
