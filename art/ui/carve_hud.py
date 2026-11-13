# Carved HUD and panel pieces (TB-195h): the richer carved wood (director 3 Nov, Hades reference): deeper relief, a warm
# low rim light, gold and starlight inlay, glow. Run headless (hidden, via hid.ps1):
#   blender -b --factory-startup --python art/ui/carve_hud.py -- <outdir> [piece ...]
# Writes <piece>.png at 2x (4K) with straight alpha; art/ui/pack_hud.py turns them into public/ui/*.webp at 1x and 2x.
import bpy, bmesh, sys, math, os, random

argv = sys.argv[sys.argv.index('--') + 1:]
out = argv[0]; only = set(argv[1:])
os.makedirs(out, exist_ok=True)

def srgb(h): return tuple(((int(h[i:i+2], 16) / 255) ** 2.2) for i in (1, 3, 5))

# ---------- scene

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.engine = 'CYCLES'; s.cycles.samples = 96; s.cycles.use_denoising = True
    s.render.film_transparent = True; s.render.filter_size = 1.2
    s.view_settings.view_transform = 'Standard'; s.view_settings.look = 'None'
    s.render.image_settings.file_format = 'PNG'; s.render.image_settings.color_mode = 'RGBA'
    return s

def actors_sun(s, suns):
    """TB-263: light the piece with the field actors' sun (lit_render: SUN -0.6,1.6,0.5, 3.2, angle 0.14, warm white, sky world
    SKYC) so the HUD and the field share one light: the key comes from the same screen direction (upper left, 20.6 deg off
    vertical) in the same warm white and softness. It meets the face-on plaque at 38 deg (HUDINC; the old key's tilt, so carved
    relief still reads: 20 deg, the sun on the field ground, flattened it), and the sky fill is 0.35 (HUDAMB; 0.65 as on the
    actors washed metallic gilt to flat pale yellow and wax to pink). The strongest sun becomes that key; the others are capped
    at lit_render's rim 0.6, unshadowed. HUDLIT=0 renders the old studio light (TB-136/TB-195h)."""
    from mathutils import Vector
    az = Vector((-0.6, 1.6)).normalized(); inc = math.radians(float(os.environ.get('HUDINC', '38')))
    d = Vector((az.x * math.sin(inc), az.y * math.sin(inc), math.cos(inc)))
    key = max(suns, key=lambda o: o.data.energy)
    for o in suns:
        if o is key:
            o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler(); o.data.energy = 3.2; o.data.angle = 0.14; o.data.color = (1, 0.95, 0.85)
        else:
            o.data.energy = min(o.data.energy, 0.6); o.data.use_shadow = False
    s.world.use_nodes = True; bg = s.world.node_tree.nodes['Background']
    bg.inputs[0].default_value = [float(x) for x in os.environ.get('SKYC', '0.8,0.88,1').split(',')] + [1]
    bg.inputs[1].default_value = float(os.environ.get('HUDAMB', '0.35'))

def light_cam(w, h, px_w):
    """Top-down ortho camera over a w x h unit area rendered px_w wide. Key from the top left (as carve.py), a warm low
    rim from the top right that grazes every carved edge, a cool soft fill."""
    s = bpy.context.scene
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = max(w, h)
    co = bpy.data.objects.new('cam', cam); co.location = (0, 0, 10); s.collection.objects.link(co); s.camera = co
    s.render.resolution_x = int(px_w); s.render.resolution_y = int(round(px_w * h / w))
    def sun(name, energy, col, rx, rz, ang=0.2):
        l = bpy.data.lights.new(name, 'SUN'); l.energy = energy; l.color = col; l.angle = ang
        o = bpy.data.objects.new(name, l); o.rotation_euler = (math.radians(rx), 0, math.radians(rz)); s.collection.objects.link(o)
    sun('key', 3.0, (1, 0.96, 0.9), 38, -135)
    sun('rim', 5.0, (1, 0.62, 0.3), 74, 135, 0.08)
    sun('fill', 0.5, (0.75, 0.82, 1), 60, 60, 0.6)
    s.world = bpy.data.worlds.new('w'); s.world.color = (0.04, 0.045, 0.04)
    if os.environ.get('HUDLIT', '1') == '1': actors_sun(s, [o for o in s.collection.objects if o.type == 'LIGHT'])

def render(name):
    if only and name not in only: return False
    bpy.context.scene.render.filepath = os.path.join(out, name + '.png')
    bpy.ops.render.render(write_still=True); return True

def want(name): return not only or name in only

# ---------- materials

