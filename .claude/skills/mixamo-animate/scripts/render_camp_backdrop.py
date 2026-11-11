# TB-188k: render the whole Camp scene in one Blender scene (Cycles, one sun, one sky light) so the buildings and the backdrop
# share light, shadow and pixel density. Pass "plate": forest, meadow, road and props, no buildings. Pass per building/level:
# that Tripo model planted on the meadow (its ground island sunk under the field and its leftover grass faces removed), the
# rest of the scene held out and the ground a shadow catcher, so the PNG carries the building plus its real contact shadow.
# post_camp.py crops the PNGs, writes public/decor/camp/*.webp and prints the CAMP_ART rects for src/data/presentation.ts.
# blender -b --factory-startup --python render_camp_backdrop.py -- <out dir>   env: PX (4), SAMPLES (96), ONLY (plate,forge3,elk,...)
# Pass "elk" (TB-208) renders the elk's graze clip frame by frame to <out>/elk/NNN.png + elk.json; post_elk.py packs them.
import bpy, bmesh, math, os, random, sys, json
from mathutils import Vector, Euler
out = sys.argv[sys.argv.index("--") + 1]; os.makedirs(out, exist_ok=True)
X0, X1, Y0, Y1 = -40, 1240, -370, 380           # plate bounds, scene units (keep in step with CAMP_BACKDROP.plate)
U = 0.01                                          # metres per scene unit
BACK_Y, FRONT_Y = 40, 150                         # scene y of the back and front rows' front edges (TB-188k round 3)
ROAD_Y, ROAD_HALF = 232, 13                       # road centre and half width (scene units)
# building centres (scene x) and screen-width footprint at level 3 in scene units; levels 1/2 are LV_K of it
SPOTS = {"bowyer": (230, 234, BACK_Y), "forge": (470, 234, FRONT_Y), "kitchen": (730, 242, BACK_Y), "training": (975, 278, FRONT_Y)}  # director 3 Nov round 3: 1.6x round 2, two staggered rows in a full-screen 1194x672 view
LV_K = {0: 0.7, 1: 0.8, 2: 0.9, 3: 1.0}   # level 0 = the cleared plot (Tripo, 11 Nov)
PX = float(os.environ.get("PX", "4"))   # the elk pass is rendered with PX=3 (TB-208)
ONLY = [s for s in os.environ.get("ONLY", "").split(",") if s]
CAMP = r"C:\Users\DANTE\Documents\tide-assets\camp"
rng = random.Random(1886)

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
    return o + FWD * ((z - o.z) / FWD.z)
G0 = ground(0, 0); GX = ground(1, 0) - G0; GY = ground(0, 1) - G0
DET = GX.x * GY.y - GX.y * GY.x
def scene_of(p):
    """Inverse of ground() at z=0: world (x, y) to scene (sx, sy)."""
    dx, dy = p.x - G0.x, p.y - G0.y
    return ((dx * GY.y - dy * GY.x) / DET, (GX.x * dy - GX.y * dx) / DET)

# ---- materials ---------------------------------------------------------------------------------------------------
def srgb(c): return tuple(((v / 255) ** 2.2) for v in c) + (1,)
def bsdf(m):
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Roughness"].default_value = 1.0
    if "Specular IOR Level" in b.inputs: b.inputs["Specular IOR Level"].default_value = 0.0
    return b
def mat(name, col, col2=None, scale=6.0, bump=0.0, coord="Object"):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = bsdf(m)
    if col2 is None: b.inputs["Base Color"].default_value = srgb(col); return m
    tc = nt.nodes.new("ShaderNodeTexCoord")
    n = nt.nodes.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = scale; n.inputs["Detail"].default_value = 3
    nt.links.new(tc.outputs[coord], n.inputs["Vector"])
    r = nt.nodes.new("ShaderNodeValToRGB"); r.color_ramp.elements[0].color = srgb(col); r.color_ramp.elements[1].color = srgb(col2)
    r.color_ramp.elements[0].position = 0.3; r.color_ramp.elements[1].position = 0.7
    nt.links.new(n.outputs["Fac"], r.inputs["Fac"]); nt.links.new(r.outputs["Color"], b.inputs["Base Color"])
    if bump:
        bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = bump
        nt.links.new(n.outputs["Fac"], bp.inputs["Height"]); nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return m

# meadow: hue ~100, moderate saturation; three blade tones
GRASS_A, GRASS_B, GRASS_C = (58, 88, 46), (73, 102, 55), (87, 114, 66)  # lit median ~hue 97, value ~43%
STONE = mat("stone", (122, 120, 110), (158, 154, 140), 12.0, 0.3)
BARK = mat("bark", (78, 54, 34), (106, 74, 44), 14.0, 0.5)
WOOD = mat("wood", (122, 84, 50), (152, 108, 64), 9.0, 0.4)
WOOD_END = mat("woodEnd", (176, 136, 88), (196, 158, 106), 20.0, 0.2)
TUFT = [mat("tuft%d" % i, c) for i, c in enumerate([(46, 68, 36), (52, 74, 40), (42, 62, 34)])]
CLOVER = mat("clover", (84, 124, 66), (98, 138, 76), 30.0, 0.1)
FLOWER = [mat("fl%d" % i, c) for i, c in enumerate([(246, 238, 216), (240, 204, 92), (186, 156, 222), (232, 170, 190)])]
# foliage: near (warm, lit), mid, far (cooler); each a pair for crown variation
LEAF_NEAR = [mat("ln%d" % i, a, b, 4.0, 0.25) for i, (a, b) in enumerate([((60, 100, 46), (94, 132, 64)), ((52, 92, 50), (82, 122, 64)), ((70, 106, 48), (104, 138, 66))])]
LEAF_MID = [mat("lm%d" % i, a, b, 4.0, 0.25) for i, (a, b) in enumerate([((48, 84, 50), (76, 112, 66)), ((56, 90, 48), (86, 118, 62))])]
LEAF_FAR = [mat("lf%d" % i, a, b, 4.0, 0.2) for i, (a, b) in enumerate([((52, 84, 66), (76, 106, 82)), ((58, 88, 64), (82, 110, 80))])]
PINE = mat("pine", (40, 74, 52), (62, 98, 66), 6.0, 0.3)

