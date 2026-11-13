# gnorm.py <in.png> <out.png> [view.png]: gain each channel so the mean equals palette plain #7c9676; view = scratch copy
import sys, numpy as np; from PIL import Image
a = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(np.float32); m = a.reshape(-1, 3).mean(0); t = np.array([0x7c, 0x96, 0x76], np.float32)
b = np.clip(a * (t / m), 0, 255).astype(np.uint8); Image.fromarray(b).save(sys.argv[2]); print('mean', m.round(1), 'gain', (t / m).round(3), 'p5/p95', np.percentile(b.reshape(-1,3), [5, 95], axis=0).round())
