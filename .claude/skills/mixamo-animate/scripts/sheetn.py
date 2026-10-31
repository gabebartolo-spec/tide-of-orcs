# args: prefix out.png [n=33] -> 9-column contact sheet of prefix_0..n-1.png
import bpy, sys, numpy as np
a = sys.argv[sys.argv.index("--") + 1:]; ims = []
for i in range(int(a[2]) if len(a) > 2 else 33):
    im = bpy.data.images.load(f"{a[0]}_{i}.png"); w, h = im.size
    ims.append(np.array(im.pixels[:]).reshape(h, w, 4)[::2, ::2])
h, w = ims[0].shape[:2]; cols = 9; rows = -(-len(ims) // cols)
S = np.zeros((rows * h, cols * w, 4)); S[..., 3] = 1
for k, m in enumerate(ims):
    r, c = divmod(k, cols); S[(rows - 1 - r) * h:(rows - r) * h, c * w:(c + 1) * w] = m
o = bpy.data.images.new("s", cols * w, rows * h); o.pixels[:] = S.ravel(); o.filepath_raw = a[1]; o.file_format = "PNG"; o.save()