ENV = []   # every environment object: held out in the building passes
def obj(me, name, m, smooth=True):
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o); o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = smooth
    ENV.append(o); return o

def blob(loc, r, m, squash=0.85, sub=2, wob=0.12):
    me = bpy.data.meshes.new("b"); bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    for v in bm.verts:
        v.co *= 1 + rng.uniform(-wob, wob); v.co.z *= squash
    bm.to_mesh(me); bm.free(); o = obj(me, "blob", m); o.location = loc; o.rotation_euler.z = rng.uniform(0, 6.28); return o

def cyl(loc, r1, r2, h, m, seg=10, rot=(0, 0, 0)):
    me = bpy.data.meshes.new("c"); bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r1, radius2=r2, depth=h)
    for v in bm.verts: v.co.z += h / 2
    bm.to_mesh(me); bm.free(); o = obj(me, "cone", m); o.location = loc; o.rotation_euler = rot; return o

def box(loc, size, m, rot=(0, 0, 0)):
    me = bpy.data.meshes.new("k"); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts: v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2] + size[2] / 2))
    bevel = bmesh.ops.bevel(bm, geom=list(bm.edges), offset=min(size) * 0.18, segments=2, affect="EDGES")
    bm.to_mesh(me); bm.free(); o = obj(me, "box", m); o.location = loc; o.rotation_euler = rot; return o

def tree(p, s, leaves):
    """Chunky broadleaf: tapered trunk, a crown of 5-7 soft blobs."""
    h = s * rng.uniform(0.45, 0.6); cyl(p, 0.07 * s, 0.045 * s, h, BARK, 8)
    lm = rng.choice(leaves); top = p + Vector((0, 0, h))
    blob(top + Vector((0, 0, 0.22 * s)), 0.36 * s, lm)
    for _ in range(rng.randint(5, 7)):
        a = rng.uniform(0, 6.28); d = rng.uniform(0.18, 0.32) * s
        blob(top + Vector((math.cos(a) * d, math.sin(a) * d, rng.uniform(-0.05, 0.32) * s)), rng.uniform(0.18, 0.27) * s, lm)

def pine(p, s):
    cyl(p, 0.05 * s, 0.035 * s, 0.25 * s, BARK, 8)
    for i in range(3):
        cyl(p + Vector((0, 0, (0.18 + i * 0.22) * s)), (0.36 - i * 0.09) * s, 0.02 * s, 0.42 * s, PINE, 9)

def bush(p, s, leaves):
    m = rng.choice(leaves)
    for _ in range(rng.randint(3, 4)):
        blob(p + Vector((rng.uniform(-0.6, 0.6) * s, rng.uniform(-0.5, 0.5) * s, 0.28 * s)), rng.uniform(0.3, 0.45) * s, m, 0.75)

def tuft(p, s):
    """A clump of 4-6 leaning blades, mid green (never near-black: no blade is thinner than it is lit)."""
    return  # director 3 Nov: no tufts (they read as black flecks)
    m = rng.choice(TUFT)
    for _ in range(rng.randint(4, 6)):
        a = rng.uniform(0, 6.28); lean = rng.uniform(0.15, 0.5)
        cyl(p + Vector((math.cos(a) * 0.008 * s, math.sin(a) * 0.008 * s, 0)), 0.006 * s, 0.0, rng.uniform(0.035, 0.06) * s, m, 4,
            (math.cos(a) * lean, math.sin(a) * lean, 0))

def flowers(p, s):
    m = rng.choice(FLOWER)
    for _ in range(rng.randint(4, 7)):
        blob(p + Vector((rng.uniform(-0.03, 0.03) * s, rng.uniform(-0.03, 0.03) * s, 0.025 * s)), 0.011 * s, m, 0.7, 1, 0.1)

def clover(p, s):
    for _ in range(rng.randint(5, 8)):
        blob(p + Vector((rng.uniform(-0.035, 0.035) * s, rng.uniform(-0.035, 0.035) * s, 0.006)), rng.uniform(0.008, 0.013) * s, CLOVER, 0.45, 1, 0.1)

# ---- ground: one mesh, road mask and ruts in a colour attribute ------------------------------------------------------
def road_y(sx): return ROAD_Y + 2.5 * math.sin(sx / 170 * 6.28)
def edge_n(sx): return 1.6 * math.sin(sx * 0.11) + 1.1 * math.sin(sx * 0.29 + 1.3) + 0.6 * math.sin(sx * 0.71 + 2.1)
def sstep(a, b, x):
    t_ = max(0.0, min(1.0, (x - a) / (b - a))); return t_ * t_ * (3 - 2 * t_)
