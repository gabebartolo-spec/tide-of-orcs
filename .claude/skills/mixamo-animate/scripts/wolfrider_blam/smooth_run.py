# smooth_run.py <in.blend> <out.blend> : TB-210 run jolt fix. build_gallop pins the lowest vertex per frame, so the root height zigzags. Cyclic [1,2,1]/4
# passes (env ZPASS, default 3) on the root's location curves, then every curve doubled by cyclic Catmull-Rom midpoints: no new pose, only in-betweens.
import bpy, sys, os
a = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.wm.open_mainfile(filepath=a[0]); sc = bpy.context.scene
ZP = int(os.environ.get("ZPASS", "3")); n = sc.frame_end - sc.frame_start
def curves(o):
    ad = o.animation_data
    if not ad or not ad.action: return []
    return [fc for l in ad.action.layers for st in l.strips for fc in st.channelbag(ad.action_slot).fcurves]
def flat(v): return [(v[i - 1] + 2 * v[i] + v[(i + 1) % len(v)]) / 4 for i in range(len(v))]
root = [o for o in bpy.data.objects if o.parent is None][0]
for o in bpy.data.objects:
    cs = curves(o)
    groups = {}
    for fc in cs: groups.setdefault(fc.data_path, []).append(fc)
    for path, g in groups.items():
        vals = [[fc.evaluate(i + 1) for i in range(n)] for fc in g]
        if path.endswith("rotation_quaternion"):  # same hemisphere frame to frame
            for i in range(1, n):
                if sum(v[i] * v[i - 1] for v in vals) < 0:
                    for v in vals: v[i] = -v[i]
        for fc, v in zip(g, vals):
            if o is root and path == "location":
                for _ in range(ZP): v = flat(v)
            fc.keyframe_points.clear()
            for i in range(2 * n):
                j = i // 2
                x = v[j] if i % 2 == 0 else (-v[j - 1] + 9 * v[j] + 9 * v[(j + 1) % n] - v[(j + 2) % n]) / 16
                k = fc.keyframe_points.insert(i + 1, x); k.interpolation = 'LINEAR'
sc.frame_start, sc.frame_end = 1, 2 * n + 1
bpy.ops.wm.save_as_mainfile(filepath=a[1]); print("SMOOTH frames", 2 * n)
