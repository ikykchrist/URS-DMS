# QA-DMS User Manual
Original local build | Prepared 04 November 2026
Filipino instructions / English UI labels

## Mag-sign in at kilalanin ang portal
Role: LAHAT NG ACCOUNT
Path: Sign In
Buksan ang local QA-DMS at gamitin ang account na ibinigay ng administrator. Ang role at organization ng account ang nagtatakda ng available na pages at records.

1. Buksan ang http://localhost:5173/ sa browser.
2. Ilagay ang Email Address at Password, pagkatapos ay piliin ang Sign In.
3. Tingnan ang pangalan at role sa itaas. Ang faculty at staff ay gumagamit ng User Portal; may management pages ang authorized admins.
4. Gamitin ang Logout kapag tapos na. Kung hindi makapasok, gamitin ang Forgot password? o humingi ng tulong sa administrator.

Tandaan: Walang personal password sa manual na ito. Hiwalay na ibinibigay ang presentation account list.

## Dashboard at notifications
Role: USER
Path: User Portal > Dashboard
Ang dashboard ang mabilis na simula para makita ang kailangang gawin: assigned tasks, submissions na dapat baguhin, request updates, at recent activity.

1. Buksan ang Dashboard sa sidebar.
2. Tingnan ang Tasks needing action at Submissions to revise. Buksan ang kaugnay na task o submission para makita ang detalye.
3. Gamitin ang My Accreditation Progress para suriin ang sarili mong progress.
4. Buksan ang Notifications o bell icon para sa updates. Gamitin ang My Activity para sa history ng sariling account.

Tandaan: Ang personal submission progress ay maaaring iba sa shared area progress ng buong program o college.

## Ayusin ang personal repository
Role: USER / ADMIN / ROOT
Path: My Documents
Ang My Documents ay sariling repository ng bawat account. Ang personal files ng ibang user ay hindi awtomatikong nabubuksan ng administrator.

1. Piliin ang My Documents. Gamitin ang New Folder para gumawa ng malinaw na folder name.
2. Single-click para pumili; double-click para buksan ang folder o file.
3. Gamitin ang Upload upang maglagay ng file sa kasalukuyang folder. Hintaying matapos ang upload bago umalis.
4. Gamitin ang search, file-type filter, at List o Grid view. Ang breadcrumb ay bumabalik sa parent folder.
5. Tingnan ang Shared with Me, Favorites, Recent, Requested Documents, o Recycle Bin ayon sa kailangan.

Tandaan: Panatilihing malinaw ang filename at reporting period. Ang paglipat ng file ay hindi kapalit ng accreditation submission.

## Preview, download at file actions
Role: USER / ADMIN / ROOT
Path: My Documents > File Actions / Preview
Buksan ang isang file para mabasa ang current version at makita ang metadata at activity. Ang available na actions ay nakadepende sa access ng account.

1. Double-click ang file, o gamitin ang Actions menu at piliin ang Preview.
2. Sa Preview, gamitin ang Download o Print kung available. Maaaring i-download ang file type na walang inline preview.
3. Buksan ang Details & Activity para makita ang version at activity information.
4. Gamitin ang Rename, Move, o Delete kung ikaw ang may access. Ang recoverable deleted records ay makikita sa Recycle Bin.
5. Piliin ang Replace Version sa Actions menu para sa revised copy. Mapapanatili ang document identity at version history.

Tandaan: Bago mag-delete o mag-replace, siguraduhing tama ang napiling file. Maaaring pigilan ang permanent deletion ng file na ginagamit sa accreditation evidence.

## Humiling ng access sa dokumento
Role: USER
Path: User Portal > My Requests
Ang My Requests ay para sa formal na paghiling ng dokumento o access. Iba ito sa pag-submit ng accreditation evidence.

1. Buksan ang My Requests at piliin ang Request Files.
2. Piliin ang mga available na dokumento at ilagay ang malinaw na justification. Sundin ang file limit ng request dialog.
3. I-submit ang request at tingnan ang status sa listahan.
4. Gamitin ang View para sa request details. Kung Pending pa at may Cancel request, maaari itong kanselahin.
5. Kapag approved o fulfilled, tingnan ang Requested Documents o access na ipinagkaloob sa iyo.

Tandaan: Pending = naghihintay ng desisyon; Approved = pinayagan; Fulfilled = na-deliver; Rejected = hindi pinayagan. Basahin ang decision note.

## Piliin ang tamang accreditation area
Role: USER
Path: User Portal > Accreditation > AACCUP / ISO
Sa AACCUP at ISO, makikita ang area number, area name, campus, college, at audience. Lumalabas lang ang requirements matapos mag-attach ang admin ng template sa area.

