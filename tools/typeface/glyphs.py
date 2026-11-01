"""Heartwood glyph skeletons. Coordinates in font units; glyphs are re-spaced by sb (left, right).

Design rules
- Broad nib at 30 deg: verticals thick, the up-right diagonal is a hairline, stress leans back.
- Stems open with a wedge flag (a short hairline entry into the top of the stem).
- Free stroke ends taper to leaf points; right legs end in a long outward flick.
- Small x-height, long ascenders: the tall, narrow proportions of a sylvan uncial.
"""
XH, CAP, ASC, DSC, FIG = 430, 680, 760, -230, 640
SB = (40, 40)
SPACE = 220


def S(d, **o):
    return (d, o)


LEAF = dict(tin=45, tout=45)
SOFT = dict(tout=26, pmin=0.5)       # softened chisel foot
BAR = dict(w=0.5, tin=40, tout=40)  # thin leaf crossbar


def wedge(x, top):
    """Path start: hairline flag entering the top of a stem at x. Ascenders get a longer curved leaf."""
    if top > 600:
        return f"M {x - 62} {top - 58} C {x - 36} {top - 40} {x - 14} {top - 20} {x} {top}"
    return f"M {x - 38} {top - 32} L {x} {top}"


def stem(x, top, bot=0, flag=True, **o):
    d = (wedge(x, top) if flag else f"M {x} {top}") + f" L {x} {bot}"
    opts = dict(tin=40 if flag else 30, **SOFT)
    opts.update(o)
    return S(d, **opts)


def flick(x, y=0):
    """Path tail: a right leg running down to y that sweeps out into a leaf."""
    return f" L {x} {y + 110} C {x} {y + 40} {x + 25} {y} {x + 78} {y + 2}"


def leg(x, top, flag=True, y=0):
    d = (wedge(x, top) if flag else f"M {x} {top}") + flick(x, y)
    return S(d, tin=40 if flag else 30, tout=80, pmin=0.04)


def dot(x, y, w=0.75):
    """A leaf lozenge drawn across the nib (thick), for i, j and punctuation."""
    return S(f"M {x - 12} {y + 38} C {x - 4} {y + 12} {x + 4} {y - 12} {x + 12} {y - 38}", tin=30, tout=30, w=w)


def comma(x, y):
    """Leaf dot at (x, y) with a tail sweeping down-left."""
    return S(f"M {x - 12} {y + 38} C {x + 6} {y + 10} {x + 14} {y - 20} {x - 30} {y - 120}", tin=30, tout=60, pmin=0.05, w=0.8)


def turned(x, y):
    """Comma turned 180 degrees: leaf dot at (x, y) with a tail rising up-right."""
    return S(f"M {x + 12} {y - 38} C {x - 6} {y - 10} {x - 14} {y + 20} {x + 30} {y + 120}", tin=30, tout=60, pmin=0.05, w=0.8)


def arch(x0, x1, top=XH, tail=True, y=0):
    """Pointed (ogee) shoulder springing from a stem at x0 to a right leg at x1."""
    w = x1 - x0
    ax = x0 + 0.62 * w
    d = (f"M {x0 + 2} {top - 130} C {x0 + 0.12 * w:.0f} {top - 50} {x0 + 0.38 * w:.0f} {top - 4} {ax:.0f} {top + 10} "
         f"C {x1 - 0.06 * w:.0f} {top - 12} {x1} {top - 50} {x1} {top - 120}")
    if tail:
        return S(d + flick(x1, y), tin=30, tout=80, pmin=0.04)
    return S(d + f" L {x1} {y}", tin=30, **SOFT)


# --- shared bowls -------------------------------------------------------------
def bowl_o(x0, x1, top, bot=-8):
    """Oval in two strokes meeting at thin top-left and bottom-right points."""
    w = x1 - x0
    tx, bx = x0 + 0.47 * w, x0 + 0.55 * w
    h = top - bot
    k = 0.06 * h
    left = (f"M {tx:.0f} {top} C {x0 + 0.12 * w:.0f} {top - k:.0f} {x0} {top - 0.28 * h:.0f} {x0} {bot + 0.5 * h:.0f} "
            f"C {x0} {bot + 0.2 * h:.0f} {x0 + 0.2 * w:.0f} {bot} {bx:.0f} {bot}")
    right = (f"M {tx:.0f} {top} C {x1 - 0.18 * w:.0f} {top:.0f} {x1} {top - 0.22 * h:.0f} {x1} {bot + 0.5 * h:.0f} "
             f"C {x1} {bot + 0.28 * h:.0f} {x1 - 0.12 * w:.0f} {bot + k:.0f} {bx:.0f} {bot}")
    return [S(left, tin=22, tout=22, pmin=0.15), S(right, tin=22, tout=22, pmin=0.15)]


