# Unified look (TB-278, director 26 Nov: "everything in the game needs to look like it exists in the same universe").
# One shared material and texture step for every actor render, so orcs, bosses, beasts and allies read as one set under the
# lit_render sun. Called by lit_render.eevee_outputs() (apply_anim's LIT block and lit_render.setup() both call it), so every
# renderer picks it up. Settings live in look.json beside this file; docs/ART-STYLE.md §Unified look is the spec.
#   LOOK=off       skip the step (renders exactly as before)
#   LOOK=<profile> force a profile (else the first look.json "match" substring found in the blend path, else "default")
# Nothing is written back to disk: graded textures are new in-memory images, the source .blend stays untouched.
import json
import os

import numpy as np

try:
    import bpy
except ImportError:  # look_test.py runs grade() without Blender
    bpy = None

_DONE = set()


def _cfg():
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "look.json"), encoding="utf-8") as f:
        return json.load(f)


def profile_name(cfg, path):
    want = os.environ.get("LOOK", "")
    if want and want != "off": return want
    import sys  # FBX/glTF importers (render_ogre, render_wolf, render_hawk) start from an empty scene: match their argv paths too
    p = " ".join([path or ""] + sys.argv).replace("\\", "/").lower()
    for name, prof in cfg["profiles"].items():
        if any(m.lower() in p for m in prof.get("match", [])): return name
    return "default"


def _rgb_to_hsv(c):
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    mx = c.max(-1); mn = c.min(-1); d = mx - mn
    h = np.zeros_like(mx); nz = d > 1e-6
    rm = nz & (mx == r); gm = nz & (mx == g) & ~rm; bm = nz & ~rm & ~gm
    h[rm] = ((g - b)[rm] / d[rm]) % 6; h[gm] = (b - r)[gm] / d[gm] + 2; h[bm] = (r - g)[bm] / d[bm] + 4
    return np.stack([h * 60, np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0), mx], -1)


def _hsv_to_rgb(hsv):
    h, s, v = hsv[..., 0] % 360 / 60, hsv[..., 1], hsv[..., 2]
    i = np.floor(h).astype(int) % 6; f = h - np.floor(h)
    p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    out = np.empty(hsv.shape, dtype=np.float32)
    for k, (a, b, c) in enumerate(((v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q))):
        m = i == k; out[..., 0][m] = a[m]; out[..., 1][m] = b[m]; out[..., 2][m] = c[m]
    return out


def _smooth(x, lo, hi):
    t = np.clip((x - lo) / max(hi - lo, 1e-6), 0, 1); return t * t * (3 - 2 * t)


def grade(rgb, g, prof):
    """rgb: (N,3) floats 0-1 in display (sRGB) space. Returns the graded copy. Pure numpy, so look_test.py runs it without Blender."""
    hsv = _rgb_to_hsv(rgb.astype(np.float32))
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    sk = prof.get("skin")
    if sk:  # skin: texels near the profile's source hue move to the shared skin hue, keeping their own light and shade detail
        lo, hi = sk["hue"]; f = sk.get("feather", 12)
        w = (_smooth(h, lo - f, lo) * (1 - _smooth(h, hi, hi + f)) if lo <= hi else np.maximum(_smooth(h, lo - f, lo), 1 - _smooth(h, hi, hi + f)))
        w = w * _smooth(s, sk.get("sat_min", 0.12), sk.get("sat_min", 0.12) + 0.08)
        T = g["skin"]; src_v = sk["v"]; src_s = sk["s"]
        sh = T["hue"] + np.clip(((h - sk["centre"] + 180) % 360 - 180) * T.get("hue_keep", 0.25), -T.get("hue_spread", 8), T.get("hue_spread", 8))
        ss = np.clip(s * (T["s"] / max(src_s, 1e-3)), 0, T.get("s_max", 0.6))
        sv = np.clip(v * (T["v"] / max(src_v, 1e-3)), 0, 1)
        h = np.where(w > 0, (h + (((sh - h + 180) % 360) - 180) * w), h)
        s = s + (ss - s) * w; v = v + (sv - v) * w
    # the whole texture: one saturation ceiling and one value band, so no actor is louder or darker than the set
    s = np.minimum(s * prof.get("sat", g["sat"]), g["sat_max"])
    vm = prof.get("value", 1.0); v = np.clip(v * vm, 0, 1)
    v = g["v_floor"] + v * (1 - g["v_floor"])  # lift the deepest texels: matte painted, never inky
    return _hsv_to_rgb(np.stack([h, s, v], -1))


def kuwahara(rgb, r):
    """Classic 4-quadrant Kuwahara on an (H,W,3) array: flattens photo fur and feathers into painted strokes while keeping edges
    (the photoreal Sketchfab wolf and hawk next to the toy-board orcs, TB-278). Box means via summed-area tables, so it is fast."""
    H, W, _ = rgb.shape; p = np.pad(rgb, ((r, r), (r, r), (0, 0)), mode="edge")
    def sat(x): s = np.zeros((x.shape[0] + 1, x.shape[1] + 1) + x.shape[2:], np.float64); s[1:, 1:] = x.cumsum(0).cumsum(1); return s
    S, S2 = sat(p), sat((p ** 2).sum(-1)); n = (r + 1) ** 2
    best_m = np.zeros_like(rgb); best_v = np.full((H, W), np.inf)
    for dy in (0, r):
        for dx in (0, r):
            y0, x0 = np.arange(H)[:, None] + dy, np.arange(W)[None, :] + dx
            box = lambda T: T[y0 + r + 1, x0 + r + 1] - T[y0, x0 + r + 1] - T[y0 + r + 1, x0] + T[y0, x0]
            m = box(S) / n; v = box(S2) / n - (m ** 2).sum(-1)
            k = v < best_v; best_v = np.where(k, v, best_v); best_m = np.where(k[..., None], m, best_m)
    return best_m.astype(np.float32)