def wood(name, base, dark, along_y=False, rough=0.62):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; n = nt.nodes; l = nt.links
    bsdf = n['Principled BSDF']; bsdf.inputs['Roughness'].default_value = rough
    tc = n.new('ShaderNodeTexCoord'); mp = n.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (1.2, 22, 1) if along_y else (22, 1.2, 1)
    nz = n.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 1.6; nz.inputs['Detail'].default_value = 8; nz.inputs['Distortion'].default_value = 0.6
    wv = n.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = 'Y' if not along_y else 'X'
    wv.inputs['Scale'].default_value = 0.9; wv.inputs['Distortion'].default_value = 3; wv.inputs['Detail Scale'].default_value = 0.6
    ramp = n.new('ShaderNodeValToRGB'); ramp.color_ramp.interpolation = 'EASE'
    ramp.color_ramp.elements[0].position = 0.3; ramp.color_ramp.elements[0].color = (*dark, 1)
    ramp.color_ramp.elements[1].position = 0.78; ramp.color_ramp.elements[1].color = (*base, 1)
    mx = n.new('ShaderNodeMix'); mx.data_type = 'FLOAT'; mx.inputs['Factor'].default_value = 0.5
    bump = n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.35; bump.inputs['Distance'].default_value = 0.02
    l.new(tc.outputs['Object'], mp.inputs['Vector']); l.new(mp.outputs['Vector'], nz.inputs['Vector']); l.new(tc.outputs['Object'], wv.inputs['Vector'])
    l.new(nz.outputs['Fac'], mx.inputs['A']); l.new(wv.outputs['Fac'], mx.inputs['B'])
    l.new(mx.outputs['Result'], ramp.inputs['Fac']); l.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    l.new(nz.outputs['Fac'], bump.inputs['Height']); l.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return m

def gold(name='gilt', glow=0.0, col='#d9a54f'):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*srgb(col), 1); b.inputs['Metallic'].default_value = 1; b.inputs['Roughness'].default_value = 0.28
    if glow:
        b.inputs['Emission Color'].default_value = (*srgb('#ffcf7a'), 1); b.inputs['Emission Strength'].default_value = glow
    return m

def flat(name, col, rough=0.6, emit=None, emit_str=0.0, metal=0.0, coat=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*srgb(col), 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    b.inputs['Coat Weight'].default_value = coat
    if emit:
        b.inputs['Emission Color'].default_value = (*srgb(emit), 1); b.inputs['Emission Strength'].default_value = emit_str
    return m

def leather(name, base, dark):
    """Tanned hide: fine pebbled bump, soft creases, low sheen."""
    m = bpy.data.materials.new(name); m.use_nodes = True; n = m.node_tree.nodes; l = m.node_tree.links
    b = n['Principled BSDF']; b.inputs['Roughness'].default_value = 0.5; b.inputs['Coat Weight'].default_value = 0.15
    tc = n.new('ShaderNodeTexCoord')
    nz = n.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 3; nz.inputs['Detail'].default_value = 6
    vo = n.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = 60
    ramp = n.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].color = (*dark, 1); ramp.color_ramp.elements[1].color = (*base, 1)
    ramp.color_ramp.elements[0].position = 0.3; ramp.color_ramp.elements[1].position = 0.7
    mx = n.new('ShaderNodeMix'); mx.data_type = 'FLOAT'; mx.inputs['Factor'].default_value = 0.25
    bump = n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.3; bump.inputs['Distance'].default_value = 0.01
    l.new(tc.outputs['Object'], nz.inputs['Vector']); l.new(tc.outputs['Object'], vo.inputs['Vector'])
    l.new(nz.outputs['Fac'], ramp.inputs['Fac']); l.new(ramp.outputs['Color'], b.inputs['Base Color'])
    l.new(nz.outputs['Fac'], mx.inputs['A']); l.new(vo.outputs['Distance'], mx.inputs['B'])
    l.new(mx.outputs['Result'], bump.inputs['Height']); l.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m

# ---------- geometry

def link(o): bpy.context.scene.collection.objects.link(o); return o

def smooth(o):
    for p in o.data.polygons: p.use_smooth = True

def slab(name, pts, depth, bevel, mat, z=0.0, segs=4):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    vs = [bm.verts.new((x, y, 0)) for x, y in pts]; f = bm.faces.new(vs)
    r = bmesh.ops.extrude_face_region(bm, geom=[f]); top = [e for e in r['geom'] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=top, vec=(0, 0, depth)); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.location.z = z
    if bevel:
        bv = o.modifiers.new('bev', 'BEVEL'); bv.width = bevel; bv.segments = segs; bv.limit_method = 'ANGLE'; bv.profile = 0.6
    o.data.materials.append(mat); smooth(o)
    return o

def grid_plate(name, w, h, depth, mat, nx=24, ny=None, shape=None, z=0.0, zfn=None):
    """A quad-grid plate (no fanned ngon), optionally clipped to a half-width profile shape(x) -> half height."""
    ny = ny or max(2, int(nx * h / w))
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    rows = []
    for i in range(nx + 1):
        x = -w / 2 + w * i / nx; hh = shape(x) if shape else h / 2
        rows.append([bm.verts.new((x, -hh + 2 * hh * j / ny, zfn(x, -hh + 2 * hh * j / ny) if zfn else 0)) for j in range(ny + 1)])
    for i in range(nx):
        for j in range(ny): bm.faces.new((rows[i][j], rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1]))
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.location.z = z; o.data.materials.append(mat)
    sol = o.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = depth; sol.offset = -1
    bv = o.modifiers.new('bev', 'BEVEL'); bv.width = min(0.12, depth * 0.6); bv.segments = 5; bv.profile = 0.7; bv.limit_method = 'ANGLE'
    smooth(o); return o