1. Buksan ang Accreditation at piliin ang AACCUP o ISO 21001:2025.
2. Piliin ang College-wide para sa requirements ng buong college, o Program areas para sa sariling program.
3. Piliin ang area tab at basahin ang Area number at name.
4. Suriin ang Applies to at reporting cycle bago pumili ng requirement.
5. Basahin ang required indicator, description, upload rules, at kasalukuyang submission status.

Tandaan: Kung walang requirements, maaaring wala pang attached active template o hindi sakop ng account ang area. Ipa-check ang campus, college at program sa admin.

## Mag-submit ng accreditation evidence
Role: USER
Path: Accreditation > Requirement > Submit
Isang evidence submission ang nag-uugnay ng file sa isang specific requirement. Sinusuri ang file ayon sa upload rules bago ito tanggapin.

1. Sa tamang area at requirement, piliin ang Submit.
2. I-check ang requirement code, area number, at program sa Submit Evidence dialog.
3. Mag-upload ng file, o gamitin ang Choose from My Documents para sa existing document.
4. Ayusin ang Document Title at magdagdag ng Remarks kung kailangan. Sundin ang allowed file type at ibang rules.
5. Mag-scroll pababa sa dialog kung kailangan. Piliin ang Upload and Submit kapag enabled, hintayin ang confirmation, at i-check ang My Submissions.

Tandaan: Hindi sapat ang pag-upload lang sa My Documents. Kailangang ma-submit ang file sa requirement upang pumasok sa admin review queue.

## Submissions, revisions at Unsubmit
Role: USER
Path: Accreditation > My Submissions
Ang My Submissions ang listahan ng sariling evidence at review results. Piliin ang tamang AACCUP o ISO set at gamitin ang filters.

1. Buksan ang My Submissions. I-check ang area at status ng dokumento.
2. Pending: nasa review queue. Approved: tinanggap ng reviewer. Returned: kailangan ng revision. Rejected: hindi tinanggap ang evidence.
3. Kapag kailangan ng correction, basahin ang remarks at isumite ang tamang revised evidence mula sa area o task.
4. Kung available ang Unsubmit, buksan ito at kumpirmahin ang Unsubmit evidence para bawiin ang pending o returned record.
5. Pagkatapos mag-unsubmit, manatili ang file sa My Documents at maaari itong gamitin muli.

Tandaan: Hindi maaaring i-unsubmit ang Approved evidence. Ang historical returned row at current approved row ay magkaibang submission records.

## Mga task at deadline
Role: USER
Path: Accreditation > My Tasks
Ang task ay assigned work item para sa area. Hindi awtomatikong nagkakaroon ng task dahil lang may requirement template.

1. Buksan ang My Tasks at piliin ang tamang accreditation set.
2. Basahin ang task title, area, priority, due date, at required evidence.
3. Gamitin ang available na status action upang simulan o i-update ang trabaho.
4. Kung may Submit o Resubmit, buksan iyon at sundin ang evidence dialog.
5. I-check ang approved evidence count at reviewer feedback bago sabihing kumpleto na ang requirement.

Tandaan: Ang shared area progress ay panggrupo. Ang personal submission history ay hiwalay. Sa presentation data, October 31 ang maraming deadline kaya maaaring overdue na kapag November ang system date.

## Mag-report ng issue na may attachment
Role: USER / ADMIN / ROOT
Path: Sidebar > Bug Report
Gamitin ang Bug Report upang maipaliwanag ang reproducible issue at mailakip ang screenshot o supporting file.

1. Buksan ang Bug Report o Bug Reports.
2. Piliin ang Affected tab. Ilarawan ang steps, aktuwal na nangyari, at inaasahang result.
3. Piliin ang Attach file kung may screenshot o supporting document.
4. Gamitin ang PNG, JPG, WebP o PDF na hanggang 5 MB. I-check ang napiling filename.
5. Piliin ang Submit report at hintayin ang confirmation.

Tandaan: Huwag isama ang password sa report o screenshot. Ang attachment ay supporting evidence ng issue, hindi accreditation evidence.

## Admin: campus, college at audience
Role: ADMIN / ROOT
Path: Admin > Accreditation > Campus > College
Pareho ang location flow ng AACCUP at ISO. Piliin muna ang organization bago gumawa o mag-manage ng areas.

1. Buksan ang Accreditation at piliin ang AACCUP o ISO 21001:2025.
2. Piliin ang Campus card, pagkatapos ang College card.
3. Sa college workspace, piliin ang College-wide o By program.
4. Kung By program, piliin ang program bago gumawa o magbukas ng area.
5. Gamitin ang breadcrumb para bumalik. I-check ang Applies to label upang maiwasan ang maling audience.

