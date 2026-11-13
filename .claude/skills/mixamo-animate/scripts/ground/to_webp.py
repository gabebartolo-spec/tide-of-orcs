# feather the bake's edges to alpha (so it melts into the vector plain past its region), save webp
import sys, numpy as np
from PIL import Image
src, out, fe = sys.argv[1], sys.argv[2], int(sys.argv[3])
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32); h, w, _ = im.shape
ramp = lambda n: np.clip(np.minimum(np.arange(n), np.arange(n)[::-1]) / fe, 0, 1)
a = np.outer(ramp(h), ramp(w)); a = a * a * (3 - 2 * a)
Image.fromarray(np.dstack([im, a * 255]).astype(np.uint8), 'RGBA').save(out, 'WEBP', quality=82, method=6)
