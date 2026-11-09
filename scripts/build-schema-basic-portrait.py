"""One-page simplified ERD, US Letter portrait; no database access."""
from pathlib import Path
import json
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/pdf/QA-DMS_Database_Schema_Basic_Portrait.pdf'
models={m['name']:m for m in json.loads((ROOT/'output/schema/datamodel.json').read_text())['models']}
c=canvas.Canvas(str(OUT),pagesize=(612,792));c.setTitle('QA-DMS | Basic Database Schema | Letter Portrait')
navy=HexColor('#122b50');muted=HexColor('#596b80');blue=HexColor('#3a65a0');border=HexColor('#bbcada')
def text(x,y,s,size=9,bold=False,color=navy):
 c.setFillColor(color);c.setFont('Helvetica-Bold' if bold else 'Helvetica',size);c.drawString(x,y,s)
text(30,750,'QA-DMS',11,True)
text(30,724,'Basic Database Schema',23,True)
text(30,704,'Core tables and main relationships',10,color=muted)
rows=[
 ('ORGANIZATION','#e8f3ed',[('Campus','Campuses',['id','name']),('College','Colleges',['id','campusId','name']),('Program','Programs',['id','collegeId','name'])]),
 ('ACCOUNTS','#e8eefb',[('Role','Roles',['id','name']),('User','Users',['id','roleId','email']),('Repository','Repositories',['id','ownerId','name'])]),
 ('DOCUMENTS','#e8f1fa',[('Folder','Folders',['id','repositoryId','name']),('Document','Documents',['id','folderId','title']),('DocumentVersion','File Versions',['id','documentId','versionNumber'])]),
 ('ACCREDITATION','#fff2d9',[('AaccupArea','Areas',['id','programId','title']),('AaccupRequirement','Requirements',['id','areaId','title']),('AaccupSubmission','Submissions',['id','requirementId','documentId','status'])]),
]
bw,bh=166,100;pos={}
for ri,(category,color,items) in enumerate(rows):
 y=570-ri*146
 text(30,y+115,category,8,True,color=muted)
 for ci,(model,label,fields) in enumerate(items):pos[model]=(30+ci*193,y)

def arrow(points,label=None):
 c.setStrokeColor(blue);c.setLineWidth(.9)
 for a,b in zip(points,points[1:]):c.line(*a,*b)
 x,y=points[-1];a,b=points[-2];dx,dy=x-a,y-b
 if abs(dx)>abs(dy):
  sign=1 if dx>0 else -1;c.line(x,y,x-sign*4,y+2.5);c.line(x,y,x-sign*4,y-2.5)
 else:
  sign=1 if dy>0 else -1;c.line(x,y,x-2.5,y-sign*4);c.line(x,y,x+2.5,y-sign*4)
 if label:
  a,b=points[0];d,e=points[1];text((a+d)/2-5,(b+e)/2+4,label,6.5,color=blue)

# Essential direct foreign keys only. Parent -> child.
for parent,child in [('Campus','College'),('College','Program'),('Role','User'),('User','Repository'),('Folder','Document'),('Document','DocumentVersion'),('AaccupArea','AaccupRequirement'),('AaccupRequirement','AaccupSubmission')]:
 x,y=pos[parent];a,b=pos[child];arrow([(x+bw,y+50),(a,b+50)],'1:N')
# Repository holds folders; route between rows, outside the card interiors.
x,y=pos['Repository'];a,b=pos['Folder'];arrow([(x+83,y),(x+83,y-21),(a+83,y-21),(a+83,b+bh)])
text(299,y-17,'1:N',6.5,color=blue)
# Evidence links the accreditation record to the uploaded document.
x,y=pos['Document'];a,b=pos['AaccupSubmission'];arrow([(x+83,y),(x+83,y-21),(a+83,y-21),(a+83,b+bh)])
text(428,y-17,'1:N evidence',6.5,color=blue)

for category,color,items in rows:
 for model,label,fields in items:
  m=models[model];x,y=pos[model]
  # Keep only fields that really exist in the schema.
  actual={f['name']:f for f in m['fields']}
  if 'title' in fields and 'title' not in actual:fields=[('name' if 'name' in actual else 'code') if f=='title' else f for f in fields]
  if 'name' in fields and 'name' not in actual:fields=[f for f in fields if f!='name']
  assert all(f in actual for f in fields),(model,fields)
  fk={k for f in m['fields'] for k in f.get('relationFromFields',[])}
  c.setFillColor(white);c.setStrokeColor(border);c.roundRect(x,y,bw,bh,5,fill=1,stroke=1)
  c.setFillColor(HexColor(color));c.rect(x+.5,y+bh-33,bw-1,28,fill=1,stroke=0)
  text(x+10,y+bh-16,label,11,True)
  text(x+10,y+bh-28,m['dbName'] or model,6.5,color=muted)
  for i,f in enumerate(fields):
   marker='PK' if actual[f]['isId'] else 'FK' if f in fk else ''
   text(x+10,y+bh-47-i*12,marker,7,True,color=blue)
   text(x+32,y+bh-47-i*12,f,8)

text(30,95,'1:N = one-to-many   |   PK = primary key   |   FK = foreign key',8,color=muted)
text(30,77,'Simplified view: 12 core tables. Supporting tables and extra relationships are omitted.',7.7,color=muted)
text(30,63,'Areas, requirements and submissions support both AACCUP and ISO.',7.7,color=muted)
c.setStrokeColor(border);c.line(30,46,582,46)
text(30,31,'Source: URS-DMS Prisma schema  |  US Letter portrait (8.5 x 11 in)',7,color=muted)
c.showPage();c.save();print(OUT)
