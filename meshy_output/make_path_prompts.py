"""TB-193d: adds the path sets, path mythics and path sigils to prompts.json, in the TB-104 prompt style."""
import json, os
S = " Soft low-poly toy-board look, flat shading, no outlines, clean simple silhouette, a single object, no extra parts."
T = "Hand-painted flat colours, soft low-poly toy-board game prop, no outlines, no baked shadows. "
SV = "Deep dusty sage-green with bone-coloured scale patterns, "
FX = "Warm rust-orange fox red with bone-white fur tips, "
MG = "Glossy black-blue magpie with bone-white patches, "
FLAT = "unbuckled and laid flat on the ground, outer face up, seen from above. A single tapered plate, wider at the elbow end and narrower at the wrist end, gently domed, "
STRAPS = ", with two straps lying splayed out flat to either side, each ending in a small buckle."
CLOAK = "displayed standing as if worn by an invisible figure. "
QUIV = "a strap, five fletched arrow shafts rising out of the open top, no bow."
P = {
# Serpent's Coil (archery)
'serpents-coil-bow': ("Serpent bow, a game item prop. A recurve bow whose wooden limbs are carved as a coiled snake body with a snake head at the upper tip, a wrapped grip and a single taut string, no arrow.", SV + "ochre grip wrap, bone string."),
'serpents-coil-quiver': ("Snakeskin arrow quiver, a game item prop, standing upright. A cylindrical tube of snakeskin with a snake coiled around it from bottom to rim, " + QUIV, SV + "rust-brown strap, pale bone arrow shafts with sage fletching."),
'serpents-coil-bracer': ("Snakescale bracer, a game item prop, " + FLAT + "covered in diamond snake scales with a small snake head emblem at the wide end" + STRAPS, SV + "rust-brown straps, ochre buckles."),
'serpents-coil-cloak': ("Serpent hooded cloak, a game item prop, " + CLOAK + "Cloth to the ground with a diamond snake-scale pattern, a hood shaped like a snake's head, a coiled snake clasp at the throat, no body.", SV + "an ochre snake clasp, darker sage hood lining."),
'serpents-coil-boots': ("Pair of snakeskin boots, a game item prop. Two knee-high boots of snakeskin with a small snake coiled around each ankle, pointed toes, standing side by side, no legs.", SV + "rust-brown soles, ochre snake eyes."),
'serpents-coil-charm': ("Serpent charm pendant, a game item prop. A small snake coiled into a ring biting its own tail, hung on a short cord loop.", SV + "ochre eyes, rust-brown cord."),
# Foxfire Pack (vanguard and companions)
'foxfire-pack-bow': ("Fox bow, a game item prop. A recurve bow with a carved fox head at the upper tip and a bushy fox tail tied at the grip, a single taut string, no arrow.", FX + "ochre wood, bone string."),
'foxfire-pack-quiver': ("Fox fur arrow quiver, a game item prop, standing upright. A cylindrical tube of fox fur with a fox-head clasp near the rim, " + QUIV, FX + "rust-brown strap, bone arrow shafts with orange fletching."),
'foxfire-pack-bracer': ("Fox bracer, a game item prop, " + FLAT + "with a fox head emblem embossed in its centre and a fur trim along the wide end" + STRAPS, FX + "ochre buckles, bone fur trim."),
'foxfire-pack-cloak': ("Fox fur hooded cloak, a game item prop, " + CLOAK + "Cloth to the ground with a hood shaped like a fox head with two pointed ears and a fur collar, no body.", FX + "bone-white collar and hem, ochre clasp."),
'foxfire-pack-boots': ("Pair of fox fur boots, a game item prop. Two ankle boots with thick fox fur cuffs and a small fox tail tuft at each heel, standing side by side, no legs.", FX + "bone-white fur cuffs, rust-brown soles."),
'foxfire-pack-charm': ("Fox charm pendant, a game item prop. A small carved fox head with two pointed ears, hung on a short cord loop.", FX + "bone-white muzzle, rust-brown cord."),
# Magpie's Hoard (economy)
'magpies-hoard-bow': ("Magpie bow, a game item prop. A recurve bow with a carved magpie bird perched on the upper tip and gold coins strung at the grip, a single taut string, no arrow.", MG + "ochre-gold coins, dark wood, bone string."),
'magpies-hoard-quiver': ("Magpie arrow quiver, a game item prop, standing upright. A cylindrical tube covered in layered black and white feathers with gold coins sewn on the rim, " + QUIV, MG + "ochre-gold coins, rust-brown strap, black-and-white fletching."),
'magpies-hoard-bracer': ("Magpie bracer, a game item prop, " + FLAT + "covered in overlapping black and white feathers with a large gold coin set in its centre" + STRAPS, MG + "ochre-gold coin and buckles, rust-brown straps."),
'magpies-hoard-cloak': ("Magpie feather hooded cloak, a game item prop, " + CLOAK + "Cloth to the ground with black and white feathers over the shoulders and a hood, small gold trinkets hanging from the hem, no body.", MG + "ochre-gold trinkets and clasp."),
'magpies-hoard-boots': ("Pair of magpie boots, a game item prop. Two ankle boots with black and white feather cuffs and a gold coin buckle on each, standing side by side, no legs.", MG + "ochre-gold buckles, rust-brown soles."),
'magpies-hoard-charm': ("Magpie charm pendant, a game item prop. A small carved magpie bird holding a gold ring in its beak, hung on a short cord loop.", MG + "ochre-gold ring, rust-brown cord."),
# Path mythics
'serpent-fang': ("Mythic serpent fang bow, a game item prop. A recurve bow whose limbs are a long snake's body, the upper tip a snake head with an open mouth and two long curved white fangs, a single taut string, no arrow.", "Deep sage-green snake scales with ochre-gold bands, bone-white fangs, a pale green venom drop, bone string."),
'foxfire-tail': ("Mythic foxfire tail charm, a game item prop. One large bushy fox tail curled into a crescent, its tip wreathed in flames, bound at the base with a gold ring and hung on a short cord loop.", "Rust-orange fox fur with a bone-white tip wreathed in pale blue-green ghostly flame, ochre-gold ring, rust-brown cord."),
'magpies-talon': ("Mythic magpie talon quiver, a game item prop, standing upright. A cylindrical quiver gripped by a large bird's claw with four curved talons wrapped around it, black and white feathers on the sides, " + QUIV, "Glossy black-blue and bone-white feathers, ochre-gold talons and rim, rust-brown strap, gold arrow tips."),
# Path sigils: round carved medallions
'sigil-serpent': ("Round carved medallion emblem, a game item prop, standing upright facing forward. A flat thick disc with a raised rim, a coiled snake in relief on its face.", "Dusty sage-green disc, ochre-gold snake, bone rim."),
'sigil-fox': ("Round carved medallion emblem, a game item prop, standing upright facing forward. A flat thick disc with a raised rim, a fox head with pointed ears in relief on its face.", "Rust-orange disc, bone-white fox head, ochre-gold rim."),
'sigil-magpie': ("Round carved medallion emblem, a game item prop, standing upright facing forward. A flat thick disc with a raised rim, a magpie bird in flight in relief on its face.", "Dark blue-black disc, bone-white magpie, ochre-gold rim."),
}
# Rerolls after preview screening (serpent bow, magpie bow, magpie bracer, talon failed): shape first, motif second.
BOW = "a game item prop, standing upright. One wooden stave bent into a smooth D-curve from tip to tip, a wrapped grip at the middle, and a single taut straight bowstring between the two tips with clear open space between string and stave, "
P.update({
'serpents-coil-bow-r2': ("Serpent recurve bow, " + BOW + "the stave carved with snake scales and the upper tip ending in a small snake head, no arrow.", SV + "ochre grip wrap, bone string."),
'magpies-hoard-bow-r2': ("Magpie recurve bow, " + BOW + "black and white feathers bound at the grip and two small gold coins hanging from the grip on a cord, no arrow.", MG + "dark wood, ochre-gold coins, bone string."),
'magpies-hoard-bracer-r2': ("Magpie archer's bracer, a game item prop, standing upright. A curved forearm guard shaped like an open cuff, wider at the elbow end, its outer face covered in overlapping black and white feathers with a large gold coin set in the middle, two buckled leather straps around it, no arm inside.", MG + "ochre-gold coin and buckles, rust-brown straps."),
'magpies-talon-r2': ("Mythic magpie talon quiver, a game item prop, standing upright. One wide cylindrical arrow quiver, closed at the bottom and open at the top, with a large bird's foot of four thick curved claws gripping it from below and wrapping up its sides, black and white feathers on the tube, five fletched arrow shafts rising out of the open top, no bow.", "Glossy black-blue and bone-white feathers, ochre-gold claws and rim, rust-brown strap, gold arrow tips."),
})
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'prompts.json')
d = json.load(open(out))
d.update({k: {'prompt': v[0] + S, 'texture': T + v[1]} for k, v in P.items()})
json.dump(d, open(out, 'w'), indent=1)
print(len(P), 'new; longest', max(len(v[0] + S) for v in P.values()))
