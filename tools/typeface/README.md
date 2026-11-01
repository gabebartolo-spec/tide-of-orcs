# Heartwood typeface (TB-135)

The game's own display face, drawn as pen skeletons swept by a broad nib. Docs: `docs/ART-STYLE.md` §Typography.

| File | What |
|---|---|
| `engine.py` | Stroke engine: elliptical nib at 30° (96 x 11 units, 1000 UPM), pressure tapers, pathops union, TrueType quadratics |
| `glyphs.py` | Every glyph as skeleton paths, metrics, sidebearings, `KERN` pairs |
| `build.py` | Writes `out/Heartwood-Regular.ttf` and `.woff2`, adds `kern` and a generated `tnum` |
| `look.py` | PIL test renders (no shaping engine, so kerning is not applied; check kerning in a browser) |
| `specimen.html` | Specimen vs Spectral in the game's real slots |

```
pip install fonttools skia-pathops brotli pillow
python tools/typeface/build.py
cp tools/typeface/out/Heartwood-Regular.woff2 src/ui/fonts/heartwood-400.woff2
```

Specimen: run `python -m http.server 8731` at the repo root and open `/tools/typeface/specimen.html`.
These are dev tools only; nothing here ships or runs in the game.
