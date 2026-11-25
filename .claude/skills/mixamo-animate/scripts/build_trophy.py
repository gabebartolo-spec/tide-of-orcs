# TB-250 boss trophies: cut a boss model's head off at the neck (rest pose, by its skin weights) and save it alone, facing -X
# (towards the camp camera), its neck cut at z = 0, scaled to HEADW metres wide. render_camp_backdrop.py mounts it on a plaque.
# A vertex is kept when weight(Head) + NECK * weight(Neck) >= KEEP (head-only meshes such as eyes, teeth and horns follow
# their own weights). The facing comes from the eyes: the mesh named EYES (substring) sits in front of the head centre.
# blender -b <model.blend> --python build_trophy.py -- <out.blend>     (an .fbx is imported into an empty scene: FBX=<path>)
# Rigs without Head/Neck names (the troll ogre's joint123): HEADB = comma bone names whose groups (and their child bones') count as
# head, NECKB = comma bone names that count as neck.
# CUT=plane (for heads whose skin weights are ragged): keep every vertex above a level plane between the neck bone and the head
# bone (CUTF 0..1 along that gap, 0.3, plus DZ metres) and within RADK x the neck-to-head length of the head bone sideways (along x; 3),
# or within RAD metres when set, and RADY (default twice that) front to back (the snout), and BACK metres behind it.
# In weights mode subdivision modifiers are switched off before the cut (the weights belong to the base mesh); a plane cut keeps
# them (orc213's face detail is a multires sculpt). EEVEE-only materials (ogre228)
# are made to drive Cycles, as lit_render.eevee_outputs() does for the sprites.
# Env: NECK (0.5), KEEP (0.5), EYES (comma substrings, default eye,глаз), HEADW (0.5), DROP (comma substrings of meshes to leave out), TEX (dir: relink missing images by name)
import bpy, bmesh, os, sys, math
from mathutils import Vector, Matrix
out = sys.argv[sys.argv.index("--") + 1]
if os.environ.get("FBX"):
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.fbx(filepath=os.environ["FBX"])
NECK, KEEP = float(os.environ.get("NECK", "0.5")), float(os.environ.get("KEEP", "0.5"))
EYES = [s for s in os.environ.get("EYES", "eye,глаз").lower().split(",") if s]; HEADW = float(os.environ.get("HEADW", "0.5"))
DROP = [s.lower() for s in os.environ.get("DROP", "").split(",") if s]
if os.environ.get("TEX"):
    d = os.environ["TEX"]; files = {os.path.splitext(f)[0].lower(): os.path.join(d, f) for f in os.listdir(d)}   # by stem: .tif in the FBX, .png on disk
    for im in bpy.data.images:
        k = os.path.splitext(os.path.basename(im.filepath.replace("\\", "/")))[0].lower()
        if k in files: im.filepath = files[k]; im.reload()
HB = set(); NB = {s.lower() for s in os.environ.get("NECKB", "").split(",") if s}
for a in bpy.data.objects:
    if a.type == "ARMATURE":
        a.data.pose_position = "REST"
        for b in a.data.bones:
            if b.name in os.environ.get("HEADB", "").split(",") and os.environ.get("HEADB"): HB |= {b.name.lower()} | {c.name.lower() for c in b.children_recursive}
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lit_render; lit_render.eevee_outputs()
PLANE = os.environ.get("CUT") == "plane"
for o in bpy.data.objects:
    for m in getattr(o, "modifiers", []):
        if m.type in ("SUBSURF", "MULTIRES") and not PLANE: m.show_render = m.show_viewport = False
