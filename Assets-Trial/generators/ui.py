"""Original hand-plotted pixel UI studies. Run with Python + Pillow; no game changes.

All geometry is painted on an integer logical grid and enlarged exactly 4x.
The generators preserve button canvas/anchor alignment across every state.
"""
from pathlib import Path
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'ui'
SCALE = 4
THEMES = {
    'royal_obsidian': dict(shadow='#130e22', edge='#513248', rim='#b48a4e', light='#ffe6a0', body='#30233f', body2='#3f2b53', accent='#bd85f6', dim='#68536e'),
    'moss_stone': dict(shadow='#111e20', edge='#344543', rim='#8eaa7c', light='#e0e3b0', body='#394d48', body2='#4f6559', accent='#b6d981', dim='#68766b'),
    'brass_clockwork': dict(shadow='#142a2d', edge='#684731', rim='#c18b4b', light='#ffe0a2', body='#244d51', body2='#316267', accent='#7de2d0', dim='#6f8178'),
    'ice_crystal': dict(shadow='#11243a', edge='#295878', rim='#7abacc', light='#ddffff', body='#244764', body2='#315e80', accent='#a3e7ff', dim='#617b91'),
}
CATALOG = []

def plate(draw, box, color, cut=4):
    x,y,x2,y2=box
    draw.polygon([(x+cut,y),(x2-cut,y),(x2,y+cut),(x2,y2-cut),(x2-cut,y2),(x+cut,y2),(x,y2-cut),(x,y+cut)], fill=color)

def diamond(draw,x,y,r,color):
    draw.polygon([(x,y-r),(x+r,y),(x,y+r),(x-r,y)], fill=color)

def motif(draw, theme, x, y, pal, scale=1):
    a,light,rim=pal['accent'],pal['light'],pal['rim']
    if theme=='royal_obsidian':
        draw.polygon([(x-5,y-3),(x-3,y),(x,y-5),(x+3,y),(x+5,y-3),(x+4,y+3),(x-4,y+3)], fill=rim)
        draw.line([(x-3,y+4),(x+3,y+4)],fill=light)
        diamond(draw,x,y,1,a)
    elif theme=='moss_stone':
        draw.line([(x-4,y+5),(x+3,y-4)],fill=rim,width=2)
        draw.polygon([(x-4,y),(x-5,y-4),(x-1,y-3),(x+1,y)],fill=a)
        draw.polygon([(x,y+3),(x+4,y-1),(x+5,y+2),(x+2,y+4)],fill=light)
    elif theme=='brass_clockwork':
        draw.rectangle((x-4,y-4,x+4,y+4),fill=rim)
        for b in [(x-1,y-6,x+1,y+6),(x-6,y-1,x+6,y+1)]:draw.rectangle(b,fill=rim)
        draw.rectangle((x-2,y-2,x+2,y+2),fill=pal['shadow'])
        draw.point((x-3,y-3),fill=light)
        draw.rectangle((x,y-1,x+1,y+1),fill=a)
    else:
        draw.polygon([(x,y-6),(x+4,y-1),(x+3,y+4),(x,y+6),(x-4,y+1),(x-3,y-4)],fill=rim)
        draw.polygon([(x,y-5),(x,y+4),(x-2,y),(x-2,y-2)],fill=light)
        draw.polygon([(x+1,y-3),(x+3,y),(x+1,y+3)],fill=a)

def palette(theme, state):
    p=THEMES[theme].copy()
    if state=='hover':p['body'],p['body2']=p['body2'],p['edge'];p['rim']=p['light']
    if state=='disabled':
        def muted(h):
            rgb=tuple(int(h[i:i+2],16) for i in (1,3,5));mid=sum(rgb)//3
            return tuple(int(v*.28+mid*.50) for v in rgb)+(255,)
        p={k:muted(v) for k,v in p.items()}
    return p

def save(im, theme, category, variant, state=None, **info):
    folder=OUT/theme/category;folder.mkdir(parents=True,exist_ok=True)
    name=variant+(f'__{state}' if state else '')+'.png'
    target=folder/name
    im.resize((im.width*SCALE,im.height*SCALE),Image.Resampling.NEAREST).save(target)
    CATALOG.append(dict(path=target.relative_to(ROOT).as_posix(),theme=theme,category=category,variant=variant,state=state,
        logical_size=list(im.size),pixel_size=[im.width*SCALE,im.height*SCALE],scale=SCALE,**info))

