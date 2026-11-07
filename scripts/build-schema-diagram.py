"""Read-only schema documentation exporter. No database connection or writes."""
from pathlib import Path
import json, re, hashlib, math, html
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Polygon
from reportlab.graphics import renderPDF, renderSVG

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/schema'; OUT.mkdir(parents=True,exist_ok=True)
data=json.loads((OUT/'datamodel.json').read_text())
models={m['name']:m for m in data['models']}
schema=(ROOT/'server/prisma/schema.prisma').read_text(encoding='utf8')
assert set(re.findall(r'^model (\w+)\s*\{',schema,re.M))==set(models)
# Refuse a stale generated client: compare every scalar/relation field and type.
for name,m in models.items():
    body=re.search(r'^model '+name+r'\s*\{(.*?)^}',schema,re.M|re.S)[1]
    fields={a:b for a,b in re.findall(r'^\s+(\w+)\s+(\w+)(?:\[\]|\?)?(?=\s|$)',body,re.M)}
    assert fields=={f['name']:f['type'] for f in m['fields']}, name

groups=[
 ('Identity and access','Role Permission RolePermission User Session PasswordResetToken RegistrationInvite EmergencyAccess'),
 ('Organization and scope','Campus College Program Office OrganizationVersion'),
 ('Documents and sharing','Folder FolderShare Document DocumentVersion DocumentTag DocumentShare'),
 ('Repositories and requests','Repository RepositoryCopyJob RepositoryFavorite RepositoryRecent RepositoryPin DocumentRequest DocumentRequestItem'),
 ('Accreditation delivery','AaccupArea AaccupRequirement AaccupSubmission AaccupTask AaccupTaskReminder'),
 ('Requirement templates','AccreditationCycle RequirementTemplate RequirementNode RequirementValidation RequirementAssignment RequirementVersion RequirementHistory'),
 ('Folder templates','FolderTemplate FolderNode FolderAssignment FolderVersion FolderHistory'),
 ('Configuration and setup','SystemSetting ConfigurationCategory Configuration ConfigurationVersion ConfigurationHistory SetupState'),
 ('Audit, messaging and maintenance','AuditLog AuditArchive AuditReview BugReport Notification EmailMessage MaintenanceJob MaintenanceOrphanCandidate MaintenanceLock'),
 ('Retained workflow structures','WorkflowDefinition WorkflowStep WorkflowTransition WorkflowAssignment WorkflowVersion WorkflowHistory WorkflowInstance WorkflowStepInstance WorkflowAction'),
 ('Retained form structures','FormTemplate FormField FormAssignment FormVersion FormHistory'),
]
groups=[(title,names.split()) for title,names in groups]
assert sorted(n for _,names in groups for n in names)==sorted(models)
edges=[]
for name,m in models.items():
 for f in m['fields']:
  if f.get('relationFromFields'):
   fk=f['relationFromFields']; scalar={x['name']:x for x in m['fields']}
   unique=any(scalar[k]['isUnique'] or scalar[k]['isId'] for k in fk) or fk in m.get('uniqueFields',[])
   edges.append(dict(source=name,target=f['type'],field=f['name'],fk=fk,ref=f['relationToFields'],optional=not f['isRequired'],unique=unique,onDelete=f.get('relationOnDelete','Default')))

mermaid=['erDiagram']
dictionary=['# QA-DMS database schema','', 'Source: `server/prisma/schema.prisma`. PostgreSQL / Prisma. Generated 04 November 2026.', '', 'All physical models are included, including retained Workflow/Form structures. Generic IDs and JSON references are not invented foreign keys.','']
for name,m in models.items():
 fk={k for e in edges if e['source']==name for k in e['fk']}
 pk=set((m.get('primaryKey') or {}).get('fields',[]))
 mermaid.append(f'    {name} {{')
 dictionary.extend([f'## {name} (`{m["dbName"] or name}`)','', '| Field | Type | Constraints |','|---|---|---|'])
 for f in m['fields']:
  if f['kind']=='object':continue
  tags=[t for yes,t in [(f['isId'] or f['name'] in pk,'PK'),(f['name'] in fk,'FK'),(f['isUnique'],'UK')] if yes]
  typ=f['type']+('[]' if f['isList'] else '')
  mermaid.append(f'        {typ} {f["name"]}'+(' '+','.join(tags) if tags else '')+(' "nullable"' if not f['isRequired'] else ''))
  dictionary.append(f'| {f["name"]} | {typ}{"?" if not f["isRequired"] else ""} | {", ".join(tags)} |')
 mermaid.append('    }');dictionary.append('')
for e in edges:
 left='|o' if e['optional'] else '||'
 right='o|' if e['unique'] else 'o{'
 mermaid.append(f'    {e["target"]} {left}--{right} {e["source"]} : "{e["field"]} ({",".join(e["fk"])})"')
