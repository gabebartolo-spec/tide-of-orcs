# Approved loot models (TB-104)

One row per item id (src/data/lootTables.ts BASES and MYTHICS; set pieces reuse their base model). The GLB named
here is the one UI wiring uses; every other file for that id in this folder is superseded history. Director
approval is quoted from docs/log. Icons rendered from these files: icons/<stem>.png (render_icons.py).

| item id (slot) | file | approved |
|---|---|---|
| ashwood-bow (bow) | ashwood-bow-i1_i23d.glb | 1 Nov, "replace these too" |
| yew-longbow (bow) | yew-longbow-i2_i23d.glb | 1 Nov, "replace" |
| hornbow (bow) | hornbow_refine.glb | 1 Nov, "yes all are approved" |
| ironbark-recurve (bow) | ironbark-recurve-i1_i23d.glb | 4 Nov, "replace the art" (TB-221; image route 9 + 15 cr; was bow_refine.glb) |
| hide-quiver (quiver) | hide-quiver_refine.glb | 1 Nov, "yes all are approved" |
| birch-quiver (quiver) | birch-quiver-r2_refine.glb | 1 Nov, "yes all are approved" |
| woven-quiver (quiver) | woven-quiver_refine.glb | 1 Nov, "yes all are approved" |
| gilded-quiver (quiver) | gilded-quiver_refine.glb | 1 Nov, "yes all are approved" |
| leather-bracer (bracer) | leather-bracer-i1_i23d.glb | 1 Nov, "Approve all five" |
| bark-bracer (bracer) | bark-bracer-i1_i23d.glb | 1 Nov, "Approve all five" |
| scaled-bracer (bracer) | scaled-bracer-i1_i23d.glb | 1 Nov, "Approve all five" |
| silver-bracer (bracer) | silver-bracer-i1_i23d.glb | 1 Nov, "Approve all five" |
| moss-cloak (cloak) | moss-cloak_refine.glb | 1 Nov, "yes all are approved" |
| wool-cloak (cloak) | wool-cloak_refine.glb | 1 Nov, "yes all are approved" |
| feather-cloak (cloak) | feather-cloak_refine.glb | 1 Nov, "yes all are approved" |
| dusk-cloak (cloak) | dusk-cloak_refine.glb | 1 Nov, "yes all are approved" |
| soft-boots (boots) | soft-boots_refine.glb | 1 Nov, "yes all are approved" |
| root-boots (boots) | root-boots_refine.glb | 1 Nov, "yes all are approved" |
| ranger-boots (boots) | ranger-boots-i1_i23d.glb | 1 Nov, "replace these too" |
| windstep-boots (boots) | windstep-boots_refine.glb | 1 Nov, "yes all are approved" |
| acorn-charm (charm) | acorn-charm-i1_i23d.glb | 1 Nov, "replace these too" |
| bone-charm (charm) | bone-charm_refine.glb | 1 Nov, "yes all are approved" |
| amber-charm (charm) | amber-charm_refine.glb | 1 Nov, "yes all are approved" |
| star-charm (charm) | star-charm_refine.glb | 1 Nov, "yes all are approved" |
| last-knife (mythic) | last-knife-i1_i23d.glb | 1 Nov, "make a new model for this weird knife" |
| heart-of-kiln (mythic) | heart-of-kiln-r2_refine.glb | 1 Nov, "yes all are approved" |
| thunders-memory (mythic) | thunders-memory-i1_i23d.glb | 1 Nov, "Approve all five" |
| oakspine (mythic) | oakspine_refine.glb | 1 Nov, "yes all are approved" |
| pale-moon (mythic) | pale-moon_refine.glb | 1 Nov, "yes all are approved" |
| first-wolf (mythic) | first-wolf-i1_i23d.glb | 1 Nov, "replace these too" |
| heartwood-splinter (mythic) | heartwood-splinter-i1_i23d.glb | 1 Nov, "replace this too" |
| starfall-cloak (mythic) | starfall-cloak_refine.glb | 1 Nov, "yes all are approved" |

Route that worked for open shells (bracers): Text-to-Image reference (gpt-image-2, 9 cr) -> Image-to-3D smart
topology 3,000 tris textured 2K (15 cr), `run_img.sh image|i23d <id>-i1`. Text-to-3D (preview 5 + refine 10)
for solid props.

TB-221 (4 Nov): the seven bow icons, Dusk Cloak and The Last Knife read thin or dark at pocket size, so they are
finished with `icon_rim.py` (cream rim over an ink line, palette tokens `cream` and `ink`; the cloak and the new
ironbark also get a gamma lift) after `render_icons.py` at 512 px. Only Ironbark Recurve got a new model.