def bowl_left(xs, top, bot=-8, x0=40):
    """Left-hand bowl closing on a stem at xs (a, d, g, q)."""
    h = top - bot
    return S(f"M {xs - 2} {top - 70} C {xs - 40} {top - 10} {xs - 95} {top + 8} {xs - 135} {top + 8} "
             f"C {x0 + 30} {top + 8} {x0} {top - 0.3 * h:.0f} {x0} {bot + 0.47 * h:.0f} "
             f"C {x0} {bot + 0.15 * h:.0f} {x0 + 50} {bot} {xs - 140} {bot} "
             f"C {xs - 80} {bot} {xs - 30} {bot + 40} {xs - 2} {bot + 110}", tin=26, tout=30, pmin=0.2)


def bowl_right(xs, top, bot=-8, x1=345):
    """Right-hand bowl springing from a stem at xs (b, p)."""
    h = top - bot
    return S(f"M {xs + 2} {top - 120} C {xs + 40} {top - 30} {xs + 95} {top + 8} {xs + 150} {top + 8} "
             f"C {x1 - 40} {top + 8} {x1} {top - 0.28 * h:.0f} {x1} {bot + 0.5 * h:.0f} "
             f"C {x1} {bot + 0.18 * h:.0f} {x1 - 60} {bot} {xs + 120} {bot} "
             f"C {xs + 70} {bot} {xs + 25} {bot + 20} {xs + 2} {bot + 50}", tin=26, tout=30, pmin=0.2)


def c_curve(x0, x1, top, bot=-8, open_top=0.82, open_bot=0.16):
    h = top - bot
    w = x1 - x0
    return S(f"M {x1 - 4} {bot + open_top * h:.0f} C {x1 - 0.2 * w:.0f} {top} {x0 + 0.5 * w:.0f} {top} {x0 + 0.5 * w:.0f} {top} "
             f"C {x0 + 0.12 * w:.0f} {top} {x0} {top - 0.25 * h:.0f} {x0} {bot + 0.48 * h:.0f} "
             f"C {x0} {bot + 0.15 * h:.0f} {x0 + 0.2 * w:.0f} {bot} {x0 + 0.53 * w:.0f} {bot} "
             f"C {x1 - 0.2 * w:.0f} {bot} {x1 - 0.05 * w:.0f} {bot + 0.08 * h:.0f} {x1 + 6} {bot + open_bot * h:.0f}",
             tin=40, tout=50, pmin=0.08)


def s_curve(x0, x1, top, bot=-8):
    h = top - bot
    w = x1 - x0
    m = bot + 0.52 * h
    return S(f"M {x1 - 10} {bot + 0.86 * h:.0f} C {x1 - 0.25 * w:.0f} {top} {x0 + 0.55 * w:.0f} {top} {x0 + 0.5 * w:.0f} {top} "
             f"C {x0 + 0.15 * w:.0f} {top} {x0 + 0.05 * w:.0f} {top - 0.12 * h:.0f} {x0 + 0.05 * w:.0f} {top - 0.24 * h:.0f} "
             f"C {x0 + 0.05 * w:.0f} {m + 0.05 * h:.0f} {x0 + 0.3 * w:.0f} {m:.0f} {x0 + 0.5 * w:.0f} {m - 0.03 * h:.0f} "
             f"C {x1 - 0.1 * w:.0f} {m - 0.09 * h:.0f} {x1} {bot + 0.38 * h:.0f} {x1} {bot + 0.25 * h:.0f} "
             f"C {x1} {bot + 0.08 * h:.0f} {x1 - 0.25 * w:.0f} {bot} {x0 + 0.42 * w:.0f} {bot} "
             f"C {x0 + 0.2 * w:.0f} {bot} {x0 + 0.04 * w:.0f} {bot + 0.07 * h:.0f} {x0 - 8} {bot + 0.16 * h:.0f}",
             tin=40, tout=45, pmin=0.06)


