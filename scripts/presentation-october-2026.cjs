/* Explicitly requested local presentation reset. Never run against production.
 * Preserves organization, RBAC, platform configuration and the existing ROOT.
 * Old users/templates are archived; prior file objects remain for restoration.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const { Client } = require('minio');
const { PDFDocument, StandardFonts, rgb } = createRequire(path.resolve('client/package.json'))('pdf-lib');
const output = path.resolve('output/presentation');
const backup = path.join(output, 'backup/urs_dms-before-presentation-20261104.dump');
const url = new URL(process.env.DATABASE_URL);
if (!['localhost','127.0.0.1'].includes(url.hostname) || url.pathname !== '/urs_dms') throw Error('Only local urs_dms is allowed');
if (!process.argv.includes('--apply') || !fs.existsSync(backup) || fs.statSync(backup).size < 10000) throw Error('Requires --apply and the verified database backup');
if (fs.existsSync(path.join(output,'completed.json'))) throw Error('Presentation reset already completed; refusing an accidental rerun');
const p = new PrismaClient();
const uid = () => crypto.randomUUID();
const when = (day,hour=9,minute=0) => new Date(`2026-10-${String(Math.min(day,31)).padStart(2,'0')}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00+08:00`);
const password = 'DemoReady!2026';
const staff = [
 ['Angela','Reyes','ADMINISTRATOR','CS'],['Miguel','Santos','ADMINISTRATOR','BHS'],
 ['Patricia','Cruz','QUALITY_ASSURANCE_OFFICER','CS'],['Rafael','Mendoza','QUALITY_ASSURANCE_OFFICER','BHS'],
 ['Elena','Navarro','DEPARTMENT_COORDINATOR','CS'],['Carlos','Garcia','DEPARTMENT_COORDINATOR','BHS'],['Diana','Flores','DEPARTMENT_COORDINATOR','CS'],
 ['Maria','Santos','FACULTY','CS'],['Jose','Reyes','FACULTY','CS'],['Andrea','Torres','FACULTY','CS'],['Paolo','Villanueva','FACULTY','CS'],['Camille','Bautista','FACULTY','CS'],
 ['John','Ramos','FACULTY','BHS'],['Isabel','Dela Cruz','FACULTY','BHS'],['Mark','Aquino','FACULTY','BHS'],['Sofia','Castillo','FACULTY','BHS'],['Daniel','Lim','FACULTY','BHS'],
 ['Grace','Hernandez','STAFF','CS'],['Vincent','Lopez','STAFF','BHS'],
];
const areasSpec = [
 ['AACCUP','CW',1,'Vision, Mission, Goals and Objectives',['Approved VMGO statement','Stakeholder consultation minutes','VMGO dissemination report','Annual alignment review']],
 ['AACCUP','CW',5,'Research',['Research agenda 2026','Research accomplishment report','Research ethics guidelines','Research utilization summary']],
 ['AACCUP','CW',6,'Extension and Community Involvement',['Extension program plan','Community needs assessment','Extension activity report','Partner feedback summary']],
 ['AACCUP','CW',7,'Library',['Library collection profile','Library utilization report','Learning resource inventory','Library service evaluation']],
 ['AACCUP','CS',2,'Faculty',['Faculty qualification matrix','Faculty development plan','Teaching performance summary','Professional development report']],
 ['AACCUP','CS',3,'Curriculum and Instruction',['Curriculum mapping matrix','Approved course syllabi','Instructional materials inventory','Learning outcomes assessment']],
 ['AACCUP','BHS',2,'Faculty',['Faculty qualification matrix','Faculty development plan','Teaching performance summary','Professional development report']],
 ['AACCUP','BHS',3,'Curriculum and Instruction',['Curriculum mapping matrix','Approved course syllabi','Field practicum guidelines','Learning outcomes assessment']],
 ['ISO','CW',4,'Context of the Organization',['Stakeholder register','Internal and external issues register','Quality management scope','Process interaction map']],
 ['ISO','CW',5,'Leadership',['Quality policy','Management review minutes','Quality objectives dashboard','Responsibility and authority matrix']],
 ['ISO','CS',7,'Support',['Competency assessment record','Training effectiveness evaluation','Document control register','Communication plan']],
 ['ISO','CS',8,'Operation',['Operational control plan','Service delivery monitoring','Process change log','Nonconformity action record']],
 ['ISO','BHS',7,'Support',['Competency assessment record','Training effectiveness evaluation','Document control register','Communication plan']],
 ['ISO','BHS',9,'Performance Evaluation',['Internal audit program','Internal audit findings','Client satisfaction analysis','Corrective action monitoring']],
];
const generalTitles = ['Monthly accomplishment report','Faculty meeting minutes','Course assessment summary','Student consultation schedule','Instructional materials review','Research progress update','Extension attendance summary','Quality assurance action plan'];
const audits = [];
function audit(user,action,entity,id,title,date,extra={}) {
 audits.push({id:uid(),userId:user.id,actorName:`${user.firstName} ${user.lastName}`,actorRole:user.roleName,actorOrganization:'URS Morong Campus / College of Science',action,category: entity==='User'?'AUTHENTICATION':entity.startsWith('Aaccup')?'SUBMISSION':entity==='DocumentRequest'?'REQUEST':'REPOSITORY',severity:'INFO',result:'SUCCESS',entity:({Document:'document',Folder:'folder',DocumentRequest:'request',AaccupSubmission:'aaccup_submission',AaccupArea:'aaccup_area',User:'user'}[entity]||entity),entityId:id,targetType:entity,targetId:id,targetName:title,createdAt:date,metadata:{presentation:true,synthetic:true,period:'2026-10',...extra}});
}
async function pdfBytes(title,owner,day,version,area='Quality Assurance Office') {
 const pdf=await PDFDocument.create(); const page=pdf.addPage([595.28,841.89]);
 const regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 pdf.setTitle(title);pdf.setAuthor('QA-DMS Presentation Dataset');pdf.setCreationDate(when(day));pdf.setModificationDate(when(day));
 page.drawRectangle({x:0,y:724,width:595.28,height:118,color:rgb(.055,.12,.29)});
 page.drawText('QA-DMS',{x:42,y:797,size:21,font:bold,color:rgb(1,1,1)});
 page.drawText('University of Rizal System | Quality Assurance Office',{x:42,y:774,size:10,font:regular,color:rgb(.81,.86,.95)});
 const lines=[title,`Reporting period: October 2026 | Version ${version}`,`Prepared by: ${owner.firstName} ${owner.lastName}`,`Campus / College: Morong / College of Science`,`Accreditation context: ${area}`,`Document date: October ${day}, 2026`,'','1. Purpose and coverage','This report consolidates the documented activities, evidence and follow-up actions','for the October 2026 quality assurance and accreditation preparation cycle.','','2. Activity record',`Oct ${Math.max(1,day-3)} - Collected source records and checked document completeness.`,`Oct ${Math.max(1,day-2)} - Reviewed the evidence against the assigned area requirements.`,`Oct ${Math.max(1,day-1)} - Updated the supporting information and recorded the changes.`,`Oct ${day} - Prepared version ${version} for review and controlled distribution.`,'','3. Review checklist','[x] Document title, reporting period and responsible personnel are identified.','[x] Supporting information is organized for reviewer verification.','[x] Version number and update history are recorded in QA-DMS.','','4. Follow-up actions','Maintain the controlled copy, address reviewer comments, and retain the evidence','under the appropriate college-wide or program accreditation area.'];
 let y=690;for(let i=0;i<lines.length;i++){const text=lines[i]; const f=i===0||/^\d\./.test(text)?bold:regular; const size=i===0?14:10; const max=i===0?62:94;const parts=text.match(new RegExp(`.{1,${max}}(?:\\s|$)|.{1,${max}}`,'g'))||[''];for(const part of parts){page.drawText(part.trim(),{x:42,y,size,font:f,color:rgb(.12,.17,.25)});y-=17;}if(!text)y-=3;}
 page.drawLine({start:{x:42,y:56},end:{x:553,y:56},color:rgb(.8,.84,.9),thickness:.7});
 page.drawText('Presentation sample - fictional activity and personnel records. Not an official certification.',{x:42,y:40,size:8,font:regular,color:rgb(.4,.45,.52)});
 return Buffer.from(await pdf.save());
}
async function main(){
 const root=await p.user.findFirstOrThrow({where:{email:'root@urs.local',role:{name:'ROOT'},deletedAt:null}});
 const campus=await p.campus.findFirstOrThrow({where:{name:'URS Morong Campus'}});
 const college=await p.college.findFirstOrThrow({where:{name:'College of Science',campusId:campus.id}});
 const cs=await p.program.findFirstOrThrow({where:{name:'Computer Science',collegeId:college.id,campusId:campus.id}});
 const bhs=await p.program.findFirstOrThrow({where:{name:'Bachelor of Human Services',collegeId:college.id,campusId:campus.id}});
 const roles=Object.fromEntries((await p.role.findMany()).map(r=>[r.name,r.id]));
 const users=[{...root,roleName:'ROOT',scope:'CS'},...staff.map(([firstName,lastName,roleName,scope],i)=>({id:uid(),firstName,lastName,roleName,scope,email:`${firstName}.${lastName}`.toLowerCase().replaceAll(' ','')+'@qa-demo.local',employeeId:`QA-2026-${String(i+1).padStart(3,'0')}`}))];
 const hash=await argon2.hash(password,{type:argon2.argon2id});
 const minio=new Client({endPoint:process.env.MINIO_ENDPOINT||'localhost',port:Number(process.env.MINIO_PORT||9000),useSSL:process.env.MINIO_USE_SSL==='true',accessKey:process.env.MINIO_ACCESS_KEY,secretKey:process.env.MINIO_SECRET_KEY});
 const bucket=process.env.MINIO_BUCKET||'urs-dms';
 if(!await minio.bucketExists(bucket))throw Error('Storage bucket is not ready');
 const documents=[];
 for(let u=0;u<users.length;u++)for(let j=0;j<8;j++){
  const owner=users[u],id=uid(),day=1+(u*3+j*4)%25,title=`${generalTitles[j]} - ${owner.scope} - October 2026`;
  const versionCount=j%3===0?3:j%3===1?2:1,versions=[];
  for(let v=1;v<=versionCount;v++){
   const versionDay=Math.min(31,day+(v-1)*2),bytes=await pdfBytes(title,owner,versionDay,v),objectKey=`presentation/october-2026/${id}/v${v}.pdf`,filename=title.replaceAll(' ','_')+`_v${v}.pdf`;
   await minio.putObject(bucket,objectKey,bytes,bytes.length,{'Content-Type':'application/pdf'});
   versions.push({id:uid(),versionNumber:v,objectKey,filename,mimeType:'application/pdf',sizeBytes:BigInt(bytes.length),checksum:crypto.createHash('sha256').update(bytes).digest('hex'),uploadedById:owner.id,uploadedAt:when(versionDay,9+j%7,10+u),changeNote:v===1?'Initial controlled copy':v===2?'Updated supporting records after internal review':'Finalized figures and addressed review comments'});
  }
  documents.push({id,title,ownerId:owner.id,scope:owner.scope,day,j,versions,updatedDay:Math.min(31,day+(versionCount-1)*2)});
 }
 for(let ai=0;ai<areasSpec.length;ai++)for(let ri=0;ri<4;ri++){
  const [set,scope,,area,titles]=areasSpec[ai],eligible=users.filter(u=>['FACULTY','STAFF','DEPARTMENT_COORDINATOR'].includes(u.roleName)&&(scope==='CW'||u.scope===scope)),owner=eligible[(ai+ri)%eligible.length],id=uid(),day=10+(ai*4+ri)%16,versions=[];
  for(let v=1;v<=2;v++){const bytes=await pdfBytes(titles[ri],owner,day+v-1,v,`${set} / ${area}`),objectKey=`presentation/october-2026/${id}/v${v}.pdf`,filename=titles[ri].replaceAll(' ','_')+`_October2026_v${v}.pdf`;await minio.putObject(bucket,objectKey,bytes,bytes.length,{'Content-Type':'application/pdf'});versions.push({id:uid(),versionNumber:v,objectKey,filename,mimeType:'application/pdf',sizeBytes:BigInt(bytes.length),checksum:crypto.createHash('sha256').update(bytes).digest('hex'),uploadedById:owner.id,uploadedAt:when(day+v-1,10),changeNote:v===1?'Initial evidence submission':'Revised supporting information and controlled document header'});}
  documents.push({id,title:`${titles[ri]} - ${owner.scope} - October 2026`,ownerId:owner.id,scope:owner.scope,day,j:ri,versions,updatedDay:day+1,evidenceFor:`${ai}:${ri}`});
 }
 console.log(`Prepared ${users.length} active accounts, ${documents.length} PDFs and ${documents.reduce((n,d)=>n+d.versions.length,0)} real stored file versions. Applying transactional reset.`);
 const result=await p.$transaction(async tx=>{
  const resetModels=['workflowAction','workflowStepInstance','workflowInstance','workflowAssignment','formAssignment','aaccupTaskReminder','aaccupSubmission','aaccupTask','aaccupRequirement','aaccupArea','requirementAssignment','documentRequestItem','documentRequest','folderShare','documentShare','repositoryFavorite','repositoryRecent','repositoryPin','repositoryCopyJob','emergencyAccess','documentTag','bugReport','notification','emailMessage','auditReview','auditLog','auditArchive'];
  for(const model of resetModels)await tx[model].deleteMany();
  await tx.document.updateMany({data:{currentVersionId:null}});await tx.documentVersion.deleteMany();await tx.document.deleteMany();await tx.folder.deleteMany();await tx.repository.deleteMany();
  await tx.session.deleteMany({where:{userId:{not:root.id}}});await tx.passwordResetToken.deleteMany();await tx.registrationInvite.deleteMany();
  await tx.user.updateMany({where:{id:{not:root.id}},data:{deletedAt:new Date(),status:'INACTIVE',failedAttempts:0,lockedUntil:null}});
  await tx.requirementTemplate.updateMany({where:{deletedAt:null},data:{deletedAt:new Date(),status:'INACTIVE'}});
  await tx.accreditationCycle.updateMany({where:{deletedAt:null},data:{deletedAt:new Date(),status:'INACTIVE'}});
  await tx.folderAssignment.deleteMany();await tx.folderTemplate.updateMany({where:{deletedAt:null},data:{deletedAt:new Date(),status:'INACTIVE'}});
  await tx.workflowDefinition.updateMany({data:{status:'ARCHIVED',deletedAt:new Date()}});
  await tx.formTemplate.updateMany({data:{status:'ARCHIVED',deletedAt:new Date()}});
  for(let i=1;i<users.length;i++){const u=users[i];await tx.user.create({data:{id:u.id,firstName:u.firstName,lastName:u.lastName,email:u.email,employeeId:u.employeeId,passwordHash:hash,roleId:roles[u.roleName],campusId:campus.id,collegeId:college.id,programId:u.scope==='CS'?cs.id:bhs.id,status:'ACTIVE',mustChangePassword:false,createdAt:when(1,8,i),updatedAt:when(1,8,i),lastLogin:when(29+i%3,8,i)}});}
  const folderByUser=new Map(),repoByUser=new Map();
  for(const u of users){const repo=await tx.repository.create({data:{ownerId:u.id,createdAt:when(1,8)}});repoByUser.set(u.id,repo.id);const folders=[];for(const [k,name]of ['Accreditation Evidence','Academic Records','Quality Management','Working Files'].entries()){const f=await tx.folder.create({data:{name,ownerId:u.id,repositoryId:repo.id,campusId:campus.id,collegeId:college.id,programId:null,color:['#2563eb','#10b981','#8b5cf6','#f59e0b'][k],createdAt:when(1+k,8),updatedAt:when(1+k,8)}});folders.push(f);audit(u,'folder.created','Folder',f.id,name,when(1+k,8));}folderByUser.set(u.id,folders);}
  for(const d of documents){const owner=users.find(u=>u.id===d.ownerId),folders=folderByUser.get(d.ownerId);let folder=folders[d.j%4];const moved=d.j%4===0;const deleted=d.j===7&&users.indexOf(owner)%4===0;const updatedDay=moved?Math.min(31,d.updatedDay+1):d.updatedDay;
   await tx.document.create({data:{id:d.id,title:d.title,description:'October 2026 presentation sample. Fictional records for demonstration.',metadata:{presentation:true,reportingPeriod:'2026-10'},ownerId:d.ownerId,campusId:campus.id,collegeId:college.id,programId:d.scope==='CS'?cs.id:bhs.id,repositoryId:repoByUser.get(d.ownerId),folderId:(moved?folders[2]:folder).id,status:'DRAFT',createdAt:when(d.day,8+d.j%7,10+users.indexOf(owner)),updatedAt:when(updatedDay,16),deletedAt:deleted?when(30,15):null}});
   for(const v of d.versions){await tx.documentVersion.create({data:{...v,documentId:d.id}});audit(owner,v.versionNumber===1?'document.created':'document.version_added','Document',d.id,d.title,v.uploadedAt,{version:v.versionNumber});}
   const latest=d.versions.at(-1);d.currentVersionId=latest.id;d.deleted=deleted;
   await tx.document.update({where:{id:d.id},data:{currentVersionId:latest.id,updatedAt:when(updatedDay,16)}});
   if(moved)audit(owner,'document.updated','Document',d.id,d.title,when(updatedDay,16),{operation:'move',from:folder.name,to:folders[2].name});
   if(d.j%4===1)audit(owner,'document.updated','Document',d.id,d.title,when(updatedDay,15),{operation:'rename',previousTitle:'October working copy',newTitle:d.title});
   for(let a=0;a<2+d.j%3;a++)audit(owner,'document.downloaded','Document',d.id,d.title,when(Math.min(31,updatedDay+a),16,a*10));
   if(deleted)audit(owner,'document.deleted','Document',d.id,d.title,when(30,15));
   if(d.j===2){await tx.repositoryFavorite.create({data:{ownerId:owner.id,documentId:d.id,createdAt:when(Math.min(31,updatedDay+1),15)}});}
   if(d.j===1)await tx.repositoryRecent.create({data:{ownerId:owner.id,itemType:'DOCUMENT',itemId:d.id,lastOpenedAt:when(31,10)}});
   await tx.documentTag.createMany({data:[{documentId:d.id,tag:'October 2026'},{documentId:d.id,tag:d.scope==='CS'?'Computer Science':'Human Services'}]});
  }
  const cycle=await tx.accreditationCycle.create({data:{name:'October 2026 Accreditation Readiness',code:'PRESENTATION-OCT2026',status:'ACTIVE',startDate:when(1),endDate:when(31,17),createdBy:root.id,createdAt:when(1,8),updatedAt:when(1,8)}});
  const areaIds=[],requirementIds=[];let submissionCount=0,taskCount=0;
  for(let ai=0;ai<areasSpec.length;ai++){
   const [set,scope,number,name,titles]=areasSpec[ai],programId=scope==='CW'?null:scope==='CS'?cs.id:bhs.id,owner=users[1+ai%4];
   const area=await tx.aaccupArea.create({data:{code:`${set}-AREA-${number}-${scope}-OCT26`,name,areaSet:set,campusId:campus.id,collegeId:college.id,programId,accreditationCycleId:cycle.id,createdBy:owner.id,status:'ACTIVE',description:`${set} evidence preparation for ${scope==='CW'?'the entire College of Science':scope==='CS'?'Computer Science':'Bachelor of Human Services'}. October 2026 presentation dataset.`,createdAt:when(1+ai%3,9),updatedAt:when(30,16)}});areaIds.push(area.id);
   const template=await tx.requirementTemplate.create({data:{name:`${set} - ${name}`,code:`OCT26-${set}-${scope}-${number}`,areaSet:set,status:'ACTIVE',category:set,version:1,createdBy:root.id,metadata:{presentation:true},createdAt:when(1,9),updatedAt:when(1,9)}});
   const assignment=await tx.requirementAssignment.create({data:{templateId:template.id,targetType:'AACCUP_AREA',targetId:area.id,dueDate:when(31,17),createdBy:owner.id,createdAt:when(2,9),updatedAt:when(2,9)}});
   const nodes=[];
   for(let ri=0;ri<titles.length;ri++){
    const node=await tx.requirementNode.create({data:{templateId:template.id,code:`${set}-${number}.${ri+1}`,name:titles[ri],description:`Submit the controlled October 2026 copy of the ${titles[ri].toLowerCase()}.`,helpText:'Use a readable PDF with the document date, responsible personnel and version number.',type:'REQUIREMENT',sortOrder:ri,isRequired:true,createdBy:root.id,createdAt:when(1,9),updatedAt:when(1,9)}});
    await tx.requirementValidation.create({data:{nodeId:node.id,type:'FILE_TYPE',config:{allowedMimeTypes:['application/pdf'],allowedExtensions:['.pdf']},message:'Upload the controlled PDF document.',severity:'ERROR',createdBy:root.id,createdAt:when(1),updatedAt:when(1)}});nodes.push({...node,validations:[]});
    const req=await tx.aaccupRequirement.create({data:{areaId:area.id,title:titles[ri],description:node.description,documentCode:node.code,category:name,isRequired:true,displayOrder:ri,createdBy:owner.id,sourceNodeId:node.id,sourceAssignmentId:assignment.id,sourceTemplateVersion:1,createdAt:when(2),updatedAt:when(2)}});requirementIds.push(req.id);
    const eligible=users.filter(u=>['FACULTY','STAFF','DEPARTMENT_COORDINATOR'].includes(u.roleName)&&(scope==='CW'||u.scope===scope));const submitter=eligible[(ai+ri)%eligible.length];
    const doc=documents.find(d=>d.evidenceFor===`${ai}:${ri}`),version=doc.versions.at(-1);const index=ai*4+ri;
    const status=['APPROVED','APPROVED','APPROVED','PENDING','APPROVED','NEEDS_REVISION','APPROVED','REJECTED','PENDING','APPROVED'][index%10];
    const submittedDay=Math.max(doc.updatedDay,15+(index%12)),reviewDay=Math.min(31,submittedDay+1),reviewed=status!=='PENDING';
    const taskStatus=status==='APPROVED'?'COMPLETED':status==='NEEDS_REVISION'?'NEEDS_REVISION':'IN_PROGRESS';
    const task=await tx.aaccupTask.create({data:{areaId:area.id,requirementId:req.id,requirementTemplateId:template.id,sourceAssignmentId:assignment.id,title:`Prepare ${titles[ri]}`,description:'Consolidate, validate and submit October 2026 accreditation evidence.',assigneeType:'USER',assigneeId:submitter.id,assigneeLabel:`${submitter.firstName} ${submitter.lastName}`,createdBy:owner.id,status:taskStatus,priority:['HIGH','MEDIUM','MEDIUM','LOW'][ri],dueDate:when(31,17),completedAt:taskStatus==='COMPLETED'?when(reviewDay,15):null,createdAt:when(3+index%5,9),updatedAt:when(reviewDay,15)}});taskCount++;
    if(index%4===0){const oldDay=Math.max(doc.day,submittedDay-2);await tx.aaccupSubmission.create({data:{requirementId:req.id,documentId:doc.id,submittedBy:submitter.id,reviewedBy:owner.id,status:'NEEDS_REVISION',remarks:'Please include the document date and responsible personnel in the revised copy.',isCurrent:false,submittedAt:when(oldDay,10),reviewedAt:when(Math.min(submittedDay,oldDay+1),14),createdAt:when(oldDay,10),updatedAt:when(Math.min(submittedDay,oldDay+1),14),snapshotFilename:doc.versions[0].filename,snapshotMimeType:'application/pdf',snapshotSizeBytes:doc.versions[0].sizeBytes,snapshotChecksum:doc.versions[0].checksum}});submissionCount++;}
    const submission=await tx.aaccupSubmission.create({data:{requirementId:req.id,documentId:doc.id,taskId:task.id,submittedBy:submitter.id,reviewedBy:reviewed?owner.id:null,status,isCurrent:true,remarks:status==='APPROVED'?'Verified against the area checklist. Controlled copy accepted.':status==='NEEDS_REVISION'?'Add the supporting summary and update the coverage period.':status==='REJECTED'?'The submitted evidence does not address this requirement. Please prepare the correct document.':'Submitted for quality assurance review.',submittedAt:when(submittedDay,11),reviewedAt:reviewed?when(reviewDay,15):null,createdAt:when(submittedDay,11),updatedAt:when(reviewDay,15),snapshotFilename:version.filename,snapshotMimeType:version.mimeType,snapshotSizeBytes:version.sizeBytes,snapshotChecksum:version.checksum}});submissionCount++;
    audit(submitter,'aaccup_submission.created','AaccupSubmission',submission.id,titles[ri],when(submittedDay,11),{area:name,areaSet:set});if(reviewed)audit(owner,'aaccup_submission.reviewed','AaccupSubmission',submission.id,titles[ri],when(reviewDay,15),{decision:status});
    await tx.notification.create({data:{userId:reviewed?submitter.id:owner.id,type:status==='APPROVED'?'AACCUP_SUBMISSION_APPROVED':status==='NEEDS_REVISION'?'AACCUP_SUBMISSION_RETURNED':status==='REJECTED'?'AACCUP_SUBMISSION_REJECTED':'AACCUP_SUBMISSION_PENDING_REVIEW',title:status==='PENDING'?'Evidence awaiting review':`Evidence ${status.toLowerCase().replaceAll('_',' ')}`,message:`${titles[ri]} - ${name}`,entity:'AaccupSubmission',entityId:submission.id,actionUrl:reviewed?`/user/submissions?areaSet=${set}`:`/submissions?areaSet=${set}`,metadata:{presentation:true},createdAt:when(reviewDay,15),updatedAt:when(reviewDay,15),readAt:index%3===0?when(31,16):null}});
   }
   await tx.requirementVersion.create({data:{templateId:template.id,version:1,changeType:'CREATED',data:{name:template.name,code:template.code,description:template.description,category:set,areaSet:set,status:'ACTIVE',metadata:{presentation:true},nodes},changedById:root.id,changeNote:'October 2026 presentation baseline',createdAt:when(1)}});
   await tx.requirementHistory.create({data:{templateId:template.id,action:'CREATED',versionTo:1,actorId:root.id,newValue:{name:template.name,presentation:true},createdAt:when(1)}});
   audit(owner,'aaccup_area.created','AaccupArea',area.id,name,when(1+ai%3,9));
  }
  // Document access requests, approved deliveries and share activity.
  for(let i=0;i<24;i++){
   const requester=users[8+i%12],source=documents.filter(d=>d.ownerId!==requester.id&&!d.deleted)[i*3%140],status=['PENDING','APPROVED','REJECTED','FULFILLED'][i%4],day=8+i%18;
   const request=await tx.documentRequest.create({data:{requesterId:requester.id,documentId:source.id,title:`Request for ${source.title}`,justification:'For cross-checking the October accreditation evidence and preparing the consolidated college report.',status,decidedById:status==='PENDING'?null:users[1].id,decidedAt:status==='PENDING'?null:when(day+1,14),decisionNote:status==='REJECTED'?'Use the current approved summary instead of this working document.':status==='PENDING'?null:'Access approved for accreditation preparation.',createdAt:when(day,9),updatedAt:when(day+1,14)}});
   await tx.documentRequestItem.create({data:{requestId:request.id,documentId:source.id,createdAt:when(day,9)}});audit(requester,'request.created','DocumentRequest',request.id,request.title,when(day,9));
   if(status!=='PENDING')audit(users[1],`request.${status.toLowerCase()}`,'DocumentRequest',request.id,request.title,when(day+1,14));
   if(['APPROVED','FULFILLED'].includes(status))await tx.documentShare.upsert({where:{documentId_userId:{documentId:source.id,userId:requester.id}},create:{documentId:source.id,userId:requester.id,permission:'READ',createdAt:when(day+1,14)},update:{}});
  }
  for(let i=0;i<users.length;i++){const u=users[i];for(let day=1+i%3;day<=31;day+=3){audit(u,'auth.login.success','User',u.id,`${u.firstName} ${u.lastName}`,when(day,8,i),{sessionType:'presentation sample'});audit(u,'auth.logout','User',u.id,`${u.firstName} ${u.lastName}`,when(day,17,i));}}
  for(let i=0;i<3;i++)await tx.bugReport.create({data:{reporterId:users[8+i].id,tab:['My Documents','AACCUP','My Requests'][i],description:['PDF preview takes longer for a revised document. Refreshing the preview resolves the display.','The area selection should stay visible after switching between college-wide and program requirements.','Please make the request status explanation clearer after the administrator returns a decision.'][i],createdAt:when(12+i*6,14)}});
  await tx.auditLog.createMany({data:audits});
  await tx.auditLog.create({data:{userId:root.id,action:'presentation.dataset_reset',category:'SYSTEM',entity:'PresentationDataset',actorName:`${root.firstName} ${root.lastName}`,actorRole:'ROOT',metadata:{synthetic:false,authorizedReset:true,period:'2026-10',backup:path.basename(backup),note:'Historical activity entries are generated presentation samples.'}}});
  return {activeUsers:await tx.user.count({where:{deletedAt:null}}),documents:documents.length,fileVersions:documents.reduce((n,d)=>n+d.versions.length,0),areas:areaIds.length,requirements:requirementIds.length,submissions:submissionCount,tasks:taskCount,requests:24,syntheticAuditEvents:audits.length,areaIds,rootId:root.id};
 },{timeout:240000,maxWait:10000});
 const credentials=['Name,Email,Role,Program,Password',...users.map(u=>`${u.firstName} ${u.lastName},${u.email},${u.roleName},${u.scope},${u.id===root.id?'Existing ROOT password unchanged':password}`)].join('\n');
 fs.writeFileSync(path.join(output,'demo-accounts.csv'),credentials);
 fs.writeFileSync(path.join(output,'completed.json'),JSON.stringify({...result,period:'October 1-31, 2026 (Asia/Manila)',generatedAt:new Date().toISOString(),backup,organizationPreserved:true,oldFileObjectsRetained:true,oldUsersArchived:true},null,2));
 console.log(JSON.stringify(result));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>p.$disconnect());