NX, NY = 760, 440
me = bpy.data.meshes.new("g"); bm = bmesh.new(); vs = []
for j in range(NY + 1):
    for i in range(NX + 1):
        sx = X0 - 30 + (X1 - X0 + 60) * i / NX; sy = Y0 - 30 + (Y1 - Y0 + 60) * j / NY
        vs.append(bm.verts.new(ground(sx, sy)))
for j in range(NY):
    for i in range(NX):
        a = j * (NX + 1) + i; bm.faces.new((vs[a], vs[a + 1], vs[a + NX + 2], vs[a + NX + 1]))
bm.to_mesh(me); bm.free()
attr = me.color_attributes.new("road", "FLOAT_COLOR", "POINT")
for k, v in enumerate(me.vertices):
    sx, sy = scene_of(v.co); d = sy - road_y(sx); half = ROAD_HALF + edge_n(sx)
    road = sstep(half + 9.0, half - 4.0, abs(d))
    rut = max(sstep(2.2, 0.6, abs(d - 4.5)), sstep(2.2, 0.6, abs(d + 4.5))) * road
    attr.data[k].color = (road, rut, 0, 1)
GROUND = bpy.data.materials.new("ground"); GROUND.use_nodes = True; nt = GROUND.node_tree; b = bsdf(GROUND)
tc = nt.nodes.new("ShaderNodeTexCoord"); at = nt.nodes.new("ShaderNodeAttribute"); at.attribute_name = "road"
sep = nt.nodes.new("ShaderNodeSeparateColor"); nt.links.new(at.outputs["Color"], sep.inputs[0])
def noise(scale, det=3):
    n = nt.nodes.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = scale; n.inputs["Detail"].default_value = det
    nt.links.new(tc.outputs["Object"], n.inputs["Vector"]); return n
def ramp(fac, cols):
    r = nt.nodes.new("ShaderNodeValToRGB"); el = r.color_ramp.elements
    while len(el) < len(cols): el.new(0.5)
    for e, (pos, c) in zip(el, cols): e.position = pos; e.color = srgb(c)
    nt.links.new(fac, r.inputs["Fac"]); return r
# grass: three tones, broad patches plus fine speckle
g1 = ramp(noise(1.2).outputs["Fac"], [(0.25, GRASS_A), (0.5, GRASS_B), (0.75, GRASS_C)])
gfine = noise(40, 2)
gmix = nt.nodes.new("ShaderNodeMix"); gmix.data_type = "RGBA"; gmix.blend_type = "OVERLAY"; gmix.inputs["Factor"].default_value = 0.25
nt.links.new(g1.outputs["Color"], gmix.inputs[6]); nt.links.new(gfine.outputs["Color"], gmix.inputs[7])
# dirt: +-10% value from a broad noise, darker ruts
d1 = ramp(noise(2.5).outputs["Fac"], [(0.3, (132, 100, 66)), (0.7, (160, 124, 84))])
dr = nt.nodes.new("ShaderNodeMix"); dr.data_type = "RGBA"; dr.blend_type = "MULTIPLY"
nt.links.new(sep.outputs["Green"], dr.inputs["Factor"]); nt.links.new(d1.outputs["Color"], dr.inputs[6]); dr.inputs[7].default_value = srgb((196, 180, 160))
# the road edge: broken by fine noise so grass bleeds over it softly
em = nt.nodes.new("ShaderNodeMath"); em.operation = "MULTIPLY_ADD"; en = noise(22, 2)
nt.links.new(en.outputs["Fac"], em.inputs[0]); em.inputs[1].default_value = 0.6; em.inputs[2].default_value = -0.3
ea = nt.nodes.new("ShaderNodeMath"); ea.operation = "ADD"; ea.use_clamp = True
nt.links.new(sep.outputs["Red"], ea.inputs[0]); nt.links.new(em.outputs[0], ea.inputs[1])
# only perturb inside the soft band: mask = road + (noise term) * 4 * road * (1 - road)
rr = nt.nodes.new("ShaderNodeMath"); rr.operation = "MULTIPLY"; nt.links.new(sep.outputs["Red"], rr.inputs[0])
inv = nt.nodes.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1; nt.links.new(sep.outputs["Red"], inv.inputs[1])
nt.links.new(inv.outputs[0], rr.inputs[1])
band = nt.nodes.new("ShaderNodeMath"); band.operation = "MULTIPLY"; band.inputs[1].default_value = 4; nt.links.new(rr.outputs[0], band.inputs[0])
pert = nt.nodes.new("ShaderNodeMath"); pert.operation = "MULTIPLY"; nt.links.new(band.outputs[0], pert.inputs[0]); nt.links.new(em.outputs[0], pert.inputs[1])
mask = nt.nodes.new("ShaderNodeMath"); mask.operation = "ADD"; mask.use_clamp = True
nt.links.new(sep.outputs["Red"], mask.inputs[0]); nt.links.new(pert.outputs[0], mask.inputs[1])
fin = nt.nodes.new("ShaderNodeMix"); fin.data_type = "RGBA"
nt.links.new(mask.outputs[0], fin.inputs["Factor"]); nt.links.new(gmix.outputs[2], fin.inputs[6]); nt.links.new(dr.outputs[2], fin.inputs[7])
nt.links.new(fin.outputs[2], b.inputs["Base Color"])
bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.15; nt.links.new(gfine.outputs["Fac"], bp.inputs["Height"]); nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
GROUND_OBJ = obj(me, "ground", GROUND)