def button(theme,variant,state):
    w,h=112,36
    im=Image.new('RGBA',(w,h));d=ImageDraw.Draw(im);p=palette(theme,state)
    off=2 if state=='pressed' else 0
    x0,x1=(3,108) if variant!='compact' else (17,94)
    cut=3 if variant=='compact' else 6
    plate(d,(x0,5,x1,32),p['shadow'],cut)
    plate(d,(x0,2+off,x1,28+off),p['edge'],cut)
    plate(d,(x0+1,2+off,x1-1,27+off),p['rim'],cut)
    plate(d,(x0+3,5+off,x1-3,25+off),p['body'],max(1,cut-2))
    # A quiet inset makes blank labels usable without decorative collisions.
    d.line((x0+cut+1,6+off,x1-cut-1,6+off),fill=p['body2'])
    d.line((x0+cut,3+off,x1-cut,3+off),fill=p['light'])
    d.line((x0+cut+2,26+off,x1-cut-2,26+off),fill=p['edge'])
    if variant=='ornate':
        for x in [x0+9,x1-9]:motif(d,theme,x,15+off,p)
        safe=[23,9+off,88,22+off]
    elif variant=='ribbon':
        for x,s in [(x0+6,1),(x1-6,-1)]:
            d.line([(x,10+off),(x+3*s,13+off),(x,16+off)],fill=p['accent'])
            d.line([(x,15+off),(x+3*s,18+off),(x,21+off)],fill=p['rim'])
        safe=[18,9+off,93,22+off]
    else:
        for x in [x0+5,x1-5]:d.rectangle((x,14+off,x+1,16+off),fill=p['accent'])
        safe=[28,9+off,83,22+off]
    if state=='hover':
        for x in [x0+cut+1,x1-cut-1]:diamond(d,x,2+off,1,p['light'])
        d.line((x0+cut+3,29,x1-cut-3,29),fill=p['accent'])
    save(im,theme,'buttons',variant,state,label_safe_rect=safe,anchor_logical=[56,18],
         suggested_nine_slice_logical=[23,9,23,10],note='Blank button. State canvases align; pressed face shifts down 2 logical pixels. Horizontal extension recommended; preserve decorated ends.')

