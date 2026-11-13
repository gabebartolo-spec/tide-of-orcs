# TB-262: the one-shot effects lit like the actors. Procedural dust puffs, clods, splinters and ice shards moved frame by frame in Cycles
# under lit_render's sun, seen from the field camera (GAMECAM 20 deg), with their cast shadow on a shadow catcher (Cycles' own, not lit_render.mask).
# Usage: blender -b --factory-startup --python render_vfx.py -- <outdir> [kinds]   (kinds: impact,slam,death,shatter,walldust)
# Writes <outdir>/<kind>/f_000.png.. (RES x RES). pack_vfx.py makes the strips in public/vfx.
# Scale: 1 Blender unit = the event's radius r; the frame is W units wide, centred `up` units above the ground point (FLIPBOOK_SIZE / ay).
import bpy, sys, os, math, random
from mathutils import Vector, Euler
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
os.environ.setdefault('LIT', '1'); os.environ.setdefault('AMB', '1.0'); os.environ.setdefault('SAMPLES', '96')
import lit_render
E = os.environ.get
a = sys.argv[sys.argv.index('--') + 1:]
out = a[0]
ALL = ['impact', 'slam', 'death', 'shatter', 'walldust']
KINDS = a[1].split(',') if len(a) > 1 else ALL
HEX = lambda h: tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (1, 3, 5))  # palette token -> linear
SAND, BARK, TIMBER, FROST = HEX('#c9b78a'), HEX('#5a4634'), HEX('#8a6a46'), HEX('#bfe3ee')
# kind: frames, frame width W, ground below centre `up`, render px
SPEC = {'impact': (7, 2.4, 0.0, 192), 'slam': (9, 3.2, 0.0, 192), 'death': (10, 3.0, 0.9, 160), 'shatter': (8, 2.4, 0.0, 160), 'walldust': (21, 2.0, 0.0, 128)}  # walldust: centred on the strike point on the wall, no ground shadow
DENS = float(E('DENS', '5'))
DUST = HEX('#efe4c6')  # volume colour reads darker than a surface, so the dust is a light sand
DEATH = HEX('#f2ead2')  # the orc's last breath of dust: pale, never smoke
ease = lambda t: 1 - (1 - t) ** 2
fade = lambda t, t0: 1.0 if t < t0 else max(0.0, 1 - (t - t0) / (1 - t0))


def mat(name, col, rough=1.0, spec=0.2):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Roughness'].default_value = rough
    if 'Specular IOR Level' in b.inputs: b.inputs['Specular IOR Level'].default_value = spec
    return m


def vmat(name, col):
    """Dust: a lit scattering volume (no surface), so puffs have soft edges, a sunlit top and a shaded underside; Alpha scales density."""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.remove(nt.nodes['Principled BSDF'])
    v = nt.nodes.new('ShaderNodeVolumePrincipled'); v.inputs['Color'].default_value = (*col, 1); v.inputs['Density'].default_value = DENS
    nt.links.new(v.outputs[0], nt.nodes['Material Output'].inputs['Volume']); return m


def alpha(o, v):
    nt = o.active_material.node_tree; b = nt.nodes.get('Principled BSDF')
    if b: b.inputs['Alpha'].default_value = v
    else: nt.nodes['Principled Volume'].inputs['Density'].default_value = DENS * v
    o.hide_render = v <= 0.01


def blob(col, seed):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1); o = bpy.context.object
    tx = bpy.data.textures.new(f'n{seed}', 'CLOUDS'); tx.noise_scale = 0.4; tx.noise_depth = 2
    d = o.modifiers.new('d', 'DISPLACE'); d.texture = tx; d.strength = 0.6; d.texture_coords = 'LOCAL'
    o.location = (seed * 7.0, 0, -50)  # offsets the noise per blob (LOCAL coords ignore it; rotation varies the lumps)
    o.rotation_euler = Euler([random.uniform(0, 6.28) for _ in range(3)])
    bpy.ops.object.shade_smooth(); o.data.materials.append(vmat(f'm{seed}', col)); return o


def chunk(col, kind, rough=1.0):
    if kind == 'shard': bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=1, depth=2.6)
    else: bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.object; o.data.materials.append(mat(o.name + 'm', col, rough, 0.6 if kind == 'shard' else 0.2)); return o


