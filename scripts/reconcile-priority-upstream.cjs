'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const asset='assets/priority-regimens.js';
let code=fs.readFileSync(asset,'utf8');
if(!code.includes("id:'nystatin-officinal'")){
 code=code.replace("const version='2026-09-28.priority.1'","const version='2026-09-28.priority.2'");
 code=code.replace("salb:{title:'GSK — texto da bula profissional Aerolin spray, reproduzido em Bula.com.br',url:'https://bula.com.br/original/aerolin-spray-aerossol',kind:'reprodução da bula; não consulta direta ao Bulário Anvisa'}","salb:{title:'GSK — Aerolin spray, bula profissional consultada diretamente no fabricante em 28/09/2026',url:'https://br.gsk.com/media/5wtj4ekh/aerolin-spray.pdf',kind:'bula no fabricante'}");
 code=code.replace('Posologia da bula profissional reproduzida, conciliada com orientação ministerial. Não houve consulta direta da renovação do registro na Anvisa.','Posologia da bula profissional consultada diretamente no fabricante e conciliada com orientação ministerial. Não representa consulta individual à situação de renovação do registro na Anvisa.');
 code=code.replace('Nistatina isolada: não foi confirmada nesta auditoria uma formulação dermatológica brasileira isolada apropriada. Não converter formulação vaginal/oral em pomada de fraldas.','Nistatina isolada foi conciliada separadamente como creme OFICINAL 100.000 UI/g do Formulário Nacional, não como produto industrializado. Não converter formulação vaginal/oral em pomada de fraldas.');
 const newRecord=`
// Reconciled with FNFB 2, revisão 02, página impressa 117.
sources.fnfb={title:'Anvisa — Formulário Nacional, nistatina creme 100.000 UI/g, p.117',url:'https://www.gov.br/anvisa/pt-br/assuntos/farmacopeia/formulario-nacional/arquivos/8065json-file-1/@@download/file',kind:'formulação oficinal; não produto industrializado'};
records.push({id:'nystatin-officinal',fiche:318,name:'Nistatina — creme oficinal',status:'READY',scope:'Candidíase cutânea, inclusive de fraldas. Formulação oficinal preparada por farmácia habilitada; não produto industrializado nem creme vaginal. Escopo auditado: ≥3 meses e <18 anos.',minMonths:3,maxMonths:216,category:'Tratamento etiológico',sources:['fnfb','cps'],presentations:[{id:'ny-100k-officinal',label:'Creme OFICINAL dermatológico 100.000 UI/g — preparação de 20 g',unitsG:100000,packG:20}],variants:[['three','Aplicar 3 vezes/dia'],['four','Aplicar 4 vezes/dia']],warnings:'Revisar alergia, integridade da pele e adequação dos excipientes com o farmacêutico, especialmente em crianças pequenas. Não aplicar grandes quantidades em pele ferida. Não substituir por formulação vaginal ou oral.',labelStatus:'Formulação do Formulário Nacional da Farmacopeia Brasileira, 2ª edição, revisão 02. Dose tópica e concentração oficiais; não equivale a registro de marca industrializada nem a validação de qualquer base manipulada.',remaining:'Disponibilidade comercial industrializada não confirmada. A farmácia deve validar a preparação, embalagem, excipientes e prazo de uso; não se inventa estabilidade ou máximo por aplicação.'});
`;
 assert.ok(code.includes('const bands=['));code=code.replace('const bands=[',newRecord+'\nconst bands=[');
 const gate=" if(id==='nystatin-officinal'&&(!/candid/.test(dx)||!/(fralda|cutan|pele)/.test(dx)||/(oral|vaginal|boca)/.test(dx)))fail('Este creme oficinal é dermatológico, para candidíase cutânea/fraldas; não para uso oral ou vaginal.');\n";
 code=code.replace(" const r={status:'READY'",gate+" const r={status:'READY'");
 const branch=` }else if(id==='nystatin-officinal'){
  if(!['three','four'].includes(variant))fail('Selecionar três ou quatro aplicações por dia.');
  r.route='Tópica dermatológica';r.applicationsDay=variant==='four'?4:3;
  r.amount='Aplicar quantidade suficiente para cobrir a área afetada, após higiene';
  r.interval=r.applicationsDay+' vezes ao dia';r.duration='Enquanto houver lesões; reavaliar persistência, piora ou irritação';
  r.quantity='20 g de creme oficinal 100.000 UI/g, preparado e dispensado por farmácia habilitada';
  r.instructions='Uso externo. Aplicar somente na pele afetada, após higiene. Não usar formulação vaginal ou oral no lugar deste creme. Conservação e prazo de uso conforme rótulo da farmácia.';
  r.formula='Formulário Nacional: 2.000.000 UI em 20 g = 100.000 UI/g; reverso: 100.000 × 20 = 2.000.000 UI. Não há dose em mg/kg, mL por aplicação, duração numérica ou máximo absoluto estabelecidos nesta monografia. A adequação da base e excipientes pertence à validação farmacêutica da preparação.';
 }else if(id==='dipyrone'){
`;
 assert.ok(code.includes(" }else if(id==='dipyrone'){"));code=code.replace(" }else if(id==='dipyrone'){",branch);
 code=code.replace(':/nistatina.*zinco/.test(n)',':/nistatina/.test(n)');
 fs.writeFileSync(asset,code);
}
let html=fs.readFileSync('index.html','utf8');
if(!html.includes('PPS_UPSTREAM_SCOPED_ROUTES')){
 const needle='      function populateMedicationFromEvidence(regimen, presentation, evidenceKey) {';
 assert.ok(html.includes(needle));
 html=html.replace(needle,needle+`
        /* PPS_UPSTREAM_SCOPED_ROUTES */
        if (regimen.medication === 'Nistatina + óxido de zinco') return window.PPSPriority ? window.PPSPriority.use('nystatin-zinc-diaper','nyz-60','standard',evidenceKey) : false;
        if (regimen.medication === 'Nistatina creme 100.000 UI/g') return window.PPSPriority ? window.PPSPriority.use('nystatin-officinal','ny-100k-officinal','three',evidenceKey) : false;
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
  if(regimen.medication==='Nistatina creme 100.000 UI/g'){
   regimen.presentation='Creme OFICINAL dermatológico 100.000 UI/g — 20 g; preparação em farmácia habilitada';
   for(const p of regimen.presentations||[])p.label=regimen.presentation;
  }
 }
}
fs.writeFileSync(evidencePath,JSON.stringify(evidence,null,2)+'\n');
const testPath='tests/priority-browser.py';let tests=fs.readFileSync(testPath,'utf8');
tests=tests.replace("count() == 4","count() == 5").replace("'four_regimens_visible'","'five_regimens_visible'");
if(!tests.includes('officinal_nystatin_not_industrial_or_vaginal')){
 const needle="    case('4 anos', 16, 'Asma com broncoespasmo')";
 assert.ok(tests.includes(needle));
 tests=tests.replace(needle,`    case('1 ano', 10, 'Candidíase de fraldas')
    card = apply('nystatin-officinal', 'ny-100k-officinal', 'three')
    assert 'OFICINAL' in card.locator('[data-field="presentation"]').input_value()
    assert '3 vezes ao dia' == card.locator('[data-field="interval"]').input_value()
    assert '20 g' in card.locator('[data-field="quantity"]').input_value()
    page.locator('button.primary').click()
    expect(page.locator('#print')).to_be_enabled()
    assert 'oficinal' in page.locator('#out-medications').inner_text().lower()
    checks.append('officinal_nystatin_not_industrial_or_vaginal')

`+needle);
}
fs.writeFileSync(testPath,tests);
const unitPath='tests/priority-regimens.test.cjs';let unit=fs.readFileSync(unitPath,'utf8');
if(!unit.includes('Oficinal FNFB'))unit+=`
test('Oficinal FNFB: concentração, quantidade, via e limites preservados',()=>{
 const r=core.calculate('nystatin-officinal','ny-100k-officinal','three',context(10,'1 ano','Candidíase de fraldas'));
 assert.equal(r.applicationsDay,3);assert.equal(r.mg,null);assert.equal(r.ml,null);assert.match(r.presentation,/OFICINAL/);assert.match(r.quantity,/20 g/);
 assert.equal(2000000/20,100000);assert.equal(100000*20,2000000);
 assert.throws(()=>core.calculate('nystatin-officinal','ny-100k-officinal','three',context(10,'1 ano','Candidíase oral')));
 assert.throws(()=>core.calculate('nystatin-officinal','ny-100k-officinal','three',context(3,'2 meses','Candidíase de fraldas')));
});
`;
fs.writeFileSync(unitPath,unit);
console.log('Concurrent main reconciled without deleting prior source material; five scoped medication regimes, seven presentations.');
