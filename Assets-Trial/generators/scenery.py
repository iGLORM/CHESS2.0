"""Original transparent pixel scenery studies. Run with Python + Pillow.

Each scene uses three 320 x 180 canvases, enlarged 4x without smoothing.
No source game assets are read. No game files are changed.
"""
from pathlib import Path
import json
import math
import random
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'backgrounds'
W, H = 320, 180
SCALE = 4
THEMES = {
    'moonlit-ruins': ['#181c32', '#303d59', '#526584', '#92a5b6', '#c4e2d3', '#73ac9c'],
    'desert-oracle': ['#35253e', '#714653', '#ba745b', '#e8ab70', '#ffe1a3', '#79bdc0'],
    'clockwork-citadel': ['#242b38', '#424859', '#83634e', '#bc9363', '#f5d494', '#7fbbaf'],
    'crystal-grotto': ['#231d3b', '#443566', '#735593', '#a986ca', '#e9c9ff', '#73d8d1'],
    'woodland-sanctum': ['#172c31', '#2c4a49', '#547263', '#8ba783', '#e0d9a3', '#7ebcad'],
    'astral-observatory': ['#1c203f', '#393e6c', '#646b9b', '#999bd0', '#e4d9f4', '#e4b86e'],
}
items = []

def canvas():
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)

def rect(d, box, c): d.rectangle(tuple(map(int, box)), fill=c)
def poly(d, points, c): d.polygon([(int(x), int(y)) for x, y in points], fill=c)
def line(d, pts, c, width=1): d.line([(int(x), int(y)) for x, y in pts], fill=c, width=width)