X = XH
G = {}

# --- lowercase ----------------------------------------------------------------
G["a"] = dict(s=[leg(300, X, flag=False), bowl_left(300, X - 4)], sb=(32, 10))
G["b"] = dict(s=[stem(70, ASC, 30), bowl_right(70, X - 4)], sb=(40, 32))
G["c"] = dict(s=[c_curve(40, 305, X + 6)], sb=(32, 25))
G["d"] = dict(s=[leg(300, ASC), bowl_left(300, X - 4)], sb=(32, 10))
G["e"] = dict(s=[
    S("M 52 232 L 300 250", **dict(BAR, tout=0)),
    S("M 300 250 C 305 360 250 438 182 438 C 95 438 40 330 40 210 C 42 80 108 -8 192 -8 "
      "C 245 -8 285 22 312 66", tout=50, pmin=0.06),
], sb=(32, 25))
G["f"] = dict(s=[
    S("M 100 0 L 100 560 C 100 690 150 760 240 760 C 278 760 300 748 318 726", tin=0, tout=40, **{"pmin": 0.06}),
    S("M 34 424 L 220 436", **BAR),
], sb=(25, -35))
G["g"] = dict(s=[
    S(f"M 300 {X - 70} L 300 0 C 300 -150 240 -228 140 -228 C 90 -228 50 -210 26 -180", tin=30, tout=50, pmin=0.06),
    bowl_left(300, X - 4),
], sb=(32, 40))
G["h"] = dict(s=[stem(70, ASC), arch(70, 318)], sb=(40, 10))
G["i"] = dict(s=[leg(74, X), dot(70, 590)], sb=(40, 10))
G["j"] = dict(s=[S(f"{wedge(110, X)} L 110 -40 C 110 -160 70 -228 0 -228 C -30 -228 -55 -215 -70 -195",
                   tin=40, tout=50, pmin=0.06), dot(106, 590)], sb=(20, 40))
G["k"] = dict(s=[
    stem(70, ASC),
    S("M 300 430 C 230 385 150 320 74 240", tin=50, tout=0, w=0.9),
    S("M 128 285 C 190 190 240 90 286 30 C 305 6 326 -2 368 2", tin=0, tout=70, pmin=0.04),
], sb=(40, 10))
G["l"] = dict(s=[leg(84, ASC)], sb=(40, 10))
G["m"] = dict(s=[stem(70, X), arch(70, 288, tail=False), arch(288, 506)], sb=(40, 10))
G["n"] = dict(s=[stem(70, X), arch(70, 318)], sb=(40, 10))
G["o"] = dict(s=bowl_o(36, 340, X + 10), sb=(32, 32))
G["p"] = dict(s=[stem(70, X, DSC), bowl_right(70, X - 4)], sb=(40, 32))
G["q"] = dict(s=[leg(300, X, flag=False, y=DSC), bowl_left(300, X - 4)], sb=(32, 10))
G["r"] = dict(s=[stem(70, X),
                 S(f"M 72 {X - 130} C 98 {X - 50} 150 {X - 4} 214 {X + 10} C 250 {X - 2} 280 {X - 18} 304 {X - 44}",
                   tin=30, tout=45, pmin=0.06)], sb=(40, 5))
G["s"] = dict(s=[s_curve(40, 290, X + 8)], sb=(32, 32))
G["t"] = dict(s=[S("M 96 570 L 96 110 C 96 40 121 0 174 2 C 205 3 228 14 248 34", tin=70, tout=50, pmin=0.04),
                 S("M 30 424 L 230 436", **BAR)], sb=(25, 15))
