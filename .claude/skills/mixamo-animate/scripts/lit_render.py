# TB-253: the actor light from apply_anim.py's LIT block, for the renderers that are not apply_anim jobs (render_own, ogre, hawk,
# wolfrider, wolfrider_blam). Usage after the camera is placed:  import lit_render; lit_render.setup(sc, cam)  ... and after each
# bpy.ops.render.render(write_still=True):  lit_render.mask(sc, path)  (before any in-script mirror). Env as apply_anim: LIT SUN LITFLIP
# SUNE AMB RIME SAMPLES SHA NOGROUND. setup() is a no-op unless LIT is set; mask() is a no-op unless setup() made a ground.
import os
import bpy
from mathutils import Vector

E = os.environ.get


def on():
    return bool(E("LIT"))


def setup(sc, cam):
    if not on(): return
    bpy.context.view_layer.update(); cm = cam.matrix_world.to_3x3()
    rt, up, bk = cm @ Vector((1, 0, 0)), cm @ Vector((0, 1, 0)), cm @ Vector((0, 0, 1))
    sl = [float(x) for x in E("SUN", "-0.6,1.6,0.5").split(",")]
    if E("LITFLIP"): sl[0] = -sl[0]
    sd = (rt * sl[0] + up * sl[1] + bk * sl[2] + Vector((0, 0, 0.9))).normalized()
    suns = [o for o in sc.objects if o.type == "LIGHT" and o.data.type == "SUN"]
    if not suns:
        o = bpy.data.objects.new("litsun", bpy.data.lights.new("litsun", "SUN")); sc.collection.objects.link(o); suns = [o]
    key = max(suns, key=lambda o: o.data.energy)  # the key light takes the wall's sun; other suns become the rim
    for o in suns:
        if o is key:
            o.rotation_euler = sd.to_track_quat("Z", "Y").to_euler(); o.data.energy = float(E("SUNE", "3.2")); o.data.angle = 0.14; o.data.color = (1, 0.95, 0.85)
        else:
            o.data.energy = min(o.data.energy, float(E("RIME", "0.6"))); o.data.use_shadow = False
    for o in sc.objects:  # point/area fills cast their own shadows on the catcher: keep their light, drop their shadows
        if o.type == "LIGHT" and o.data.type != "SUN": o.data.use_shadow = False
    w = sc.world or bpy.data.worlds.new("litworld"); sc.world = w; w.use_nodes = True
    bg = next((n for n in w.node_tree.nodes if n.type == "BACKGROUND"), None)
    if bg: bg.inputs[1].default_value = float(E("AMB", "0.65"))
    sc.render.engine = "CYCLES"; sc.cycles.samples = int(E("SAMPLES", "48")); sc.cycles.use_denoising = True; sc.cycles.device = "GPU"
    sc.render.film_transparent = True
    if E("NOGROUND"): return
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, float(E("LITZ", "0")))); g = bpy.context.object; g.is_shadow_catcher = True; g.name = "litground"


def mask(sc, path):
    """Re-render at 4 samples with the ground as holdout (feet below it stay masked) for the body alpha; pixels outside it are cast
    shadow: alpha x SHA (catcher alpha under 0.12 dropped), tinted toward the meadow shade SHC."""
    g = bpy.data.objects.get("litground")
    if not g: return
    import numpy as np
    sp = sc.cycles.samples; fp = sc.render.filepath; g.is_holdout = True; sc.cycles.samples = 4; sc.render.filepath = path + ".m.png"
    bpy.ops.render.render(write_still=True); g.is_holdout = False; sc.cycles.samples = sp; sc.render.filepath = fp

    def ld(p):
        im = bpy.data.images.load(p); return im, np.array(im.pixels[:], dtype=np.float32).reshape(im.size[1], im.size[0], 4)
    im, a = ld(path); mi, m = ld(path + ".m.png"); wa = m[..., 3]; sh = wa <= 245 / 255; f = (1 - wa)[..., None]
    SHA = float(E("SHA", "0.55")); SHC = np.array([22, 30, 20], dtype=np.float32) / 255
    sa = np.where(a[..., 3] < 0.12, 0, a[..., 3] * SHA * (1 - wa))
    a[..., 3] = np.where(sh, np.maximum(wa, sa), a[..., 3]); a[..., :3] = np.where(sh[..., None], a[..., :3] * (1 - f) + SHC * f, a[..., :3])
    im.pixels[:] = a.ravel(); im.filepath_raw = path; im.file_format = "PNG"; im.save(); bpy.data.images.remove(im); bpy.data.images.remove(mi); os.remove(path + ".m.png")
