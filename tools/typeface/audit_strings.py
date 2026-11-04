import sys,glob,re
from fontTools.ttLib import TTFont
f=TTFont('src/ui/fonts/heartwood-400.woff2'); cm=set(f.getBestCmap().keys())
miss={}
for p in glob.glob('src/**/*.ts',recursive=True)+['index.html']:
    if p.endswith('.test.ts'): continue
    s=open(p,encoding='utf8').read()
    s=re.sub(r'/\*[\s\S]*?\*/','',s); s=re.sub(r'(?m)(^|\s)//.*$','',s)   # comments are never shown
    for m in re.finditer(r"""(["'`])((?:\.|(?!\1).)*)\1""",s):
        for ch in m.group(2):
            if ord(ch)>126 or (ord(ch)<32 and ch not in '\n\t'):
                if ord(ch) not in cm: miss.setdefault(ch,set()).add(p)
    # ascii check
for ch,ps in miss.items(): print(repr(ch),hex(ord(ch)),sorted(ps)[:3])
asc=[chr(c) for c in range(32,127) if c not in cm]; print('ascii missing',asc)