G["u"] = dict(s=[
    S(f"{wedge(70, X)} L 70 130 C 70 40 118 -6 180 -6 C 240 -6 288 36 318 110", tin=40, tout=30, pmin=0.25),
    leg(318, X),
], sb=(40, 10))
G["v"] = dict(s=[
    S(f"M 26 {X - 34} L 60 {X} C 100 300 150 140 196 -6", tin=40, tout=10, pmin=0.35),
    S(f"M 196 -6 C 240 140 290 320 352 {X + 4}", tin=10, tout=50, pmin=0.06),
], sb=(25, 25))
G["w"] = dict(s=[
    S(f"M 26 {X - 34} L 60 {X} C 90 300 130 140 170 -6", tin=40, tout=10, pmin=0.35),
    S("M 170 -6 C 200 120 240 250 280 340", tin=10, tout=10, pmin=0.4),
    S("M 280 340 C 310 230 350 100 390 -6", tin=10, tout=10, pmin=0.35),
    S(f"M 390 -6 C 430 140 470 320 530 {X + 4}", tin=10, tout=50, pmin=0.06),
], sb=(25, 25))
G["x"] = dict(s=[
    S(f"M 20 {X - 34} L 56 {X} C 140 280 230 140 330 -4", tin=40, tout=40, pmin=0.06),
    S(f"M 30 -4 C 140 140 230 280 330 {X + 4}", tin=40, tout=40, pmin=0.06, w=0.95),
], sb=(25, 25))
G["y"] = dict(s=[
    S(f"M 26 {X - 34} L 60 {X} C 100 300 140 170 190 30", tin=40, tout=20, pmin=0.3),
    S(f"M 352 {X + 4} C 290 260 230 60 160 -100 C 125 -175 85 -228 20 -228", tin=50, tout=45, pmin=0.06),
], sb=(25, 25))
G["z"] = dict(s=[
    S(f"M 40 {X - 8} L 310 {X + 4}", w=0.55, tin=40, tout=0),
    S(f"M 310 {X + 4} C 230 300 130 150 40 0", tin=0, tout=0, w=0.95, ang=5),
    S("M 40 0 L 300 6 C 320 7 335 18 348 34", w=0.55, tin=0, tout=40, pmin=0.06),
], sb=(25, 25))

# --- capitals -----------------------------------------------------------------
C = CAP
G["A"] = dict(s=[
    S(f"M 18 -4 C 100 220 180 460 262 {C + 14}", tin=40, tout=0, pmin=0.06),
    S(f"M 222 {C - 18} L 262 {C + 14} L 480 0", tin=40, **SOFT),
    S("M 110 250 C 200 260 300 268 400 276", **BAR),
], sb=(20, 20))
G["B"] = dict(s=[
    stem(70, C),
    S(f"M 70 {C} C 260 {C + 8} 360 {C - 40} 360 {C - 160} C 360 {C - 260} 270 {C - 300} 80 {C - 306}", tin=0, tout=0, w=1.0),
    S(f"M 80 {C - 306} C 300 {C - 300} 400 {C - 370} 400 {C - 490} C 400 {C - 630} 290 -4 70 0", tin=0, tout=0),
], sb=(40, 35))
G["C"] = dict(s=[c_curve(40, 450, C + 10)], sb=(32, 30))
G["D"] = dict(s=[
    stem(70, C),
    S(f"M 70 {C} C 330 {C + 10} 480 {C - 140} 480 {C - 340} C 480 {C - 540} 330 -6 70 0", tin=0, tout=0),
], sb=(40, 32))
G["E"] = dict(s=[  # uncial round E
    c_curve(40, 420, C + 10, open_top=0.86, open_bot=0.13),
    S(f"M 46 {C * 0.5:.0f} L 300 {C * 0.5 + 14:.0f}", **dict(BAR, tin=0)),
], sb=(32, 25))
G["F"] = dict(s=[
    stem(70, C),
    S(f"M 70 {C} L 330 {C + 10} C 350 {C + 11} 366 {C + 2} 380 {C - 16}", w=0.55, tin=0, tout=40, pmin=0.06),
    S(f"M 70 {C * 0.5:.0f} L 290 {C * 0.5 + 12:.0f}", **dict(BAR, tin=0)),
], sb=(40, 20))
G["G"] = dict(s=[
    c_curve(40, 450, C + 10, open_bot=0.0),
    S(f"M 280 270 L 450 280 L 450 40", w=0.95, tin=40, tout=30, pmin=0.4),
], sb=(32, 40))
G["H"] = dict(s=[
    stem(70, C), stem(420, C),
    S("M 76 330 C 180 345 300 360 414 372", **dict(BAR, w=0.7)),
], sb=(40, 40))
G["I"] = dict(s=[stem(70, C)], sb=(40, 40))
G["J"] = dict(s=[S(f"{wedge(260, C)} L 260 80 C 260 -10 200 -70 120 -70 C 80 -70 50 -55 26 -30",
                   tin=40, tout=50, pmin=0.06)], sb=(30, 40))
