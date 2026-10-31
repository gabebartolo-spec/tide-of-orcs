# Measure the welded staff on the shaman rig: PCA axis of the shaft below the fist, radius percentiles along z,
# skull region bbox. Args: rig.blend
import bpy, sys, numpy as np
a = sys.argv[sys.argv.index("--") + 1:]; bpy.ops.wm.open_mainfile(filepath=a[0])
body = max((o for o in bpy.data.objects if o.type == "MESH"), key=lambda o: len(o.data.vertices))
V = np.array([(body.matrix_world @ v.co)[:] for v in body.data.vertices])
m = (V[:, 0] < -0.15) & (V[:, 2] > 0.03) & (V[:, 2] < 0.42); P = V[m]; c = P.mean(0)
ax = np.linalg.svd(P - c)[2][0]; ax = ax if ax[2] > 0 else -ax
print("SHAFT n", len(P), "c", c.round(3), "ax", ax.round(3))
t = (V - c) @ ax; r = np.linalg.norm((V - c) - np.outer(t, ax), axis=1)
for z0 in np.arange(0.0, 1.0, 0.1):
    s = (V[:, 2] >= z0) & (V[:, 2] < z0 + 0.1) & (r < 0.08); rr = np.sort(r[s])
    print("Z", round(z0, 1), "n", len(rr), "r pct 50/80/95/max", [round(float(x), 3) for x in (np.percentile(rr, [50, 80, 95]).tolist() + [rr.max()])] if len(rr) else "-")
sk = V[(V[:, 0] < -0.1) & (V[:, 2] > 0.75)]; print("SKULL n", len(sk), sk.min(0).round(3), sk.max(0).round(3))
hd = V[(V[:, 0] >= -0.1) & (V[:, 2] > 0.75)]; print("HEADTOP n", len(hd), hd.min(0).round(3), hd.max(0).round(3))
# where the axis exits the top of the shaft and bottom
print("AXIS t range of r<0.03 verts", round(float(t[r < 0.03].min()), 3), round(float(t[r < 0.03].max()), 3), "z at ends", (c + ax * t[r < 0.03].min()).round(3), (c + ax * t[r < 0.03].max()).round(3))
