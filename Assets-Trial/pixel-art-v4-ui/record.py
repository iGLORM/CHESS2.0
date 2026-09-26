import json,sys,shutil,importlib.util
from pathlib import Path
root=Path('Assets-Trial/pixel-art-v4-ui')
spec=importlib.util.spec_from_file_location('catalog','Assets-Trial/generators/catalog.py');cat=importlib.util.module_from_spec(spec);spec.loader.exec_module(cat)
job=json.loads(sys.stdin.read())
info=cat.png_info(job['source_path'])
assert info['rgba'] and info['transparent']>0 and info['visible']>0
dest=root/job['path'];dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(job['source_path'],dest)
prompt_path='prompts/'+str(Path(job['path']).with_suffix('.txt'))
p=root/prompt_path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(job['prompt']+'\n\nAttached reference images (in order):\n'+'\n'.join(job['refs'])+'\n')
meta=root/'metadata'/ (job['section']+'.json');rows=json.loads(meta.read_text()) if meta.exists() else []
rows=[r for r in rows if r['path']!=job['path']]
rows.append(dict(path=job['path'],section=job['section'],world=job.get('world'),state=job.get('state'),size=[info['width'],info['height']],source='built-in imagegen',postprocessing='none',prompt_path=prompt_path,source_path=job['source_path'],references=job['refs'],review='accepted after visual review and alpha validation'))
meta.write_text(json.dumps(rows,indent=2)+'\n')
print(job['path'],info)

