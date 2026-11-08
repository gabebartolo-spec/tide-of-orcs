# TB-211 Orc Ogre: import Sketchfab "Troll_Orc" (Reizake, CC BY) FBX, relink textures, play its own take, ortho renders.
# Env: VIEW=game|front|side|top (comma list), FORTHO front/back ortho (front crop), SPLICE token list "171,171>180@0.2,180-190" / arm layer "61-110~1@0.7", or the old "a:b:N" (splice.py), BOFF "bone:ax,ay,az,deg:f0,f1,f2,f3;..." (extra bone turn ramped in f0..f1, held, out f2..f3), GAMECAM deg, YAW deg, ORTHO, RES, FRAMES "a-b" or "a,b,c", HEIGHT m, INPLACE=1
# Usage: blender -b --factory-startup --python render_ogre.py -- <Troll_Orc.fbx> <textures dir> <outdir> <prefix>
import bpy, math, sys, os
from mathutils import Vector, Euler
a = sys.argv[sys.argv.index("--") + 1:]
SRC, TEX, OUT, PFX = a[:4]
E = os.environ.get
VIEWS = E("VIEW", "game").split(","); RES = int(E("RES", "512")); ORTHO = float(E("ORTHO", "2.4"))
T = math.radians(float(E("GAMECAM", "20"))); YAW = math.radians(float(E("YAW", "0"))); HEIGHT = float(E("HEIGHT", "2.0"))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=SRC)
sc = bpy.context.scene
for im in bpy.data.images:
    b = os.path.splitext(os.path.basename(im.filepath.replace("\\", "/")))[0]
    p = os.path.join(TEX, b + ".png")
    if os.path.exists(p): im.filepath = p; im.reload()
    else: print("MISSING TEX", im.filepath)
for m in bpy.data.materials:   # drop emissive/specular extras that wash the look out; keep base colour + normal
    if not m.node_tree: continue
    for n in m.node_tree.nodes:
        if n.type == 'BSDF_PRINCIPLED':
            for k in ("Emission Strength",):
                if k in n.inputs: n.inputs[k].default_value = 0.0
            if "Specular IOR Level" in n.inputs:
                for l in list(n.inputs["Specular IOR Level"].links): m.node_tree.links.remove(l)
                n.inputs["Specular IOR Level"].default_value = 0.2
# The sword is a spec/gloss material: its diffuse is black where the steel is and the steel colour lives in the
# specular map. Convert to metal/rough the standard way: base = lighten(diffuse, specular), metallic = steel mask, rough = 1 - gloss.
sw = bpy.data.materials.get("lambert3")
if sw and sw.node_tree:
    nt = sw.node_tree; bs = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    dif = next(n for n in nt.nodes if n.type == 'TEX_IMAGE')
    def tex(name, cs):
        n = nt.nodes.new("ShaderNodeTexImage"); n.image = bpy.data.images.load(os.path.join(TEX, name)); n.image.colorspace_settings.name = cs; return n
    spe = tex("Troll_Teksture_Sword_Specular.png", "sRGB"); glo = tex("Troll_Teksture_Sword_Glossiness.png", "Non-Color")
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = 'RGBA'; mix.blend_type = 'LIGHTEN'; mix.inputs[0].default_value = 1.0
    nt.links.new(dif.outputs[0], mix.inputs[6]); nt.links.new(spe.outputs[0], mix.inputs[7]); nt.links.new(mix.outputs[2], bs.inputs["Base Color"])
    inv = nt.nodes.new("ShaderNodeInvert"); nt.links.new(glo.outputs[0], inv.inputs[1]); nt.links.new(inv.outputs[0], bs.inputs["Roughness"])
    bw = nt.nodes.new("ShaderNodeRGBToBW"); nt.links.new(dif.outputs[0], bw.inputs[0])
    mr = nt.nodes.new("ShaderNodeMapRange"); mr.inputs[1].default_value = 0.0; mr.inputs[2].default_value = 0.03; mr.inputs[3].default_value = 1.0; mr.inputs[4].default_value = 0.0
    nt.links.new(bw.outputs[0], mr.inputs[0]); nt.links.new(mr.outputs[0], bs.inputs["Metallic"])