def arch(d, x, y, w, h, c):
    # Stepped rather than anti-aliased arch, with deliberately readable pixel edges.
    rect(d, (x, y+4, x+w, y+h), c)
    rect(d, (x+2, y+2, x+w-2, y+4), c)
    inset=min(4,w//3)
    rect(d, (x+inset, y, x+w-inset, y+3), c)

def sparkle(d, x, y, c, r=2):
    line(d, [(x-r, y), (x+r, y)], c)
    line(d, [(x, y-r), (x, y+r)], c)

def tower(d, x, base, w, height, p, rng, ruined=False):
    y = base-height
    rect(d, (x,y,x+w,base), p[1]); rect(d, (x+2,y+2,x+w-3,base), p[2])
    rect(d, (x+w-5,y+3,x+w,base), p[0])
    rect(d, (x-2,y-3,x+w+2,y+1), p[3])
    for a in range(x, x+w, 7):
        rect(d, (a,y-7,a+3,y-3),p[2]); rect(d,(a,y-7,a+3,y-6),p[3])
    for row in range(y+9,base-3,9):
        line(d,[(x+2,row),(x+w-5,row)],p[1])
        off = 4 if row%2 else 0
        for a in range(x+5+off,x+w-5,9): line(d,[(a,row-7),(a,row)],p[1])
    for wy in range(y+11,base-9,20):
        arch(d,x+w//2-3,wy,6,10,p[0])
        rect(d,(x+w//2-1,wy+3,x+w//2,wy+8),p[4] if not ruined else p[1])
    if ruined:
        line(d,[(x+4,y+3),(x+7,y+10),(x+5,y+15),(x+9,y+21)],p[0])

def crystal(d, x, b, h, w, p):
    poly(d,[(x-w//2,b-5),(x-w//2,b-h+7),(x,b-h),(x+w//2,b-h+8),(x+w//2,b-3),(x,b)],p[2])
    poly(d,[(x,b-h),(x+w//2,b-h+8),(x+w//2,b-3),(x,b)],p[3])
    poly(d,[(x-w//2,b-h+7),(x,b-h),(x,b),(x-2,b-8)],p[1])
    line(d,[(x,b-h+2),(x+w//2-2,b-h+9),(x+w//2-2,b-8)],p[4])
    line(d,[(x,b-h+2),(x,b-5)],p[5])

def tree(d, x, b, h, p, rng, leaves=True):
    poly(d,[(x-5,b),(x-3,b-h+8),(x+2,b-h),(x+5,b)],p[0])
    line(d,[(x-2,b-3),(x,b-h+11),(x+1,b-h+5)],p[2],2)
    branches=[(-19,-h+12), (22,-h+6), (-13,-h-7), (9,-h-17)]
    for dx,dy in branches:
        line(d,[(x,b-h//2),(x+dx//2,b+dy+8),(x+dx,b+dy)],p[0],4)
        line(d,[(x,b-h//2),(x+dx//2,b+dy+8),(x+dx,b+dy)],p[2],1)
        if leaves:
            cx,cy=x+dx,b+dy
            poly(d,[(cx-16,cy+5),(cx-19,cy-4),(cx-9,cy-8),(cx-8,cy-13),(cx+8,cy-13),(cx+14,cy-6),(cx+20,cy-3),(cx+16,cy+7)],p[1])
            poly(d,[(cx-15,cy-5),(cx-7,cy-8),(cx-6,cy-11),(cx+7,cy-11),(cx+12,cy-5),(cx+2,cy-2)],p[2])
            for _ in range(9):
                a,b2=rng.randint(-12,12),rng.randint(-6,3)
                rect(d,(cx+a,cy+b2,cx+a+2,cy+b2),p[3])

def gear(d, x, y, r, p):
    points=[]
    for n in range(48):
        a=n*math.pi/24
        rr=r if n%4 in (0,1) else r-3
        points.append((x+math.cos(a)*rr,y+math.sin(a)*rr))
    poly(d,points,p[3]); d.ellipse((x-r+4,y-r+4,x+r-4,y+r-4),fill=p[1])
    d.ellipse((x-r+7,y-r+7,x+r-7,y+r-7),fill=p[0])
    for n in range(6):
        a=n*math.pi/3
        line(d,[(x,y),(x+math.cos(a)*(r-6),y+math.sin(a)*(r-6))],p[2],3)
    d.ellipse((x-3,y-3,x+3,y+3),fill=p[4])

def terrain(d,p,rng,y=145,shade=0):
    pts=[(0,H),(0,y)]
    for x in range(0,W+1,8): pts.append((x,y+rng.randint(-5,5)))
    pts.extend([(W,H)])
    poly(d,pts,p[shade]); line(d,pts[1:-1],p[min(shade+1,5)])
    for _ in range(90):
        x, yy=rng.randrange(W),rng.randrange(min(y+7,H-1),H)
        rect(d,(x,yy,x+rng.randrange(2,6),yy),p[min(shade+1,5)])

def moonlit(d,layer,p,rng):
    if layer==0:
        # Shattered viaduct whose openings remain truly transparent.
        for x,h in [(15,47),(72,66),(125,40),(191,57),(259,77)]:
            tower(d,x,145,20,h,p[:2]+[p[1],p[2],p[2],p[5]],rng,True)
        for x in range(35,260,45):
            rect(d,(x,120,x+32,125),p[1])
            poly(d,[(x,125),(x+6,125),(x+6,134),(x+3,134),(x+3,145),(x,145)],p[1])
        for x,y in [(34,50),(238,43),(151,64)]:sparkle(d,x,y,p[3],1)
    elif layer==1:
        terrain(d,p,rng,146,1)
        for x in [43,223]:
            tower(d,x,158,28,63,p,rng,True)
        # Broken gothic arch, with open sky through the doorway.
        rect(d,(74,106,83,159),p[2]);rect(d,(114,105,123,158),p[2])
        poly(d,[(73,107),(77,93),(85,85),(97,79),(105,83),(115,90),(124,104),(115,104),(107,92),(98,88),(88,94),(82,108)],p[2])
        line(d,[(76,102),(82,92),(98,83),(111,91),(119,101)],p[3],2)
        for x in (76,117): rect(d,(x,112,x+2,149),p[3])
        for x,y in [(90,148),(133,151),(178,146)]:
            poly(d,[(x,y),(x+11,y-4),(x+19,y+2),(x+16,y+7),(x-3,y+7)],p[2])
            line(d,[(x,y),(x+11,y-3),(x+18,y+2)],p[3])
        tree(d,291,162,66,p,rng,False)
    else:
        terrain(d,p,rng,173,0)
        for x in (9,28,186,202,273,310):
            line(d,[(x,178),(x-3,162),(x-8,158)],p[2])
            line(d,[(x-2,168),(x+4,162)],p[3])
        for x,y in [(36,166),(154,171),(230,169)]:
            rect(d,(x,y-8,x+6,y),p[1]);rect(d,(x+2,y-10,x+4,y-8),p[4]);sparkle(d,x+3,y-11,p[5],1)

def desert(d,layer,p,rng):
    if layer==0:
        for x,b,w,h in [(12,145,93,48),(172,144,110,61)]:
            poly(d,[(x,b),(x+w//2,b-h),(x+w,b)],p[1]);poly(d,[(x+w//2,b-h),(x+w,b),(x+w//2+13,b)],p[2])
            for yy in range(b-h+11,b,10):
                half=(yy-(b-h))*w//(2*h)
                line(d,[(x+w//2-half,yy),(x+w//2+half,yy)],p[0])
        for x in (141,295):
            poly(d,[(x,147),(x+2,83),(x+6,73),(x+10,83),(x+12,147)],p[1]);line(d,[(x+6,77),(x+6,140)],p[2])
    elif layer==1:
        terrain(d,p,rng,147,1)
        # Oracle gateway and a floating sun disc with transparent centre.
        for x in (52,107):
            rect(d,(x,102,x+13,157),p[2]);rect(d,(x+2,103,x+4,153),p[3])
            rect(d,(x-3,96,x+16,104),p[3]);rect(d,(x-4,151,x+17,158),p[3])
            for yy in range(112,146,7):rect(d,(x+8,yy,x+10,yy+2),p[0])
        rect(d,(48,91,124,97),p[2]);rect(d,(52,89,120,91),p[4])
        d.ellipse((76,59,96,79),outline=p[3],width=3);sparkle(d,86,69,p[4],3)
        for n in range(8):
            a=n*math.pi/4
            line(d,[(86+math.cos(a)*15,69+math.sin(a)*15),(86+math.cos(a)*18,69+math.sin(a)*18)],p[4])
        for x,h in [(219,51),(242,71)]:
            rect(d,(x,156-h,x+12,156),p[2]);poly(d,[(x,156-h),(x+6,147-h),(x+12,156-h)],p[3])
            line(d,[(x+3,160-h),(x+3,149)],p[3]);sparkle(d,x+7,173-h,p[5],2)
    else:
        terrain(d,p,rng,172,0)
        for x,y in [(13,165),(148,170),(288,169)]:
            poly(d,[(x,y),(x-3,y-12),(x+1,y-18),(x+5,y-12),(x+4,y-7),(x+9,y-7),(x+10,y-15),(x+14,y-15),(x+14,y-4),(x+7,y-2),(x+7,y)],p[1])
            line(d,[(x+1,y-14),(x+2,y-3)],p[3])
        for x in (40,180,261):
            poly(d,[(x,175),(x+2,167),(x+13,164),(x+18,168),(x+16,175)],p[2]);line(d,[(x+3,166),(x+12,165)],p[3])

def clockwork(d,layer,p,rng):
    if layer==0:
        for x,h,w in [(6,61,31),(46,44,27),(93,83,30),(144,54,41),(207,74,27),(260,49,44)]:
            rect(d,(x,148-h,x+w,149),p[1]);poly(d,[(x-3,149-h),(x+w//2,139-h),(x+w+3,149-h)],p[2])
            for a in range(x+6,x+w-3,9):
                for b in range(159-h,143,13):rect(d,(a,b,a+2,b+4),p[2])
            rect(d,(x+4,136-h,x+8,148-h),p[1])
        for x,y in [(18,71),(113,43),(223,54)]:
            for i in range(3):rect(d,(x+i*3,y-i*7,x+6+i*3,y+3-i*7),p[1])
    elif layer==1:
        terrain(d,p,rng,150,1)
        rect(d,(64,69,106,158),p[2]);rect(d,(66,71,70,155),p[3]);rect(d,(99,71,106,158),p[0])
        poly(d,[(58,71),(85,45),(112,71)],p[1]);line(d,[(60,69),(85,46),(110,69)],p[3],2)
        gear(d,85,90,16,p);line(d,[(85,90),(85,81)],p[4]);line(d,[(85,90),(92,94)],p[4])
        arch(d,77,128,15,30,p[0]);rect(d,(79,133,81,154),p[3])
        for x in (60,108):
            line(d,[(x,154),(x,112),(x+7,112)],p[3],3)
        gear(d,237,120,28,p);gear(d,274,139,18,p)
        rect(d,(205,152,301,158),p[2]);rect(d,(210,151,298,152),p[4])
        for x in range(136,190,14):
            rect(d,(x,130,x+3,157),p[3]);rect(d,(x+1,126,x+5,130),p[4])
        line(d,[(136,139),(192,139)],p[3],2)
    else:
        terrain(d,p,rng,172,0)
        for x in (4,117,299):gear(d,x,176,15,p)
        line(d,[(31,179),(31,164),(52,164),(52,158),(97,158),(97,179)],p[2],4)
        line(d,[(32,175),(32,163),(53,163),(53,157),(94,157)],p[3])
        for x in (164,217,260):
            rect(d,(x,155,x+3,177),p[1]);rect(d,(x-3,153,x+6,164),p[3]);rect(d,(x-1,155,x+4,161),p[4])

def grotto(d,layer,p,rng):
    if layer==0:
        for x,h,w in [(21,57,21),(55,87,30),(95,42,18),(170,66,32),(217,47,23),(275,96,28)]:
            crystal(d,x,151,h,w,p[:2]+[p[1],p[2],p[3],p[2]])
        for _ in range(18):
            x,y=rng.randrange(18,302),rng.randrange(41,131)
            rect(d,(x,y,x,y),p[3])
    elif layer==1:
        terrain(d,p,rng,153,1)
        for x,h,w in [(23,36,16),(40,57,23),(64,31,18),(212,60,25),(240,86,29),(267,42,22)]:crystal(d,x,160,h,w,p)
        # Faceted floating shrine, suspended over a reflective pool.
        poly(d,[(115,111),(133,105),(155,110),(162,119),(138,145),(110,120)],p[1])
        poly(d,[(110,120),(138,122),(138,145)],p[2]);poly(d,[(138,122),(162,119),(138,145)],p[0])
        poly(d,[(110,114),(133,108),(159,113),(162,119),(136,123),(110,120)],p[3])
        crystal(d,136,111,39,18,p)
        for yy,xx in [(153,119),(159,109),(165,127)]:line(d,[(xx,yy),(xx+39,yy)],p[5])
        for x,y in [(126,70),(170,99),(286,86),(89,126)]:sparkle(d,x,y,p[4],2)
    else:
        terrain(d,p,rng,175,0)
        for x in (3,75,185,306):
            crystal(d,x,180,22,12,p);crystal(d,x+9,180,14,9,p)
        for x,y in [(103,173),(163,170),(285,168)]:
            line(d,[(x,y),(x,y-9)],p[3],2)
            poly(d,[(x-6,y-7),(x-4,y-11),(x+3,y-12),(x+6,y-7)],p[5])
            rect(d,(x-4,y-8,x+4,y-7),p[4])

def woodland(d,layer,p,rng):
    if layer==0:
        for x,h in [(20,56),(57,85),(108,64),(185,73),(227,58),(282,91)]:
            tree(d,x,149,h,[p[0],p[1],p[1],p[2],p[3],p[5]],rng)
    elif layer==1:
        terrain(d,p,rng,155,1)
        for x in (31,277):tree(d,x,160,70,p,rng)
        for x in (116,177):
            poly(d,[(x,159),(x+2,101),(x+7,89),(x+17,94),(x+19,159)],p[2])
            line(d,[(x+4,148),(x+5,103),(x+8,94)],p[3],2)
            sparkle(d,x+10,118,p[5],3)
            for yy in (127,135,142):rect(d,(x+8,yy,x+12,yy+1),p[0])
        poly(d,[(111,99),(120,87),(187,86),(199,98),(193,103),(119,105)],p[2])
        line(d,[(117,96),(125,91),(185,90),(192,96)],p[3],2)
        for x in range(120,191,8):
            line(d,[(x,94),(x-2,105),(x+1,113)],p[1],2)
            rect(d,(x-2,104,x+2,106),p[3])
        # Small altar visible in the open arch.
        rect(d,(143,144,166,151),p[3]);rect(d,(147,151,162,158),p[2]);sparkle(d,154,134,p[4],3)
        for x,y in [(76,127),(209,103),(165,63)]:sparkle(d,x,y,p[4],1)
    else:
        terrain(d,p,rng,175,0)
        for x in (9,44,91,228,289,311):
            for dx in (-8,-4,0,4,8):
                line(d,[(x,179),(x+dx,165-abs(dx)//2)],p[2])
                rect(d,(x+dx-2,166-abs(dx)//2,x+dx+1,168-abs(dx)//2),p[3])
        for x,y in [(128,173),(198,175),(258,169)]:
            rect(d,(x,y-7,x+2,y),p[3]);poly(d,[(x-5,y-7),(x-3,y-11),(x+4,y-11),(x+7,y-7)],p[4])
            rect(d,(x,y-10,x+1,y-9),p[2])

def astral(d,layer,p,rng):
    if layer==0:
        for x,h,w in [(14,47,27),(62,78,28),(215,61,34),(278,85,27)]:
            rect(d,(x,150-h,x+w,150),p[1]);d.pieslice((x-2,135-h,x+w+2,165-h),180,360,fill=p[2])
            line(d,[(x+w//2,137-h),(x+w//2,127-h)],p[3]);sparkle(d,x+w//2,125-h,p[3],2)
            for yy in range(161-h,147,17):arch(d,x+w//2-3,yy,6,9,p[0])
        for a,b in [((120,42),(143,30)),((143,30),(166,47)),((166,47),(157,70))]:line(d,[a,b],p[1])
        for x,y in [(120,42),(143,30),(166,47),(157,70)]:sparkle(d,x,y,p[3],2)
    elif layer==1:
        terrain(d,p,rng,155,1)
        # Observatory with a brass slit in a stepped dome.
        rect(d,(54,107,118,157),p[2]);rect(d,(59,111,63,153),p[3]);rect(d,(110,111,118,157),p[1])
        d.pieslice((51,72,121,142),180,360,fill=p[1]);d.arc((53,74,119,140),182,358,fill=p[3],width=2)
        poly(d,[(80,75),(88,74),(98,108),(89,108)],p[5]);line(d,[(81,76),(90,106)],p[4])
        rect(d,(49,106,123,111),p[3]);rect(d,(51,107,121,108),p[4])
        arch(d,78,132,15,26,p[0]);arch(d,96,120,8,13,p[0]);rect(d,(99,123,101,130),p[5])
        # Orrery: concentric rings, planet and supporting tripod.
        line(d,[(235,131),(220,156)],p[5],3);line(d,[(235,131),(249,156)],p[5],3)
        d.ellipse((207,77,263,132),outline=p[5],width=2)
        d.ellipse((198,96,272,113),outline=p[3],width=2)
        d.ellipse((224,71,246,138),outline=p[3],width=2)
        d.ellipse((227,96,243,112),fill=p[2]);d.arc((228,97,242,111),100,280,fill=p[4],width=2)
        d.ellipse((257,93,263,99),fill=p[4]);d.ellipse((217,125,221,129),fill=p[5])
        sparkle(d,235,104,p[4],2)
    else:
        terrain(d,p,rng,174,0)
        for x in (9,154,290):
            rect(d,(x,157,x+12,177),p[1]);rect(d,(x-2,154,x+14,158),p[3]);rect(d,(x+1,159,x+3,175),p[2])
            sparkle(d,x+6,148,p[5],2)
        for x in (57,104,220,263):
            line(d,[(x,177),(x+5,166),(x+9,177)],p[3]);line(d,[(x+2,174),(x+7,174)],p[5])

SCENES={'moonlit-ruins':moonlit,'desert-oracle':desert,'clockwork-citadel':clockwork,'crystal-grotto':grotto,'woodland-sanctum':woodland,'astral-observatory':astral}
PROP_NAMES={
    'moonlit-ruins':('broken-watchtower','moonstone-shrine'),
    'desert-oracle':('rune-obelisk','ceremonial-urn'),
    'clockwork-citadel':('brass-gear-pedestal','steam-engine'),
    'crystal-grotto':('amethyst-cluster','levitating-crystal'),
    'woodland-sanctum':('luminous-mushrooms','forest-runestone'),
    'astral-observatory':('brass-armillary','stargazer-telescope'),
}

def save(im, relative, theme, category, **extra):
    path=OUT/relative
    path.parent.mkdir(parents=True,exist_ok=True)
    im.resize((im.width*SCALE,im.height*SCALE),Image.Resampling.NEAREST).save(path)
    items.append({'file':str(path.relative_to(ROOT)), 'theme':theme,'category':category,'logical_resolution':list(im.size),'resolution':[im.width*SCALE,im.height*SCALE],'transparent':True,**extra})

def prop(theme,idx):
    p=THEMES[theme];rng=random.Random(theme+str(idx));im=Image.new('RGBA',(64,64));d=ImageDraw.Draw(im)
    if theme=='moonlit-ruins':
        if idx==0:
            tower(d,21,55,22,39,p,rng,True)
            for x in (20,27,43):line(d,[(x,47),(x-2,54),(x+2,57)],p[5],2)
        else:
            poly(d,[(18,56),(23,46),(23,23),(26,18),(39,18),(42,23),(42,46),(48,56)],p[1]);rect(d,(27,24,38,45),p[2])
            arch(d,28,24,9,16,p[0]);sparkle(d,32,31,p[5],3);rect(d,(21,48,44,51),p[3])
    elif theme=='desert-oracle':
        if idx==0:
            poly(d,[(21,54),(24,19),(32,8),(40,19),(43,54)],p[2]);poly(d,[(32,8),(40,19),(43,54),(32,54)],p[1]);line(d,[(28,20),(27,49)],p[3],2)
            for y in (25,35,44):sparkle(d,33,y,p[5],2)
            rect(d,(18,54,46,58),p[3])
        else:
            poly(d,[(21,21),(44,21),(46,33),(41,50),(36,55),(28,55),(21,49),(18,33)],p[2]);rect(d,(23,17,42,22),p[3]);rect(d,(25,15,40,17),p[1]);line(d,[(23,28),(23,43),(28,49)],p[3],2)
            rect(d,(19,32,44,35),p[5]);sparkle(d,32,42,p[4],3)
    elif theme=='clockwork-citadel':
        if idx==0:
            gear(d,32,30,22,p);rect(d,(25,49,38,53),p[2]);rect(d,(19,54,45,58),p[3])
        else:
            rect(d,(15,24,46,52),p[2]);rect(d,(18,26,21,48),p[3]);rect(d,(15,51,48,56),p[0]);rect(d,(39,16,44,25),p[3]);rect(d,(36,13,47,17),p[2]);gear(d,33,37,11,p)
            line(d,[(14,33),(9,33),(9,47),(15,47)],p[3],3);rect(d,(24,18,32,23),p[5])
    elif theme=='crystal-grotto':
        if idx==0:
            crystal(d,23,55,31,15,p);crystal(d,35,56,47,17,p);crystal(d,46,56,23,13,p);sparkle(d,13,25,p[4],2)
        else:
            poly(d,[(15,48),(27,42),(45,44),(49,50),(32,58),(17,54)],p[1]);line(d,[(17,48),(29,45),(44,46)],p[3]);crystal(d,32,40,27,18,p)
            sparkle(d,48,28,p[5],2);sparkle(d,17,18,p[4],2)
    elif theme=='woodland-sanctum':
        if idx==0:
            rect(d,(28,28,33,56),p[2]);poly(d,[(12,32),(15,22),(25,16),(38,16),(49,24),(52,32)],p[5]);rect(d,(14,31,50,33),p[3]);rect(d,(22,21,26,23),p[4]);rect(d,(37,24,40,27),p[4]);line(d,[(31,39),(31,52)],p[3])
            rect(d,(42,42,45,57),p[2]);poly(d,[(34,44),(37,37),(46,35),(53,43)],p[3])
        else:
            poly(d,[(20,56),(18,20),(26,12),(40,15),(45,26),(43,56)],p[1]);poly(d,[(21,23),(28,16),(37,18),(39,52),(23,53)],p[2]);sparkle(d,31,31,p[5],5)
            for x,y in [(19,23),(40,18),(20,48),(40,49)]:rect(d,(x,y,x+5,y+3),p[3])
    else:
        if idx==0:
            d.ellipse((12,10,52,50),outline=p[5],width=2);d.ellipse((8,24,56,38),outline=p[3],width=2);d.ellipse((25,7,39,53),outline=p[3],width=2)
            d.ellipse((26,24,38,36),fill=p[2]);sparkle(d,32,30,p[4],3);rect(d,(30,50,34,55),p[5]);rect(d,(23,56,41,58),p[3])
        else:
            line(d,[(31,35),(17,57)],p[3],3);line(d,[(31,35),(43,57)],p[3],3);line(d,[(31,35),(31,57)],p[2],3)
            poly(d,[(16,32),(43,14),(49,22),(22,40)],p[2]);poly(d,[(42,12),(47,10),(54,20),(49,24)],p[5]);line(d,[(20,31),(42,16)],p[3],2);poly(d,[(15,32),(20,29),(25,37),(20,41)],p[5])
    return im

def main():
    for theme, fn in SCENES.items():
        for layer,name in enumerate(('01-distant','02-midground','03-foreground')):
            im,d=canvas();fn(d,layer,THEMES[theme],random.Random(theme+str(layer)))
            save(im,Path(theme)/(name+'.png'),theme,'background-layer',layer_order=layer+1,alignment='top-left; all three canvases share one origin')
        for idx,name in enumerate(PROP_NAMES[theme]):save(prop(theme,idx),Path(theme)/'props'/f'{name}.png',theme,'scenery-prop',name=name)
    metadata={'collection':'Transparent scenery studies','generator':'generators/scenery.py','seed':'stable theme and layer names','style':'original hand-authored raster pixel art','alpha':'RGBA; transparent sky and negative space; no baked checkerboard','layer_order':'distant → midground → foreground','items':items}
    (ROOT/'metadata').mkdir(parents=True,exist_ok=True)
    (ROOT/'metadata'/'scenery.json').write_text(json.dumps(metadata,indent=2)+'\n')
    print(f'Wrote {len(items)} transparent scenery candidates')

if __name__=='__main__':main()
