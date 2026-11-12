# Hawk (TB-068): import the Sketchfab glTF (CC BY, OSU "Red-tailed Hawk - in Flight"), play its "Wings Flapping" clip,
# render each frame with an ortho camera. Env: VIEW=game|front|probe, GAMECAM deg above the ground, YAW deg (turns the
# bird so its beak points +X, i.e. screen-right in the game view), ORTHO, RES, STEP.
# Usage: blender -b --factory-startup --python render_hawk.py -- <scene.gltf> <outdir> <prefix>
import bpy, math, sys, os
from mathutils import Vector, Euler
a = sys.argv[sys.argv.index("--") + 1:]
SRC, OUT, PFX = a[0], a[1], a[2]
VIEW = os.environ.get("VIEW", "game"); RES = int(os.environ.get("RES", "512")); ORTHO = float(os.environ.get("ORTHO", "1.4"))
STEP = int(os.environ.get("STEP", "1")); T = math.radians(float(os.environ.get("GAMECAM", "20")))
YAW = math.radians(float(os.environ.get("YAW", "0"))); SPAN = float(os.environ.get("SPAN", "1.2"))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
sc = bpy.context.scene
roots = [o for o in sc.objects if o.parent is None]
piv = bpy.data.objects.new("piv", None); sc.collection.objects.link(piv)
for o in roots: o.parent = piv
meshes = [o for o in sc.objects if o.type == 'MESH']
act = next(iter(bpy.data.actions), None)
f0, f1 = (int(act.frame_range[0]), int(act.frame_range[1])) if act else (0, 0)
sc.frame_start, sc.frame_end = f0, f1
# normalise: wingspan (largest bbox extent at frame f0) -> SPAN m, centred on the origin at z 0.5
sc.frame_set(f0); bpy.context.view_layer.update()
def bbox():
    dg = bpy.context.evaluated_depsgraph_get(); lo = Vector((1e9,) * 3); hi = -lo
    for o in meshes:
        e = o.evaluated_get(dg); m = e.to_mesh()
        for v in m.vertices:
            w = e.matrix_world @ v.co; lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
        e.to_mesh_clear()
    return lo, hi
lo, hi = bbox(); s = SPAN / max(hi - lo); c = (lo + hi) / 2
piv.scale = (s, s, s); piv.location = -c * s + Vector((0, 0, 0.5)); piv.rotation_euler.z = YAW
bpy.context.view_layer.update()
lo, hi = bbox(); print("BBOX", tuple(round(x, 3) for x in lo), tuple(round(x, 3) for x in hi), "FRAMES", f0, f1, "ACT", act.name if act else None)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"; cam.data.ortho_scale = ORTHO; C = Vector((0, 0, 0.5)); D = 3.7
def place(view):
    if view == "game":   # field camera: on +Y... looking toward -Y? no: copy render_wr_sheet (+Y, elevated T), then mirror x
        cam.location = C + Vector((0, -D * math.cos(T), D * math.sin(T))); cam.rotation_euler = Euler((math.pi / 2 - T, 0, 0))
    elif view == "front":  # facing the beak (+X)
        cam.location = C + Vector((D, 0, 0)); cam.rotation_euler = Euler((math.pi / 2, 0, math.pi / 2))
    elif view == "top":
        cam.location = C + Vector((0, 0, D)); cam.rotation_euler = Euler((0, 0, 0))
def sun(name, d, energy, color):
    L = bpy.data.objects.new(name, bpy.data.lights.new(name, "SUN")); sc.collection.objects.link(L); L.data.energy = energy; L.data.color = color
    L.rotation_euler = Vector(d).normalized().to_track_quat('-Z', 'Y').to_euler()
sun("sun", (-0.60, 0.22, -0.77), 3.5, (1, 0.93, 0.8)); sun("rim", (-0.82, 0.30, -0.5), 1.5, (0.8, 0.85, 1))
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[1].default_value = 0.6
sc.render.engine = "BLENDER_EEVEE"; sc.render.film_transparent = True
sc.render.resolution_x = sc.render.resolution_y = RES; sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"
os.makedirs(OUT, exist_ok=True)
views = ["game", "front", "top"] if VIEW == "probe" else [VIEW]
frames = [f0] if VIEW == "probe" else list(range(f0, f1, STEP))   # last frame == first for a loop
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); import lit_render  # TB-253 (env LIT)
for v in views:
    place(v)
    if v == "game" and not bpy.data.objects.get("litground") and not getattr(lit_render, "_done", 0): lit_render.setup(sc, cam); lit_render._done = 1
    for i, f in enumerate(frames):
        sc.frame_set(f); sc.render.filepath = os.path.join(OUT, f"{PFX}_{v}_{i}.png"); bpy.ops.render.render(write_still=True); lit_render.mask(sc, os.path.join(OUT, f"{PFX}_{v}_{i}.png"))
print("DONE", len(frames), "frames x", views)
