"""Export the complete physical schema as one vector US Letter page."""
from pathlib import Path
import json, math, textwrap
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, Color, white
from reportlab.pdfbase.pdfmetrics import stringWidth

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/pdf/QA-DMS_Database_Schema_Letter.pdf'
data=json.loads((ROOT/'output/schema/datamodel.json').read_text())
manifest=json.loads((ROOT/'output/schema/manifest.json').read_text())
edges=json.loads((ROOT/'output/schema/relationships.json').read_text())
models={m['name']:m for m in data['models']}
names=[n for g in manifest['modules'] for n in g['models']]
W,H=792,612
c=canvas.Canvas(str(OUT),pagesize=(W,H));c.setTitle('QA-DMS Database Schema | US Letter | One Page')
navy=HexColor('#102751');grey=HexColor('#526177');blue=HexColor('#2759a8')
palette=['#e7eefb','#e4f3ee','#e6effa','#edf0fc','#fff1d7','#f0eafa','#e6f3f4','#eaf1e1','#fcece7','#eeeef0','#eeeef0']
group={n:i for i,g in enumerate(manifest['modules']) for n in g['models']}
c.setFillColor(navy);c.setFont('Helvetica-Bold',15);c.drawString(18,590,'QA-DMS | DATABASE SCHEMA')
c.setFont('Helvetica',7);c.drawRightString(774,591,'PostgreSQL / Prisma  |  72 tables  |  153 foreign keys')
c.setFillColor(grey);c.setFont('Helvetica',6.5);c.drawString(18,578,'PK = primary key   FK = foreign key   ? = nullable   Arrows: child -> referenced parent   |   Key fields shown; other columns omitted')

cols,rows=9,8
left,bottom=18,48
cw,ch=84,65
bw,bh=77,57
pos={n:(left+i%cols*cw,bottom+(rows-1-i//cols)*ch) for i,n in enumerate(names)}

# Relationships are drawn beneath tables. All declared foreign keys are included.
c.setLineWidth(.22)
for e in edges:
 x,y=pos[e['source']];a,b=pos[e['target']]
 if e['source']==e['target']:
  c.setStrokeColor(blue);c.lines([(x+bw,y+8,x+bw+3,y+8),(x+bw+3,y+8,x+bw+3,y+bh-8),(x+bw+3,y+bh-8,x+bw,y+bh-8)])
  continue
 sx,sy=x+bw/2,y+bh/2;tx,ty=a+bw/2,b+bh/2
 if abs(tx-sx)>abs(ty-sy):
  direction=1 if tx>sx else -1;sx+=direction*bw/2;tx-=direction*bw/2
 else:
  direction=1 if ty>sy else -1;sy+=direction*bh/2;ty-=direction*bh/2
 c.setStrokeColor(HexColor('#c0c8d4') if e['target']=='User' else HexColor('#8299b7'))
 c.line(sx,sy,tx,ty)
 angle=math.atan2(ty-sy,tx-sx);L=2.2
 c.line(tx,ty,tx-L*math.cos(angle-.4),ty-L*math.sin(angle-.4));c.line(tx,ty,tx-L*math.cos(angle+.4),ty-L*math.sin(angle+.4))

for n in names:
 m=models[n];x,y=pos[n];c.setFillColor(white);c.setStrokeColor(HexColor('#a9b5c7'));c.setLineWidth(.35);c.rect(x,y,bw,bh,fill=1,stroke=1)
 c.setFillColor(HexColor(palette[group[n]]));c.rect(x+.3,y+bh-11,bw-.6,10.7,fill=1,stroke=0)
 fs=min(6.1,(bw-6)/stringWidth(n,'Helvetica-Bold',1));c.setFillColor(navy);c.setFont('Helvetica-Bold',fs);c.drawString(x+3,y+bh-7.6,n)
 pk=[f['name'] for f in m['fields'] if f['isId']] or (m.get('primaryKey') or {}).get('fields',[])
 scalar={f['name']:f for f in m['fields']}
 fks=[k for e in edges if e['source']==n for k in e['fk']]
 lines=['PK '+', '.join(pk)]
 for k in dict.fromkeys(fks):lines.append('FK '+k+('?' if not scalar[k]['isRequired'] else ''))
 if len(lines)==1:
  for f in m['fields']:
   if f['kind']!='object' and f['name'] not in pk and f['name'] not in ['createdAt','updatedAt','deletedAt']:
    lines.append(f['name']+('?' if not f['isRequired'] else ''))
    if len(lines)==4:break
 fs=min(5.1,39/max(len(lines),1));leading=fs+0.1
 for j,s in enumerate(lines):
  size=min(fs,(bw-6)/stringWidth(s,'Helvetica',1));c.setFont('Helvetica',size);c.drawString(x+3,y+bh-18-j*leading,s)

# Compact module legend, separate from diagram and without instructional content.
short=['Identity','Organization','Documents','Repository / requests','Accreditation','Requirement templates','Folder templates','Configuration','Audit / messaging / maintenance','Workflow (retained)','Forms (retained)']
x=18;y=33
for i,label in enumerate(short):
 width=stringWidth(label,'Helvetica',5.4)+15
 if x+width>775:x=18;y-=11
 c.setFillColor(HexColor(palette[i]));c.rect(x,y-1,6,6,fill=1,stroke=0)
 c.setFillColor(grey);c.setFont('Helvetica',5.4);c.drawString(x+9,y,label);x+=width
c.setFillColor(grey);c.setFont('Helvetica',5.4);c.drawString(18,8,'Source: server/prisma/schema.prisma | ikykchrist/URS-DMS | 04 November 2026 | US Letter landscape (11 x 8.5 in)')
c.showPage();c.save();print(OUT)
