# Approved loot models (TB-104)

One row per item id (src/data loot ids). The GLB named here is the one UI wiring uses; every other file for
that id in this folder is superseded history. Director approval is quoted from docs/log.

| item id | file | approved |
|---|---|---|
| ashwood-bow (Ironbark Recurve) | ashwood-bow_refine.glb | 1 Nov, "Approve, quiver (5)" |
| leather-bracer | leather-bracer-i1_i23d.glb | 1 Nov, "Approve all five" |
| bark-bracer | bark-bracer-i1_i23d.glb | 1 Nov, "Approve all five" |
| silver-bracer | silver-bracer-i1_i23d.glb | 1 Nov, "Approve all five" |
| scaled-bracer | scaled-bracer-i1_i23d.glb | 1 Nov, "Approve all five" |
| thunders-memory | thunders-memory-i1_i23d.glb | 1 Nov, "Approve all five" |

Route that worked for open shells (bracers): Text-to-Image reference (gpt-image-2, 9 cr) -> Image-to-3D smart
topology 3,000 tris textured 2K (15 cr), `run_img.sh image|i23d <id>-i1`. Text-to-3D for solid props.