(OUT/'QA-DMS_Complete_ERD.mmd').write_text('\n'.join(mermaid),encoding='utf8')
(OUT/'QA-DMS_Data_Dictionary.md').write_text('\n'.join(dictionary),encoding='utf8')
(OUT/'relationships.json').write_text(json.dumps(edges,indent=2))

W,H=1190,842
navy=colors.HexColor('#102751'); blue=colors.HexColor('#2456c6'); pale=colors.HexColor('#eff4fc'); grey=colors.HexColor('#63748c')
pdfdir=ROOT/'output/pdf';pdfdir.mkdir(exist_ok=True)
c=canvas.Canvas(str(pdfdir/'QA-DMS_Database_Schema.pdf'),pagesize=(W,H))
c.setTitle('QA-DMS Database Schema - Complete ERD')
page=0
def header(title,sub):
 global page
 page+=1;c.setFillColor(navy);c.rect(0,H-89,W,89,fill=1,stroke=0)
 c.setFillColor(colors.white);c.setFont('Helvetica-Bold',23);c.drawString(36,H-40,title)
 c.setFont('Helvetica',11);c.drawString(36,H-64,sub)
 c.setFillColor(grey);c.setFont('Helvetica',9);c.drawString(36,22,'QA-DMS | PostgreSQL | Source: server/prisma/schema.prisma | 04 November 2026')
 c.drawRightString(W-36,22,str(page))
def text(x,y,t,size=12,bold=False):
 c.setFillColor(navy);c.setFont('Helvetica-Bold' if bold else 'Helvetica',size);c.drawString(x,y,t)
header('QA-DMS | Database schema','Complete physical schema with module diagrams, field dictionary and foreign-key registry')
text(40,705,f'{len(models)} models     /     {len(edges)} declared foreign-key relationships     /     {len(data["enums"])} enums',22,True)
for i,(title,names) in enumerate(groups):
 text(44,649-i*37,f'{i+1:02d}   {title}',15,True)
 text(480,649-i*37,f'{len(names)} tables  -  diagram page {i+2}',12)
