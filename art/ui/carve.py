# Carved living-wood UI pieces (TB-136). Run: blender -b --factory-startup --python art/ui/carve.py -- <outdir>
# Renders top-down orthographic PNGs with alpha: frame.png (9-slice source) and button.png.
import bpy, bmesh, sys, math, os

out = sys.argv[sys.argv.index('--') + 1]
os.makedirs(out, exist_ok=True)

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.engine = 'CYCLES'; s.cycles.samples = 64; s.cycles.use_denoising = True
    s.render.film_transparent = True
    s.view_settings.view_transform = 'Standard'
    return s

def wood(name, base, dark, along_y=False):
    """Long-fibre grain: noise stretched hard along the plank, banded through a ramp, plus a fine bump."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; n = nt.nodes; l = nt.links
    bsdf = n['Principled BSDF']; bsdf.inputs['Roughness'].default_value = 0.7
    tc = n.new('ShaderNodeTexCoord'); mp = n.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (1.2, 22, 1) if along_y else (22, 1.2, 1)
    nz = n.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 1.6; nz.inputs['Detail'].default_value = 8; nz.inputs['Distortion'].default_value = 0.6
    wv = n.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = 'Y' if not along_y else 'X'
    wv.inputs['Scale'].default_value = 0.9; wv.inputs['Distortion'].default_value = 3; wv.inputs['Detail Scale'].default_value = 0.6
    ramp = n.new('ShaderNodeValToRGB'); ramp.color_ramp.interpolation = 'EASE'
    ramp.color_ramp.elements[0].position = 0.35; ramp.color_ramp.elements[0].color = (*dark, 1)
    ramp.color_ramp.elements[1].position = 0.75; ramp.color_ramp.elements[1].color = (*base, 1)
    mx = n.new('ShaderNodeMix'); mx.data_type = 'FLOAT'; mx.inputs['Factor'].default_value = 0.5
    bump = n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.25; bump.inputs['Distance'].default_value = 0.02
    l.new(tc.outputs['Object'], mp.inputs['Vector']); l.new(mp.outputs['Vector'], nz.inputs['Vector']); l.new(tc.outputs['Object'], wv.inputs['Vector'])
    l.new(nz.outputs['Fac'], mx.inputs['A']); l.new(wv.outputs['Fac'], mx.inputs['B'])
    l.new(mx.outputs['Result'], ramp.inputs['Fac']); l.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    l.new(nz.outputs['Fac'], bump.inputs['Height']); l.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return m

def gold():
    m = bpy.data.materials.new('gilt'); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (0.78, 0.52, 0.22, 1); b.inputs['Metallic'].default_value = 1; b.inputs['Roughness'].default_value = 0.32
    return m

def srgb(h): return tuple(((int(h[i:i+2], 16) / 255) ** 2.2) for i in (1, 3, 5))

def light_cam(w, h):
    s = bpy.context.scene
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = max(w, h)
    co = bpy.data.objects.new('cam', cam); co.location = (0, 0, 10); s.collection.objects.link(co); s.camera = co
    s.render.resolution_x = int(w * 256); s.render.resolution_y = int(h * 256)
    sun = bpy.data.lights.new('key', 'SUN'); sun.energy = 3.2; sun.angle = 0.2
    so = bpy.data.objects.new('key', sun); so.rotation_euler = (math.radians(38), 0, math.radians(-135)); s.collection.objects.link(so)
    fill = bpy.data.lights.new('fill', 'SUN'); fill.energy = 0.6
    fo = bpy.data.objects.new('fill', fill); fo.rotation_euler = (math.radians(60), 0, math.radians(60)); s.collection.objects.link(fo)
    s.world = bpy.data.worlds.new('w'); s.world.color = (0.05, 0.06, 0.05)

def slab(name, verts2d, depth, bevel, mat):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    vs = [bm.verts.new((x, y, 0)) for x, y in verts2d]; f = bm.faces.new(vs)
    r = bmesh.ops.extrude_face_region(bm, geom=[f]); top = [e for e in r['geom'] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=top, vec=(0, 0, depth)); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    bv = o.modifiers.new('bev', 'BEVEL'); bv.width = bevel; bv.segments = 4; bv.limit_method = 'ANGLE'
    o.data.materials.append(mat); bpy.context.view_layer.objects.active = o; bpy.ops.object.shade_smooth()
    return o

def tex_empty(name, scale, loc=(0, 0, 0)):
    e = bpy.data.objects.new(name, None); e.scale = scale; e.location = loc; bpy.context.scene.collection.objects.link(e); return e

def relief(o, axis, depth=0.035, levels=6):
    """Carve the grain into the surface: dense simple subdivision, then fibres (clouds stretched along the plank)
    and a slow warp so the face looks hand-adzed, not machined."""
    sub = o.modifiers.new('sub', 'SUBSURF'); sub.subdivision_type = 'SIMPLE'; sub.levels = sub.render_levels = levels
    fib = bpy.data.textures.new(o.name + 'fib', 'CLOUDS'); fib.noise_scale = 0.05; fib.noise_depth = 4
    e = tex_empty(o.name + 'fe', (6, 0.25, 1) if axis == 'x' else (0.25, 6, 1))
    d = o.modifiers.new('fib', 'DISPLACE'); d.texture = fib; d.texture_coords = 'OBJECT'; d.texture_coords_object = e; d.strength = depth; d.direction = 'Z'
    wrp = bpy.data.textures.new(o.name + 'wrp', 'CLOUDS'); wrp.noise_scale = 0.6
    d2 = o.modifiers.new('wrp', 'DISPLACE'); d2.texture = wrp; d2.texture_coords = 'GLOBAL'; d2.strength = depth * 1.4; d2.direction = 'Z'
    bpy.context.view_layer.objects.active = o; bpy.ops.object.shade_smooth()

def plank(name, x0, y0, x1, y1, mat, axis):
    bpy.ops.mesh.primitive_cube_add(location=((x0 + x1) / 2, (y0 + y1) / 2, 0.1))
    o = bpy.context.object; o.name = name; o.scale = ((x1 - x0) / 2, (y1 - y0) / 2, 0.1)
    bpy.ops.object.transform_apply(scale=True)
    bv = o.modifiers.new('bev', 'BEVEL'); bv.width = 0.09; bv.segments = 5; bv.profile = 0.7
    o.data.materials.append(mat); relief(o, axis); return o

def endgrain(base, dark):
    """End grain for a knot: concentric rings (Wave RINGS on object coords) with a little wobble."""
    m = bpy.data.materials.new('endgrain'); m.use_nodes = True; n = m.node_tree.nodes; l = m.node_tree.links
    b = n['Principled BSDF']; b.inputs['Roughness'].default_value = 0.75
    tc = n.new('ShaderNodeTexCoord'); wv = n.new('ShaderNodeTexWave'); wv.wave_type = 'RINGS'; wv.rings_direction = 'Z'
    wv.inputs['Scale'].default_value = 5; wv.inputs['Distortion'].default_value = 6; wv.inputs['Detail'].default_value = 5; wv.inputs['Detail Scale'].default_value = 0.8
    ramp = n.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].color = (*dark, 1); ramp.color_ramp.elements[1].color = (*base, 1)
    bump = n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.6
    l.new(tc.outputs['Object'], wv.inputs['Vector']); l.new(wv.outputs['Fac'], ramp.inputs['Fac']); l.new(ramp.outputs['Color'], b.inputs['Base Color'])
    l.new(wv.outputs['Fac'], bump.inputs['Height']); l.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m

def knot(x, y, r, mat):
    """A sawn burl: a low rounded disc showing its end-grain rings, ringed by a raised bark collar."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=r, depth=0.24, location=(x, y, 0.12))
    o = bpy.context.object; o.data.materials.append(mat)
    bv = o.modifiers.new('bev', 'BEVEL'); bv.width = 0.08; bv.segments = 6; bv.profile = 0.6
    bpy.ops.object.shade_smooth()
    bpy.ops.mesh.primitive_torus_add(location=(x, y, 0.24), major_radius=r * 0.98, minor_radius=0.05, major_segments=64)
    c = bpy.context.object; c.data.materials.append(BARK); bpy.ops.object.shade_smooth()
    return o