Tandaan: College-wide areas ay para sa matching campus at college. Program areas ay para sa matching program. Ang template library ay hindi awtomatikong user assignment.

## Admin: gumawa at mag-edit ng area
Role: ADMIN / ROOT
Path: Admin > Accreditation workspace > Add Area
Kapag nasa tamang college o program workspace, minamana ng bagong area ang napiling location. Ang requirement template ay ikakabit sa loob ng area.

1. Piliin muna ang campus, college, at College-wide o program audience.
2. Piliin ang Add Area at ilagay ang Area name.
3. Buksan ang Optional details kung kailangan ng description o ibang available setting.
4. Piliin ang Create area at buksan ang bagong card.
5. Gamitin ang Edit sa area card o detail page para sa corrections. Gamitin lang ang Archive kapag hindi na aktibong gagamitin ang area.

Tandaan: Suriin muna ang location bago mag-save. Iwasang gumawa ng duplicate area para sa parehong audience at accreditation set.

## Admin: ikabit ang requirement template
Role: ADMIN / ROOT
Path: Area detail > Requirements
Ito ang mahalagang link sa pagitan ng Root Requirement Builder at user side. Nagiging available ang requirements sa users matapos ang explicit area attachment.

1. Buksan ang area card at piliin ang Requirements tab.
2. Hanapin ang Requirement template control.
3. Piliin ang active template para sa tamang AACCUP o ISO set.
4. Piliin ang Apply to area. I-check ang projected requirements at requirement codes sa listahan.
5. Kung papalitan ang template, gamitin muna ang Remove template at pagkatapos ay piliin ang kapalit.

Tandaan: Pinananatili ang submission history kapag inalis ang attachment. Hiwalay ang task creation; hindi awtomatikong nag-a-assign ng trabaho ang template attachment.

## Admin: suriin ang Pending evidence
Role: ADMIN / ROOT
Path: Admin > Accreditation > Submissions
Sa submission review, Pending records lang ang may action buttons. Sa hindi Pending, basahin ang record gamit ang double-click.

1. Buksan ang Submissions at piliin ang set, area, program, at Pending filter kung kailangan.
2. Gamitin ang View o Download upang suriin ang mismong document at ang requirement na tinutugunan nito.
3. Approve kung sapat at tama ang evidence.
4. Return kung may kailangang baguhin; ilagay ang specific reason at optional reference attachment.
5. Reject kung hindi katanggap-tanggap ang evidence. Hintayin ang refreshed status at i-check ang notification/result.

Tandaan: Hindi dapat i-approve dahil lang may file. Suriin ang tamang area, version, reporting period, completeness at reviewer remarks.

## Admin: document requests at access
Role: ADMIN / ROOT
Path: Admin > Requests
Ang Requests page ay para sa access o issuance requests. Basahin ang requester, files, at justification bago magdesisyon.

1. Buksan ang Requests at hanapin ang record gamit ang search o status filter.
2. Suriin kung tama ang requested files at ang purpose ng requester.
3. Gamitin ang Approve para sa lehitimong request.
4. Gamitin ang Reject at reason kung hindi dapat ibigay ang access.
5. I-check ang final status at kaugnay na delivery o access result.

Tandaan: Magkaiba ang request approval at accreditation approval. Ang pag-approve ng request ay hindi awtomatikong nag-a-approve ng evidence requirement.

## Admin: account at organization scope
Role: ADMIN / ROOT
Path: Admin > User Management
Ang role ang kumokontrol sa available na functions. Ang campus, college at program ang tumutulong magtakda ng tamang accreditation audience.

1. Buksan ang User Management at hanapin ang account.
2. Gamitin ang available na add o invite action para sa bagong account.
3. Itakda nang tama ang role, campus, college at program.
4. Gamitin ang View at Actions para sa available account operations at status management.
5. Kapag hindi makita ng user ang area, i-check muna ang organization assignment at account status.

Tandaan: May 20 active presentation accounts. Fictional ang mga demo personnel. Hiwalay ang account CSV sa manual; hindi kasama rito ang personal credentials.

## Audit history at October reporting
Role: ADMIN / ROOT
Path: Admin > Audit Logs / Root > System Audit
Ang Audit Logs ay nagpapakita ng actor, action, module, timestamp at result. Ang date presets ay nakabatay sa aktuwal na kasalukuyang petsa.

1. Buksan ang Audit Logs. Gamitin ang Submissions, Requests o Login Activity preset ayon sa kailangan.
2. Gamitin ang search at action/status filters. Piliin ang Reset upang alisin ang kasalukuyang filters.
3. Buksan ang available record details para suriin ang action at target.
4. Para sa October report, gamitin ang Export CSV at piliin ang October 1-31, 2026 sa date fields.
5. Basahin ang timestamps sa Asia/Manila context. Ang live actions pagkatapos ng seed ay may tunay na current date.