for y,t in [(184,'Reading the diagrams: arrows point from the child foreign key to the referenced parent.'),(160,'PK = primary key; FK = foreign key; UK = unique; ? = nullable. Boxes show keys and selected identifying fields.'),(136,'Module diagrams show internal foreign keys. Every cross-module relationship is included in the numbered registry.'),(112,'Workflow and Form authoring screens were removed locally; their persisted tables remain and are documented.'),(88,'Generic entity/target IDs and JSON snapshots are application-managed references, not declared database foreign keys.'),(64,'Basis: local checkout of github.com/ikykchrist/URS-DMS, commit 032d5c7; schema has no local modifications.')]:text(40,y,t,11)
c.showPage()
for gi,(title,names) in enumerate(groups):
 header(f'{gi+1:02d} | {title}','Physical table names beneath model names | Internal relations only; see registry for complete cross-module links')
 d=Drawing(W-60,H-150); dw,dh=d.width,d.height
 cols=3 if len(names)<=9 else 4; rows=math.ceil(len(names)/cols)
 cellw=dw/cols;cellh=dh/rows; bw=cellw-38; positions={}
 for i,n in enumerate(names):
  m=models[n]; fk={k for e in edges if e['source']==n for k in e['fk']};pk=set((m.get('primaryKey') or {}).get('fields',[]))
  fields=[f for f in m['fields'] if f['kind']!='object' and (f['isId'] or f['name'] in pk or f['name'] in fk or f['isUnique'])]
  for f in m['fields']:
   if len(fields)<4 and f['kind']!='object' and f not in fields:fields.append(f)
  bh=51+len(fields)*13
  x=i%cols*cellw+17; y=dh-(i//cols+1)*cellh+(cellh-bh)/2
  positions[n]=(x,y,bw,bh,fields,fk,pk)
 for e in edges:
  if e['source'] not in names or e['target'] not in names:continue
  x,y,w,h,*_=positions[e['source']];a,b,v,k,*_=positions[e['target']]
  sx=x+w/2;sy=y+h/2;tx=a+v/2;ty=b+k/2
  if e['source']==e['target']:
   d.add(Line(x+w,y+15,x+w+9,y+15,strokeColor=blue));d.add(Line(x+w+9,y+15,x+w+9,y+h-10,strokeColor=blue));continue
  if abs(tx-sx)>abs(ty-sy):sx=x+w if tx>sx else x;tx=a if tx>sx else a+v
  else:sy=y+h if ty>sy else y;ty=b if ty>sy else b+k
  d.add(Line(sx,sy,tx,ty,strokeColor=blue,strokeWidth=.8))
  angle=math.atan2(ty-sy,tx-sx);L=7
  d.add(Polygon([tx,ty,tx-L*math.cos(angle-.4),ty-L*math.sin(angle-.4),tx-L*math.cos(angle+.4),ty-L*math.sin(angle+.4)],fillColor=blue,strokeColor=blue))
 for n,(x,y,w,h,fields,fk,pk) in positions.items():
  d.add(Rect(x,y,w,h,fillColor=colors.white,strokeColor=colors.HexColor('#b8c8de'),rx=5,ry=5))
  d.add(Rect(x,y+h-37,w,37,fillColor=pale,strokeWidth=0))
  d.add(String(x+10,y+h-15,n,fontName='Helvetica-Bold',fontSize=11,fillColor=navy))
  d.add(String(x+10,y+h-29,models[n]['dbName'] or n,fontName='Helvetica',fontSize=8,fillColor=grey))
  for j,f in enumerate(fields):
   tag='/'.join(t for yes,t in [(f['isId'] or f['name'] in pk,'PK'),(f['name'] in fk,'FK'),(f['isUnique'],'UK')] if yes)
   label=f'{tag+" " if tag else ""}{f["name"]}: {f["type"]}{"?" if not f["isRequired"] else ""}'
   assert len(label)<73,(n,label)
   d.add(String(x+10,y+h-51-j*13,label,fontName='Helvetica',fontSize=9,fillColor=navy))
 renderPDF.draw(d,c,30,62)
 renderSVG.drawToFile(d,str(OUT/f'{gi+1:02d}-diagram.svg'))
 c.showPage()

for start in range(0,len(edges),27):
 header('Complete foreign-key registry',f'Relationships {start+1}-{min(start+27,len(edges))} of {len(edges)} | Child -> parent | All modules included')
 for x,label in [(38,'#'),(73,'CHILD MODEL / FK'),(460,'PARENT MODEL / KEY'),(770,'PARENT PER CHILD'),(920,'ON DELETE')]:text(x,727,label,10,True)
 for j,e in enumerate(edges[start:start+27]):
  y=700-j*23
  if j%2==0:c.setFillColor(pale);c.rect(33,y-7,W-66,23,fill=1,stroke=0)
  for x,t in [(38,str(start+j+1)),(73,e['source']+'.'+','.join(e['fk'])),(460,e['target']+'.'+','.join(e['ref'])),(770,'0..1' if e['optional'] else '1'),(920,e['onDelete'])]:text(x,y,t,9)
 c.showPage()
c.save()
manifest=dict(models=len(models),relations=len(edges),enums=len(data['enums']),pages=page,schema_sha256=hashlib.sha256((ROOT/'server/prisma/schema.prisma').read_bytes()).hexdigest(),modules=[dict(title=t,models=n) for t,n in groups])
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))
cards=''
for i,(title,_) in enumerate(groups):
 svg=(OUT/f'{i+1:02d}-diagram.svg').read_text()
 svg=svg[svg.index('<svg'):]
 cards+=f'<section><h2>{html.escape(title)}</h2>{svg}</section>'
rows=''.join('<tr>'+''.join(f'<td>{html.escape(str(v))}</td>' for v in [e['source'],','.join(e['fk']),e['target'],','.join(e['ref']),'0..1' if e['optional'] else '1',e['onDelete']])+'</tr>' for e in edges)
cards+='<section><h2>Complete foreign-key registry</h2><table><tr><th>Child</th><th>Foreign key</th><th>Parent</th><th>Referenced key</th><th>Parent per child</th><th>On delete</th></tr>'+rows+'</table></section>'
(OUT/'index.html').write_text(f'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QA-DMS Database Schema</title><style>body{{font:16px Segoe UI,sans-serif;margin:36px;background:#f3f6fb;color:#102751}}section{{background:white;padding:20px;margin:24px 0;border-radius:14px;overflow:auto}}svg{{width:100%;height:auto;min-width:800px}}a{{color:#2456c6}}table{{border-collapse:collapse;width:100%;font-size:13px}}th,td{{text-align:left;padding:9px;border-bottom:1px solid #dde5f0}}tr:nth-child(even){{background:#f3f6fb}}</style><h1>QA-DMS Database Schema</h1><p>72 models | {len(edges)} declared foreign keys | PostgreSQL / Prisma</p><p>Arrows: child foreign key to parent. PK = primary key; FK = foreign key; UK = unique; ? = nullable. Module diagrams show keys and selected fields. All foreign keys appear in the registry below.</p><p>Source: local schema from ikykchrist/URS-DMS, commit 032d5c7, schema unchanged locally. Workflow/Form tables remain as retained structures. Generic target IDs and JSON references are not declared foreign keys. No database records accessed.</p>{cards}</html>',encoding='utf8')
print(json.dumps(manifest))