G["K"] = dict(s=[
    stem(70, C),
    S(f"M 400 {C} C 300 {C - 120} 180 {C - 260} 74 {C - 390}", tin=50, tout=0, w=0.9),
    S(f"M 150 {C - 300} C 230 {C - 450} 320 {C - 610} 360 {C - 650} C 385 {C - 676} 410 -2 450 2",
      tin=0, tout=70, pmin=0.04),
], sb=(40, 10))
G["L"] = dict(s=[
    stem(70, C, 0),
    S("M 70 0 L 330 6 C 360 7 380 22 396 46", w=0.6, tin=0, tout=45, pmin=0.06),
], sb=(40, 25))
G["M"] = dict(s=[
    S(f"M 40 0 C 50 240 60 480 72 {C}", tin=0, tout=0, w=0.95, **{"pmin": 1}),
    S(f"M 34 {C - 32} L 72 {C} L 300 0", tin=40, tout=0),
    S(f"M 300 0 L 520 {C}", tin=0, tout=0),
    S(f"M 520 {C} L 530 0", **SOFT),
], sb=(30, 40))
G["N"] = dict(s=[
    S(f"M 66 0 L 70 {C}", **dict(tin=30, tout=0, w=0.9)),
    S(f"M 32 {C - 32} L 70 {C} L 430 0", tin=40, tout=0),
    S(f"M 430 0 L 430 {C + 10}", tin=0, tout=50, pmin=0.06, w=0.9),
], sb=(30, 40))
G["O"] = dict(s=bowl_o(36, 500, C + 12, -12), sb=(32, 32))
G["P"] = dict(s=[
    stem(70, C),
    S(f"M 70 {C} C 270 {C + 8} 390 {C - 50} 390 {C - 180} C 390 {C - 300} 280 {C - 350} 80 {C - 340}", tin=0, tout=40, pmin=0.06),
], sb=(40, 20))
G["Q"] = dict(s=bowl_o(36, 500, C + 12, -12) + [
    S("M 250 40 C 320 -40 420 -90 560 -70", tin=30, tout=60, pmin=0.04, w=0.9)], sb=(32, 10))
G["R"] = dict(s=[
    stem(70, C),
    S(f"M 70 {C} C 270 {C + 8} 380 {C - 50} 380 {C - 170} C 380 {C - 290} 280 {C - 330} 80 {C - 330}", tin=0, tout=0),
    S(f"M 200 {C - 330} C 260 {C - 420} 320 {C - 560} 360 {C - 640} C 380 {C - 676} 410 -2 455 2",
      tin=0, tout=70, pmin=0.04),
], sb=(40, 10))
G["S"] = dict(s=[s_curve(40, 380, C + 10)], sb=(32, 32))
G["T"] = dict(s=[
    S(f"M 20 {C - 14} C 150 {C - 2} 300 {C + 8} 470 {C + 18}", w=0.65, tin=60, tout=60, pmin=0.06),
    S(f"M 245 {C + 4} L 245 0", tin=0, **SOFT),
], sb=(20, 20))
G["U"] = dict(s=[
    S(f"{wedge(70, C)} L 70 200 C 70 60 140 -8 250 -8 C 340 -8 400 40 430 130", tin=40, tout=30, pmin=0.25),
    leg(430, C),
], sb=(40, 10))
G["V"] = dict(s=[
    S(f"M 26 {C - 34} L 60 {C} C 120 460 180 220 250 -8", tin=40, tout=10, pmin=0.35),
    S(f"M 250 -8 C 320 220 390 460 470 {C + 14}", tin=10, tout=50, pmin=0.06),
], sb=(20, 20))
G["W"] = dict(s=[
    S(f"M 26 {C - 34} L 60 {C} C 100 460 150 220 200 -8", tin=40, tout=10, pmin=0.35),
    S("M 200 -8 C 250 170 300 340 350 500", tin=10, tout=10, pmin=0.4),
    S("M 350 500 C 400 340 450 170 500 -8", tin=10, tout=10, pmin=0.35),
    S(f"M 500 -8 C 560 220 620 460 690 {C + 14}", tin=10, tout=50, pmin=0.06),
], sb=(20, 20))
G["X"] = dict(s=[
    S(f"M 20 {C - 34} L 56 {C} C 170 440 300 220 450 -4", tin=40, tout=40, pmin=0.06),
    S(f"M 30 -4 C 180 220 310 440 460 {C + 10}", tin=40, tout=40, pmin=0.06, w=0.95),
], sb=(20, 20))
G["Y"] = dict(s=[
    S(f"M 20 {C - 34} L 56 {C} C 120 540 180 420 240 330", tin=40, tout=0, pmin=0.3),
    S(f"M 460 {C + 14} C 380 540 300 420 240 330 L 240 0", tin=50, **SOFT),
], sb=(20, 20))
G["Z"] = dict(s=[
    S(f"M 40 {C - 10} L 420 {C + 4}", w=0.6, tin=45, tout=0),
    S(f"M 420 {C + 4} C 300 470 170 230 40 0", tin=0, tout=0, w=1.15),
    S("M 40 0 L 410 6 C 430 7 446 18 458 36", w=0.6, tin=0, tout=40, pmin=0.06),
], sb=(25, 25))