def box(name, x0, y0, x1, y1, d, mat, bevel=0.08, z=0.0):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0); bmesh.ops.scale(bm, vec=(x1 - x0, y1 - y0, d), verts=bm.verts)
    bmesh.ops.translate(bm, vec=((x0 + x1) / 2, (y0 + y1) / 2, z + d / 2), verts=bm.verts); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.data.materials.append(mat)
    if bevel:
        bv = o.modifiers.new('bev', 'BEVEL'); bv.width = bevel; bv.segments = 5; bv.profile = 0.7
    smooth(o); return o

def tex_empty(name, scale, loc=(0, 0, 0)):
    e = link(bpy.data.objects.new(name, None)); e.scale = scale; e.location = loc; return e

def relief(o, axis, depth=0.05, levels=6, warp=1.5):
    """Deep adzed grain (deeper than carve.py's 0.035)."""
    sub = o.modifiers.new('sub', 'SUBSURF'); sub.subdivision_type = 'SIMPLE'; sub.levels = sub.render_levels = levels
    fib = bpy.data.textures.new(o.name + 'fib', 'CLOUDS'); fib.noise_scale = 0.05; fib.noise_depth = 4
    e = tex_empty(o.name + 'fe', (6, 0.25, 1) if axis == 'x' else (0.25, 6, 1))
    d = o.modifiers.new('fib', 'DISPLACE'); d.texture = fib; d.texture_coords = 'OBJECT'; d.texture_coords_object = e; d.strength = depth; d.direction = 'Z'
    wrp = bpy.data.textures.new(o.name + 'wrp', 'CLOUDS'); wrp.noise_scale = 0.6
    d2 = o.modifiers.new('wrp', 'DISPLACE'); d2.texture = wrp; d2.texture_coords = 'GLOBAL'; d2.strength = depth * warp; d2.direction = 'Z'

def plank(name, x0, y0, x1, y1, mat, axis, d=0.24, depth=0.05, bevel=0.1, z=0.0):
    o = box(name, x0, y0, x1, y1, d, mat, bevel, z); relief(o, axis, depth); return o

def tube(name, pts, r, mat, z, closed=False, res=4):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = res
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for p, (x, y) in zip(sp.points, pts): p.co = (x, y, z, 1)
    sp.use_cyclic_u = closed
    o = link(bpy.data.objects.new(name, cu)); o.data.materials.append(mat); return o

def rrect(x0, y0, x1, y1, r, n=6):
    pts = []
    for cx, cy, a0 in ((x1 - r, y1 - r, 0), (x0 + r, y1 - r, 90), (x0 + r, y0 + r, 180), (x1 - r, y0 + r, 270)):
        for k in range(n + 1):
            a = math.radians(a0 + 90 * k / n); pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts

def circle(cx, cy, r, n=48): return [(cx + r * math.cos(2 * math.pi * k / n), cy + r * math.sin(2 * math.pi * k / n)) for k in range(n)]

def disc(name, x, y, r, d, mat, z=0.0, bevel=0.06, verts=64):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=d, location=(x, y, z + d / 2))
    o = bpy.context.object; o.name = name; o.data.materials.append(mat)
    if bevel:
        bv = o.modifiers.new('bev', 'BEVEL'); bv.width = bevel; bv.segments = 6; bv.profile = 0.6; bv.limit_method = 'ANGLE'
    bpy.ops.object.shade_smooth(); return o

def ring(name, x, y, R, r, mat, z):
    bpy.ops.mesh.primitive_torus_add(location=(x, y, z), major_radius=R, minor_radius=r, major_segments=96, minor_segments=16)
    o = bpy.context.object; o.name = name; o.data.materials.append(mat); bpy.ops.object.shade_smooth(); return o

def leaf_pts(x, y, ang, size):
    pts = [(0, 0)] + [(t, 0.2 * math.sin(math.pi * t) * (1 - 0.3 * t)) for t in (0.15, 0.3, 0.45, 0.6, 0.75, 0.9)] + [(1, 0)] + \
          [(t, -0.2 * math.sin(math.pi * t) * (1 - 0.3 * t)) for t in (0.9, 0.75, 0.6, 0.45, 0.3, 0.15)]
    c, s_ = math.cos(ang), math.sin(ang)
    return [(x + (px * c - py * s_) * size, y + (px * s_ + py * c) * size) for px, py in pts]

def leaf(x, y, ang, size, mat, z, d=0.05):
    return slab('leaf', leaf_pts(x, y, ang, size), d, min(0.03, size * 0.05), mat, z)

