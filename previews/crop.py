import sys
from PIL import Image
# crop.py out.png cols scale x0 y0 x1 y1 files...
out, cols, sc = sys.argv[1], int(sys.argv[2]), float(sys.argv[3]); box = tuple(int(v) for v in sys.argv[4:8]); fs = sys.argv[8:]
ims = [Image.open(f).convert("RGBA").crop(box) for f in fs]
w, h = int(ims[0].width*sc), int(ims[0].height*sc); rows = -(-len(ims)//cols)
S = Image.new("RGBA", (cols*w, rows*h), (124,150,118,255))
for k, im in enumerate(ims):
    im = im.resize((w, h), Image.LANCZOS); S.alpha_composite(im, ((k%cols)*w, (k//cols)*h))
S.convert("RGB").save(out)