if PLANE:
    def bone(test):
        for a in bpy.data.objects:
            if a.type == "ARMATURE":
                for b in a.data.bones:
                    if test(b.name.lower()): return a.matrix_world @ b.head_local
    hb = bone(lambda n: n in HB if HB else n.endswith("head")); nb = bone(lambda n: n in NB if NB else n.endswith("neck"))
    ZC = nb.z + float(os.environ.get("CUTF", "0.3")) * (hb.z - nb.z); RAD = float(os.environ.get("RADK", "3")) * (hb - nb).length
    if os.environ.get("RAD"): RAD = float(os.environ["RAD"])            # absolute radius in metres (orc213: its neck and head bones nearly touch)
    ZC += float(os.environ.get("DZ", "0"))                               # metres added to the cut height
    print("PLANE z", round(ZC, 3), "rad", round(RAD, 3), "head", tuple(round(x, 2) for x in hb))
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get(); parts = []
if PLANE:   # BACK: keep only this many metres behind the head bone (away from the eyes): ogre228's hunched back
    EW = [o.matrix_world @ v.co for o in bpy.data.objects if o.type == "MESH" and any(s in o.name.lower() for s in EYES) for v in o.data.vertices]
    FY = 1 if EW and sum(p.y for p in EW) / len(EW) > hb.y else -1; BACK = float(os.environ.get("BACK", "9"))
for o in list(bpy.data.objects):
    if o.type != "MESH" or o.hide_render or any(s in o.name.lower() for s in DROP): continue
    gi = {g.index: g.name for g in o.vertex_groups}
    def score(v):
        s = 0.0
        for e in v.groups:
            n = gi.get(e.group, "").lower()
            if n in HB: s += e.weight
            elif n in NB: s += NECK * e.weight
            elif n.endswith(("head", "headtop_end", "head_end", "jaw")) or "eye" in n: s += e.weight
            elif n.endswith("neck") or n.endswith("neck1"): s += NECK * e.weight
        return s
    ev = o.evaluated_get(dg); me = bpy.data.meshes.new_from_object(ev, depsgraph=dg); me.transform(o.matrix_world)
    if PLANE: keep = [v.co.z >= ZC and abs(v.co.x - hb.x) <= RAD and abs(v.co.y - hb.y) <= float(os.environ.get("RADY", 2 * RAD)) and (v.co.y - hb.y) * FY >= -BACK for v in me.vertices]   # a box: the shoulders lie along x, the snout sticks out along y
    else: keep = [score(v) >= KEEP for v in o.data.vertices]
    if len(keep) != len(me.vertices): print("SKIP vertex count changed", o.name); continue
    if not any(keep): continue
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not keep[v.index]], context="VERTS")
    bm.to_mesh(me); bm.free()
    if not me.vertices: continue
    n = bpy.data.objects.new("head_" + o.name, me); parts.append(n)
for o in list(bpy.data.objects):
    if o not in parts: bpy.data.objects.remove(o)
for c in list(bpy.data.collections): bpy.data.collections.remove(c)
sc = bpy.context.scene
for p in parts: sc.collection.objects.link(p)
P = [v.co for p in parts for v in p.data.vertices]
lo = Vector((min(p.x for p in P), min(p.y for p in P), min(p.z for p in P))); hi = Vector((max(p.x for p in P), max(p.y for p in P), max(p.z for p in P)))
cen = (lo + hi) / 2
E = [v.co for p in parts if any(s in p.name.lower() for s in EYES) for v in p.data.vertices]
if not E: raise SystemExit("no eyes mesh matching " + ",".join(EYES))
f = sum(E, Vector()) / len(E) - cen; f.z = 0; f.normalize()
yaw = math.atan2(f.y, f.x); R = Matrix.Rotation(math.pi - yaw, 4, "Z")   # turn the face to -X
w = None
for p in parts: p.data.transform(Matrix.Translation(-Vector((cen.x, cen.y, lo.z)))); p.data.transform(R)
P = [v.co for p in parts for v in p.data.vertices]; w = max(p.y for p in P) - min(p.y for p in P)
for p in parts: p.data.transform(Matrix.Scale(HEADW / w, 4))
P = [v.co for p in parts for v in p.data.vertices]
print("TROPHY parts", [p.name for p in parts], "verts", len(P), "size", tuple(round(max(getattr(q, a) for q in P) - min(getattr(q, a) for q in P), 3) for a in "xyz"))
for im in bpy.data.images:
    if im.source == "FILE" and not im.packed_file:
        try: im.pack()
        except RuntimeError as e: print("NOPACK", im.name, e)
bpy.ops.wm.save_as_mainfile(filepath=out)