def gem(name, x, y, r, mat, z, facets=8, h=None):
    """A cut stone seen from above: octagonal table, crown facets down to the girdle."""
    h = h or r * 0.55
    me = bpy.data.meshes.new(name)
    # top[k] sits between mid[k] and mid[k+1]
    bm = bmesh.new()
    top = [bm.verts.new(v) for v in [(x + r * 0.55 * math.cos(2 * math.pi * (k + .5) / facets), y + r * 0.55 * math.sin(2 * math.pi * (k + .5) / facets), z + h) for k in range(facets)]]
    mid = [bm.verts.new(v) for v in [(x + r * 0.86 * math.cos(2 * math.pi * k / facets), y + r * 0.86 * math.sin(2 * math.pi * k / facets), z + h * 0.62) for k in range(facets)]]
    gir = [bm.verts.new(v) for v in [(x + r * math.cos(2 * math.pi * (k + .5) / facets), y + r * math.sin(2 * math.pi * (k + .5) / facets), z + h * 0.15) for k in range(facets)]]
    bot = bm.verts.new((x, y, z - h * 0.6))
    bm.faces.new(top)
    for k in range(facets):
        k1 = (k + 1) % facets
        bm.faces.new((mid[k], top[k], top[k - 1]))           # star facet between two table corners
        bm.faces.new((mid[k1], gir[k], top[k]))              # kite: top corner, girdle, next mid
        bm.faces.new((mid[k], gir[k], top[k]))
        bm.faces.new((mid[k], gir[k - 1], gir[k]))
    for k in range(facets): bm.faces.new((gir[k], gir[k - 1], bot))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.data.materials.append(mat); return o

def cutter(name, pts, z0=-1, z1=2):
    o = slab(name, pts, z1 - z0, 0, MAT_CUT, z0); o.hide_render = True; o.display_type = 'WIRE'; return o

def cut(target, c):
    """Cut right after the bevel, before the grain subdivision, so the boolean runs on a clean closed solid."""
    b = target.modifiers.new('cut' + c.name, 'BOOLEAN'); b.operation = 'DIFFERENCE'; b.object = c; b.solver = 'EXACT'
    target.modifiers.move(len(target.modifiers) - 1, 1)

def materials():
    global BARK, BARKV, DARK, DARKV, GOLD, GOLDGLOW, STAR, MAT_CUT, ENDG
    BARK = wood('bark', srgb('#9a7650'), srgb('#4e3a28')); BARKV = wood('barkv', srgb('#9a7650'), srgb('#4e3a28'), True)
    DARK = wood('dark', srgb('#5c4630'), srgb('#241a12')); DARKV = wood('darkv', srgb('#5c4630'), srgb('#241a12'), True)
    GOLD = gold(); GOLDGLOW = gold('giltglow', 0.45)
    STAR = flat('star', '#d8963e', 0.06, '#ffc870', 0.35, coat=1.0)
    MAT_CUT = flat('cut', '#000000')

# ======================================================================= pieces

# --- starlight gem: a faceted starlight stone in a gold bezel on a carved wood roundel with two gilt leaves. 1x 72
if want('gem'):
    reset(); light_cam(2.0, 2.0, 144); materials()
    disc('back', 0, 0, 0.78, 0.22, DARK, bevel=0.08)
    ring('bezel', 0, 0, 0.6, 0.075, GOLD, 0.24)
    ring('rimg', 0, 0, 0.8, 0.05, GOLD, 0.2)
    leaf(-0.3, -0.62, math.radians(200), 0.55, GOLD, 0.2, 0.04); leaf(0.3, -0.62, math.radians(-20), 0.55, GOLD, 0.2, 0.04)
    gem('stone', 0, 0, 0.55, STAR, 0.26, 8, 0.42)
    render('gem')

# --- wave banner: a carved ribbon plaque with swallowtail ends, gilt inlay line, gilt studs. 1x 256x72; 3-slice ends 48
if want('banner'):
    reset(); W, H = 3.56, 1.0; light_cam(W, H, 512); materials()
    L, hh = 1.70, 0.36
    # the body is one plank (a clean stretchable middle); each swallowtail end is two convex halves (a concave notch
    # outline beveled as one ngon renders a stepped edge)
    body = box('body', -L + 0.24, -hh, L - 0.24, hh, 0.22, BARK, 0.1); relief(body, 'x', 0.045)
    for sx in (-1, 1):
        for sy in (-1, 1):
            ep = [(sx * (L - 0.34), sy * hh), (sx * (L - 0.04), sy * hh * 0.95), (sx * (L - 0.26), 0), (sx * (L - 0.34), 0)]
            if sx * sy < 0: ep = ep[::-1]
            slab('tail', ep, 0.2, 0.04, DARK, 0.0)
        disc('stud', sx * (L - 0.42), 0, 0.09, 0.08, GOLD, 0.22, 0.03)
        ring('studr', sx * (L - 0.42), 0, 0.13, 0.025, GOLD, 0.25)
    for sy in (-1, 1):
        tube('inlay', [(-L + 0.56, sy * (hh - 0.09)), (L - 0.56, sy * (hh - 0.09))], 0.028, GOLD, 0.25)
    render('banner')

