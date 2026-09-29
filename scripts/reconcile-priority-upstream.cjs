'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const asset='assets/priority-regimens.js';
let code=fs.readFileSync(asset,'utf8');
if(code.includes("const version='2026-09-28.priority.1'")){
 code=code.replace("const version='2026-09-28.priority.1'","const version='2026-09-28.priority.2'");
 // A migração de versão preserva a origem documental; não comprova nova consulta à fonte.
 fs.writeFileSync(asset,code);
}
let html=fs.readFileSync('index.html','utf8');
if(!html.includes('PPS_UPSTREAM_SCOPED_ROUTES')){
 const needle='      function populateMedicationFromEvidence(regimen, presentation, evidenceKey) {';
 assert.ok(html.includes(needle));
 html=html.replace(needle,needle+`
        /* PPS_UPSTREAM_SCOPED_ROUTES */
        if (regimen.medication === 'Nistatina + óxido de zinco') return window.PPSPriority ? window.PPSPriority.use('nystatin-zinc-diaper','nyz-60','standard',evidenceKey) : false;
        if (regimen.medication === 'Salbutamol aerossol 100 mcg/jato') {
          status.textContent = 'Este card descreve tratamento inicial supervisionado da exacerbação, não uma receita domiciliar. Para o plano de resgate ambulatorial, use o bloco reconciliado; a referência de crise foi preservada.';
          return false;
        }
`);
 if(html.includes('      function populateReadyCatalogMedication(card, medication, regimen) {')){
  html=html.replace('      function populateReadyCatalogMedication(card, medication, regimen) {',`      function populateReadyCatalogMedication(card, medication, regimen) {
        if (Number(medication.fiche) === 166) {
          if (!window.PPSPriority) return false;
          const p=Number(regimen?.concentration_mg_ml)===500?'dip-500':Number(regimen?.concentration_mg_ml)===50?'dip-50':'UNVERIFIED';
          const selected=card.querySelector('[data-selected]');const before=selected.checked;selected.checked=false;
          const ok=window.PPSPriority.use('dipyrone',p,'min');
          if(ok)card.remove();else selected.checked=before;
          return ok;
        }
`);
 }
 fs.writeFileSync('index.html',html);
}
// Preserve the new source material, but distinguish supervised crisis from home dosing.
const evidencePath='public-data/clinical-evidence.json';
const evidence=JSON.parse(fs.readFileSync(evidencePath,'utf8'));
for(const diagnosis of evidence.diagnoses||[]){
 for(const regimen of diagnosis.regimens||[]){
  if(regimen.medication==='Salbutamol aerossol 100 mcg/jato'){
   regimen.supervised_regimen_preserved=true;
   regimen.operational=false;
   regimen.note='Referência de tratamento supervisionado da exacerbação preservada. Não transferir doses repetidas na primeira hora à receita domiciliar. Resgate ambulatorial selecionável no bloco reconciliado.';
  }
 }
}
fs.writeFileSync(evidencePath,JSON.stringify(evidence,null,2)+'\n');
console.log('Concurrent main reconciled without deleting prior source material; four scoped medication regimes, six presentations.');