# ---- footprints of the buildings (kept clear of dressing) --------------------------------------------------------
def in_bld(sx, sy, pad=0):
    for x, w, f in SPOTS.values():
        if abs(sx - x) < w / 2 + pad and f - 110 - pad < sy < f + pad: return True
    return False
def on_road(sx, sy, pad=0): return abs(sy - road_y(sx)) < ROAD_HALF + edge_n(sx) + pad

# ---- meadow dressing: flower and clover patches only (no tufts, no stones: director 3 Nov) --------------------------------
for cx_, cy_ in ((120, -60), (610, -20), (880, -90), (360, 200), (1120, 190), (60, 300), (700, 300)):
    for _ in range(6):
        sx, sy = cx_ + rng.gauss(0, 14), cy_ + rng.gauss(0, 7)
        if on_road(sx, sy, 4) or in_bld(sx, sy, 4): continue
        flowers(ground(sx, sy), rng.uniform(2.2, 2.8))
for _ in range(50):
    sx, sy = rng.uniform(X0, X1), rng.uniform(-150, Y1)
    if on_road(sx, sy, 3) or in_bld(sx, sy, 3): continue
    clover(ground(sx, sy), rng.uniform(1.0, 1.6))

# ---- props in the buildings' chunky style: fences, log pile, stumps, bushes, barrel ------------------------------
def fence(sx0, sx1, sy):
    n = max(2, int(abs(sx1 - sx0) / 16)); pts = [ground(sx0 + (sx1 - sx0) * i / n, sy + rng.uniform(-1, 1)) for i in range(n + 1)]
    for p in pts: cyl(p, 0.022, 0.019, 0.16 + rng.uniform(-0.01, 0.01), WOOD, 7, (rng.uniform(-0.06, 0.06), rng.uniform(-0.06, 0.06), 0))
    for a, b in zip(pts, pts[1:]):
        d = b - a; L = d.length; ang = math.atan2(d.y, d.x)
        for hz in (0.06, 0.12):
            cyl(a + Vector((0, 0, hz)), 0.012, 0.012, L, WOOD, 6, (0, math.pi / 2, ang)).location = a + Vector((0, 0, hz))
def logpile(sx, sy):
    p = ground(sx, sy)
    for i, (dy, z) in enumerate([(-0.05, 0.025), (0, 0.025), (0.05, 0.025), (-0.025, 0.068), (0.025, 0.068)]):
        q = p + Vector((0, dy, z)); cyl(q + Vector((-0.09, 0, 0)), 0.025, 0.025, 0.18, BARK, 10, (0, math.pi / 2, 0))
        cyl(q + Vector((-0.092, 0, 0)), 0.02, 0.02, 0.004, WOOD_END, 10, (0, math.pi / 2, 0))
def stump(sx, sy):
    p = ground(sx, sy); cyl(p, 0.05, 0.042, 0.05, BARK, 12); cyl(p + Vector((0, 0, 0.05)), 0.041, 0.041, 0.003, WOOD_END, 12)
def barrel(sx, sy):
    p = ground(sx, sy); cyl(p, 0.035, 0.04, 0.09, WOOD, 12)
    for hz in (0.015, 0.07): cyl(p + Vector((0, 0, hz)), 0.042, 0.042, 0.008, STONE, 12)
def scaled(fn, k, *a):
    n0 = len(ENV); fn(*a); p = ground(a[0], a[1])
    for o in ENV[n0:]: o.location = p + (o.location - p) * k; o.scale = o.scale * k
# foreground (below the road, <=20% of the view): 10 props at 1.6x, none mid-field (director 3 Nov)
# foreground (below the road): barrels in two groups, varied bushes and flower clumps; no stumps or log piles (critics r3)
for sx, sy in ((330, 262), (352, 270), (1150, 258)): scaled(barrel, 3.0, sx, sy)
for _ in range(16):
    sx, sy = rng.uniform(X0 + 20, X1 - 20), rng.uniform(252, 330)
    if on_road(sx, sy, 6): continue
    bush(ground(sx, sy), rng.uniform(0.08, 0.2), rng.choice([LEAF_NEAR, LEAF_MID]))
for _ in range(10):
    sx, sy = rng.uniform(X0 + 20, X1 - 20), rng.uniform(252, 300)
    if on_road(sx, sy, 6): continue
    flowers(ground(sx, sy), rng.uniform(2.2, 2.8))

# ---- forest: far, mid and near layers; hedges right behind the building row ---------------------------------------
def forest(y0, y1, rows, step, leaves, pine_p, smin, smax):
    for row in range(rows):
        sy = y0 + (y1 - y0) * row / max(1, rows - 1); sx = X0 - 40 + rng.uniform(0, step)
        while sx < X1 + 40:
            p = ground(sx + rng.uniform(-6, 6), sy + rng.uniform(-5, 5)); s = rng.uniform(smin, smax)
            if rng.random() < pine_p: pine(p, s)
            else: tree(p, s, leaves)
            sx += step * rng.uniform(0.8, 1.25)