def _grade_image(img, g, prof):
    key = (img.name, json.dumps(prof, sort_keys=True))
    if key in _DONE or img.size[0] == 0: return img
    px = np.empty(img.size[0] * img.size[1] * img.channels, dtype=np.float32); img.pixels.foreach_get(px)
    px = px.reshape(-1, img.channels)
    lin = img.colorspace_settings.name.lower() not in ("srgb", "")
    rgb = px[:, :3]
    if lin: rgb = np.where(rgb <= 0.0031308, rgb * 12.92, 1.055 * np.power(np.clip(rgb, 0, None), 1 / 2.4) - 0.055)
    out = grade(np.clip(rgb, 0, 1), g, prof)
    if prof.get("paint"):  # texture-space Kuwahara, radius in texels at 1024 px (scaled with the texture)
        H, W = img.size[1], img.size[0]; r = max(1, round(prof["paint"] * W / 1024))
        out = kuwahara(out.reshape(H, W, 3), r).reshape(-1, 3)
    if lin: out = np.where(out <= 0.04045, out / 12.92, np.power((out + 0.055) / 1.055, 2.4))
    px[:, :3] = out
    new = bpy.data.images.new(img.name + "_look", img.size[0], img.size[1], alpha=img.channels == 4, float_buffer=img.is_float)
    new.colorspace_settings.name = img.colorspace_settings.name; new.pixels.foreach_set(px.ravel()); new.pack()
    _DONE.add(key); return new


def _base_images(nt):
    """Image textures that reach a Principled BSDF's Base Color (directly or through mix/colour nodes)."""
    out = []
    for n in nt.nodes:
        if n.type != "BSDF_PRINCIPLED": continue
        stack = [l.from_node for l in n.inputs["Base Color"].links]; seen = set()
        while stack:
            m = stack.pop()
            if m in seen: continue
            seen.add(m)
            if m.type == "TEX_IMAGE" and m.image: out.append(m)
            stack += [l.from_node for i in m.inputs for l in i.links]
    return out


def apply(path=None):
    if os.environ.get("LOOK") == "off": return
    cfg = _cfg(); g = cfg["global"]; name = profile_name(cfg, path or bpy.data.filepath); prof = cfg["profiles"].get(name, {})
    mat = {**g["material"], **prof.get("material", {})}
    graded = {}
    for m in bpy.data.materials:
        if not m.use_nodes or not m.node_tree: continue
        for n in m.node_tree.nodes:
            if n.type != "BSDF_PRINCIPLED": continue
            ins = n.inputs
            if not ins["Metallic"].links: ins["Metallic"].default_value = min(ins["Metallic"].default_value, mat["metal_max"])
            if not ins["Roughness"].links: ins["Roughness"].default_value = max(ins["Roughness"].default_value, mat["rough_min"])
            else:  # a roughness map: floor it with a Maximum math node
                src = ins["Roughness"].links[0].from_socket; mx = m.node_tree.nodes.new("ShaderNodeMath"); mx.operation = "MAXIMUM"
                mx.inputs[1].default_value = mat["rough_min"]; m.node_tree.links.new(src, mx.inputs[0]); m.node_tree.links.new(mx.outputs[0], ins["Roughness"])
            for k, v in (("Specular IOR Level", mat["spec"]), ("Coat Weight", 0.0), ("Sheen Weight", 0.0)):
                if k in ins and not ins[k].links: ins[k].default_value = v
            if "Emission Strength" in ins and not mat.get("keep_emission"): ins["Emission Strength"].default_value = 0.0
        if prof.get("skin") or g["sat"] != 1 or g["v_floor"] or prof.get("sat") or prof.get("value"):
            for t in _base_images(m.node_tree):
                if t.image.name not in graded: graded[t.image.name] = _grade_image(t.image, g, prof)
                t.image = graded[t.image.name]
    if prof.get("flat") or g.get("flat"):  # toy-board facets: flat shading on every mesh (ART-STYLE: "flat shading")
        for o in bpy.data.objects:
            if o.type == "MESH":
                for md in [md for md in o.modifiers if md.type == "NODES" and "smooth" in md.name.lower()]: o.modifiers.remove(md)
                if o.data.has_custom_normals:  # custom split normals override flat faces: clear them or nothing changes
                    with bpy.context.temp_override(object=o, active_object=o, selected_objects=[o]): bpy.ops.mesh.customdata_custom_splitnormals_clear()
                o.data.shade_flat()
                if prof.get("decimate") and not o.data.shape_keys:
                    d = o.modifiers.new("look_facets", "DECIMATE"); d.ratio = prof["decimate"]
                    o.modifiers.move(len(o.modifiers) - 1, 0)  # before the Armature, so the facets ride the skin
    print(f"LOOK {name}: {len(graded)} textures graded, material {mat}")
