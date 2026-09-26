"""Original code-drawn pixel candidates; Python 3 + Pillow. No game dependencies."""
from pathlib import Path
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SCALE = 4
PALETTES = {
    'royal_gold': ['#17152c', '#423150', '#956048', '#d6a45c', '#ffe2a0', '#fff8d9'],
    'lunar_crystal': ['#121d37', '#283966', '#386f95', '#62bbc6', '#b0f4e1', '#f1fff1'],
    'ember_copper': ['#291927', '#633044', '#a84e46', '#e78c55', '#ffcf88', '#fff0c5'],
}
FONT = {
 'C':['01111','11000','11000','11000','11000','11000','01111'],
 'H':['11011','11011','11011','11111','11011','11011','11011'],
 'E':['11111','11000','11000','11110','11000','11000','11111'],
 'S':['01111','11000','11000','01110','00011','00011','11110'],
 '2':['01110','11011','00011','00110','01100','11000','11111'],
 '0':['01110','11011','11011','11011','11011','11011','01110'],
 '.':['0','0','0','0','0','1','1'],
 ' ':['00']*7,
}
records=[]

def save(im, folder, name, **meta):
    path=ROOT/folder/(name+'.png'); path.parent.mkdir(parents=True,exist_ok=True)
    im.resize((im.width*SCALE,im.height*SCALE),Image.Resampling.NEAREST).save(path)
    records.append({'path':path.relative_to(ROOT).as_posix(),'logical_size':list(im.size),'scale':SCALE,'source':'code-drawn','generator':'generators/marks.py',**meta})

def star(d,x,y,r,c):
    d.polygon([(x,y-r),(x+2,y-2),(x+r,y),(x+2,y+2),(x,y+r),(x-2,y+2),(x-r,y),(x-2,y-2)],fill=c)