# --- wall bar: a timber beam with a sunken channel the HP fill sits in, gilt iron bands at each end. 1x 320x40
WB_W, WB_H = 8.0, 1.0
def rail_piece(name, xa, xb, y0, y1, mat, nx=40, ny=6):
    """One length of rail between two crack lines xa(y) and xb(y), as a quad grid with deep grain."""
    me = bpy.data.meshes.new(name); bm = bmesh.new(); rows = []
    ys = [y0 + (y1 - y0) * j / ny for j in range(ny + 1)]
    for i in range(nx + 1):
        t = i / nx; rows.append([bm.verts.new((xa(y) + (xb(y) - xa(y)) * t, y, 0)) for y in ys])
    for i in range(nx):
        for j in range(ny): bm.faces.new((rows[i][j], rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1]))
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.data.materials.append(mat)
    sol = o.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = 0.26; sol.offset = 1
    bv = o.modifiers.new('bev', 'BEVEL'); bv.width = 0.06; bv.segments = 4; bv.profile = 0.7; bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(50)
    relief(o, 'x', 0.04, 2); smooth(o); return o

def jag(rnd, y0, y1, x, amp, n=6):
    """A splintered crack line across the rail: x(y) through n jagged knots."""
    ks = [(y0 + (y1 - y0) * k / n, x + rnd.uniform(-amp, amp)) for k in range(n + 1)]
    def f(y):
        for (ya, xa_), (yb, xb_) in zip(ks, ks[1:]):
            if ya <= y <= yb: return xa_ + (xb_ - xa_) * (y - ya) / (yb - ya)
        return ks[-1][1]
    return f

def rail(name, L, y0, y1, splits, rnd, gap, tilt):
    """A rail split at each x in splits; the gaps open by `gap` and the loose pieces tilt by up to `tilt` radians."""
    import mathutils
    cuts = [jag(rnd, y0, y1, x, 0.09) for x in splits]
    lefts = [lambda y: -L] + cuts; rights = cuts + [lambda y: L]
    for i, (fa, fb) in enumerate(zip(lefts, rights)):
        ga = 0 if i == 0 else gap; gb = 0 if i == len(cuts) else gap
        o = rail_piece('%s%d' % (name, i), (lambda y, f=fa, g=ga: f(y) + g / 2), (lambda y, f=fb, g=gb: f(y) - g / 2), y0, y1, BARK)
        if tilt and 0 < i < len(cuts):
            cy = (y0 + y1) / 2; cx = (fa(cy) + fb(cy)) / 2
            o.data.transform(mathutils.Matrix.Translation((-cx, -cy, 0)))
            o.rotation_euler.z = rnd.uniform(-tilt, tilt); o.location = (cx, cy + rnd.uniform(-0.015, 0.015), 0)

def wallbar(state):
    """state 0 intact, 1 one split, 2 three splits, 3 six splits with wide gaps and knocked pieces."""
    reset(); light_cam(WB_W, WB_H, 640); materials()
    L, hh, ch = 3.92, 0.44, 0.2
    box('back', -L + 0.3, -ch - 0.02, L - 0.3, ch + 0.02, 0.1, flat('chan', '#120d09', 0.9), 0.02)
    rnd = random.Random(11)
    top = {0: [], 1: [0.9], 2: [-1.4, 0.9], 3: [-2.3, -1.4, 0.9, 2.2]}[state]
    bot = {0: [], 1: [], 2: [1.7], 3: [-0.6, 1.7]}[state]
    gap = {0: 0, 1: 0.035, 2: 0.05, 3: 0.08}[state]; tilt = {0: 0, 1: 0, 2: 0.01, 3: 0.035}[state]
    rail('top', L, ch, hh, top, rnd, gap, tilt); rail('bot', L, -hh, -ch, bot, rnd, gap, tilt)
    plank('cl', -L, -ch, -L + 0.3, ch, BARKV, 'y', 0.26, 0.03, 0.06); plank('cr', L - 0.3, -ch, L, ch, BARKV, 'y', 0.26, 0.03, 0.06)
    for sx in (-1, 1):
        box('band', sx * (L - 0.5) - 0.07, -hh - 0.02, sx * (L - 0.5) + 0.07, hh + 0.02, 0.3, GOLD, 0.03)
        for sy in (-1, 1): disc('nail', sx * (L - 0.5), sy * 0.32, 0.045, 0.05, GOLD, 0.3, 0.015)

if want('wallbar'):
    wallbar(0); render('wallbar')
for k in (1, 2, 3):
    if want('wallbar-crack%d' % k):
        wallbar(k); render('wallbar-crack%d' % k)

# --- wall bar fill: lit heartwood strip with a warm inner glow, to clip by width inside the channel. 1x 304x16
if want('wallbar-fill'):
    reset(); light_cam(7.6, 0.4, 608); materials()
    lit = wood('lit', srgb('#e8a858'), srgb('#8a5428'))
    b = lit.node_tree.nodes['Principled BSDF']; b.inputs['Emission Color'].default_value = (*srgb('#ffb061'), 1); b.inputs['Emission Strength'].default_value = 0.6
    o = plank('fill', -3.8, -0.2, 3.8, 0.2, lit, 'x', 0.16, 0.02, 0.06)
    render('wallbar-fill')

