"""Mock of the two satchel options from the approved models: A = static PNG icons, B = in-game 3D (turntable).
Writes sheets/satchel_options.gif (12 frames) and sheets/satchel_options.png (frame 0). python -P make_mock.py"""
from PIL import Image, ImageDraw, ImageFont
import os
D = os.path.dirname(os.path.abspath(__file__))
INK, INK2, LINE, CREAM, DIM = (27,33,48), (36,45,63), (62,74,96), (239,230,210), (185,176,156)
RAR = {'common': DIM, 'rare': (143,169,138), 'epic': (205,189,234), 'legendary': (226,168,91), 'mythic': (199,111,111)}
F = lambda s: ImageFont.truetype(r'C:\Windows\Fonts\arial.ttf', s)
FB = lambda s: ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', s)
WORN = [('bow','Ashwood Bow','rare','ashwood-bow-r2_refine'), ('quiver','Birch Quiver','common','birch-quiver-r2_refine'),
        ('bracer','Leather Bracer','epic','leather-bracer-i1_i23d'), ('cloak','Moss Cloak','legendary','moss-cloak_refine'),
        ('boots','Ranger Boots','common','ranger-boots_refine'), ('charm','Star Charm','mythic','star-charm_refine')]
S = 2  # UI px -> mock px
TW, TH, GAP = 150*S, 44*S, 6*S
PW = 3*TW + 2*GAP + 24*S
PH = 24*S + 2*(TH+GAP) + 20*S + 60*S + 16*S
def icon(stem, f, anim):
    p = os.path.join(D, 'turn', f'{stem}_t{f:02d}.png') if anim else os.path.join(D, 'icons', f'{stem}.png')
    return Image.open(p).convert('RGBA')
def panel(title, sub, anim, f):
    im = Image.new('RGB', (PW, PH), INK); dr = ImageDraw.Draw(im)
    dr.text((12*S, 6*S), title, fill=CREAM, font=FB(11*S)); dr.text((12*S, 6*S), ' '*len(title)*2 + '', fill=DIM, font=F(8*S))
    dr.text((12*S + dr.textlength(title, font=FB(11*S)) + 8*S, 8*S), sub, fill=DIM, font=F(8*S))
    y0 = 24*S
    for i, (slot, name, rar, stem) in enumerate(WORN):
        x = 12*S + (i % 3) * (TW + GAP); y = y0 + (i // 3) * (TH + GAP)
        dr.rounded_rectangle((x, y, x+TW, y+TH), 6*S, fill=INK2, outline=LINE)
        dr.rectangle((x, y+2, x+3*S, y+TH-2), fill=RAR[rar])
        box = 34*S; bx, by = x + 8*S, y + (TH-box)//2
        dr.rounded_rectangle((bx, by, bx+box, by+box), 4*S, fill=INK, outline=RAR[rar], width=(3 if rar in ('legendary','mythic') else 2))
        ic = icon(stem, f, anim).resize((box-4*S, box-4*S), Image.LANCZOS); im.paste(ic, (bx+2*S, by+2*S), ic)
        dr.text((bx+box+8*S, y+9*S), slot.upper(), fill=DIM, font=F(7*S))
        dr.text((bx+box+8*S, y+21*S), name, fill=CREAM, font=F(10*S))
    # detail head for the selected item (bow)
    y = y0 + 2*(TH+GAP) + 8*S; big = 56*S
    dr.rounded_rectangle((12*S, y, 12*S+big, y+big), 5*S, fill=INK, outline=RAR['rare'], width=2)
    ic = icon(WORN[0][3], f, anim).resize((big-6*S, big-6*S), Image.LANCZOS); im.paste(ic, (15*S, y+3*S), ic)
    dr.text((12*S+big+12*S, y+6*S), 'Ashwood Bow', fill=RAR['rare'], font=FB(16*S))
    dr.text((12*S+big+12*S, y+28*S), '+12.0% Draw speed   +0.35 Arrow damage', fill=CREAM, font=F(9*S))
    return im
frames = []
for f in range(12):
    a = panel('A  PNG icons', 'one picture per item, rendered once from the model', False, f)
    b = panel('B  In-game 3D', 'the model itself, turning in the slot', True, f)
    out = Image.new('RGB', (PW*2 + 10*S, PH), (14,18,26)); out.paste(a, (0,0)); out.paste(b, (PW+10*S, 0))
    frames.append(out)
os.makedirs(os.path.join(D, 'sheets'), exist_ok=True)
frames[0].save(os.path.join(D, 'sheets', 'satchel_options.png'))
frames[0].save(os.path.join(D, 'sheets', 'satchel_options.gif'), save_all=True, append_images=frames[1:], duration=110, loop=0, optimize=True)
print('WROTE', frames[0].size, os.path.getsize(os.path.join(D, 'sheets', 'satchel_options.gif')))