def icon(kind,p):
    im=Image.new('RGBA',(32,32)); d=ImageDraw.Draw(im); dark,shade,mid,base,light,shine=p
    if kind in ('crown','rook','pawn','bishop','knight','king'):
        if kind=='crown':
            d.polygon([(5,9),(11,14),(16,5),(21,14),(27,9),(24,25),(8,25)],fill=dark)
            d.polygon([(7,12),(12,17),(16,9),(20,17),(25,12),(22,22),(10,22)],fill=base)
            d.rectangle((9,22,23,24),fill=mid); d.line((11,21,22,21),fill=light)
            for x,y in [(6,8),(16,5),(26,8)]: d.rectangle((x-1,y-1,x+1,y+1),fill=shine)
        else:
            d.polygon([(8,26),(8,23),(11,21),(13,16),(12,12),(20,12),(19,16),(21,21),(24,23),(24,26)],fill=dark)
            d.polygon([(11,23),(15,16),(14,12),(18,12),(17,17),(20,23)],fill=base)
            d.rectangle((9,24,23,25),fill=mid); d.line((11,23,21,23),fill=light)
            if kind=='pawn': d.ellipse((11,5,21,15),fill=dark); d.ellipse((13,6,19,12),fill=base); d.rectangle((14,7,16,8),fill=shine)
            if kind=='rook':
                d.rectangle((9,5,23,14),fill=dark); d.rectangle((11,7,21,12),fill=base)
                for x in (13,19): d.rectangle((x,5,x+1,8),fill=(0,0,0,0))
                d.line((11,11,20,11),fill=light)
            if kind=='bishop':
                d.polygon([(16,3),(22,10),(19,15),(12,15),(10,10)],fill=dark)
                d.polygon([(16,5),(20,10),(18,13),(13,13),(12,10)],fill=base)
                d.line((17,6,14,10),fill=dark,width=2); d.point((13,11),fill=shine)
            if kind=='knight':
                d.polygon([(10,20),(12,13),(8,12),(10,8),(15,6),(16,3),(21,7),(23,14),(21,22)],fill=dark)
                d.polygon([(13,20),(16,12),(11,11),(16,8),(17,6),(20,9),(21,15),(19,21)],fill=base)
                d.point((17,9),fill=shine); d.line((21,10,22,16),fill=mid)
            if kind=='king':
                d.rectangle((15,3,17,10),fill=light);d.rectangle((12,5,20,7),fill=light)
                d.polygon([(10,10),(22,10),(20,15),(12,15)],fill=base);d.line((12,11,20,11),fill=shine)
    elif kind=='sword':
        d.polygon([(23,3),(27,4),(26,9),(12,23),(8,19)],fill=dark)
        d.polygon([(23,5),(25,5),(24,9),(12,21),(10,19)],fill=light)
        d.line((24,6,11,19),fill=shine);d.line((9,18,16,25),fill=mid,width=3)
        d.line((10,23,5,28),fill=base,width=3);d.rectangle((4,26,7,28),fill=shine)
    elif kind=='shield':
        d.polygon([(5,5),(16,3),(27,5),(26,20),(22,25),(16,29),(10,25),(6,20)],fill=dark)
        d.polygon([(7,7),(16,5),(25,7),(24,19),(20,23),(16,26),(12,23),(8,19)],fill=base)
        d.polygon([(10,9),(16,7),(22,9),(21,18),(16,23),(11,18)],fill=shade)
        d.rectangle((15,10,17,20),fill=light);d.rectangle((12,13,20,15),fill=light)
    elif kind=='gem':
        d.polygon([(10,3),(22,3),(28,12),(16,29),(4,12)],fill=dark)
        d.polygon([(11,5),(21,5),(25,12),(16,25),(7,12)],fill=base)
        d.polygon([(11,5),(16,5),(13,12),(7,12)],fill=shine)
        d.polygon([(16,5),(21,5),(19,12),(13,12)],fill=light)
        d.polygon([(13,12),(19,12),(16,25)],fill=light)
        d.line((7,12,25,12),fill=mid)
    elif kind=='key':
        d.ellipse((3,3,18,18),fill=dark);d.ellipse((5,5,16,16),fill=base)
        d.ellipse((8,8,13,13),fill=(0,0,0,0));d.line((16,16,27,27),fill=dark,width=6)
        d.line((16,16,26,26),fill=light,width=3);d.line((23,25,20,28),fill=base,width=3)
    elif kind=='hourglass':
        d.rectangle((7,4,25,7),fill=dark);d.rectangle((7,25,25,28),fill=dark)
        d.rectangle((8,4,24,5),fill=light);d.rectangle((8,25,24,27),fill=base)
        d.line([(10,8),(11,12),(16,16),(11,20),(10,24)],fill=light,width=2)
        d.line([(22,8),(21,12),(16,16),(21,20),(22,24)],fill=mid,width=2)
        d.polygon([(12,10),(20,10),(16,14)],fill=base);d.polygon([(16,19),(12,23),(20,23)],fill=base)
        d.point((16,17),fill=shine)
    elif kind=='scroll':
        d.rectangle((8,5,24,25),fill=dark);d.rectangle((10,7,22,24),fill=light)
        d.rectangle((5,4,23,9),fill=base);d.rectangle((8,23,27,28),fill=base)
        d.rectangle((5,5,7,8),fill=shine);d.rectangle((25,24,27,27),fill=shine)
        for y in (12,15,18):d.line((12,y,20 if y<18 else 17,y),fill=mid)
    elif kind=='heart':
        d.polygon([(3,7),(7,4),(12,4),(16,8),(20,4),(25,4),(29,8),(29,15),(16,28),(3,15)],fill=dark)
        d.polygon([(5,8),(8,6),(11,6),(16,11),(21,6),(24,6),(27,9),(27,14),(16,25),(5,14)],fill=base)
        d.line([(7,12),(7,9),(10,8)],fill=shine,width=2);d.line((18,22,25,15),fill=mid,width=2)
    elif kind=='coin':
        d.ellipse((4,3,28,29),fill=dark);d.ellipse((6,4,26,26),fill=base);d.ellipse((9,7,23,23),outline=light,width=2)
        d.line((16,10,16,21),fill=shine,width=2);d.line((13,12,19,12),fill=shine,width=2);d.line((13,19,19,19),fill=mid)
    elif kind=='potion':
        d.rectangle((12,3,20,7),fill=mid);d.rectangle((13,7,19,12),fill=light)
        d.polygon([(12,11),(20,11),(26,18),(26,25),(22,29),(10,29),(6,25),(6,18)],fill=dark)
        d.polygon([(13,12),(19,12),(24,19),(24,24),(21,27),(11,27),(8,24),(8,19)],fill=base)
        d.line((10,19,22,19),fill=shine);d.line((10,20,10,23),fill=light,width=2)
    elif kind=='gear':
        for x,y,w,h in [(13,2,6,28),(2,13,28,6),(5,5,5,5),(22,5,5,5),(5,22,5,5),(22,22,5,5)]:d.rectangle((x,y,x+w-1,y+h-1),fill=base)
        d.ellipse((6,6,26,26),fill=dark);d.ellipse((8,8,24,24),fill=base);d.ellipse((12,12,20,20),fill=shade);d.ellipse((14,14,18,18),fill=(0,0,0,0))
        d.arc((8,8,24,24),190,285,fill=shine,width=2)
    elif kind=='lock':
        d.arc((9,3,23,20),180,360,fill=dark,width=5);d.arc((10,4,22,19),180,360,fill=light,width=2)
        d.rectangle((6,13,26,28),fill=dark);d.rectangle((8,15,24,26),fill=base);d.line((9,15,23,15),fill=shine)
        d.ellipse((14,18,18,22),fill=shade);d.rectangle((15,21,17,24),fill=shade)
    elif kind=='spark':star(d,16,16,14,dark);star(d,16,16,11,base);star(d,16,16,7,light);d.rectangle((15,15,17,17),fill=shine)
    return im

