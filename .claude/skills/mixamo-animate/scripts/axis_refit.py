# Iteratively refit the staff axis: start from AX, keep verts within RW of it (outside the fist band and skull), PCA, repeat.
import bpy, sys, os, numpy as np
a = sys.argv[sys.argv.index("--") + 1:]; bpy.ops.wm.open_mainfile(filepath=a[0])
body = max((o for o in bpy.data.objects if o.type == "MESH"), key=lambda o: len(o.data.vertices))
V = np.array([(body.matrix_world @ v.co)[:] for v in body.data.vertices])
c = np.array([float(x) for x in os.environ["AX"].split(",")]); ax = c[3:] / np.linalg.norm(c[3:]); c = c[:3]
RW = float(os.environ.get("RW", "0.035")); z = V[:, 2]
band = ((z > 0.04) & (z < 0.44)) | ((z > 0.58) & (z < 0.78))
for it in range(8):
    t = (V - c) @ ax; r = np.linalg.norm((V - c) - np.outer(t, ax), axis=1); m = band & (r < RW)
    P = V[m]; c = P.mean(0); ax = np.linalg.svd(P - c)[2][0]; ax = ax if ax[2] > 0 else -ax
    print("IT", it, "n", len(P), "c", c.round(4), "ax", ax.round(4), "r95", round(float(np.percentile(r[m], 95)), 4))
t = (V - c) @ ax; r = np.linalg.norm((V - c) - np.outer(t, ax), axis=1)
for z0 in np.arange(0.0, 0.9, 0.1):
    s = (z >= z0) & (z < z0 + 0.1) & (r < 0.08); rr = np.sort(r[s]); print("Z", round(z0, 1), "n", len(rr), "r 50/80/95/max", [round(float(x), 3) for x in (np.percentile(rr, [50, 80, 95]).tolist() + [rr.max()])] if len(rr) else "-")
print("AXSTR", ",".join(str(round(float(x), 4)) for x in list(c) + list(ax)))
