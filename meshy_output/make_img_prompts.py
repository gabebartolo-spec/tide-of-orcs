"""TB-104 image route for the bracers (research report: Text-to-Image reference, then Image-to-3D).
Writes img_prompts.json: {id: {"base": loot id, "image": prompt}}. Texture prompts come from prompts.json[base]."""
import json
F = ("Concept art of a single fantasy archer's bracer, a game item, shown alone in three-quarter view and centred on a "
     "plain pale grey background. It is an open curved forearm guard, a tapered half-cylinder of {plate}, wider at the "
     "elbow end and narrower at the wrist, its open inner side turned slightly toward the viewer so the hollow inside is "
     "visible; {detail}; {straps}. No arm, no hand, no stand, no other objects. Stylised low-poly toy-miniature look, flat "
     "matte colours, soft even lighting, no outlines, no text. Palette: dusty sage, rust, ochre and bone.")
D = {
 'leather-bracer': dict(plate='worn tan leather', detail='an embossed leaf motif and stitched edges on the outer face',
                        straps='two leather straps with small bronze buckles holding it closed'),
 'bark-bracer': dict(plate='thick birch bark lined with soft leather', detail='small moss patches and one green leaf on the outer face',
                     straps='two twisted cord ties holding it closed'),
 'silver-bracer': dict(plate='polished silver', detail='an engraved five-pointed star and a raised rim on the outer face',
                       straps='two leather straps with buckles holding it closed'),
 'scaled-bracer': dict(plate='overlapping round bronze scales over leather', detail='the scales catching soft light',
                       straps='two leather straps with buckles holding it closed'),
 'thunders-memory': dict(plate='dark iron', detail='a raised jagged lightning bolt down the outer face and three copper coils ringing the wrist end',
                         straps='two leather straps with buckles holding it closed'),
}
out = {f'{k}-i1': {'base': k, 'image': F.format(**v)} for k, v in D.items()}
json.dump(out, open('meshy_output/img_prompts.json', 'w'), indent=1)
print(len(out), max(len(v['image']) for v in out.values()))