def wordmark(p,style):
    im=Image.new('RGBA',(192,56));d=ImageDraw.Draw(im)
    # Original hand-coded glyphs: no installed font or runtime logo reused.
    mask=Image.new('L',(154,21));md=ImageDraw.Draw(mask);x=0
    for ch in 'CHESS 2.0':
        glyph=FONT[ch]
        for y,row in enumerate(glyph):
            for j,v in enumerate(row):
                if v=='1':md.rectangle((x+j*3,y*3,x+j*3+2,y*3+2),fill=255)
        x+=(len(glyph[0])+1)*3
    x0=(192-x+3)//2;y0=24
    for dy in range(5,0,-1):im.paste(p[0],(x0+dy,y0+dy),mask)
    for dx,dy in [(-1,0),(1,0),(0,-1),(0,1)]:im.paste(p[1],(x0+dx,y0+dy),mask)
    fill=Image.new('RGBA',mask.size);fd=ImageDraw.Draw(fill)
    fd.rectangle((0,0,153,6),fill=p[5]);fd.rectangle((0,7,153,13),fill=p[4]);fd.rectangle((0,14,153,21),fill=p[3])
    im.paste(fill,(x0,y0),mask)
    if style=='crowned':
        d.polygon([(81,6),(88,11),(96,2),(104,11),(111,6),(108,19),(84,19)],fill=p[0])
        d.polygon([(84,9),(89,14),(96,6),(103,14),(108,9),(106,17),(86,17)],fill=p[3]);d.line((87,16,105,16),fill=p[5])
    else:
        d.polygon([(96,2),(107,11),(96,20),(85,11)],fill=p[1]);d.polygon([(96,4),(104,11),(96,18),(88,11)],fill=p[3]);star(d,96,11,5,p[5])
    d.line((27,52,83,52),fill=p[2]);d.line((108,52,163,52),fill=p[2]);star(d,96,52,2,p[4])
    return im

def main():
    for theme,p in PALETTES.items():
        for kind in ['crown','rook','pawn','bishop','knight','king','sword','shield','gem','key','hourglass','scroll','heart','coin','potion','gear','lock','spark']:
            save(icon(kind,p),'icons/'+theme,kind,theme=theme,category='icon')
        for style in ('crowned','diamond'):
            save(wordmark(p,style),'logos/wordmarks',theme+'_'+style,theme=theme,category='wordmark',text='CHESS 2.0')
        for shape in ('crown','rook','knight'):
            im=Image.new('RGBA',(64,64));d=ImageDraw.Draw(im)
            d.polygon([(32,3),(57,16),(57,43),(32,60),(7,43),(7,16)],fill=p[0])
            d.polygon([(32,5),(55,17),(55,42),(32,57),(9,42),(9,17)],outline=p[3],width=2)
            d.polygon([(32,9),(51,19),(51,40),(32,53),(13,40),(13,19)],fill=p[1])
            im.alpha_composite(icon(shape,p),(16,15));star(d,32,48,3,p[4])
            save(im,'logos/emblems',theme+'_'+shape,theme=theme,category='emblem')
        for frame in range(4):
            im=Image.new('RGBA',(64,64));d=ImageDraw.Draw(im)
            import math
            for i in range(8):
                a=i*math.pi/4;r=7+frame*5;x=round(32+math.cos(a)*r);y=round(32+math.sin(a)*r)
                star(d,x,y,max(1,4-frame),p[4 if i%2 else 3])
            if frame<3:star(d,32,32,9-frame*3,p[5])
            save(im,'effects/spark_burst/'+theme,f'frame_{frame:02}',theme=theme,category='effect',frame=frame,frame_duration_ms=90,pivot=[32,32])
    (ROOT/'metadata').mkdir(exist_ok=True)
    (ROOT/'metadata/marks.json').write_text(json.dumps(records,indent=2)+'\n')
    print(f'Created {len(records)} transparent mark/icon/effect candidates')

if __name__=='__main__':main()