def leaf(x, y, ang, size, mat, z):
    """A carved leaf: lens outline, thick rounded bevel, a sunk midrib, curled tip."""
    pts = [(0, 0)] + [(t, 0.2 * math.sin(math.pi * t) * (1 - 0.3 * t)) for t in (0.15, 0.3, 0.45, 0.6, 0.75, 0.9)] + [(1, 0)] +           [(t, -0.2 * math.sin(math.pi * t) * (1 - 0.3 * t)) for t in (0.9, 0.75, 0.6, 0.45, 0.3, 0.15)]
    c, s_ = math.cos(ang), math.sin(ang)
    o = slab('leaf', [(x + (px * c - py * s_) * size, y + (px * s_ + py * c) * size) for px, py in pts], 0.05, 0.03, mat)
    o.location.z = z
    return o

def render(path): bpy.context.scene.render.filepath = path; bpy.ops.render.render(write_still=True)

# --- frame: a 4x4 square ring, 0.5 thick, knots and gilt leaves at each corner (9-slice: corners are 1 unit)
s = reset(); light_cam(4, 4)
bark = wood('bark', srgb('#8a6a46'), srgb('#4e3a28')); barkv = wood('barkv', srgb('#8a6a46'), srgb('#4e3a28'), True); g = gold()
W, T = 1.92, 0.42
BARK = bark; eg = endgrain(srgb('#a07c52'), srgb('#4e3a28'))
plank('top', -W, W - T, W, W, bark, 'x'); plank('bot', -W, -W, W, -W + T, bark, 'x')
plank('lft', -W, -W + T, -W + T, W - T, barkv, 'y'); plank('rgt', W - T, -W + T, W, W - T, barkv, 'y')
for cx in (-1, 1):
    for cy in (-1, 1):
        kx, ky = cx * (W - T / 2), cy * (W - T / 2)
        knot(kx, ky, 0.36, eg)
        inward = math.atan2(-cy, -cx)
        leaf(kx - cx * 0.12, ky - cy * 0.12, inward - 0.5, 0.6, bark, 0.16)
        leaf(kx - cx * 0.12, ky - cy * 0.12, inward + 0.5, 0.6, bark, 0.17)