def panel(theme,variant):
    w,h={'window':(112,80),'wide':(144,56),'card':(72,100)}[variant]
    im=Image.new('RGBA',(w,h));d=ImageDraw.Draw(im);p=THEMES[theme]
    plate(d,(2,4,w-3,h-2),p['shadow'],7)
    plate(d,(2,2,w-3,h-5),p['edge'],7)
    plate(d,(3,2,w-4,h-6),p['rim'],6)
    plate(d,(5,4,w-6,h-8),p['body'],5)
    plate(d,(7,6,w-8,h-10),p['edge'],3)
    plate(d,(9,8,w-10,h-12),(0,0,0,0),2)
    d.line((11,3,w-12,3),fill=p['light'])
    for x,y in [(7,7),(w-8,7),(7,h-10),(w-8,h-10)]:
        diamond(d,x,y,3,p['rim']);diamond(d,x,y,1,p['light'])
    for x in [w//2-12,w//2+12]:d.rectangle((x-1,2,x+1,4),fill=p['accent'])
    # Top and bottom material identity ornaments stay inside the frame band.
    diamond(d,w//2,4,3,p['shadow']);diamond(d,w//2,3,2,p['accent']);d.point((w//2,2),fill=p['light'])
    for x in range(15,w-15,9):d.point((x,h-7),fill=p['body2'])
    save(im,theme,'frames',variant,center_cutout=True,content_safe_rect=[12,11,w-13,h-15],suggested_nine_slice_logical=[16,12,16,16],
         note='Transparent central opening. Add your own fill behind frame. Nine-slice stretches top ornament; preserve by drawing ornament separately or use supplied native aspect ratio.')

def toggle(theme,state):
    im=Image.new('RGBA',(48,24));d=ImageDraw.Draw(im);p=THEMES[theme]
    plate(d,(2,5,45,20),p['shadow'],5)
    plate(d,(2,3,45,18),p['rim'],5)
    plate(d,(4,5,43,16),p['edge'],3)
    plate(d,(5,6,42,15),p['body'],2)
    x=29 if state=='on' else 5
    if state=='on':
        d.line((10,11,13,14),fill=p['accent'],width=2);d.line((13,14,19,8),fill=p['accent'],width=2)
    else:
        d.line((31,8,37,14),fill=p['dim']);d.line((37,8,31,14),fill=p['dim'])
    plate(d,(x,3,x+14,18),p['shadow'],3)
    plate(d,(x,2,x+14,16),p['rim'],3)
    plate(d,(x+2,4,x+12,14),p['body2'],2)
    d.line((x+3,3,x+11,3),fill=p['light'])
    for xx in [x+5,x+8]:d.line((xx,7,xx,11),fill=p['light'])
    save(im,theme,'toggles','slide',state,anchor_logical=[24,12],note='Standalone paired toggle states. Fixed 48 × 24 logical canvas.')

def badge(theme,variant):
    im=Image.new('RGBA',(28,32));d=ImageDraw.Draw(im);p=THEMES[theme]
    if variant=='shield':
        pts=[(4,4),(23,4),(24,7),(23,21),(14,28),(5,21),(3,7)]
        d.polygon([(x,y+2) for x,y in pts],fill=p['shadow']);d.polygon(pts,fill=p['rim'])
        d.polygon([(6,6),(21,6),(21,20),(14,25),(7,20)],fill=p['body'])
        d.line([(5,7),(6,5),(21,5)],fill=p['light'])
    elif variant=='diamond':
        diamond(d,14,17,13,p['shadow']);diamond(d,14,15,12,p['rim']);diamond(d,14,15,9,p['body'])
        d.line([(4,14),(14,4),(21,11)],fill=p['light'])
    elif variant=='seal':
        d.polygon([(6,20),(5,29),(10,26),(13,29),(14,20)],fill=p['edge'])
        d.polygon([(14,20),(15,29),(18,26),(23,29),(21,19)],fill=p['rim'])
        plate(d,(3,3,24,24),p['shadow'],6);plate(d,(3,2,24,22),p['rim'],6);plate(d,(6,5,21,19),p['body'],4)
        d.line((9,3,18,3),fill=p['light'])
    else:
        plate(d,(2,7,25,25),p['shadow'],4);plate(d,(2,5,25,23),p['rim'],4);plate(d,(5,8,22,20),p['body'],2)
        d.line((7,6,20,6),fill=p['light'])
        d.rectangle((10,2,17,5),fill=p['edge']);d.line((11,2,16,2),fill=p['rim'])
    motif(d,theme,14,13 if variant=='seal' else 14,p)
    save(im,theme,'badges',variant,note='Decorative material insignia. No labels baked in.')

def main():
    for theme in THEMES:
        for variant in ['ornate','ribbon','compact']:
            for state in ['normal','hover','pressed','disabled']:button(theme,variant,state)
        for variant in ['window','wide','card']:panel(theme,variant)
        for state in ['off','on']:toggle(theme,state)
        for variant in ['shield','diamond','seal','tab']:badge(theme,variant)
    meta=dict(collection='Transparent pixel UI material studies',version=1,asset_count=len(CATALOG),
        authoring='Original Python/Pillow pixel geometry; no external source art',alpha='RGBA; only 0 or 255 alpha; nearest-neighbor scaling',
        integration_status='Candidates only. No runtime references or game integration.',coordinate_convention='All rects and slice insets are logical pixels, inclusive rect bounds. Multiply by 4 for exported pixels.',
        assets=CATALOG)
    (ROOT/'metadata').mkdir(exist_ok=True)
    (ROOT/'metadata'/'ui.json').write_text(json.dumps(meta,indent=2)+'\n')
    # Transparent, contact-sheet preview (not an individual asset candidate).
    sheet=Image.new('RGBA',(1440,1440));sd=ImageDraw.Draw(sheet)
    for row,theme in enumerate(THEMES):
        y=row*360
        sd.text((20,y+10),theme.replace('_',' ').upper(),fill=THEMES[theme]['light'],font_size=20)
        for i,entry in enumerate(e for e in CATALOG if e['theme']==theme and e['category']=='buttons'):
            tile=Image.open(ROOT/entry['path']).resize((224,72),Image.Resampling.NEAREST)
            x=20+(i%4)*244;yy=y+46+(i//4)*82;sheet.alpha_composite(tile,(x,yy))
        for i,entry in enumerate(e for e in CATALOG if e['theme']==theme and e['category']=='badges'):
            sheet.alpha_composite(Image.open(ROOT/entry['path']).resize((56,64),Image.Resampling.NEAREST),(1016+i*74,y+56))
        for i,entry in enumerate(e for e in CATALOG if e['theme']==theme and e['category']=='toggles'):
            sheet.alpha_composite(Image.open(ROOT/entry['path']).resize((96,48),Image.Resampling.NEAREST),(1020+i*120,y+148))
        entry=next(e for e in CATALOG if e['theme']==theme and e['category']=='frames' and e['variant']=='wide')
        sheet.alpha_composite(Image.open(ROOT/entry['path']).resize((288,112),Image.Resampling.NEAREST),(1010,y+214))
    sheet.save(OUT/'_preview.png')
    print(f'Created {len(CATALOG)} assets and transparent contact sheet')

if __name__=='__main__':main()
