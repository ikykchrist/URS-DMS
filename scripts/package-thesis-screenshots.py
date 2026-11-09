"""Package genuine browser screenshots into separate thesis walkthrough ZIPs."""
from pathlib import Path
import json,csv,html,zipfile,hashlib,math
from PIL import Image,ImageDraw,ImageFont

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'output/thesis-sample-run'
captures=json.loads((BASE/'capture-manifest.json').read_text())
latest={(x['role'],x['file']):x for x in captures}
summary={}
for role in ['Admin','User']:
 folder=BASE/role
 files=sorted(folder.rglob('*.jpg'))
 records=[]
 for p in files:
  sub=p.parent.relative_to(BASE).as_posix()
  entry=latest[(sub,p.name)]
  with Image.open(p) as im:
   size=im.size;im.verify()
  assert size[0]>=1000 and size[1]>=650,(p,size)
  records.append(dict(file=p.relative_to(folder).as_posix(),caption=entry['caption'],route=entry['url'],width=size[0],height=size[1],sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
 # Distinguish confirmed results from forms captured without committing changes.
 introduction=f'''# QA-DMS {role} - Thesis Sample Run

{len(records)} genuine JPEG screenshots, numbered by process. Open index.html for an offline gallery and figure captions. screenshots.csv provides editable filenames, captions and the actual captured route.

Website address: https://qadms.online
Capture environment: the Original local QA-DMS application (localhost:5173 for Administrator/Root; 127.0.0.1:5173 for User). These are local sample-run screenshots, not a claim that the public deployment was tested. Screens retain the real UI; no page content was fabricated or replaced for the screenshots. Sample personnel and existing October records are fictional presentation data.

## Completed sample scenarios

1. Maria Santos created the Thesis Sample Run personal folder.
2. Maria uploaded Curriculum_Mapping_Matrix_CS.pdf to AACCUP Area 3 / Curriculum and Instruction / Computer Science. The submission appeared as Pending; Angela Reyes reviewed and approved it. The user then saw Approved with no Unsubmit action for that evidence.
3. Maria requested the Extension attendance summary from the program archive. Angela approved the request with a decision note. QA-DMS delivered the requested copy to Maria's Requested Documents.
4. Maria submitted a clearly labeled demonstration bug report with a repository screenshot attached. The report and attachment appeared in the Administrator report list.

## Capture scope and reading order

Authentication -> Dashboard -> Repository -> Requests -> Accreditation -> Submissions/review -> Tasks -> Notifications/activity -> Settings/profile -> Bug reporting. The Admin package also includes Root Console screens in a separate folder.

Forms for creating an area, assigning a task, adding/inviting an account, renaming/moving/copying/replacing/deleting a file, returning evidence and unsubmitting evidence are interface demonstrations where present. These forms were cancelled after capture unless explicitly listed in the completed scenarios. They are not evidence of a committed transaction.

Forgot password shows the registered-email reset request form only; no email was sent and no password was changed. Camera scanning shows the scanner interface; camera media was unavailable, so an actual scan was not completed. File viewers are captured in Details & Activity mode because the embedded PDF canvas was blank in the capture browser. The supplied sample PDF contains the evidence used for the completed upload.

Workflow Builder and Form Builder are excluded because they were removed from the current application. Root pages are captured with a separate ROOT account, not presented as permissions of an ordinary administrator. Historical dates and counts may differ from the later sample-run results.

## Use in the thesis

Insert the JPEG directly into the document. Use the caption in the gallery or CSV as a starting point for the figure description. Keep the numbered order within each process. Credentials and database backups are not included.
'''
 (folder/'README.md').write_text(introduction,encoding='utf8')
 with (folder/'screenshots.csv').open('w',encoding='utf-8-sig',newline='') as f:
  writer=csv.DictWriter(f,fieldnames=['file','caption','route','width','height','sha256']);writer.writeheader();writer.writerows(records)
 cards=''.join(f'<figure><a href="{html.escape(r["file"])}"><img loading="lazy" src="{html.escape(r["file"])}" alt="{html.escape(r["caption"])}"></a><figcaption><b>{i:02d}. {html.escape(Path(r["file"]).stem)}</b><p>{html.escape(r["caption"])}</p></figcaption></figure>' for i,r in enumerate(records,1))
 (folder/'index.html').write_text(f'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>QA-DMS {role} Sample Run</title><style>body{{font:16px Segoe UI,sans-serif;background:#f1f5fa;color:#142a50;margin:28px}}header{{max-width:1100px;margin:auto}}main{{display:grid;grid-template-columns:repeat(auto-fit,minmax(440px,1fr));gap:24px}}figure{{margin:0;background:white;border:1px solid #dbe3ef;border-radius:12px;overflow:hidden}}img{{width:100%;display:block}}figcaption{{padding:18px}}p{{line-height:1.5}}a{{color:#2257b8}}@media(max-width:500px){{main{{display:block}}figure{{margin-bottom:20px}}}}</style><header><h1>QA-DMS {role} - Thesis Sample Run</h1><p>{len(records)} actual application screenshots. Click an image for the full-size JPEG.</p><p><a href="README.md">Scope and completed scenarios</a> | <a href="screenshots.csv">Editable captions (CSV)</a> | Website: qadms.online</p><p>Captured from the Original local build using fictional demonstration records. Some images show forms only; refer to the README for completed transactions and capture limitations.</p></header><main>{cards}</main></html>',encoding='utf8')
 # Include the evidence file used in the sample run, without credentials or exports.
 sample=BASE/'sample-files/Curriculum_Mapping_Matrix_CS.pdf'
 zip_path=BASE/f'QA-DMS_{role}_Thesis_Screenshots.zip'
 with zipfile.ZipFile(zip_path,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=5) as z:
  for p in sorted(folder.rglob('*')):
   if p.is_file():z.write(p,role+'/'+p.relative_to(folder).as_posix())
  z.write(sample,role+'/Sample Evidence/'+sample.name)
 with zipfile.ZipFile(zip_path) as z:
  assert z.testzip() is None
  assert sum(n.lower().endswith('.jpg') for n in z.namelist())==len(records)
 summary[role]=dict(screenshots=len(records),zip=str(zip_path),bytes=zip_path.stat().st_size)

# Small preview; the original full-size images in the ZIP remain untouched.
preview=Image.new('RGB',(1200,520),'#edf2fa');draw=ImageDraw.Draw(preview)
font=ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf',20)
for x,role,file,title in [(0,'Admin','13-Evidence-Approved.jpg','ADMIN - Evidence reviewed and approved'),(600,'User','27-Evidence-Approved.jpg','USER - Approved result visible')]:
 im=Image.open(BASE/role/file).convert('RGB');im.thumbnail((580,465));preview.paste(im,(x+(600-im.width)//2,47));draw.text((x+14,12),title,font=font,fill='#142a50')
preview.save(BASE/'Sample-Run-Preview.jpg',quality=93)
(BASE/'package-summary.json').write_text(json.dumps(summary,indent=2))
print(json.dumps(summary,indent=2))