render(os.path.join(out, 'frame.png'))

# --- button: a split-ended bark plaque with a gilt rim line
s = reset(); light_cam(3.2, 0.9)
bark = wood('bark', srgb('#8a6a46'), srgb('#4e3a28')); g = gold()
L, H = 1.5, 0.36
# Built as a quad grid tapered at the ends (not one ngon cap): a subdivided ngon fans to its centre and pinches there
# Coarse cells: the bevel clamps to half the narrowest edge, so a fine grid flattens the rounded rim away
me = bpy.data.meshes.new('btn'); bm = bmesh.new(); NY = 2
XS = [-L, -L + 0.14] + [-L + 0.14 + (2 * L - 0.28) * i / 10 for i in range(1, 10)] + [L - 0.14, L]
def half(x): return H * max(0.12, min(1, (L - abs(x)) / 0.14))
rows = [[bm.verts.new((x, (j / NY * 2 - 1) * half(x), 0)) for j in range(NY + 1)] for x in XS]
for i in range(len(XS) - 1):
    for j in range(NY): bm.faces.new((rows[i][j], rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1]))
bm.to_mesh(me); bm.free()
btn = bpy.data.objects.new('btn', me); s.collection.objects.link(btn); btn.data.materials.append(bark)
sol = btn.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = 0.16; sol.offset = -1
bv = btn.modifiers.new('bev', 'BEVEL'); bv.width = 0.09; bv.segments = 5; bv.profile = 0.7; bv.limit_method = 'ANGLE'
relief(btn, 'x', 0.035, 4)
render(os.path.join(out, 'button.png'))
