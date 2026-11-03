# TB-188j: render the Camp tab backdrop plate in the buildings' style (chunky stylised 3D, warm sun, mossy greens) from the
# same camera as render_camp.py (ortho, GAMECAM 20, from -X). No assets needed: trees, bushes, rocks and the road are built
# here from primitives. One scene unit = U metres. The plate covers scene x [X0, X1], y [Y0, Y1] at PX px per unit; the game
# draws it so those bounds line up with the Camp scene box (CAMP_BACKDROP in src/data/presentation.ts).
# blender -b --factory-startup --python render_camp_backdrop.py -- <out.png>   env: PX (3.5), SAMPLES (64)
import bpy, bmesh, math, os, random, sys
from mathutils import Vector, Euler, Matrix
out = sys.argv[sys.argv.index("--") + 1]
X0, X1, Y0, Y1 = -200, 1040, -150, 340          # plate bounds, scene units (keep in step with CAMP_BACKDROP.plate)
U = 0.01                                         # metres per scene unit
GROUND_Y, ROAD_Y, ROAD_HALF = 165, 197, 13       # building ground line, road centre and half width (scene units)
FOREST = (-30, 78)                               # forest band: scene y of the back and front tree bases
PX = float(os.environ.get("PX", "3.5"))
rng = random.Random(1885)

bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
cx, cy = (X0 + X1) / 2, (Y0 + Y1) / 2
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"; cam.data.ortho_scale = (X1 - X0) * U; cam.data.clip_end = 200
t = math.radians(20); cam.rotation_euler = Euler((math.pi / 2 - t, 0, -math.pi / 2)); cam.location = (-40 * math.cos(t), 0, 40 * math.sin(t))
sc.render.resolution_x = round((X1 - X0) * PX); sc.render.resolution_y = round((Y1 - Y0) * PX)
bpy.context.view_layer.update()
CM = cam.matrix_world.copy(); FWD = (CM.to_3x3() @ Vector((0, 0, -1))).normalized()

def ground(sx, sy, z=0.0):
    """World point on the plane at height z that the camera sees at scene (sx, sy)."""
    o = CM @ Vector(((sx - cx) * U, -(sy - cy) * U, 0))
    k = (z - o.z) / FWD.z
    return o + FWD * k

# ---- materials ---------------------------------------------------------------------------------------------------
def srgb(c): return tuple(((v / 255) ** 2.2) for v in c) + (1,)
def mat(name, col, col2=None, scale=6.0, bump=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = 1.0
    for k in ("Specular IOR Level",):
        if k in b.inputs: b.inputs[k].default_value = 0.0
    if col2 is None: b.inputs["Base Color"].default_value = srgb(col)
    else:
        n = nt.nodes.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = scale; n.inputs["Detail"].default_value = 3
        r = nt.nodes.new("ShaderNodeValToRGB"); r.color_ramp.elements[0].color = srgb(col); r.color_ramp.elements[1].color = srgb(col2)
        r.color_ramp.elements[0].position = 0.35; r.color_ramp.elements[1].position = 0.65
        nt.links.new(n.outputs["Fac"], r.inputs["Fac"]); nt.links.new(r.outputs["Color"], b.inputs["Base Color"])
        if bump:
            bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = bump
            nt.links.new(n.outputs["Fac"], bp.inputs["Height"]); nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return m

GRASS = mat("grass", (84, 104, 20), (116, 132, 26), 1.6, 0.2)
GRASS_D = mat("grassDark", (56, 76, 16), (88, 108, 22), 3.0, 0.2)
DIRT = mat("dirt", (128, 92, 54), (166, 128, 80), 9.0, 0.4)
STONE = mat("stone", (128, 124, 112), (168, 162, 146), 12.0, 0.3)
BARK = mat("bark", (84, 54, 28), (112, 74, 38), 14.0, 0.5)
LEAVES = [mat("leaf%d" % i, a, b, 5.0, 0.35) for i, (a, b) in enumerate([
    ((58, 92, 24), (96, 128, 34)), ((46, 82, 28), (80, 114, 38)), ((76, 102, 22), (118, 136, 32)), ((40, 72, 32), (68, 102, 42))])]
PINE = mat("pine", (40, 76, 40), (66, 104, 50), 6.0, 0.3)

def obj(me, name, m):
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o); o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = True
    return o

