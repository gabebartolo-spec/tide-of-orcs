"""Broad-nib stroke engine for the Heartwood typeface.

A glyph is a list of strokes. Each stroke is an SVG-style skeleton path (absolute M L C Q only)
swept by an elliptical calligraphy nib held at a fixed angle. Pressure along the stroke scales the
nib, so stroke ends can taper to leaf points. All nib sweeps are unioned with skia-pathops and the
outline is written as TrueType quadratic splines (dense off-curve points, on-curve at corners).
"""
import math
import re

import pathops

# Pen defaults (font units, 1000 UPM)
PEN_ANGLE = 30.0   # degrees from horizontal; thin strokes run along this direction
PEN_W = 96.0       # nib width (broad edge)
PEN_T = 11.0       # nib thickness (hairline)
STEP = 5.0         # sampling step along the skeleton
NIB_PTS = 20       # polygon points per nib ellipse


def _tokens(d):
    return re.findall(r"[MLCQmlcq]|-?\d+(?:\.\d+)?", d)


def parse(d):
    """Return a list of subpaths; each subpath is a list of cubic segments (p0, p1, p2, p3)."""
    toks = _tokens(d)
    i = 0
    subs, cur, pos, cmd = [], None, None, None
    def num():
        nonlocal i
        v = float(toks[i]); i += 1
        return v
    while i < len(toks):
        t = toks[i]
        if t.isalpha():
            cmd = t.upper(); i += 1
        if cmd == "M":
            pos = (num(), num())
            cur = []
            subs.append(cur)
            cmd = "L"  # implicit lineto after moveto
        elif cmd == "L":
            p = (num(), num())
            cur.append((pos, _lerp(pos, p, 1 / 3), _lerp(pos, p, 2 / 3), p))
            pos = p
        elif cmd == "C":
            a = (num(), num()); b = (num(), num()); p = (num(), num())
            cur.append((pos, a, b, p))
            pos = p
        elif cmd == "Q":
            q = (num(), num()); p = (num(), num())
            cur.append((pos, _lerp(pos, q, 2 / 3), _lerp(p, q, 2 / 3), p))
            pos = p
        else:
            raise ValueError(f"bad path command {t!r} in {d!r}")
    return [s for s in subs if s]


def _lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def _bez(seg, t):
    p0, p1, p2, p3 = seg
    mt = 1 - t
    a, b, c, d = mt * mt * mt, 3 * mt * mt * t, 3 * mt * t * t, t * t * t
    return (a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
            a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1])


def sample(sub, step=STEP):
    """Dense polyline along a subpath, then resampled at equal arc length."""
    pts = []
    for seg in sub:
        n = 200
        for k in range(n + (1 if seg is sub[-1] else 0)):
            pts.append(_bez(seg, k / n))
    # arc length
    L = [0.0]
    for a, b in zip(pts, pts[1:]):
        L.append(L[-1] + math.dist(a, b))
    total = L[-1]
    count = max(2, int(total / step) + 1)
    out, j = [], 0
    for k in range(count):
        s = total * k / (count - 1)
        while j < len(L) - 2 and L[j + 1] < s:
            j += 1
        seg_len = L[j + 1] - L[j] or 1.0
        out.append((_lerp(pts[j], pts[j + 1], (s - L[j]) / seg_len), s))
    return out, total


def _smooth(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def pressure(s, total, tin, tout, pmin, swell):
    p = 1.0
    if tin > 0:
        p = min(p, pmin + (1 - pmin) * _smooth(s / tin))
    if tout > 0:
        p = min(p, pmin + (1 - pmin) * _smooth((total - s) / tout))
    if swell:
        # positive swell fattens the middle of the stroke, negative pinches it
        u = s / total if total else 0
        p *= 1 + swell * math.sin(math.pi * u)
    return p


def nib(cx, cy, p, ang, w, t):
    a = w / 2 * p
    b = t / 2 * min(1.0, 0.35 + p)
    ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    pts = []
    for k in range(NIB_PTS):
        th = 2 * math.pi * k / NIB_PTS
        x, y = a * math.cos(th), b * math.sin(th)
        pts.append((cx + x * ca - y * sa, cy + x * sa + y * ca))
    return pts


def hull(points):
    pts = sorted(set((round(x, 3), round(y, 3)) for x, y in points))
    if len(pts) < 3:
        return pts
    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, up = [], []
    for p in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0:
            lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0:
            up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]  # counter-clockwise


