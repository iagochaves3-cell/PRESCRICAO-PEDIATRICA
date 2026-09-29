'use strict';
// Synthetic regression tests, not a clinical validation of the medication catalogue.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const core=require('../assets/priority-regimens.js');
const context=(diagnosis,weight=16,age='4 anos')=>({diagnosis,weight,age,clinicalReview:true});
for(const diagnosis of ['Crise de Asma / Broncoespasmo Agudo (Leve a Moderada)','Crise de asma moderada','Crise de asma grave']){
 test('Do not map a moderate/severe/mixed crisis to home rescue: '+diagnosis,()=>{
  assert.throws(()=>core.calculate('salbutamol-rescue','salb-100','two',context(diagnosis)),/diagnóstico/);
 });
}
test('Existing eligible ambulatory aliases preserve the same calculation',()=>{
 for(const diagnosis of ['Asma com broncoespasmo','Broncoespasmo']){
  const r=core.calculate('salbutamol-rescue','salb-100','two',context(diagnosis));
  assert.equal(r.puffs,2);assert.equal(r.mcg,200);assert.equal(r.mcg/100,r.puffs);
  assert.equal(r.intervalHours,6);assert.equal(r.ml,null);
 }
});
test('Explicit mild-only alias is accepted, without changing the regimen',()=>{
 const r=core.calculate('salbutamol-rescue','salb-100','one',context('Crise de Asma / Broncoespasmo Agudo (Leve)'));
 assert.equal(r.puffs,1);assert.equal(r.mcg,100);
});
test('No cross-diagnosis antibiotics or antifungals; invalid variants remain rejected',()=>{
 assert.throws(()=>core.calculate('amox-gas','amox-250','standard',context('Faringite viral')));
 assert.throws(()=>core.calculate('amox-gas','amox-250','unknown',context('Faringoamigdalite estreptocócica')));
 assert.throws(()=>core.calculate('nystatin-zinc-diaper','nyz-60','standard',context('Dermatite sem candidíase')));
 assert.throws(()=>core.calculate('nystatin-zinc-diaper','nyz-60','unknown',context('Candidíase de fraldas')));
});
test('Numerical regression and independent reverse checks of six existing presentations',()=>{
 for(const weight of [5,8,8.5,9,10,15,15.5,16,23,23.5,24,30,30.5,31,45,45.5,46,53]){
  for(const pid of ['dip-50','dip-500'])for(const variant of ['min','max']){
   const r=core.calculate('dipyrone',pid,variant,context('Febre',weight));
   assert.ok(Math.abs(r.ml*(pid==='dip-50'?50:500)-r.mg)<1e-8);
   assert.ok(Math.abs(r.mg/weight-r.mgPerKg)<1e-8);
   assert.ok(r.mg*4<=r.dailyMaxMg+1e-8);
   if(pid==='dip-500')assert.equal(r.drops*25,r.mg);
  }
 }
 for(const weight of [3,5,10,16,20,27,53,80])for(const pid of ['amox-250','amox-400']){
  const r=core.calculate('amox-gas',pid,'standard',context('Faringoamigdalite estreptocócica',weight));
  assert.ok(r.mg<=500);assert.ok(r.mg<=r.targetMg+1e-8);assert.ok(r.relativeError<=0.05);
  assert.ok(Math.abs(r.ml*(pid==='amox-250'?50:80)-r.mg)<1e-8);
 }
 const topical=core.calculate('nystatin-zinc-diaper','nyz-60','standard',context('Candidíase de fraldas',3,'2 meses'));
 assert.equal(topical.mg,null);assert.equal(topical.ml,null);assert.equal(topical.route,'Tópica dermatológica');
});
test('Three paediatric profiles retain age/weight checks and functional core results',()=>{
 assert.throws(()=>core.calculate('salbutamol-rescue','salb-100','one',context('Broncoespasmo',3,'2 meses')),/Idade/);
 assert.throws(()=>core.calculate('dipyrone','dip-50','min',context('Febre',3,'2 meses')),/Idade/);
 for(const [weight,age] of [[10,'1 ano'],[16,'4 anos']]){
  assert.equal(core.calculate('salbutamol-rescue','salb-100','one',context('Broncoespasmo',weight,age)).mcg,100);
  assert.ok(core.calculate('dipyrone','dip-50','min',context('Febre',weight,age)).ml>0);
 }
});
test('Reconciliation preserves actual source provenance and is idempotent',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pps-project1-test-'));
 try{
  fs.mkdirSync(path.join(dir,'assets'));fs.mkdirSync(path.join(dir,'public-data'));
  const source=fs.readFileSync(path.join(__dirname,'../assets/priority-regimens.js'),'utf8');
  fs.writeFileSync(path.join(dir,'assets/priority-regimens.js'),source);
  fs.writeFileSync(path.join(dir,'index.html'),'<!-- PPS_UPSTREAM_SCOPED_ROUTES -->');
  fs.writeFileSync(path.join(dir,'public-data/clinical-evidence.json'),JSON.stringify({diagnoses:[{regimens:[{medication:'Salbutamol aerossol 100 mcg/jato',dose:'preserve'},{medication:'Other',dose:'unchanged'}]}]}));
  const run=()=>{const result=spawnSync(process.execPath,[path.join(__dirname,'../scripts/reconcile-priority-upstream.cjs')],{cwd:dir,encoding:'utf8'});assert.equal(result.status,0,result.stderr);};
  run();
  const written=fs.readFileSync(path.join(dir,'assets/priority-regimens.js'),'utf8');
  const sourceLines=txt=>txt.split('\n').filter(line=>line.includes('salb:{title:')||line.includes("id:'salbutamol-rescue'"));
  assert.deepEqual(sourceLines(written),sourceLines(source));
  const evidence=JSON.parse(fs.readFileSync(path.join(dir,'public-data/clinical-evidence.json'),'utf8'));
  assert.equal(evidence.diagnoses[0].regimens[0].operational,false);
  assert.equal(evidence.diagnoses[0].regimens[0].dose,'preserve');
  assert.deepEqual(evidence.diagnoses[0].regimens[1],{medication:'Other',dose:'unchanged'});
  run();assert.equal(fs.readFileSync(path.join(dir,'assets/priority-regimens.js'),'utf8'),written);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
