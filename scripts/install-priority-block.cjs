'use strict';
const fs=require('node:fs');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const core=require('../assets/priority-regimens.js');
const stamp=new Date().toISOString();
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const json=(p,x)=>fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n');
let html=fs.readFileSync('index.html','utf8');
const needle='      function populateMedicationFromEvidence(regimen, presentation, evidenceKey) {';
assert.ok(html.includes(needle),'Não localizaram a função de integração existente; nenhuma substituição ampla permitida.');
const marker='/* PPS_PRIORITY_ROUTE_V1 */';
if(!html.includes(marker))html=html.replace(needle,needle+`
        ${marker}
        if (regimen.medication === 'Amoxicilina oral') {
          if (!window.PPSPriority) { status.textContent = 'Módulo de dose não carregado; não gerar esquema.'; return false; }
          const concentration = Number(presentation?.concentration_mg_ml);
          const id = concentration === 50 ? 'amox-250' : concentration === 80 ? 'amox-400' : 'UNVERIFIED';
          return window.PPSPriority.use('amox-gas', id, 'standard', evidenceKey);
        }
        if (regimen.medication === 'Benzilpenicilina benzatina intramuscular' && medicationCards().some(card => card.querySelector('[data-selected]').checked && /amoxicilina/i.test(card.querySelector('[data-field="name"]').value))) {
          status.textContent = 'Escolha apenas um esquema etiológico para a faringite: amoxicilina OU benzilpenicilina benzatina.';
          return false;
        }
`);
const script='<script src="./assets/priority-regimens.js"></script>';
if(!html.includes(script)){assert.equal((html.match(/<\/body>/g)||[]).length,1);html=html.replace('</body>',script+'\n</body>');}
html=html.replace('Não diagnostica nem calcula doses. Registre o esquema definido na avaliação clínica e confira cada informação antes de emitir.','Calcula somente os esquemas reconciliados dentro do escopo exibido. Confira a indicação e os dados do paciente antes de emitir.');
fs.writeFileSync('index.html',html);
const catalog=JSON.parse(fs.readFileSync('public-data/catalog.json','utf8'));
const before=catalog.medications.map(m=>({fiche:m.fiche,name:m.name}));
const targetIds=new Set([35,166,318,319,381]);
const untouched=new Map(catalog.medications.filter(m=>!targetIds.has(m.fiche)).map(m=>[m.fiche,JSON.stringify(m)]));
const candidates=JSON.parse(fs.readFileSync('public-data/medication-gap-evidence-candidates.json','utf8'));
const audit={schema_version:'1.0',reviewed_at:stamp,version:core.version,candidate_file_sha256:crypto.createHash('sha256').update(fs.readFileSync('public-data/medication-gap-evidence-candidates.json')).digest('hex'),method:'Triagem dos candidatos por ficha; metadados de busca não comprovam posologia. Decisões são limitadas aos regimes documentados, com fontes e testes. Não houve auditoria humana independente.',targets:[]};
const targets=catalog.medications.filter(m=>targetIds.has(m.fiche));assert.equal(targets.length,5,'As cinco fichas-alvo devem existir.');
for(const med of targets){
 const found=(candidates.results||[]).find(x=>x.fiche===med.fiche);
 const items=found?.candidate_sources||[];const valid=items.filter(x=>!x.error),errors=items.filter(x=>x.error);
 const keys=valid.map(x=>x.doi?`doi:${norm(x.doi)}`:x.id&&/pubmed|europe/i.test(x.source)?`id:${x.id}`:x.url||JSON.stringify(x));
 const matching=core.records.filter(r=>r.fiche===med.fiche||r.id==='dipyrone'&&med.fiche===166);
 const row={fiche:med.fiche,name:med.name,searched_at:found?.searched_at||null,upstream_operational_status:found?.operational_status||null,candidates:valid.length,request_errors:errors.length,unique_identifiers:new Set(keys).size,duplicates_by_identifier:keys.length-new Set(keys).size,sample_titles:valid.slice(0,5).map(x=>({title:x.title,url:x.url,id:x.id,source:x.source})),errors:errors.map(x=>({source:x.source,error:x.error})),verdict:'DISCOVERY_ONLY: contagem de resultados não é validação clínica',ready_regimen_ids:matching.map(x=>x.id),remaining:matching.length?matching.map(x=>x.remaining):['Não foi confirmada formulação dermatológica brasileira isolada para fraldas. Suspensão oral e creme vaginal não foram equiparados à pomada.']};
 audit.targets.push(row);
 med.ready_regimen_ids=[...new Set([...(med.ready_regimen_ids||[]),...matching.map(x=>x.id)])];
 med.regimen_registry='public-data/priority-regimens.json';
 med.partial_operational_status=matching.length?'PARTIALLY_READY':'TARGET_AUDITED_PENDING_PRESENTATION';
 // Preservar resolution e auto_research: outras indicações continuam na fila.
 console.log(JSON.stringify({candidate_audit:row}));
}
assert.deepEqual(catalog.medications.map(m=>({fiche:m.fiche,name:m.name})),before);
for(const m of catalog.medications)if(untouched.has(m.fiche))assert.equal(JSON.stringify(m),untouched.get(m.fiche));
json('public-data/catalog.json',catalog);
const registry={schema_version:'1.0',version:core.version,reviewed_at:stamp,human_independent_review:false,ready_meaning:'Regime/presentação/população codificados; não aprovação de toda a monografia, não prescrição sem revisão do caso.',sources:core.sources,regimens:core.records.map(r=>({...r,fiche:r.id==='dipyrone'?166:r.fiche})),dipyrone_label_bands:core.bands,software_rounding:'Amoxicilina: para baixo em 0,1 mL, desvio relativo <=5%, alvo e dose administrada mostrados; regra do software, não uma regra textual do CDC.',automated_tests:'A publicação deste registro ocorre somente após testes de cálculo e navegador do workflow PPS priority release.'};
json('public-data/priority-regimens.json',registry);
json('public-data/priority-candidate-audit.json',audit);
const regimensInstalled=registry.regimens.length;
const presentationsInstalled=registry.regimens.reduce((total,regimen)=>total+((regimen.presentations||[]).length),0);
console.log(`INSTALL_READY: ${regimensInstalled} regimes, ${presentationsInstalled} apresentações; ${before.length} fichas preservadas.`);
// Partial legacy installation does not close the monograph's other indication scopes.
// Reconcile the scoped projection when the audited resolver is available.
const resolver=require('node:path').join(__dirname,'resolve-medication-gaps.mjs');
if(fs.existsSync(resolver)){
 const result=require('node:child_process').spawnSync(process.execPath,[resolver],{stdio:'inherit'});
 if(result.status!==0)throw new Error('Scoped gap reconciliation failed after priority installation.');
}