# --- barricade tag (TB-263): the small dark plaque that hangs under the wall bar and carries "Barricade 150 / 150", replacing the
# flat CSS pill. A bark plank, gilt inlay line, a gilt nail at each end. 1x 192x40; 3-slice caps 24
if want('tag'):
    reset(); W, H = 4.8, 1.0; light_cam(W, H, 384); materials()
    L, hh = 2.32, 0.4
    body = box('body', -L, -hh, L, hh, 0.2, DARK, 0.1); relief(body, 'x', 0.035)
    tube('inlay', rrect(-L + 0.4, -hh + 0.11, L - 0.4, hh - 0.11, 0.08), 0.022, GOLD, 0.21, True)
    for sx in (-1, 1):
        disc('nail', sx * (L - 0.2), 0, 0.075, 0.06, GOLD, 0.2, 0.025)
    render('tag')

# --- wave strip (TB-263): the field's wave progress gauge as a thin timber rail with a sunken channel and gilt bands, like the
# wall bar; the lit heartwood fill (wallbar-fill) sits in the channel. 1x 640x32; 3-slice caps 40; channel 30% of the height
if want('wavebar'):
    reset(); light_cam(10.0, 0.5, 1280); materials()
    L, hh, ch = 4.92, 0.22, 0.075
    box('back', -L + 0.2, -ch - 0.01, L - 0.2, ch + 0.01, 0.06, flat('chan', '#120d09', 0.9), 0.01)
    rnd = random.Random(5)
    rail('top', L, ch, hh, [], rnd, 0, 0); rail('bot', L, -hh, -ch, [], rnd, 0, 0)
    plank('cl', -L, -ch, -L + 0.2, ch, BARKV, 'y', 0.26, 0.02, 0.04); plank('cr', L - 0.2, -ch, L, ch, BARKV, 'y', 0.26, 0.02, 0.04)
    for sx in (-1, 1):
        box('band', sx * (L - 0.38) - 0.05, -hh - 0.01, sx * (L - 0.38) + 0.05, hh + 0.01, 0.3, GOLD, 0.02)
    render('wavebar')

# --- tab tokens: carved roundels with a gilt rim and a raised gilt emblem. 1x 72
def token_base():
    reset(); light_cam(2.0, 2.0, 144); materials()
    disc('back', 0, 0, 0.86, 0.24, DARK, bevel=0.1)
    ring('rim', 0, 0, 0.8, 0.055, GOLD, 0.25)
    for k in range(8):
        a = 2 * math.pi * k / 8 + math.pi / 8
        disc('stud', 0.8 * math.cos(a), 0.8 * math.sin(a), 0.045, 0.06, GOLD, 0.27, 0.015)

if want('token-bow'):
    token_base()
    arc = [(-0.18 + 0.5 * math.cos(math.radians(a)), 0.5 * math.sin(math.radians(a)) * 1.05) for a in range(-70, 71, 7)]
    arc = [(x - 0.05 * (1 - abs(y) / 0.5) ** 2, y) for x, y in arc]
    tube('limb', arc, 0.06, GOLD, 0.3)
    tube('string', [arc[0], arc[-1]], 0.016, GOLD, 0.29)
    tube('shaft', [(-0.5, 0), (0.42, 0)], 0.022, GOLD, 0.31)
    slab('head', [(0.56, 0), (0.4, 0.08), (0.43, 0), (0.4, -0.08)], 0.05, 0.01, GOLD, 0.29)
    for d in (0, 0.08):
        slab('fl', [(-0.5 + d, 0), (-0.36 + d, 0), (-0.44 + d, 0.09), (-0.58 + d, 0.09)], 0.04, 0.008, GOLD, 0.29)
        slab('fl', [(-0.5 + d, 0), (-0.36 + d, 0), (-0.44 + d, -0.09), (-0.58 + d, -0.09)], 0.04, 0.008, GOLD, 0.29)
    render('token-bow')

if want('token-satchel'):
    token_base()
    slab('bag', rrect(-0.42, -0.42, 0.42, 0.22, 0.14), 0.08, 0.035, GOLD, 0.26)
    slab('flap', [(-0.44, 0.24), (0.44, 0.24)] + [(0.44 * math.cos(math.radians(a)) * 0.98, -0.02 + 0.2 * math.sin(math.radians(a))) for a in range(0, -181, -15)][1:-1], 0.05, 0.02, GOLD, 0.33)
    tube('strap', [(-0.38 + 0.76 * t, 0.24 + 0.32 * math.sin(math.pi * t)) for t in [i / 16 for i in range(17)]], 0.035, GOLD, 0.3)
    disc('buckle', 0, -0.18, 0.07, 0.05, DARK, 0.37, 0.02)
    ring('buckler', 0, -0.18, 0.07, 0.018, GOLD, 0.41)
    render('token-satchel')

