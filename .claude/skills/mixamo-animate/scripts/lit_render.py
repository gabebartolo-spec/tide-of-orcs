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


def eevee_outputs():
    """Blends authored with a separate EEVEE-target and CYCLES-target Material Output (ogre228: textured Principled for EEVEE,
    flat grey Diffuse for CYCLES) render untextured in Cycles. The approved art is the EEVEE output, so it drives every engine."""
    for m in bpy.data.materials:
        if not m.use_nodes or not m.node_tree: continue
        outs = [n for n in m.node_tree.nodes if n.type == "OUTPUT_MATERIAL"]
        ev = [n for n in outs if n.target == "EEVEE" and n.inputs["Surface"].links]
        if not ev: continue
        for n in outs:
            if n.target == "CYCLES": m.node_tree.nodes.remove(n)
        ev[0].target = "ALL"; ev[0].is_active_output = True


def setup(sc, cam):
    if not on(): return
    eevee_outputs()
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
    im, a = ld(path); mi, m = ld(path + ".m.png"); wa = m[..., 3]
    wa = np.where((wa < 0.16) & (m[..., :3].max(-1) < 0.03), 0, wa)  # near-black ghost pixels of the 4-sample pass (as apply_anim._litmask): without this
    sh = wa <= 245 / 255; f = (1 - wa)[..., None]                    # the frame corners kept alpha 5-12, so the crop took the whole 512 px frame
    SHA = float(E("SHA", "0.55")); SHC = np.array([22, 30, 20], dtype=np.float32) / 255
    sa = np.where(a[..., 3] < 0.12, 0, a[..., 3] * SHA * (1 - wa))
    a[..., 3] = np.where(sh, np.maximum(wa, sa), a[..., 3]); a[..., :3] = np.where(sh[..., None], a[..., :3] * (1 - f) + SHC * f, a[..., :3])
    a[..., 3] = np.where(sh & (wa < 0.5), a[..., 3] * edge_ramp(a.shape[0], a.shape[1]), a[..., 3])  # a shadow running off the frame fades, never cuts
    im.pixels[:] = a.ravel(); im.filepath_raw = path; im.file_format = "PNG"; im.save(); bpy.data.images.remove(im); bpy.data.images.remove(mi); os.remove(path + ".m.png")


def edge_ramp(h, w, px=16):
    """0 at the frame border rising to 1 at px in: cast-shadow alpha is multiplied by it (wolf rider attack f8, TB-253: the tail's
    shadow ran off the 512 frame and ended in a straight line)."""
    import numpy as np
    y = np.minimum(np.arange(h), np.arange(h)[::-1])[:, None]; x = np.minimum(np.arange(w), np.arange(w)[::-1])[None, :]
    return np.clip(np.minimum(y, x) / px, 0, 1)

