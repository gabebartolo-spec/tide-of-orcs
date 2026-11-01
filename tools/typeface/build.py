"""Build Heartwood: python tools/typeface/build.py  ->  tools/typeface/out/Heartwood-Regular.{ttf,woff2}"""
import importlib
import os
import sys

from fontTools.agl import UV2AGL
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import engine  # noqa: E402
import glyphs  # noqa: E402

UPM = 1000
ASC, DESC = 900, -280      # line box (hhea / typo)
FAMILY = "Heartwood"
TAB_W = 480              # tabular figure advance (widest digit, 0, is 491 proportional)
OUT = os.path.join(HERE, "out")


def gname(ch):
    cp = ord(ch)
    return UV2AGL.get(cp, f"uni{cp:04X}")


def build(only=None):
    importlib.reload(glyphs)
    order = [".notdef", "space"]
    cmap = {32: "space"}
    glyf, hmtx = {}, {}
    tab = []

    pen = TTGlyphPen(None)
    glyf[".notdef"] = pen.glyph(); hmtx[".notdef"] = (500, 0)
    glyf["space"] = TTGlyphPen(None).glyph(); hmtx["space"] = (glyphs.SPACE, 0)

    for ch, g in glyphs.GLYPHS.items():
        if only and ch not in only:
            continue
        name = gname(ch)
        contours = engine.union(engine.glyph_polys(g["s"]))
        xmin, ymin, xmax, ymax = engine.bounds(contours)
        lsb, rsb = g.get("sb", glyphs.SB)
        dx = lsb - xmin
        contours = [[(x + dx, y) for x, y in c] for c in contours]
        pen = TTGlyphPen(None)
        engine.draw_contours(contours, pen)
        glyf[name] = pen.glyph()
        adv = int(round(xmax - xmin + lsb + rsb))
        hmtx[name] = (adv, int(round(lsb)))
        order.append(name)
        cmap[ord(ch)] = name
        if ch.isdigit():  # tabular copy: same drawing centred in a fixed advance (tnum)
            ink = xmax - xmin
            tl = (TAB_W - ink) / 2
            tc = [[(x - lsb + tl, y) for x, y in c] for c in contours]
            pen = TTGlyphPen(None)
            engine.draw_contours(tc, pen)
            glyf[name + ".tf"] = pen.glyph()
            hmtx[name + ".tf"] = (TAB_W, int(round(tl)))
            tab.append(name)

    order += [n + ".tf" for n in tab]
    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyf)
    fb.setupHorizontalMetrics(hmtx)
    fb.setupHorizontalHeader(ascent=ASC, descent=DESC)
    fb.setupNameTable({
        "familyName": FAMILY,
        "styleName": "Regular",
        "uniqueFontIdentifier": f"{FAMILY}-Regular-0.1",
        "fullName": f"{FAMILY} Regular",
        "psName": f"{FAMILY}-Regular",
        "version": "Version 0.100",
        "copyright": "Copyright 2026 Let's Hunt Some Orc!",
        "designer": "Let's Hunt Some Orc!",
    })
    fb.setupOS2(sTypoAscender=ASC, sTypoDescender=DESC, sTypoLineGap=0, usWinAscent=ASC,
                usWinDescent=-DESC, sxHeight=glyphs.XH, sCapHeight=glyphs.CAP, achVendID="LHSO",
                fsType=0)
    fb.setupPost()
    fea = getattr(glyphs, "FEATURES", "")
    if tab:
        fea += "feature tnum {\n" + "".join(f"  sub {n} by {n}.tf;\n" for n in tab) + "} tnum;\n"
    if fea:
        from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
        addOpenTypeFeaturesFromString(fb.font, fea)
    os.makedirs(OUT, exist_ok=True)
    ttf = os.path.join(OUT, f"{FAMILY}-Regular.ttf")
    fb.save(ttf)
    try:
        fb.font.flavor = "woff2"
        fb.save(os.path.join(OUT, f"{FAMILY}-Regular.woff2"))
    except Exception as e:  # brotli missing
        print("woff2 skipped:", e)
    return ttf


if __name__ == "__main__":
    print(build())