if want('token-seed'):
    token_base()
    seed = [(0.36 * math.sin(math.radians(a)) * (1 - 0.35 * (0.5 + 0.5 * math.cos(math.radians(a)))), -0.12 + 0.36 * math.cos(math.radians(a)) * (1.15 if math.cos(math.radians(a)) > 0 else 0.9)) for a in range(0, 360, 10)]
    slab('seed', seed, 0.1, 0.05, GOLD, 0.26)
    tube('crease', [(0, 0.2), (0.03, 0), (0, -0.3)], 0.014, DARK, 0.36)
    tube('sprout', [(0, 0.28), (0.02, 0.4), (0.0, 0.5)], 0.024, GOLD, 0.3)
    leaf(0.0, 0.48, math.radians(30), 0.3, GOLD, 0.29); leaf(0.0, 0.48, math.radians(150), 0.26, GOLD, 0.29)
    render('token-seed')

if want('token-cog'):
    token_base()
    pts = []; T = 9
    for k in range(T * 4):
        a = 2 * math.pi * k / (T * 4); r = 0.5 if (k % 4) in (1, 2) else 0.38
        pts.append((r * math.cos(a), r * math.sin(a)))
    c = slab('cog', pts, 0.1, 0.025, GOLD, 0.26)
    h = cutter('hole', circle(0, 0, 0.15, 40)); cut(c, h)
    ring('hub', 0, 0, 0.2, 0.03, GOLD, 0.36)
    render('token-cog')

# --- tooltip plate: dark stained heartwood, gilt inlay border, gilt corner leaves and starlight studs. 1x 256x160, 9-slice 40
if want('plate'):
    reset(); W, H = 3.2, 2.0; light_cam(W, H, 512); materials()
    hw, hh = 1.56, 0.96
    p = box('plate', -hw, -hh, hw, hh, 0.22, DARK, 0.12); relief(p, 'x', 0.03)
    tube('inlay', rrect(-hw + 0.17, -hh + 0.17, hw - 0.17, hh - 0.17, 0.12), 0.022, GOLD, 0.25, closed=True)
    for sx in (-1, 1):
        for sy in (-1, 1):
            cx, cy = sx * (hw - 0.17), sy * (hh - 0.17)
            gem('stud', cx, cy, 0.075, STAR, 0.22, 8, 0.06)
            ring('stud', cx, cy, 0.085, 0.022, GOLD, 0.26)
            leaf(cx - sx * 0.06, cy, math.atan2(0, -sx), 0.24, GOLD, 0.24, 0.03)
            leaf(cx, cy - sy * 0.06, math.atan2(-sy, 0), 0.24, GOLD, 0.24, 0.03)
    render('plate')

# --- satchel leather: hide panel with a saddle-stitched border. 1x 256x256, 9-slice 40 (round)
def stitches(x0, y0, x1, y1, step, mat, z):
    seg = [((x0, y0), (x1, y0)), ((x1, y0), (x1, y1)), ((x1, y1), (x0, y1)), ((x0, y1), (x0, y0))]
    for (ax, ay), (bx, by) in seg:
        ln = math.hypot(bx - ax, by - ay); n = max(1, int(round(ln / step)))
        for i in range(n):
            t0, t1 = (i + 0.2) / n, (i + 0.75) / n
            tube('st', [(ax + (bx - ax) * t0, ay + (by - ay) * t0), (ax + (bx - ax) * t1, ay + (by - ay) * t1)], 0.018, mat, z, res=2)

if want('satchel'):
    reset(); light_cam(2.0, 2.0, 512); materials()
    hide = leather('hide', srgb('#7a5434'), srgb('#3e2a1a')); thread = flat('thread', '#d9c9a0', 0.7)
    p = grid_plate('hide', 1.94, 1.94, 0.12, hide, 24)
    sub = p.modifiers.new('sub', 'SUBSURF'); sub.subdivision_type = 'SIMPLE'; sub.levels = sub.render_levels = 3
    wr = bpy.data.textures.new('crease', 'CLOUDS'); wr.noise_scale = 0.5
    d = p.modifiers.new('d', 'DISPLACE'); d.texture = wr; d.strength = 0.03; d.direction = 'Z'; d.texture_coords = 'GLOBAL'
    # a darker burnished edge band, and the stitch line inside it
    tube('edge', rrect(-0.92, -0.92, 0.92, 0.92, 0.04), 0.035, flat('burn', '#2e1f13', 0.45, coat=0.3), 0.0, closed=True)
    stitches(-0.8, -0.8, 0.8, 0.8, 0.08, thread, 0.02)
    render('satchel')

if want('pocket'):
    reset(); light_cam(1.0, 1.0, 160); materials()
    hide = leather('hide2', srgb('#8a6040'), srgb('#4a3220')); thread = flat('thread', '#d9c9a0', 0.7)
    hide.node_tree.nodes['Principled BSDF'].inputs['Coat Weight'].default_value = 0
    # stuffed: the middle bulges smoothly (cosine dome), the sewn edge stays flat
    dome = lambda x, y: 0.07 * max(0, math.cos(min(1, abs(x) / 0.4) * math.pi / 2)) * max(0, math.cos(min(1, abs(y) / 0.4) * math.pi / 2))
    p = grid_plate('pocket', 0.94, 0.94, 0.1, hide, 32, zfn=dome)
    sub = p.modifiers.new('sub', 'SUBSURF'); sub.levels = sub.render_levels = 2
    stitches(-0.4, -0.4, 0.4, 0.4, 0.08, thread, 0.03)
    render('pocket')

