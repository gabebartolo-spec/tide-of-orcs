"""TB-193d image route for the path items whose text-to-3D model failed screening (bracers read as a pillow, a mug
and a brooch; the serpent and fox bows and the Fang read as a snake or a stick; the fox charm as a fox on a stick).
Merges into img_prompts.json: {id: {"base": prompts.json key, "image": prompt}}. Run from the repo root."""
import json
TAIL = (" No arm, no hand, no stand, no other objects. Stylised low-poly toy-miniature look, flat matte colours, soft even"
        " lighting, no outlines, no text.")
HEAD = "Concept art of a single fantasy {what}, a game item, shown alone in three-quarter view and centred on a plain pale grey background. "
BRACER = ("It is an open curved forearm guard, a tapered half-cylinder of {plate}, wider at the elbow end and narrower at"
          " the wrist, its open inner side turned slightly toward the viewer so the hollow inside is visible; {detail};"
          " two leather straps with small buckles holding it closed.")
BOW = ("It is a recurve bow standing upright: one curved stave from top tip to bottom tip with a wrapped grip in the"
       " middle and one thin taut bowstring running straight from tip to tip, clear open space between string and stave; {detail}. No arrow.")
D = {
 'serpents-coil-bracer': ("archer's bracer", BRACER.format(plate='dark green snakeskin leather with diamond scales', detail='a small coiled snake emblem in gold on the outer face')),
 'foxfire-pack-bracer': ("archer's bracer", BRACER.format(plate='rust-orange leather', detail='a fox head embossed on the outer face and a strip of white fur along the elbow edge')),
 'magpies-hoard-bracer': ("archer's bracer", BRACER.format(plate='black leather covered in small black and white feathers', detail='a large gold coin set in the middle of the outer face')),
 'serpents-coil-bow': ("serpent bow", BOW.format(detail='the stave is dark green wood carved with snake scales, and the top tip is carved as a small snake head')),
 'foxfire-pack-bow': ("fox bow", BOW.format(detail='the stave is rust-orange wood, the top tip is carved as a small fox head with pointed ears, and a little white-tipped fox tail hangs from the grip')),
 'serpent-fang': ("mythic serpent bow", BOW.format(detail='the stave is a green snake\'s body with gold bands, the top tip is a snake head with open jaws and two long white fangs, and the bottom tip is its tail')),
 'foxfire-tail': None,
 'foxfire-pack-charm': ("fox charm pendant", "It is a small carved fox head with two pointed ears and a white muzzle, hanging from a thin soft cord tied in a loop above it."),
}
d = json.load(open('meshy_output/img_prompts.json'))
for k, v in D.items():
    if v: d[f'{k}-i1'] = {'base': k, 'image': HEAD.format(what=v[0]) + v[1] + TAIL}
json.dump(d, open('meshy_output/img_prompts.json', 'w'), indent=1)
print(max(len(x['image']) for x in d.values()))