forest(-305, -280, 2, 22, LEAF_FAR, 0.35, 1.0, 1.4)
forest(-268, -245, 2, 26, LEAF_MID, 0.25, 0.95, 1.3)
forest(-235, -212, 2, 32, LEAF_NEAR, 0.15, 0.9, 1.2)
for _ in range(70):   # undergrowth along the forest's front edge, irregular so the tree line has no hard cut
    sx = rng.uniform(X0, X1); bush(ground(sx, rng.uniform(-212, -190)), rng.uniform(0.22, 0.5), LEAF_NEAR)
# hedges: varied clumps behind the back-row buildings and a few in the open meadow, never one stamp repeated
for bid_, n_, sz in (("bowyer", 9, (0.2, 0.5)), ("kitchen", 5, (0.15, 0.35))):
    bx, bw, bf = SPOTS[bid_]
    for _ in range(n_):
        bush(ground(bx + rng.uniform(-0.6, 0.6) * bw, bf - 110 + rng.uniform(-14, 10)), rng.uniform(*sz), rng.choice([LEAF_NEAR, LEAF_MID]))
for sx, sy, sz in ((470, -40, 0.32), (520, -52, 0.2), (1080, -30, 0.4), (1130, -46, 0.25), (20, 20, 0.3)): bush(ground(sx, sy), sz, LEAF_MID)

# ---- elk grazing behind the camp (TB-208): "Realistic Animated Elk 3D Model" by WildMesh 3D (CC BY 4.0), its own
# Stand_Eating_01 clip played exactly as authored, rendered frame by frame in its own pass so the scene can loop it.
ELK = os.environ.get("ELK", "C:/Users/DANTE/Documents/tide-assets/sketchfab/elk/scene.gltf")
ELK_AT = (600, -110)            # scene (x, y) of the elk's hooves
ELK_LEN = float(os.environ.get("ELK_LEN", "45"))   # nose-to-tail length, scene units (a real elk is ~2.4 m to a ~8 m building)
ELK_CLIP, ELK_STEP = "Stand_Eating_01", int(os.environ.get("ELK_STEP", "4"))   # the model's graze loop (256 frames at 24 fps)
def load_elk():
    before = set(sc.objects); bpy.ops.import_scene.gltf(filepath=ELK)
    new = [o for o in sc.objects if o not in before]
    for o in [o for o in new if o.name.startswith("Icosphere")]: new.remove(o); bpy.data.objects.remove(o)   # stray helper sphere
    arm = next(o for o in new if o.type == "ARMATURE"); ad = arm.animation_data
    for t in ad.nla_tracks: t.mute = True
    ad.action = bpy.data.actions[ELK_CLIP]
    if getattr(ad, "action_slot", 1) is None and len(ad.action_suitable_slots): ad.action_slot = ad.action_suitable_slots[0]
    for mt in {s_.material for o in new if o.type == "MESH" for s_ in o.material_slots if s_.material}:
        for nd in mt.node_tree.nodes:
            if nd.type == "BSDF_PRINCIPLED":
                for l in list(nd.inputs["Roughness"].links) + list(nd.inputs["Metallic"].links): mt.node_tree.links.remove(l)
                nd.inputs["Roughness"].default_value = 1.0; nd.inputs["Metallic"].default_value = 0.0
                if "Specular IOR Level" in nd.inputs: nd.inputs["Specular IOR Level"].default_value = 0.0
    root = bpy.data.objects.new("elk", None); sc.collection.objects.link(root)
    for o in new:
        if o.parent is None: o.parent = root
    # the model faces +y (screen right): turn it to face screen left like the old deer; ELK_FACE=right keeps it facing right,
    # a true right-facing pass (its other flank lit by the same sun, its shadow still falling lower left) instead of a canvas flip
    root.rotation_euler.z = 0.0 if os.environ.get("ELK_FACE") == "right" else math.pi
    sc.frame_set(0); bpy.context.view_layer.update()
    ms = [o for o in new if o.type == "MESH"]
    def pts():
        dg = bpy.context.evaluated_depsgraph_get(); P = []
        for o in ms:
            e = o.evaluated_get(dg); P += [e.matrix_world @ v.co for v in e.to_mesh().vertices]; e.to_mesh_clear()
        return P
    P = pts(); s_ = ELK_LEN * U / (max(p.y for p in P) - min(p.y for p in P)); root.scale = (s_, s_, s_); bpy.context.view_layer.update()
    P = pts(); g = ground(*ELK_AT)
    root.location = Vector((g.x - (min(p.x for p in P) + max(p.x for p in P)) / 2, g.y - (min(p.y for p in P) + max(p.y for p in P)) / 2, -min(p.z for p in P)))
    bpy.context.view_layer.update()
    for o in new: o.hide_render = True
    return new, ms, pts