roots = [o for o in sc.objects if o.parent is None]
piv = bpy.data.objects.new("piv", None); sc.collection.objects.link(piv)
for o in roots:
    mw = o.matrix_world.copy(); o.parent = piv; o.matrix_world = mw
meshes = [o for o in sc.objects if o.type == 'MESH']
sc.frame_start, sc.frame_end = 1, 231
def bbox():
    dg = bpy.context.evaluated_depsgraph_get(); lo = Vector((1e9,) * 3); hi = -lo
    for o in meshes:
        e = o.evaluated_get(dg); m = e.to_mesh()
        for v in m.vertices:
            w = e.matrix_world @ v.co; lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
        e.to_mesh_clear()
    return lo, hi
F0 = int(E("REFF", "1"))
sc.frame_set(F0); bpy.context.view_layer.update()
lo, hi = bbox(); print("RAWBBOX", tuple(round(x, 3) for x in lo), tuple(round(x, 3) for x in hi))
s = HEIGHT / (hi.z - lo.z); c = (lo + hi) / 2
piv.scale = (s, s, s); piv.rotation_euler.z = YAW
bpy.context.view_layer.update()
lo, hi = bbox(); c = (lo + hi) / 2
piv.location = Vector((-c.x, -c.y, -lo.z)); bpy.context.view_layer.update()
lo, hi = bbox(); print("BBOX", tuple(round(x, 3) for x in lo), tuple(round(x, 3) for x in hi))
arm = next(o for o in sc.objects if o.type == 'ARMATURE')
root = arm.pose.bones.get("Skeleton")
def rootw(): return (arm.matrix_world @ root.head) if root else Vector()
r0 = rootw().copy()
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"; cam.data.ortho_scale = ORTHO; C = Vector((0, 0, float(E("CZ", str(ORTHO / 2 - 0.15))))); D = 6
def place(view):
    if view == "game":   # field camera (as render_hawk): from -Y, T above the ground; character faces +X = screen-right
        cam.location = C + Vector((0, -D * math.cos(T), D * math.sin(T))); cam.rotation_euler = Euler((math.pi / 2 - T, 0, 0))
    elif view == "front":  # facing the character: it faces +X at YAW 90, so its facing turns with YAW - 90
        f = YAW - math.pi / 2
        cam.location = C + Vector((D * math.cos(f), D * math.sin(f), 0)); cam.rotation_euler = Euler((math.pi / 2, 0, math.pi / 2 + f))
    elif view == "back":
        cam.location = C + Vector((-D, 0, 0)); cam.rotation_euler = Euler((math.pi / 2, 0, -math.pi / 2))
    elif view == "top":
        pass
    if view in ("game", "front", "back"):  # light rig turns with the camera, so every view is lit as the game view is (critic 4 Nov: front was dark)
        a = {"game": 0, "front": 90 + math.degrees(YAW) - 90, "back": -90}[view]
        sun.rotation_euler.z = math.radians(20 + a); rim.rotation_euler.z = math.radians(200 + a)
    if view == "top":
        cam.location = C + Vector((0, 0, D)); cam.rotation_euler = Euler((0, 0, 0))