def blob(loc, r, m, squash=0.85, sub=2, wob=0.12):
    me = bpy.data.meshes.new("b"); bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    for v in bm.verts:
        v.co *= 1 + rng.uniform(-wob, wob); v.co.z *= squash
    bm.to_mesh(me); bm.free(); o = obj(me, "blob", m); o.location = loc; o.rotation_euler.z = rng.uniform(0, 6.28); return o

def cone(loc, r1, r2, h, m, seg=10):
    me = bpy.data.meshes.new("c"); bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r1, radius2=r2, depth=h)
    for v in bm.verts: v.co.z += h / 2
    bm.to_mesh(me); bm.free(); o = obj(me, "cone", m); o.location = loc; return o

def tree(p, s):
    """Chunky broadleaf: tapered trunk, a crown of 4-7 soft blobs."""
    h = s * rng.uniform(0.45, 0.6); cone(p, 0.07 * s, 0.045 * s, h, BARK, 8)
    lm = rng.choice(LEAVES); top = p + Vector((0, 0, h))
    blob(top + Vector((0, 0, 0.22 * s)), 0.36 * s, lm)
    for _ in range(rng.randint(4, 6)):
        a = rng.uniform(0, 6.28); d = rng.uniform(0.18, 0.3) * s
        blob(top + Vector((math.cos(a) * d, math.sin(a) * d, rng.uniform(0.0, 0.3) * s)), rng.uniform(0.2, 0.28) * s, lm)

def pine(p, s):
    cone(p, 0.05 * s, 0.035 * s, 0.25 * s, BARK, 8)
    for i in range(3):
        cone(p + Vector((0, 0, (0.18 + i * 0.22) * s)), (0.36 - i * 0.09) * s, 0.02 * s, 0.42 * s, PINE, 9)

def bush(p, s, m=None):
    m = m or rng.choice(LEAVES)
    for _ in range(3):
        blob(p + Vector((rng.uniform(-0.6, 0.6) * s, rng.uniform(-0.4, 0.4) * s, 0.25 * s)), rng.uniform(0.32, 0.45) * s, m, 0.75)

# ---- ground and road -----------------------------------------------------------------------------------------------
a, b = ground(X0 - 150, Y0 - 400), ground(X1 + 150, Y1 + 150)
me = bpy.data.meshes.new("g"); bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=60, y_segments=60, size=1)
for v in bm.verts:
    v.co.x = (v.co.x + 1) / 2 * (b.x - a.x) + a.x; v.co.y = (v.co.y + 1) / 2 * (b.y - a.y) + a.y
    v.co.z = 0.006 * math.sin(v.co.x * 2.1) * math.cos(v.co.y * 1.7)
bm.to_mesh(me); bm.free(); obj(me, "ground", GRASS)

def road_y(sx): return ROAD_Y + 3 * math.sin(sx / 160 * 6.28)
# road: a strip of dirt raised a hair over the grass, with soft grass lips and stones along its edges
me = bpy.data.meshes.new("road"); bm = bmesh.new(); prev = None
for sx in range(X0 - 20, X1 + 40, 10):
    l = bm.verts.new(ground(sx, road_y(sx) - ROAD_HALF, 0.0) + Vector((0, 0, 0.012)))
    r = bm.verts.new(ground(sx, road_y(sx) + ROAD_HALF, 0.0) + Vector((0, 0, 0.012)))
    l.co.z = r.co.z = 0.04
    if prev: bm.faces.new((prev[0], l, r, prev[1]))
    prev = (l, r)