Tandaan: Ang 1,830 October audit entries ay generated presentation samples na may synthetic metadata. Huwag gamitin bilang ebidensiya ng totoong institutional activity.

## Root: overview at organization
Role: ROOT
Path: Root Console > Platform Overview / Organization
Ang Root Console ay para sa platform configuration. Ang Organization ang source ng campus, college at program choices sa accreditation setup.

1. Buksan ang Platform Overview para sa system summaries at storage counts.
2. Sa Organization, piliin ang campus, college, office o program tab.
3. Gumawa o mag-edit ng record gamit ang malinaw na name, code at tamang parent organization.
4. Suriin ang hierarchy at available history bago mag-archive o mag-restore.
5. Gumamit ng stable codes at iwasang magdoble ng existing organization records.

Tandaan: Pinanatili ang existing campus/college/program setup sa presentation reset. Root-only ang configuration pages; hindi ito normal faculty workflow.

## Root: reusable folder structures
Role: ROOT
Path: Root Console > Folder Builder
Ang Folder Builder ay library ng reusable folder trees at scope assignments. Hindi nito awtomatikong nililipat ang existing user files.

1. Piliin ang Create Template o isang existing template.
2. Ilagay ang name, code, description at status.
3. Gamitin ang Add root folder at node Actions upang gumawa, mag-nest, o maglipat ng folder nodes.
4. Suriin ang tree at preview, pagkatapos ay buksan ang Assignments.
5. Itakda ang available target scope. Gamitin ang Versions at History para sa pagbabago at rollback review.

Tandaan: Ang physical folders sa My Documents at ang folder template tree ay magkaibang records. Panatilihin ang tamang assignment para sa repository provisioning.

## Root: author requirement templates
Role: ROOT
Path: Root Console > Requirement Builder
Ang Requirement Builder ang gumagawa ng versioned checklist at evidence rules. Template library pa lang ito hangga't hindi ikinakabit ng admin sa isang area.

1. Piliin ang New Template o isang existing template sa library.
2. Itakda ang name, code, accreditation set at description.
3. Magdagdag ng grouping sections at required document nodes. Ayusin ang code, description, required state at order.
4. Gamitin ang Preview para makita ang structure at i-check ang completeness bago gawing Active.
5. Ikabit ng admin ang active template sa mismong area. Gamitin ang History o Versions upang suriin ang changes.

Tandaan: Ang edits sa active template ay versioned at maaaring makaapekto sa mga area na nakakabit dito. Suriin muna ang assigned areas bago mag-save ng structural changes.

## Root: upload rules at version history
Role: ROOT
Path: Requirement Builder > Node Actions > Validation rules
Ang validation rules ang nagsasabi kung anong file ang dapat isumite. May blocking errors at advisory warnings depende sa configuration.

1. Sa requirement node, buksan ang Actions at piliin ang Validation rules.
2. Piliin kung ano ang iche-check: file type, size o iba pang available rule.
3. Itakda ang allowed values at kung block o warning ang result.
4. Maglagay ng malinaw na message na makakatulong sa user; tiyaking enabled ang rule.
5. Mag-scroll sa dialog at i-save ang rule. Suriin ang Preview at version history, at subukan ang tamang file bago gamitin sa malawak na rollout.

Tandaan: Parehong sinusuri ang configured rules sa upload preflight at sa submission. Ang presentation templates ay may PDF file-type rule.

## Root: setup, settings at access controls
Role: ROOT
Path: Root Console > Setup Wizard / Configuration Engine
May anim na visible setup steps: Platform, Organization, Folders, Requirements, Administrators at Summary. Wala na ang Workflow Builder at Form Builder sa current build.

1. Gamitin ang Setup Wizard para sa guided configuration. Piliin ang Next o Previous at Save Progress kung kailangan.
2. Sa Platform, i-check ang identity, academic year, timezone at logo; gamitin ang Save Platform Info para sa changes.
3. Sa Configuration Engine, gamitin ang Edit at History para sa versioned settings gaya ng upload policy.
4. Sa Roles & Permissions, suriin lamang ang permissions na kailangang ibigay sa bawat role.
5. Gamitin ang Storage Maintenance at System Audit para sa system checks. I-review ang epekto ng maintenance actions bago patakbuhin.

Tandaan: Ang old /root-workflow-builder at /root-form-builder links ay bumabalik na sa Root overview. Hindi kasama ang dalawang modules sa manual workflow.
