"""Validate PNG alpha and rebuild the self-contained, offline candidate browser."""
from pathlib import Path
from collections import Counter
import hashlib
import json
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1]

def png_info(path):
    """Read PNG alpha without altering pixels or requiring Pillow."""
    data=Path(path).read_bytes()
    assert data[:8]==b'\x89PNG\r\n\x1a\n', f'Not PNG: {path}'
    pos=8; compressed=b''
    while pos<len(data):
        size=struct.unpack('>I',data[pos:pos+4])[0]; kind=data[pos+4:pos+8]; chunk=data[pos+8:pos+8+size];pos+=12+size
        if kind==b'IHDR': w,h,depth,color,_,_,interlace=struct.unpack('>IIBBBBB',chunk)
        if kind==b'IDAT': compressed+=chunk
    assert depth==8 and color in (2,6) and interlace==0, f'Unsupported PNG encoding: {path}'
    channels=4 if color==6 else 3; stride=w*channels; raw=zlib.decompress(compressed)
    prev=bytearray(stride); offset=0; transparent=visible=0; bounds=[w,h,0,0]
    for y in range(h):
        filt=raw[offset];offset+=1; row=bytearray(raw[offset:offset+stride]);offset+=stride
        for x in range(stride):
            left=row[x-channels] if x>=channels else 0; above=prev[x]; diagonal=prev[x-channels] if x>=channels else 0
            if filt==1: value=left
            elif filt==2: value=above
            elif filt==3: value=(left+above)//2
            elif filt==4:
                p=left+above-diagonal; pa=abs(p-left);pb=abs(p-above);pc=abs(p-diagonal)
                value=left if pa<=pb and pa<=pc else above if pb<=pc else diagonal
            else:
                assert filt==0, f'Invalid PNG filter: {path}'
                value=0
            row[x]=(row[x]+value)&255
        for x in range(w):
            alpha=row[x*channels+3] if channels==4 else 255
            if alpha==0: transparent+=1
            else:
                visible+=1;bounds=[min(bounds[0],x),min(bounds[1],y),max(bounds[2],x+1),max(bounds[3],y+1)]
        prev=row
    return dict(width=w,height=h,rgba=channels==4,transparent=transparent,visible=visible,bounds=bounds if visible else None)

def main():
    assets=[]
    for path in sorted(ROOT.rglob('*.png')):
        relative=path.relative_to(ROOT).as_posix()
        parts=relative.split('/')
        if '_rejected' in parts:
            continue
        info=png_info(path)
        opaque_mockup=relative.startswith('pixel-art-v4-ui/mockups/')
        if not opaque_mockup:
            assert info['rgba'], f'Expected RGBA: {path}'
            assert info['transparent']>0 and info['visible']>0, f'Missing transparent or visible pixels: {path}'
        if path.name.startswith('_'):
            continue
        collection=parts[0] if parts[0] in ('detailed-v2','pixel-art-v3','pixel-art-v4-ui') else 'original-studies'
        categories={'backgrounds','characters','icons','ui','logos','effects','story','mockups'}
        category=next((part for part in parts[:-1] if part in categories),'other')
        assets.append({'path':relative,'name':path.stem.replace('_',' ').replace('-',' '),'category':category,
                       'collection':collection,'status':'rejected-style-study' if collection=='detailed-v2' else 'candidate',
                       'width':info['width'],'height':info['height'],'transparent_percent':round(100*info['transparent']/(info['width']*info['height']),2),
                       'visible_bounds':info['bounds'],'bytes':path.stat().st_size,
                       'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    manifest={'version':2,'status':'candidates-only','count':len(assets),'categories':dict(Counter(a['category'] for a in assets)),
              'collections':dict(Counter(a['collection'] for a in assets)),
              'alpha_validation':'Every asset PNG is RGBA with transparent and visible pixels; only pixel-art-v4-ui/mockups/ may be opaque. Rejected attempts are excluded.','assets':assets}
    (ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    template=(ROOT/'generators/gallery-template.html').read_text()
    (ROOT/'index.html').write_text(template.replace('__ASSET_DATA__',json.dumps(assets).replace('<','\\u003c')))
    print(json.dumps({k:v for k,v in manifest.items() if k!='assets'},indent=2))

if __name__=='__main__':main()