bm.to_mesh(me); bm.free(); obj(me, "road", DIRT)
for sx in range(X0, X1, 7):
    for edge in (-1, 1):
        if rng.random() < 0.55:
            blob(ground(sx + rng.uniform(-3, 3), road_y(sx) + edge * (ROAD_HALF + rng.uniform(-1, 1.5)), 0.04), rng.uniform(0.03, 0.06), STONE, 0.55, 1, 0.2)
        if rng.random() < 0.5:
            blob(ground(sx + rng.uniform(-3, 3), road_y(sx) + edge * (ROAD_HALF + rng.uniform(1.5, 4))), rng.uniform(0.04, 0.08), GRASS_D, 0.6, 1)
for _ in range(60):
    sx = rng.uniform(X0, X1); blob(ground(sx, road_y(sx) + rng.uniform(-0.7, 0.7) * ROAD_HALF, 0.04), rng.uniform(0.012, 0.025), STONE, 0.5, 1, 0.2)

# ---- meadow dressing: grass clumps, flowers, rocks; kept clear of the building row --------------------------------
for _ in range(900):
    sx, sy = rng.uniform(X0, X1), rng.uniform(FOREST[1] + 4, Y1)
    if abs(sy - road_y(sx)) < ROAD_HALF + 3: continue
    p = ground(sx, sy)
    for k in range(3):
        c = cone(p + Vector((rng.uniform(-0.02, 0.02), rng.uniform(-0.02, 0.02), 0)), 0.012, 0.0, rng.uniform(0.04, 0.08), rng.choice([GRASS, GRASS_D]), 4)
        c.rotation_euler = (rng.uniform(-0.4, 0.4), rng.uniform(-0.4, 0.4), 0)
FLOWER = [mat("fl%d" % i, c) for i, c in enumerate([(246, 236, 210), (242, 198, 76), (190, 150, 220), (233, 160, 187)])]
for _ in range(160):
    sx, sy = rng.uniform(X0, X1), rng.uniform(FOREST[1] + 10, Y1)
    if abs(sy - road_y(sx)) < ROAD_HALF + 4: continue
    blob(ground(sx, sy, 0.05), 0.018, rng.choice(FLOWER), 0.7, 1, 0.1)
for _ in range(25):
    sx, sy = rng.uniform(X0, X1), rng.uniform(FOREST[1] + 10, Y1)
    if abs(sy - road_y(sx)) < ROAD_HALF + 6 or (0 < sx < 800 and 120 < sy < 175): continue
    blob(ground(sx, sy), rng.uniform(0.06, 0.12), STONE, 0.6, 2, 0.18)

# ---- forest: back rows dense and dark, front edge broken by bushes ----------------------------------------------
for row in range(9):
    sy = FOREST[0] + (FOREST[1] - FOREST[0]) * row / 8
    step = 26 - row
    sx = X0 - 40 + rng.uniform(0, step)
    while sx < X1 + 40:
        p = ground(sx + rng.uniform(-6, 6), sy + rng.uniform(-6, 6))
        s = rng.uniform(1.0, 1.5) * (1.15 if row < 5 else 1.0)
        (pine if rng.random() < 0.3 else tree)(p, s)
        sx += step * rng.uniform(0.8, 1.3)
for _ in range(70):
    sx = rng.uniform(X0, X1); bush(ground(sx, FOREST[1] + rng.uniform(4, 16)), rng.uniform(0.25, 0.4))

