# Faces that tear into spikes during a clip (edges listed by apply_anim STRETCH=<ratio> STROUT=edges.json) are deleted:
# a small hidden gap reads better than a stretched shard. Args: in.blend edges.json out.blend   Env: ZMIN (bind z floor, 0)
import bpy, bmesh, sys, os, json
a = sys.argv[sys.argv.index("--") + 1:]; bpy.ops.wm.open_mainfile(filepath=a[0])
body = max((o for o in bpy.data.objects if o.type == "MESH" and not o.name.startswith("wpn_")), key=lambda o: len(o.data.vertices))
bad = {tuple(sorted(e)) for e in json.load(open(a[1]))}; zmin = float(os.environ.get("ZMIN", "0")); M = body.matrix_world
bm = bmesh.new(); bm.from_mesh(body.data)
fs = {f for e in bm.edges if tuple(sorted(v.index for v in e.verts)) in bad and min((M @ v.co).z for v in e.verts) >= zmin for f in e.link_faces}
bmesh.ops.delete(bm, geom=list(fs), context="FACES_ONLY"); bm.to_mesh(body.data); bm.free()
print("CUTSTRETCH", len(fs), "faces deleted of", len(body.data.polygons) + len(fs))
bpy.ops.wm.save_as_mainfile(filepath=a[2])