def stroke_polys(d, tin=0, tout=0, pmin=0.06, w=1.0, ang=None, swell=0.0, thin=1.0):
    """Convex hull polygons sweeping the nib along every subpath of d."""
    ang = PEN_ANGLE if ang is None else ang
    polys = []
    for sub in parse(d):
        samples, total = sample(sub)
        nibs = [nib(x, y, pressure(s, total, tin, tout, pmin, swell), ang, PEN_W * w, PEN_T * thin)
                for (x, y), s in samples]
        if len(nibs) == 1:
            polys.append(hull(nibs[0]))
        for a, b in zip(nibs, nibs[1:]):
            polys.append(hull(a + b))
    return polys


def shape_polys(d):
    """A filled closed shape (for dots and leaves drawn as outlines): sample each subpath."""
    polys = []
    for sub in parse(d):
        pts = []
        for seg in sub:
            for k in range(24):
                pts.append(_bez(seg, k / 24))
        # make counter-clockwise
        area = sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(pts, pts[1:] + pts[:1]))
        if area < 0:
            pts.reverse()
        polys.append(pts)
    return polys


def union(polys):
    path = pathops.Path()
    pen = path.getPen()
    for poly in polys:
        if len(poly) < 3:
            continue
        pen.moveTo(poly[0])
        for p in poly[1:]:
            pen.lineTo(p)
        pen.closePath()
    path.simplify(fix_winding=True, keep_starting_points=False, clockwise=True)
    contours = []
    for contour in path.contours:
        pts = []
        for verb, seg in contour.segments:
            for p in seg:
                pts.append(p)
        contours.append(pts)
    return [c for c in contours if len(c) >= 3]


def _rdp(pts, eps):
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    n = math.hypot(dx, dy) or 1.0
    dmax, idx = 0.0, 0
    for i in range(1, len(pts) - 1):
        d = abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / n
        if d > dmax:
            dmax, idx = d, i
    if dmax > eps:
        return _rdp(pts[: idx + 1], eps)[:-1] + _rdp(pts[idx:], eps)
    return [a, b]


def _turn(a, b, c):
    v1 = (b[0] - a[0], b[1] - a[1]); v2 = (c[0] - b[0], c[1] - b[1])
    l1, l2 = math.hypot(*v1), math.hypot(*v2)
    if not l1 or not l2:
        return 0.0
    cosv = max(-1.0, min(1.0, (v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2)))
    return math.degrees(math.acos(cosv))


def draw_contours(contours, pen, corner=38.0, eps=0.35):
    """Emit contours as TrueType splines: corners on-curve, everything else off-curve (smooth)."""
    for raw in contours:
        # drop duplicates, simplify lightly
        pts = []
        for p in raw:
            p = (round(p[0], 2), round(p[1], 2))
            if not pts or math.dist(p, pts[-1]) > 0.05:
                pts.append(p)
        if len(pts) > 2 and math.dist(pts[0], pts[-1]) < 0.05:
            pts.pop()
        if len(pts) < 3:
            continue
        far = max(range(len(pts)), key=lambda i: math.dist(pts[0], pts[i]))
        pts = _rdp(pts[: far + 1], eps)[:-1] + _rdp(pts[far:] + pts[:1], eps)[:-1]
        n = len(pts)
        if n < 3:
            continue
        corners = [i for i in range(n) if _turn(pts[i - 1], pts[i], pts[(i + 1) % n]) > corner]
        R = lambda p: (int(round(p[0])), int(round(p[1])))
        if not corners:
            pen.qCurveTo(*[R(p) for p in pts], None)
            continue
        start = corners[0]
        order = pts[start:] + pts[:start]
        cset = {(c - start) % n for c in corners}
        pen.moveTo(R(order[0]))
        offs = []
        for i in range(1, n + 1):
            p = order[i % n]
            if i % n in cset:
                if offs:
                    pen.qCurveTo(*[R(o) for o in offs], R(p))
                elif i != n:
                    pen.lineTo(R(p))
                offs = []
            else:
                offs.append(p)
        pen.closePath()


def glyph_polys(spec):
    polys = []
    for item in spec:
        if isinstance(item, str):
            polys += stroke_polys(item)
        elif item[0] == "shape":
            polys += shape_polys(item[1])
        else:
            d, opts = item
            polys += stroke_polys(d, **opts)
    return polys


def bounds(contours):
    xs = [p[0] for c in contours for p in c]
    ys = [p[1] for c in contours for p in c]
    return min(xs), min(ys), max(xs), max(ys)