# ---- light, sky, depth -------------------------------------------------------------------------------------------
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; nt = w.node_tree
bg = nt.nodes["Background"]; tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ"); ramp = nt.nodes.new("ShaderNodeValToRGB")
nt.links.new(tc.outputs["Window"], sep.inputs[0]); nt.links.new(sep.outputs["Y"], ramp.inputs["Fac"]); nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
ramp.color_ramp.elements[0].color = srgb((250, 226, 172)); ramp.color_ramp.elements[1].color = srgb((150, 196, 222))
ramp.color_ramp.elements[0].position = 0.55; bg.inputs["Strength"].default_value = 0.9
# ambient light for the scene comes from a separate light-path mix so the sky colour doesn't tint everything blue
lp = nt.nodes.new("ShaderNodeLightPath"); amb = nt.nodes.new("ShaderNodeBackground"); amb.inputs["Color"].default_value = srgb((190, 200, 205)); amb.inputs["Strength"].default_value = 0.7
mix = nt.nodes.new("ShaderNodeMixShader"); outn = nt.nodes["World Output"]
nt.links.new(lp.outputs["Is Camera Ray"], mix.inputs["Fac"]); nt.links.new(amb.outputs[0], mix.inputs[1]); nt.links.new(bg.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], outn.inputs["Surface"])
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sc.collection.objects.link(sun); sun.data.energy = 3.5; sun.data.color = (1, 0.93, 0.8)
sun.rotation_euler = Euler((math.radians(40), 0, math.radians(20))); sun.data.angle = math.radians(6)
rim = bpy.data.objects.new("rim", bpy.data.lights.new("rim", "SUN")); sc.collection.objects.link(rim); rim.data.energy = 1.5; rim.data.color = (0.8, 0.85, 1)
rim.rotation_euler = Euler((math.radians(-60), 0, math.radians(200)))
sc.render.engine = "CYCLES"; sc.cycles.samples = int(os.environ.get("SAMPLES", "64")); sc.cycles.use_denoising = True
try:
    sc.cycles.device = "GPU"; bpy.context.preferences.addons["cycles"].preferences.get_devices()
except Exception: pass
sc.view_settings.view_transform = "Standard"; sc.render.film_transparent = False
# aerial depth: mist pass mixed in the compositor toward a warm haze, strongest on the far forest
vl = sc.view_layers[0]; vl.use_pass_mist = True
far = (ground(cx, FOREST[0]) - cam.location).dot(FWD); near = (ground(cx, Y1) - cam.location).dot(FWD)
sc.world.mist_settings.start = near + (far - near) * 0.35; sc.world.mist_settings.depth = (far - near) * 0.75; sc.world.mist_settings.falloff = "QUADRATIC"
sc.use_nodes = True
try:
    ct = sc.compositing_node_group
except AttributeError:
    ct = None
if ct is None:
    try:
        ct = bpy.data.node_groups.new("comp", "CompositorNodeTree"); sc.compositing_node_group = ct
    except Exception:
        ct = sc.node_tree
for n in list(ct.nodes): ct.nodes.remove(n)
rl = ct.nodes.new("CompositorNodeRLayers"); mx = ct.nodes.new("ShaderNodeMix") if hasattr(bpy.types, "ShaderNodeMix") else None
try:
    mx = ct.nodes.new("ShaderNodeMix"); mx.data_type = "RGBA"; mx.blend_type = "MIX"
    ct.links.new(rl.outputs["Mist"], mx.inputs["Factor"]); ct.links.new(rl.outputs["Image"], mx.inputs[6])
    mx.inputs[7].default_value = srgb((206, 214, 188)); fac_mul = ct.nodes.new("ShaderNodeMath"); fac_mul.operation = "MULTIPLY"; fac_mul.inputs[1].default_value = 0.55
    ct.links.new(rl.outputs["Mist"], fac_mul.inputs[0]); ct.links.new(fac_mul.outputs[0], mx.inputs["Factor"])
    o = ct.nodes.new("NodeGroupOutput") if not hasattr(bpy.types, "CompositorNodeComposite") else ct.nodes.new("CompositorNodeComposite")
    if o.bl_idname == "NodeGroupOutput":
        ct.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    ct.links.new(mx.outputs[2], o.inputs[0])
except Exception as e:
    print("COMPOSITE_FAIL", e)
sc.render.filepath = out; bpy.ops.render.render(write_still=True)
print("PLATE", sc.render.resolution_x, sc.render.resolution_y)