def build(kind, rng):
    """Return a list of (object, fn(t, T) -> (loc, scale, rot, alpha)) for the effect."""
    P = []
    if kind in ('impact', 'slam'):
        K, R, C = (16, 0.7, 9) if kind == 'impact' else (20, 0.95, 13)
        for i in range(K):
            ang = 2 * math.pi * i / K + rng.uniform(-0.25, 0.25); s0 = rng.uniform(0.8, 1.2); h = rng.uniform(0.6, 1.2)
            P.append((blob(DUST, i), lambda t, T, ang=ang, s0=s0, h=h: (Vector((math.cos(ang), math.sin(ang), 0)) * (0.15 + R * 0.8 * ease(t)) + Vector((0, 0, 0.1 + 0.28 * h * ease(t))),
                                                                         s0 * (0.1 + 0.16 * ease(t)) * (1.3 if kind == 'slam' else 1), None, 0.95 * fade(t, 0.35))))
        for i in range(C):
            ang = rng.uniform(0, 6.28); v = rng.uniform(2.2, 2.7) * R / 0.7; vz = rng.uniform(1.8, 3.0); s = rng.uniform(0.08, 0.14); sp = Vector([rng.uniform(-12, 12) for _ in range(3)])
            P.append((chunk(BARK, 'clod'), lambda t, T, ang=ang, v=v, vz=vz, s=s, sp=sp: (Vector((math.cos(ang) * v * min(T, 0.42), math.sin(ang) * v * min(T, 0.42), max(0.0, vz * T - 7 * T * T) + s / 2)),
                                                                                              s, Euler(sp * T), fade(t, 0.7))))
    elif kind == 'death':
        for i in range(9):
            ang = rng.uniform(0, 6.28); rr = rng.uniform(0, 0.45); z0 = rng.uniform(0.2, 1.3); s0 = rng.uniform(0.8, 1.2)
            P.append((blob(DEATH, i), lambda t, T, ang=ang, rr=rr, z0=z0, s0=s0: (Vector((math.cos(ang) * (rr + 0.35 * ease(t)), math.sin(ang) * (rr + 0.35 * ease(t)), z0 + 0.45 * ease(t))),
                                                                                  s0 * (0.22 + 0.24 * ease(t)), None, 0.95 * fade(t, 0.3))))
    elif kind == 'shatter':
        for i in range(16):
            d = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(0.4, 1.4))).normalized() * rng.uniform(1.6, 2.4); s = rng.uniform(0.06, 0.12); sp = Vector([rng.uniform(-14, 14) for _ in range(3)]); r0 = Euler([rng.uniform(0, 6.28) for _ in range(3)])
            P.append((chunk(FROST, 'shard', 0.15), lambda t, T, d=d, s=s, sp=sp, r0=r0: (Vector((d.x * T, d.y * T, max(s, 0.25 + d.z * T - 6 * T * T))), s,
                                                                                          Euler((r0.x + sp.x * T, r0.y + sp.y * T, r0.z + sp.z * T)), fade(t, 0.55))))
    elif kind == 'walldust':
        for i in range(7):
            z0 = rng.uniform(0.3, 1.1); dy = rng.uniform(-0.5, 0.5); s0 = rng.uniform(0.8, 1.2)
            P.append((blob(DUST, i), lambda t, T, z0=z0, dy=dy, s0=s0: (Vector((0.0, dy * 0.5, (z0 - 0.7) - 0.35 * ease(t))) + SIDE * (0.05 + 0.22 * ease(t)),
                                                                         s0 * (0.12 + 0.2 * ease(t)), None, 0.85 * fade(t, 0.25))))
        for i in range(7):
            z0 = rng.uniform(0.5, 1.3); dy = rng.uniform(-0.6, 0.6); v = rng.uniform(0.6, 1.4); sp = Vector([rng.uniform(-10, 10) for _ in range(3)])
            P.append((chunk(TIMBER, 'clod'), lambda t, T, z0=z0, dy=dy, v=v, sp=sp: (Vector((0.0, dy * 0.5, (z0 - 0.9) + 1.0 * T - 5 * T * T)) + SIDE * min(v * T, 0.35),
                                                                                      Vector((0.04, 0.04, 0.16)), Euler(sp * T), fade(t, 0.6))))
    return P


SIDE = Vector((0, -1, 0))
for kind in KINDS:
    n, W, up, res = SPEC[kind]; rng = random.Random(262 + ALL.index(kind))
    bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
    sc.render.resolution_x = sc.render.resolution_y = res; sc.render.resolution_percentage = 100; sc.render.fps = 15
    sc.view_settings.view_transform = 'Standard'; sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    tilt = math.radians(float(E('GAMECAM', '20'))); h = up / math.cos(tilt)  # the ground point sits `up` units below the frame centre
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = W; cam.location = (-20 * math.cos(tilt), 0, h + 20 * math.sin(tilt)); cam.rotation_euler = Euler((math.pi / 2 - tilt, 0, -math.pi / 2))
    bpy.context.view_layer.update(); SIDE = (cam.matrix_world.to_3x3() @ Vector((1, 0, 0))).normalized()  # screen right: the orc side of the wall
    sc.world = bpy.data.worlds.new('w')
    lit_render.setup(sc, cam)
    if kind == 'walldust': bpy.data.objects.remove(bpy.data.objects['litground'])  # mask() is a no-op without it
    bg = next(nd for nd in sc.world.node_tree.nodes if nd.type == 'BACKGROUND'); bg.inputs[0].default_value = [float(x) for x in E('SKYC', '0.8,0.88,1').split(',')] + [1]
    DENS = float(E('DENS', '4' if kind == 'death' else '5'))  # the death puff a little thinner: denser read as smoke, 2.5 as a grey smudge
    P = build(kind, rng); od = os.path.join(out, kind); os.makedirs(od, exist_ok=True)
    for f in range(n):
        t = f / (n - 1); T = f / 15.0
        for o, fn in P:
            loc, s, rot, al = fn(t, T); o.location = loc; o.scale = s if isinstance(s, Vector) else (s, s, s)
            if rot is not None: o.rotation_euler = rot
            alpha(o, al)
        p = os.path.join(od, f'f_{f:03d}.png'); sc.render.filepath = p; bpy.ops.render.render(write_still=True)
        # no lit_render.mask: it reads every pixel under body alpha 0.96 as cast shadow and tints it green-black, which greyed the whole
        # semi-transparent dust; the shadow catcher's own soft shadow (black at low alpha) is kept as rendered
    print('VFX', kind, n, 'frames', res, 'px')