# --- battle report board: a heavy timber frame around a panel of boards, gilt corner brackets. 1x 480x360, 9-slice 64
if want('report'):
    reset(); W, H = 4.8, 3.6; light_cam(W, H, 960); materials()
    hw, hh, t = 2.36, 1.76, 0.42
    n = 5
    for i in range(n):
        y0 = -hh + t - 0.02 + (2 * hh - 2 * t + 0.04) * i / n; y1 = -hh + t - 0.02 + (2 * hh - 2 * t + 0.04) * (i + 1) / n
        plank('board', -hw + t - 0.05, y0 + 0.008, hw - t + 0.05, y1 - 0.008, DARK, 'x', 0.16, 0.03, 0.04)
    plank('top', -hw, hh - t, hw, hh, BARK, 'x', 0.3, 0.05); plank('bot', -hw, -hh, hw, -hh + t, BARK, 'x', 0.3, 0.05)
    plank('l', -hw, -hh + t, -hw + t, hh - t, BARKV, 'y', 0.3, 0.05); plank('r', hw - t, -hh + t, hw, hh - t, BARKV, 'y', 0.3, 0.05)
    for sx in (-1, 1):
        for sy in (-1, 1):
            cx, cy = sx * hw, sy * hh
            br = [(cx, cy), (cx - sx * 0.62, cy), (cx - sx * 0.62, cy - sy * 0.16), (cx - sx * 0.16, cy - sy * 0.16), (cx - sx * 0.16, cy - sy * 0.62), (cx, cy - sy * 0.62)]
            if sx * sy < 0: br = br[::-1]
            slab('brk', br, 0.05, 0.02, GOLD, 0.3)
            disc('nail', cx - sx * 0.08, cy - sy * 0.08, 0.04, 0.05, GOLD, 0.34, 0.015)
            disc('nail', cx - sx * 0.48, cy - sy * 0.08, 0.035, 0.05, GOLD, 0.34, 0.015)
            disc('nail', cx - sx * 0.08, cy - sy * 0.48, 0.035, 0.05, GOLD, 0.34, 0.015)
    tube('inlay', rrect(-hw + t + 0.08, -hh + t + 0.08, hw - t - 0.08, hh - t - 0.08, 0.06), 0.02, GOLD, 0.17, closed=True)
    render('report')

# --- stamp: a wax seal pressed with the starlight star inside a gilt-flecked ring. 1x 120
if want('stamp'):
    reset(); light_cam(2.0, 2.0, 240); materials()
    wax = flat('wax', '#7a2a2a', 0.32, coat=0.6)
    rnd = random.Random(3)
    blob = [((0.8 + 0.06 * math.sin(k * 1.7) + rnd.uniform(-0.03, 0.03)) * math.cos(2 * math.pi * k / 40), (0.8 + 0.06 * math.sin(k * 1.7) + rnd.uniform(-0.03, 0.03)) * math.sin(2 * math.pi * k / 40)) for k in range(40)]
    slab('wax', blob, 0.14, 0.07, wax, 0, 6)
    disc('press', 0, 0, 0.6, 0.06, wax, 0.12, 0.04)
    ring('ring', 0, 0, 0.6, 0.035, wax, 0.2)
    star = []
    for k in range(16):
        a = math.pi / 2 + 2 * math.pi * k / 16; r = 0.44 if k % 4 == 0 else (0.24 if k % 2 == 0 else 0.13)
        star.append((r * math.cos(a), r * math.sin(a)))
    slab('star', star, 0.08, 0.02, gold('gstar', 0.3), 0.18)
    render('stamp')

# --- March again: the one glowing gold plaque. Gilt rim around a carved wood face, starlight studs, warm emission. 1x 288x72
if want('march'):
    reset(); W, H = 4.0, 1.0; light_cam(W, H, 576); materials()
    L, hh = 1.86, 0.36
    def half(x): return hh * max(0.1, min(1, (L - abs(x)) / 0.16))
    g = grid_plate('rim', 2 * L, 2 * hh, 0.18, GOLDGLOW, 40, 4, half)
    gw = wood('gildwood', srgb('#e8b058'), srgb('#7a4a1c')); gb = gw.node_tree.nodes['Principled BSDF']
    gb.inputs['Metallic'].default_value = 0.75; gb.inputs['Roughness'].default_value = 0.34
    gb.inputs['Emission Color'].default_value = (*srgb('#ffb061'), 1); gb.inputs['Emission Strength'].default_value = 0.12
    face = grid_plate('face', 2 * L - 0.22, 2 * hh - 0.2, 0.1, gw, 40, 4, lambda x: (hh - 0.1) * max(0.1, min(1, (L - 0.11 - abs(x)) / 0.15)), 0.04)
    relief(face, 'x', 0.03, 4)
    for sx in (-1, 1):
        gem('stud', sx * (L - 0.36), 0, 0.09, STAR, 0.12, 8, 0.08)
    render('march')
