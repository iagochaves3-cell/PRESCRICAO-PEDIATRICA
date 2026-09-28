const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../assets/priority-regimens.js');
const context=(weight=16,age='4 anos',diagnosis='Faringoamigdalite estreptocócica')=>({weight,age,diagnosis,clinicalReview:true});
test('Amoxicilina: 16 kg, 250 mg/5 mL => 400 mg = 8 mL, 12/12 h, 10 dias',()=>{
 const r=core.calculate('amox-gas','amox-250','standard',context());
 assert.equal(r.status,'READY');assert.equal(r.mg,400);assert.equal(r.ml,8);assert.equal(r.intervalHours,12);assert.equal(r.days,10);assert.equal(r.totalMl,160);
});
test('Amoxicilina: concentração alternativa, arredondamento auditável e teto',()=>{
 assert.equal(core.calculate('amox-gas','amox-400','standard',context()).ml,5);
 const r=core.calculate('amox-gas','amox-400','standard',context(10,'1 ano'));
 assert.equal(r.targetMg,250);assert.equal(r.ml,3.1);assert.equal(r.mg,248);assert.ok(r.relativeError<=0.05);
 const max=core.calculate('amox-gas','amox-250','standard',context(60,'12 anos'));
 assert.equal(max.mg,500);assert.equal(max.dailyMg,1000);
});
test('Dipirona: tabelas próprias de solução e gotas, sem 1 gota/kg',()=>{
 const c=context(16,'4 anos','Febre');
 const low=core.calculate('dipyrone','dip-50','min',c);assert.equal(low.ml,3.75);assert.equal(low.mg,187.5);
 const drops=core.calculate('dipyrone','dip-500','max',c);assert.equal(drops.drops,15);assert.equal(drops.ml,0.75);assert.equal(drops.mg,375);assert.equal(drops.dailyMaxMg,1500);
 const infant=core.calculate('dipyrone','dip-500','min',context(10,'1 ano','Febre'));assert.equal(infant.drops,3);assert.equal(infant.mg,75);
});
test('Dipirona: peso entre faixas usa interseção, não interpolação nem arredondamento do peso',()=>{
 const r=core.calculate('dipyrone','dip-500','max',context(15.5,'3 anos','Febre'));assert.equal(r.drops,10);assert.equal(r.weight,15.5);assert.equal(r.boundaryPolicy,'intersection');
});
test('Salbutamol: 2 jatos são 200 mcg de base, não 200 mg nem mL',()=>{
 const r=core.calculate('salbutamol-rescue','salb-100','two',context(16,'4 anos','Asma com broncoespasmo'));
 assert.equal(r.puffs,2);assert.equal(r.mcg,200);assert.equal(r.mcgPerKg,12.5);assert.equal(r.ml,null);assert.equal(r.maxPuffsDay,8);
 assert.equal(core.calculate('salbutamol-rescue','salb-100','one',context(10,'1 ano','Broncoespasmo')).mcg,100);
});
test('Nistatina + zinco: camada tópica não inventa dose ponderal, volume ou máximo',()=>{
 const r=core.calculate('nystatin-zinc-diaper','nyz-60','standard',context(3,'2 meses','Candidíase de fraldas'));
 assert.equal(r.status,'READY');assert.equal(r.mg,null);assert.equal(r.ml,null);assert.equal(r.route,'Tópica dermatológica');assert.match(r.amount,/camada fina/i);
});
test('Bloqueios reais: 2 m/3 kg, alergia/risco não revisado, indicação e apresentação incompatíveis',()=>{
 for(const [id,p] of [['amox-gas','amox-250'],['dipyrone','dip-50'],['salbutamol-rescue','salb-100']])assert.throws(()=>core.calculate(id,p,'standard',context(3,'2 meses')));
 assert.throws(()=>core.calculate('dipyrone','dip-500','min',{...context(),clinicalReview:false}));
 assert.throws(()=>core.calculate('amox-gas','amox-250','standard',context(16,'4 anos','Faringite viral')));
 assert.throws(()=>core.calculate('amox-gas','amox-250','standard',context(16,'4 anos','Faringite não estreptocócica')));
 assert.throws(()=>core.calculate('salbutamol-rescue','salb-100','one',context(10,'1 ano','Bronquiolite')));
 assert.throws(()=>core.calculate('nystatin-zinc-diaper','nyz-60','standard',context(10,'1 ano','Dermatite de fraldas sem candidíase')));
 assert.throws(()=>core.calculate('nystatin-zinc-diaper','vaginal-25000','standard',context(10,'1 ano','Candidíase de fraldas')));
 assert.throws(()=>core.calculate('dipyrone','dip-50','min',context(4.9,'4 meses','Febre')));
 assert.equal(core.calculate('dipyrone','dip-50','min',context(5,'3 meses','Febre')).mg,62.5);
});
test('Variantes inválidas são rejeitadas antes do cálculo por esquema',()=>{
 assert.throws(()=>core.calculate('amox-gas','amox-250','typo',context()));
 assert.throws(()=>core.calculate('nystatin-zinc-diaper','nyz-60','typo',context(10,'1 ano','Candidíase de fraldas')));
});
test('Idade precisa de unidade; parsing composto preserva meses',()=>{
 assert.equal(core.parseAge('1 ano e 2 meses'),14);assert.equal(core.parseAge('4 a'),48);assert.equal(core.parseAge('2 m'),2);assert.equal(core.parseAge('4'),null);
 assert.throws(()=>core.calculate('amox-gas','amox-250','standard',context(16,'4')));
});
test('Checagem reversa independente em todas as faixas publicadas e concentrações',()=>{
 for(const weight of [5,8,8.5,9,10,15,15.5,16,23,23.5,24,30,30.5,31,45,45.5,46,53])for(const p of ['dip-50','dip-500'])for(const v of ['min','max']){
  const r=core.calculate('dipyrone',p,v,context(weight,'4 anos','Febre'));
  const c=p==='dip-50'?50:500;
  assert.ok(Math.abs(r.ml*c-r.mg)<1e-8);assert.ok(Math.abs(r.mg/weight-r.mgPerKg)<1e-8);assert.ok(r.mg*4<=r.dailyMaxMg+1e-8);
  if(p==='dip-500')assert.equal(r.drops*25,r.mg);
 }
 for(const weight of [3,5,10,16,20,27,53,80])for(const p of ['amox-250','amox-400']){
  const r=core.calculate('amox-gas',p,'standard',context(weight));
  assert.ok(r.mg<=500);assert.ok(r.mg<=r.targetMg+1e-8);assert.ok(r.relativeError<=0.05);assert.ok(Math.abs(r.ml*(p==='amox-250'?50:80)-r.mg)<1e-8);
 }
});