# --- figures (lining, slightly shorter than caps) ------------------------------
F = FIG
G["0"] = dict(s=bowl_o(36, 380, F + 10, -10), sb=(32, 32))
G["1"] = dict(s=[S(f"M 40 {F - 150} C 100 {F - 110} 160 {F - 60} 200 {F + 4} L 200 0", tin=50, **SOFT)], sb=(20, 60))
G["2"] = dict(s=[
    S(f"M 50 {F - 140} C 70 {F - 40} 140 {F + 6} 220 {F + 6} C 310 {F + 6} 370 {F - 60} 370 {F - 160} "
      "C 370 300 230 180 50 6", tin=40, tout=0),
    S("M 50 6 L 330 6 C 360 7 380 22 396 46", w=0.6, tin=0, tout=40, pmin=0.06),
], sb=(30, 25))
G["3"] = dict(s=[
    S(f"M 60 {F - 90} C 90 {F - 20} 150 {F + 6} 220 {F + 6} C 310 {F + 6} 355 {F - 50} 355 {F - 130} "
      f"C 355 {F - 220} 290 {F - 270} 170 {F - 280}", tin=40, tout=20, pmin=0.3),
    S(f"M 170 {F - 280} C 310 {F - 285} 390 {F - 350} 390 {F - 450} C 390 60 300 -8 190 -8 C 120 -8 70 20 36 66",
      tin=20, tout=45, pmin=0.06),
], sb=(32, 32))
G["4"] = dict(s=[
    S(f"M 300 {F + 4} C 220 {F - 140} 120 {F - 320} 30 200", tin=40, tout=0, w=1.0),
    S("M 30 200 L 400 212", w=0.55, tin=0, tout=40, pmin=0.06),
    S(f"M 296 {F - 160} L 296 0", tin=30, **SOFT),
], sb=(25, 25))
G["5"] = dict(s=[
    S(f"M 360 {F + 8} L 110 {F}", w=0.6, tin=40, tout=0),
    S(f"M 110 {F} L 90 {F - 270}", tin=0, tout=0, w=0.85),
    S(f"M 90 {F - 270} C 140 {F - 240} 190 {F - 228} 230 {F - 228} C 330 {F - 228} 390 {F - 320} 390 200 "
      "C 390 70 300 -8 190 -8 C 120 -8 70 20 36 66", tin=0, tout=45, pmin=0.06),
], sb=(32, 32))
G["6"] = dict(s=[
    S(f"M 345 {F - 50} C 310 {F - 10} 270 {F + 6} 225 {F + 6} C 110 {F + 6} 40 490 40 310 "
      "C 40 110 110 -8 210 -8 C 320 -8 380 80 380 200 C 380 320 310 400 210 400 C 140 400 84 360 52 296",
      tin=40, tout=40, pmin=0.06),
], sb=(32, 32))
G["7"] = dict(s=[
    S(f"M 36 {F - 14} C 150 {F - 4} 260 {F + 2} 380 {F + 4}", w=0.6, tin=45, tout=0),
    S(f"M 380 {F + 4} C 290 470 210 250 160 0", tin=0, **SOFT),
], sb=(25, 20))
G["8"] = dict(s=[
    S(f"M 210 345 C 110 368 70 432 70 500 C 70 585 132 {F + 6} 210 {F + 6} C 290 {F + 6} 350 585 350 500 "
      "C 350 430 300 385 210 345 C 110 305 46 260 46 180 C 46 66 120 -8 210 -8 C 300 -8 374 66 374 180 "
      "C 374 260 310 310 210 345", tin=0, tout=0),
], sb=(32, 32))
G["9"] = dict(s=[
    S(f"M 60 40 C 95 10 135 -8 180 -8 C 300 -8 370 140 370 320 C 370 520 300 {F + 6} 200 {F + 6} "
      f"C 90 {F + 6} 30 560 30 440 C 30 320 100 240 200 240 C 270 240 328 280 360 344",
      tin=40, tout=40, pmin=0.06),
], sb=(32, 32))