# ---- light: one warm sun, cool sky fill ----------------------------------------------------------------------------
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; nt = w.node_tree
bg = nt.nodes["Background"]; tc = nt.nodes.new("ShaderNodeTexCoord"); sp = nt.nodes.new("ShaderNodeSeparateXYZ"); rp = nt.nodes.new("ShaderNodeValToRGB")
nt.links.new(tc.outputs["Window"], sp.inputs[0]); nt.links.new(sp.outputs["Y"], rp.inputs["Fac"]); nt.links.new(rp.outputs["Color"], bg.inputs["Color"])
rp.color_ramp.elements[0].color = srgb((240, 230, 196)); rp.color_ramp.elements[1].color = srgb((168, 200, 214)); bg.inputs["Strength"].default_value = 0.9
lp = nt.nodes.new("ShaderNodeLightPath"); amb = nt.nodes.new("ShaderNodeBackground"); amb.inputs["Color"].default_value = srgb((176, 196, 218)); amb.inputs["Strength"].default_value = 0.75
mix = nt.nodes.new("ShaderNodeMixShader"); outn = nt.nodes["World Output"]
nt.links.new(lp.outputs["Is Camera Ray"], mix.inputs["Fac"]); nt.links.new(amb.outputs[0], mix.inputs[1]); nt.links.new(bg.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], outn.inputs["Surface"])
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sc.collection.objects.link(sun); sun.data.energy = 3.6; sun.data.color = (1, 0.92, 0.78)
sun.rotation_euler = Euler((math.radians(22), 0, math.radians(20))); sun.data.angle = math.radians(10)
sc.render.engine = "CYCLES"; sc.cycles.samples = int(os.environ.get("SAMPLES", "96")); sc.cycles.use_denoising = True; sc.cycles.filter_width = 1.0
try:
    pr = bpy.context.preferences.addons["cycles"].preferences
    for dt_ in ("OPTIX", "CUDA", "HIP", "ONEAPI"):
        try:
            pr.compute_device_type = dt_; pr.get_devices()
            if any(d.type == dt_ for d in pr.devices):
                for d in pr.devices: d.use = True
                sc.cycles.device = "GPU"; print("DEVICE", dt_); break
        except Exception: pass
except Exception: pass
sc.view_settings.view_transform = "Standard"; sc.view_settings.look = "None"
sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"

# depth: mist only on the forest (far layer strongest), never on the meadow or the buildings
vl = sc.view_layers[0]; vl.use_pass_mist = True
dist = lambda sy: (ground(cx, sy) - cam.location).dot(FWD)
sc.world.mist_settings.start = dist(-205); sc.world.mist_settings.depth = dist(-300) - dist(-205); sc.world.mist_settings.falloff = "LINEAR"
def comp(on):
    sc.render.use_compositing = on
    if not on: return
    try: ct = sc.compositing_node_group
    except AttributeError: ct = None
    if ct is None:
        ct = bpy.data.node_groups.new("comp", "CompositorNodeTree"); sc.compositing_node_group = ct
    for n in list(ct.nodes): ct.nodes.remove(n)
    rl = ct.nodes.new("CompositorNodeRLayers")
    mx = ct.nodes.new("ShaderNodeMix"); mx.data_type = "RGBA"
    fm = ct.nodes.new("ShaderNodeMath"); fm.operation = "MULTIPLY"; fm.inputs[1].default_value = 0.95
    ct.links.new(rl.outputs["Mist"], fm.inputs[0]); ct.links.new(fm.outputs[0], mx.inputs["Factor"])
    # soft blur on the farthest layer only (mist > ~0.7), the rest stays crisp
    src = rl.outputs["Image"]
    try:
        bl = ct.nodes.new("CompositorNodeBlur"); bl.inputs["Size"].default_value = (3, 3)
    except Exception:
        try: bl.size_x = bl.size_y = 3
        except Exception: bl = None
    if bl is not None:
        ct.links.new(rl.outputs["Image"], bl.inputs[0])
        bm = ct.nodes.new("ShaderNodeMix"); bm.data_type = "RGBA"
        gm = ct.nodes.new("ShaderNodeMapRange"); gm.inputs["From Min"].default_value = 0.68; gm.inputs["From Max"].default_value = 0.85
        ct.links.new(rl.outputs["Mist"], gm.inputs["Value"]); ct.links.new(gm.outputs[0], bm.inputs["Factor"])
        ct.links.new(rl.outputs["Image"], bm.inputs[6]); ct.links.new(bl.outputs[0], bm.inputs[7]); src = bm.outputs[2]
    ct.links.new(src, mx.inputs[6]); mx.inputs[7].default_value = srgb((178, 202, 196))
    o = ct.nodes.new("NodeGroupOutput")
    if not ct.interface.items_tree: ct.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    ct.links.new(mx.outputs[2], o.inputs[0])

def want(n): return not ONLY or n in ONLY
if want("plate"):
    comp(True); sc.render.film_transparent = False; sc.render.use_border = False
    sc.render.filepath = os.path.join(out, "plate.png"); bpy.ops.render.render(write_still=True); print("PLATE", sc.render.resolution_x, sc.render.resolution_y)

# ---- building passes ---------------------------------------------------------------------------------------------
yaws = json.load(open(os.path.join(CAMP, "yaws.json")))
from bpy_extras.object_utils import world_to_camera_view as w2c
FENCE_R, FENCE_Z, FENCE_KEEP = (float(os.environ.get(k_, d_)) for k_, d_ in (("FENCE_R", "0.72"), ("FENCE_Z", "0.45"), ("FENCE_KEEP", "0.6")))
def fence_faces(bm_, lo, H):
    """Director 3 Nov: no fences. The training models' fence/palisade is many small loose parts on the outer ring, low and thin."""
    bm_.faces.ensure_lookup_table()
    xs = [v.co.x for v in bm_.verts]; ys = [v.co.y for v in bm_.verts]
    mx_, my_ = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2; hx, hy = (max(xs) - min(xs)) / 2, (max(ys) - min(ys)) / 2
    seen = set(); out_ = []
    for f in bm_.faces:
        if f.index in seen: continue
        st = [f]; seen.add(f.index); isl = []
        while st:
            a = st.pop(); isl.append(a)
            for e in a.edges:
                for g in e.link_faces:
                    if g.index not in seen: seen.add(g.index); st.append(g)
        pts = [v.co for g in isl for v in g.verts]
        ix0, ix1 = min(q.x for q in pts), max(q.x for q in pts); iy0, iy1 = min(q.y for q in pts), max(q.y for q in pts)
        zt = max(q.z for q in pts) - lo
        r = max(abs((ix0 + ix1) / 2 - mx_) / hx, abs((iy0 + iy1) / 2 - my_) / hy)
        if zt > FENCE_KEEP * H: continue   # towers, racks and tents reach higher: keep them whole
        for g in isl:
            c = g.calc_center_median()
            rf = max(abs(c.x - mx_) / hx, abs(c.y - my_) / hy)
            if rf > FENCE_R and c.z - lo < FENCE_Z * H and abs(g.normal.z) < 0.8: out_.append(g)
    return out_