# lighting copied from apply_anim.py (every orc sprite): grey-blue world 0.6, warm key sun, cool rim, Standard view transform
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.6, 0.65, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.6
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sc.collection.objects.link(sun); sun.data.energy = 3.5; sun.data.color = (1, 0.93, 0.8); sun.rotation_euler = Euler((math.radians(40), 0, math.radians(20)))
rim = bpy.data.objects.new("rim", bpy.data.lights.new("rim", "SUN")); sc.collection.objects.link(rim); rim.data.energy = 1.5; rim.data.color = (0.8, 0.85, 1); rim.rotation_euler = Euler((math.radians(-60), 0, math.radians(200)))
sc.view_settings.view_transform = "Standard"
sc.render.engine = "BLENDER_EEVEE"; sc.render.film_transparent = True
sc.render.resolution_x = sc.render.resolution_y = RES; sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"
os.makedirs(OUT, exist_ok=True)
from bpy_extras.object_utils import world_to_camera_view as _w2c
sc.frame_set(F0); bpy.context.view_layer.update(); place("game")
_g = rootw(); _p = _w2c(sc, cam, Vector((_g.x, _g.y, 0))); print("ANCHOR", round(_p.x * RES, 2), round((1 - _p.y) * RES, 2), ORTHO)
fs = E("FRAMES", "1-231")
frames = list(range(int(fs.split("-")[0]), int(fs.split("-")[1]) + 1)) if "-" in fs else [int(x) for x in fs.split(",")]
INPLACE = E("INPLACE") == "1"
if E("NOSWORD"):  # measuring only: hide the cleaver to get the body's own height (body-height calibration for pack_sprites)
    for o in meshes:
        if any(sl.material and sl.material.name == "lambert3" for sl in o.material_slots): o.hide_render = True; print("HID", o.name)
from mathutils import Quaternion
BOFF = []  # TB-211: the take's cleaver passes through the head/torso in attack frames 30-32 (take 203-205); a ramped arm turn clears it
for spec in filter(None, E("BOFF", "").split(";")):
    bn, ax, fr4 = spec.split(":"); ax = [float(x) for x in ax.split(",")]; BOFF.append((bn, Vector(ax[:3]).normalized(), math.radians(ax[3]), [int(x) for x in fr4.split(",")]))
WP, HB = bpy.data.objects.get("weapon_LP_trian1"), arm.pose.bones.get("joint150")  # the cleaver rides its own control, not the hand; carry it rigidly with the hand
WPB = WP.matrix_basis.copy() if WP else None  # the weapon has no keys of its own: put its basis back every frame so an offset never leaks
def boff(f):
    if not BOFF: return
    WP.matrix_basis = WPB
    bpy.context.view_layer.update(); hw = lambda: arm.matrix_world @ HB.matrix; rel = hw().inverted() @ WP.matrix_world
    for bn, ax, ang, (f0, f1, f2, f3) in BOFF:
        k = 0 if f <= f0 or f >= f3 else 1 if f1 <= f <= f2 else (f - f0) / (f1 - f0) if f < f1 else (f3 - f) / (f3 - f2)
        k = k * k * (3 - 2 * k)  # smoothstep
        if k <= 0: continue
        pb = arm.pose.bones[bn]; q = Quaternion(ax, ang * k)
        if pb.rotation_mode == 'QUATERNION': pb.rotation_quaternion = pb.rotation_quaternion @ q
        else: pb.rotation_euler = (pb.rotation_euler.to_quaternion() @ q).to_euler(pb.rotation_mode)
    bpy.context.view_layer.update(); WP.matrix_world = hw() @ rel; bpy.context.view_layer.update()
SPLICE = E("SPLICE")  # TB-211: token list (round 5) or "a:b:N" (round 3), see splice.py
if SPLICE:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import splice
    frames = splice.seq(SPLICE)
for v in VIEWS:
    place(v)
    cam.data.ortho_scale = float(E("FORTHO", str(ORTHO))) if v in ("front", "back") else ORTHO
    for i, f in enumerate(frames):
        if SPLICE: splice.apply(sc, arm, WP, HB, f)
        else: sc.frame_set(f); boff(f)
        if INPLACE:  # cancel the take's ground drift of the root (keep height)
            d = rootw() - r0; piv.location.x -= d.x; piv.location.y -= d.y; bpy.context.view_layer.update()
        if E("PROBE"): rw = rootw(); print("ROOT", f, tuple(round(x, 3) for x in rw))
        if E("NORENDER"): continue
        sc.render.filepath = os.path.join(OUT, f"{PFX}_{v}_{i}.png"); bpy.ops.render.render(write_still=True)
print("DONE", len(frames), "frames x", VIEWS)