# --- punctuation and symbols ---------------------------------------------------
G["."] = dict(s=[dot(60, 30)], sb=(40, 40))
G[","] = dict(s=[comma(60, 30)], sb=(40, 40))
G[":"] = dict(s=[dot(60, 30), dot(60, X - 20)], sb=(40, 40))
G[";"] = dict(s=[comma(60, 30), dot(60, X - 20)], sb=(40, 40))
G["!"] = dict(s=[S(f"M 70 {C + 10} L 66 170", tin=30, tout=90, pmin=0.06), dot(64, 30)], sb=(45, 45))
G["?"] = dict(s=[
    S(f"M 40 {C - 110} C 60 {C - 20} 120 {C + 8} 190 {C + 8} C 280 {C + 8} 330 {C - 50} 330 {C - 140} "
      f"C 330 {C - 250} 190 {C - 290} 180 {C - 380} L 176 170", tin=40, tout=80, pmin=0.06),
    dot(178, 30)], sb=(30, 30))
G["'"] = dict(s=[S(f"M 66 {C + 20} L 60 {C - 170}", tin=10, tout=100, pmin=0.06)], sb=(45, 45))
G['"'] = dict(s=[S(f"M 66 {C + 20} L 60 {C - 170}", tin=10, tout=100, pmin=0.06),
                 S(f"M 166 {C + 20} L 160 {C - 170}", tin=10, tout=100, pmin=0.06)], sb=(45, 45))
G["’"] = dict(s=[comma(70, C - 40)], sb=(40, 40))
G["‘"] = dict(s=[turned(70, C - 120)], sb=(40, 40))
G["“"] = dict(s=[turned(70, C - 120), turned(190, C - 120)], sb=(40, 40))
G["”"] = dict(s=[comma(70, C - 40), comma(190, C - 40)], sb=(40, 40))
G["-"] = dict(s=[S("M 30 250 L 230 262", w=0.85, tin=40, tout=40, pmin=0.06)], sb=(30, 30))
G["–"] = dict(s=[S("M 30 250 L 470 262", w=0.85, tin=60, tout=60, pmin=0.06)], sb=(20, 20))
G["—"] = dict(s=[S("M 30 250 L 870 266", w=0.85, tin=90, tout=90, pmin=0.06)], sb=(20, 20))
G["("] = dict(s=[S(f"M 200 {C + 40} C 90 560 50 420 50 240 C 50 60 90 -80 200 -180", tin=40, tout=40, pmin=0.06)], sb=(30, 20))
G[")"] = dict(s=[S(f"M 40 {C + 40} C 150 560 190 420 190 240 C 190 60 150 -80 40 -180", tin=40, tout=40, pmin=0.06)], sb=(20, 30))
G["["] = dict(s=[S(f"M 180 {C + 40} L 70 {C + 36} L 70 -180 L 180 -176", tin=0, tout=0, w=0.8)], sb=(40, 20))
G["]"] = dict(s=[S(f"M 30 {C + 36} L 140 {C + 40} L 140 -176 L 30 -180", tin=0, tout=0, w=0.8)], sb=(20, 40))
G["/"] = dict(s=[S(f"M 20 -140 L 330 {C + 40}", tin=40, tout=40, pmin=0.06)], sb=(10, 10))
G["+"] = dict(s=[S("M 30 250 L 330 262", w=0.6, tin=40, tout=40, pmin=0.06),
                 S("M 180 100 L 180 410", w=0.8, tin=40, tout=40, pmin=0.06)], sb=(35, 35))
G["="] = dict(s=[S("M 30 330 L 330 340", w=0.6, tin=40, tout=40, pmin=0.06),
                 S("M 30 170 L 330 180", w=0.6, tin=40, tout=40, pmin=0.06)], sb=(35, 35))