GREEN_MUTE = (0.58, 0.78, 0.22)   # olive: luminance x this, matches the level 1-3 island greens
TRIM = {"bowyer0": (float(os.environ.get("TRIM_Z", "0.2")), float(os.environ.get("TRIM_R", "0.27")))}
def load_building(n, foot):
    before = set(sc.objects); bpy.ops.import_scene.gltf(filepath=os.path.join(CAMP, n + ".glb"))
    ms = [o for o in sc.objects if o not in before and o.type == "MESH"]
    root = bpy.data.objects.new("root", None); sc.collection.objects.link(root)
    for o in sc.objects:
        if o not in before and o is not root and o.parent is None: o.parent = root
    root.rotation_euler.z = math.radians(float(yaws[n])); bpy.context.view_layer.update()
    for mt in {s.material for o in ms for s in o.material_slots if s.material}:
        for nd in mt.node_tree.nodes:
            if nd.type == "BSDF_PRINCIPLED":
                for l in list(nd.inputs["Roughness"].links) + list(nd.inputs["Metallic"].links): mt.node_tree.links.remove(l)
                nd.inputs["Roughness"].default_value = 1.0; nd.inputs["Metallic"].default_value = 0.0
                if "Specular IOR Level" in nd.inputs: nd.inputs["Specular IOR Level"].default_value = 0.0
    # bake transforms into the meshes so face tests are in world space
    for o in ms:
        mw = o.matrix_world.copy(); o.parent = None; o.data.transform(mw); o.matrix_world.identity()
    bpy.data.objects.remove(root)
    # island top: the largest up-facing area in the lowest 30% of the model
    P = [v.co for o in ms for v in o.data.vertices]; lo = min(p.z for p in P); H = max(p.z for p in P) - lo
    bins = [0.0] * 60
    for o in ms:
        for p in o.data.polygons:
            if p.normal.z > 0.85 and p.center.z < lo + 0.3 * H: bins[min(59, int((p.center.z - lo) / H * 60))] += p.area
    top = lo + (max(range(60), key=lambda i: bins[i]) + 1) / 60 * H
    # leftover island grass: faces near the top that sample green from the base colour texture
    img = next((i for i in bpy.data.images if "basecolor" in i.name and i.users), None)
    sm = None
    if img and n.endswith("0"):   # level 0 (Tripo, 11 Nov): pull saturated island greens toward the meadow tone so the plots match levels 1-3
        import numpy as np
        a_ = np.empty(img.size[0] * img.size[1] * 4, dtype=np.float32); img.pixels.foreach_get(a_); a_ = a_.reshape(-1, 4); r2, g2, b2 = a_[:, 0], a_[:, 1], a_[:, 2]
        m_ = (g2 > r2 * 1.08) & (g2 > b2 * 1.15)
        l_ = 0.3 * r2[m_] + 0.59 * g2[m_] + 0.11 * b2[m_]; a_[m_, 0] = l_ * GREEN_MUTE[0]; a_[m_, 1] = l_ * GREEN_MUTE[1]; a_[m_, 2] = l_ * GREEN_MUTE[2]
        print("MUTE", n, int(m_.sum()), img.name); img.pixels.foreach_set(a_.ravel()); img.pack()
    if img:
        sm = img.copy(); sm.scale(512, 512); px_ = list(sm.pixels); W_ = 512
    for o in ms:
        me_ = o.data; uv = me_.uv_layers.active.data if me_.uv_layers.active else None
        bm_ = bmesh.new(); bm_.from_mesh(me_); uvl = bm_.loops.layers.uv.active; kill = []
        for f in bm_.faces:
            zs_ = [v.co.z for v in f.verts]
            if max(zs_) <= top + 0.002 * H: kill.append(f); continue
            if sm and uvl and min(zs_) < top + (0.5 if n in ('bowyer0', 'training0') else 0.06) * H:
                u = sum(l[uvl].uv.x for l in f.loops) / len(f.loops); v_ = sum(l[uvl].uv.y for l in f.loops) / len(f.loops)
                k = (int((v_ % 1) * (W_ - 1)) * W_ + int((u % 1) * (W_ - 1))) * 4
                r_, g_, b_ = px_[k], px_[k + 1], px_[k + 2]
                if g_ > r_ * 1.08 and g_ > b_ * 1.15 and (f.normal.z > 0.5 or n.endswith("0")): kill.append(f)
        if n.startswith("training") and os.environ.get("FENCE_CUT"): kill += fence_faces(bm_, lo, H)   # off: the fence is fused into the Tripo mesh, cutting shreds the model (3 Nov)
        if n in TRIM:   # drop loose stumps and tufts round the main mass: faces farther than r (m) from the tall parts' centre
            tall = [f.calc_center_median() for f in bm_.faces if f.calc_center_median().z > lo + TRIM[n][0] * H]
            if tall:
                cx_ = sum(c.x for c in tall) / len(tall); cy_ = sum(c.y for c in tall) / len(tall)
                for f in bm_.faces:
                    c = f.calc_center_median()
                    if math.hypot(c.x - cx_, c.y - cy_) > TRIM[n][1]: kill.append(f)
        bmesh.ops.delete(bm_, geom=list(set(kill)), context="FACES"); bm_.to_mesh(me_); bm_.free()
        for v in me_.vertices: v.co.z -= top
    P = [v.co for o in ms for v in o.data.vertices]
    ys = [p.y for p in P if p.z > 0.02 * H]; s = foot * U / (max(ys) - min(ys))
    for o in ms: o.data.transform(__import__("mathutils").Matrix.Scale(s, 4))
    P = [v.co for o in ms for v in o.data.vertices]
    return ms, P