G["−"] = dict(s=[S("M 30 250 L 330 262", w=0.6, tin=40, tout=40, pmin=0.06)], sb=(35, 35))
G["×"] = dict(s=[S("M 50 120 L 290 380", tin=40, tout=40, pmin=0.06, w=0.8),
                      S("M 50 380 L 290 120", tin=40, tout=40, pmin=0.06, w=0.8)], sb=(35, 35))
G["%"] = dict(s=bowl_o(20, 200, F + 6, 360) + bowl_o(300, 480, 270, -6) +
              [S(f"M 40 -10 L 460 {F + 6}", tin=40, tout=40, pmin=0.06, w=0.8)], sb=(30, 30))
G["*"] = dict(s=[S(f"M 160 {C + 10} L 160 {C - 230}", tin=50, tout=50, pmin=0.06, w=0.7),
                 S(f"M 50 {C - 50} L 270 {C - 170}", tin=50, tout=50, pmin=0.06, w=0.7),
                 S(f"M 50 {C - 170} L 270 {C - 50}", tin=50, tout=50, pmin=0.06, w=0.7)], sb=(30, 30))
G["&"] = dict(s=[
    S(f"M 470 0 C 360 80 160 260 120 380 C 90 470 120 {C} 230 {C} C 320 {C} 360 620 360 560 "
      "C 360 460 250 420 160 360 C 80 300 40 230 40 160 C 40 50 120 -8 220 -8 C 330 -8 410 80 450 200 "
      "C 470 260 480 300 500 320", tin=40, tout=40, pmin=0.06)], sb=(30, 20))
G["#"] = dict(s=[S(f"M 160 -20 L 200 {F + 10}", w=0.8, tin=30, tout=30, pmin=0.06),
                 S(f"M 300 -20 L 340 {F + 10}", w=0.8, tin=30, tout=30, pmin=0.06),
                 S("M 50 430 L 440 440", w=0.55, tin=30, tout=30, pmin=0.06),
                 S("M 30 200 L 420 210", w=0.55, tin=30, tout=30, pmin=0.06)], sb=(25, 25))
G["·"] = dict(s=[dot(60, 270)], sb=(40, 40))
G["…"] = dict(s=[dot(60, 30), dot(220, 30), dot(380, 30)], sb=(40, 40))
G["<"] = dict(s=[S("M 330 440 L 40 260 L 330 80", tin=40, tout=40, pmin=0.06, w=0.8)], sb=(35, 35))
G[">"] = dict(s=[S("M 40 440 L 330 260 L 40 80", tin=40, tout=40, pmin=0.06, w=0.8)], sb=(35, 35))

GLYPHS = G

# Kerning: font units, measured by eye on the pair sheet (out/kern.png).
KERN = {
    ("A", "V"): -60, ("V", "A"): -60, ("A", "T"): -50, ("T", "A"): -50, ("A", "W"): -40, ("W", "A"): -40,
    ("A", "Y"): -50, ("Y", "A"): -50, ("L", "T"): -60, ("L", "V"): -60, ("L", "Y"): -60, ("L", "y"): -40,
    ("T", "o"): -70, ("T", "e"): -70, ("T", "a"): -70, ("T", "r"): -40, ("T", "y"): -40,
    ("V", "a"): -50, ("V", "e"): -50, ("V", "o"): -50, ("W", "a"): -40, ("W", "e"): -40, ("W", "o"): -40,
    ("Y", "a"): -50, ("Y", "e"): -50, ("Y", "o"): -50, ("P", "a"): -20,
    ("F", "period"): -80, ("F", "comma"): -80, ("P", "period"): -90, ("P", "comma"): -90,
    ("T", "period"): -70, ("T", "comma"): -70, ("V", "period"): -70, ("V", "comma"): -70,
    ("f", "b"): 35, ("f", "h"): 35, ("f", "k"): 35, ("f", "l"): 35, ("f", "quoteright"): 70,
    ("f", "quotedblright"): 70, ("f", "question"): 60, ("f", "exclam"): 60, ("f", "parenright"): 50,
    ("Y", "period"): -70, ("Y", "comma"): -70, ("r", "period"): -50, ("r", "comma"): -50,
}
FEATURES = "feature kern {\n" + "".join(f"  pos {a} {b} {v};\n" for (a, b), v in KERN.items()) + "} kern;\n"