GROUND_OBJ.is_shadow_catcher = True
for o in ENV:
    if o is not GROUND_OBJ: o.is_holdout = True; o.visible_shadow = False   # the plate already carries the hedge shadows
comp(False); sc.render.film_transparent = True
lj = os.path.join(out, "layout.json")
rects = json.load(open(lj))["rects"] if os.path.exists(lj) else {}
for bid, (x, foot, frow) in SPOTS.items():
    for lv in (0, 1, 2, 3):
        n = f"{bid}{lv}"
        if not want(n) or not os.path.exists(os.path.join(CAMP, n + ".glb")): continue
        ms, P = load_building(n, foot * LV_K[lv])
        fx, fy = min(p.x for p in P), (min(p.y for p in P) + max(p.y for p in P)) / 2
        tgt = ground(x, frow); off = Vector((tgt.x - fx, tgt.y - fy, 0))
        for o in ms: o.location = off
        bpy.context.view_layer.update()
        V = [w2c(sc, cam, p + off) for p in P]
        u0, u1 = min(v.x for v in V), max(v.x for v in V); v0, v1 = min(v.y for v in V), max(v.y for v in V)
        mu, mv = (u1 - u0) * 0.25, (v1 - v0) * 0.15
        sc.render.use_border = True; sc.render.use_crop_to_border = True
        sc.render.border_min_x, sc.render.border_max_x = max(0, u0 - mu), min(1, u1 + mu)
        sc.render.border_min_y, sc.render.border_max_y = max(0, v0 - mv), min(1, v1 + mv * 0.3)
        sc.render.filepath = os.path.join(out, n + ".png"); bpy.ops.render.render(write_still=True)
        rects[n] = [sc.render.border_min_x, sc.render.border_max_x, sc.render.border_min_y, sc.render.border_max_y]
        for o in ms: bpy.data.objects.remove(o)
if want("elk"):
    obs, ms, pts = load_elk(); A = bpy.data.actions[ELK_CLIP]; f0, f1 = map(int, A.frame_range)
    frames = list(range(f0, f1, ELK_STEP))   # f1 repeats f0: the clip loops
    for o in obs: o.hide_render = False
    for o in ENV: o.visible_shadow = False   # the plate already carries the hedge/prop shadows: catch only the elk's own
    V = []
    for f in frames[::4]:
        sc.frame_set(f); bpy.context.view_layer.update(); V += [w2c(sc, cam, p) for p in pts()]
    u0, u1 = min(v.x for v in V), max(v.x for v in V); v0, v1 = min(v.y for v in V), max(v.y for v in V)
    sc.render.use_border = True; sc.render.use_crop_to_border = True
    sc.render.border_min_x, sc.render.border_max_x = u0 - 0.04, u1 + 0.02; sc.render.border_min_y, sc.render.border_max_y = v0 - 0.04, v1 + 0.006   # wide left/bottom: the shadow falls lower left and must not touch the edge
    os.makedirs(os.path.join(out, "elk"), exist_ok=True)
    for o in obs: o.hide_render = True   # the empty plate: the shadow catcher's own veil, which post_elk.py divides out
    sc.render.filepath = os.path.join(out, "elk", "bg.png"); bpy.ops.render.render(write_still=True)
    for o in obs: o.hide_render = False
    for i, f in enumerate(frames if not os.environ.get("ELK_BG_ONLY") else []):
        sc.frame_set(f); sc.render.filepath = os.path.join(out, "elk", "%03d.png" % i); bpy.ops.render.render(write_still=True)
    json.dump({"rect": [sc.render.border_min_x, sc.render.border_max_x, sc.render.border_min_y, sc.render.border_max_y],
               "n": len(frames), "fps": sc.render.fps / ELK_STEP, "res": [sc.render.resolution_x, sc.render.resolution_y],
               "plate": [X0, X1, Y0, Y1], "px": PX}, open(os.path.join(out, "elk", "elk.json"), "w"))
    for o in obs: o.hide_render = True
json.dump({"rects": rects, "res": [sc.render.resolution_x, sc.render.resolution_y], "plate": [X0, X1, Y0, Y1], "px": PX},
          open(os.path.join(out, "layout.json"), "w"))
print("DONE", rects)
