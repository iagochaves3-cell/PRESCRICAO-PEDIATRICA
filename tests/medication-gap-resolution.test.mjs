// Synthetic software fixtures. They are not clinical reviews or releasable evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { AUDIT_PASSES, GAP_FIELDS, counters, evaluatePacket, loadRuntime, packetDigest,
  readJson, reconcileLedger, sha256, writeJson } from '../scripts/lib/medication-gap-resolution.mjs';
import { resolveGaps } from '../scripts/resolve-medication-gaps.mjs';
import { boundedNumber, discover, mergeDiscovery, selectDiscoveryBatch } from '../scripts/research-medication-gaps.mjs';
const require = createRequire(import.meta.url);
const core = require('../assets/priority-regimens.js');
const repo = fileURLToPath(new URL('../',import.meta.url));
const now = '2026-10-05T12:00:00.000Z';
const context = (weight=16,age='4 anos',diagnosis='Faringite estreptocócica') => ({weight,age,diagnosis,clinicalReview:true});
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'pps-gap-test-'));
  for (const d of ['assets','public-data','clinical-review']) fs.mkdirSync(path.join(root,d));
  fs.copyFileSync(path.join(repo,'assets/priority-regimens.js'),path.join(root,'assets/priority-regimens.js'));
  const write = (file,obj) => writeJson(path.join(root,file),obj);
  const artifact = (file,obj) => {write(file,obj); return {path:file,sha256:sha256(fs.readFileSync(path.join(root,file)))};};
  const scope = {id:'regimen:35:amox-gas',fiche:35,kind:'REGIMEN',target:{regimen_id:'amox-gas',
    indication:'Faringite estreptocócica confirmada',population:'Pediatria sem ajustes especiais',
    age_range:'3 meses a <18 anos',min_months:3,max_months:216,weight_range:'Peso aferido válido',
    route:'VO',presentation_ids:['amox-250','amox-400']}};
  const regimen = structuredClone(core.records.find(r => r.id === 'amox-gas'));
  const evidence = [{id:'synthetic-br-label',url:'https://www.ems.com.br/medicamentos/amoxicilina-250mg-5ml/',
    engine_source_id:'ems250',
    country:'BR',primary:true,authority:'OFFICIAL_MANUFACTURER_LABEL',manufacturer:'EMS',manufacturer_domain:'ems.com.br',
    locator:'SYNTHETIC TEST ONLY',verified_at:now,review_status:'VERIFIED_REGIMEN_CONTENT',supports:GAP_FIELDS,
    artifact:artifact('clinical-review/synthetic-source.json',{synthetic:true})}];
  evidence.push(...['cdc','ems400'].map(id=>({...evidence[0],id:'synthetic-'+id,engine_source_id:id,url:core.sources[id].url})));
  const fields = Object.fromEntries(GAP_FIELDS.map(f => [f,{status:'VERIFIED',value:scope.target[f] || 'Synthetic '+f,source_ids:['synthetic-br-label']}]));
  const packet = {scope:scope.target,regimen,fields,evidence,
    brazilian_verification:{status:'VERIFIED',verified_at:now,reconciliation:'Synthetic test only',source_ids:['synthetic-br-label'],
      priority_search_log:['ANVISA','MS','SES_MG','SBP'].map(authority => ({authority,url:'https://www.gov.br/',checked_at:now,result:'Synthetic fixture'}))},
    safety:{high_alert:false,off_label:false},binding:{engine_sha256:sha256(fs.readFileSync(path.join(root,'assets/priority-regimens.js')))},
    calculation_cases:[
      ...['amox-250','amox-400'].map(presentation_id => ({presentation_id,variant:'standard',context:context(),expected:{mg:400,ml:presentation_id==='amox-250'?8:5}})),
      {presentation_id:'amox-400',variant:'standard',context:context(10,'1 ano'),expected:{mg:248,ml:3.1}},
      {presentation_id:'amox-250',variant:'standard',context:context(3,'2 meses'),expect_blocked:true,error_contains:'Idade'},
      {tag:'INCOMPATIBLE_PRESENTATION',presentation_id:'WRONG',variant:'standard',context:context(),expect_blocked:true,error_contains:'Apresentação'},
      {tag:'INCOMPATIBLE_INDICATION',presentation_id:'amox-250',variant:'standard',context:context(16,'4 anos','Faringite viral'),expect_blocked:true,error_contains:'diagnóstico'},
      {tag:'CLINICAL_REVIEW_REQUIRED',presentation_id:'amox-250',variant:'standard',context:{...context(),clinicalReview:false},expect_blocked:true,error_contains:'Confirme'}
    ]};
  function sign() {
    const hash = packetDigest(packet);
    packet.audits = Object.fromEntries(AUDIT_PASSES.map(pass => [pass,{status:'PASS',payload_sha256:hash,reviewed_by:'SYNTHETIC TEST',
      reviewer_kind:'ASSISTED_DOCUMENTARY',reviewed_at:now,artifact:artifact('clinical-review/synthetic-'+pass+'.json',
        {pass,payload_sha256:hash,status:'PASS',reviewed_by:'SYNTHETIC TEST',reviewer_kind:'ASSISTED_DOCUMENTARY',findings:'Software fixture; no clinical validation'})}]));
  }
  sign();
  write('public-data/catalog.json',{medications:[{fiche:35,name:'Amoxicilina',resolution:'AUTO_RESEARCH_PENDING',auto_research:true,ready_regimen_ids:['legacy-id']},
    {fiche:318,name:'Nistatina',resolution:'AUTO_RESEARCH_PENDING',auto_research:true}]});
  write('clinical-review/medication-gap-resolutions.json',{schema_version:'2.0',requests:[{scope,packet}]});
  return {root,scope,packet,sign,write,cleanup:() => fs.rmSync(root,{recursive:true,force:true}),
    evaluate:() => evaluatePacket(packet,scope,{root,now,...loadRuntime(root)})};
}
function using(fn) {const f=fixture(); try {return fn(f);} finally {f.cleanup();}}

test('Only a complete exact-scope packet with all three hash-bound audits passes',()=>using(f=>{
  assert.deepEqual(f.evaluate().reasons,[]); assert.equal(f.evaluate().passed,true);
}));
test('Discovery candidates and READY strings alone never satisfy the resolution gates',()=>using(f=>{
  assert.equal(evaluatePacket({operational_status:'READY',candidate_sources:f.packet.evidence},f.scope,{root:f.root,now,...loadRuntime(f.root)}).passed,false);
}));
for (const field of GAP_FIELDS) test('Missing operational field remains blocked: '+field,()=>using(f=>{
  delete f.packet.fields[field]; f.sign(); assert.equal(f.evaluate().passed,false);
}));
for (const pass of AUDIT_PASSES) test('Missing audit remains blocked: '+pass,()=>using(f=>{
  delete f.packet.audits[pass]; assert.equal(f.evaluate().passed,false);
}));
test('Dose, population or engine changes invalidate prior audit hashes',()=>using(f=>{
  f.packet.fields.dose.value='changed'; assert.ok(f.evaluate().reasons.some(r=>r.includes('audit')));
  f.sign(); f.packet.scope.population='different'; assert.equal(f.evaluate().passed,false);
  f.packet.scope.population=f.scope.target.population; f.sign();
  fs.appendFileSync(path.join(f.root,'assets/priority-regimens.js'),'\n// change\n'); assert.equal(f.evaluate().passed,false);
}));
test('Foreign labels / aggregators do not meet Brazilian primary verification',()=>using(f=>{
  f.packet.evidence[0].url='https://bula.com.br/example'; f.sign(); assert.equal(f.evaluate().passed,false);
  f.packet.evidence[0].url='https://api.fda.gov/example'; f.packet.evidence[0].country='US'; f.sign(); assert.equal(f.evaluate().passed,false);
}));
test('Engine citations must bind to the same verified source URL and artifact',()=>using(f=>{
  f.packet.evidence=f.packet.evidence.filter(e=>e.engine_source_id!=='cdc');f.sign();assert.equal(f.evaluate().passed,false);
}));
test('Missing priority searches, sources supporting another field, waived maxima and off-label bases block release',()=>using(f=>{
  f.packet.brazilian_verification.priority_search_log=[]; f.sign(); assert.equal(f.evaluate().passed,false);
  f.packet.brazilian_verification.priority_search_log=['ANVISA','MS','SES_MG','SBP'].map(authority=>({authority,url:'https://gov.br',checked_at:now,result:'synthetic'}));
  f.packet.evidence[0].supports=['brazilian_presentation']; f.sign(); assert.equal(f.evaluate().passed,false);
  f.packet.evidence[0].supports=GAP_FIELDS;f.packet.fields.maximum_per_dose.status='NOT_ESTABLISHED_IN_SOURCE';f.packet.fields.maximum_per_dose.reason='synthetic';f.sign();assert.equal(f.evaluate().passed,false);
  f.packet.fields.maximum_per_dose.status='VERIFIED';f.packet.safety.off_label=true;f.sign();assert.equal(f.evaluate().passed,false);
}));
test('High-alert packets require a documented human double-check, not an assisted pass',()=>using(f=>{
  f.packet.safety.high_alert=true;f.sign();assert.equal(f.evaluate().passed,false);
}));
test('Future reviews, changed reports and repository escape paths cannot pass',()=>using(f=>{
  f.packet.audits.structural.reviewed_at='2030-01-01'; assert.equal(f.evaluate().passed,false);
  f.sign();fs.appendFileSync(path.join(f.root,f.packet.audits.structural.artifact.path),' ');assert.equal(f.evaluate().passed,false);
  f.sign();f.packet.evidence[0].artifact={path:'../outside',sha256:'a'.repeat(64)};f.sign();assert.equal(f.evaluate().passed,false);
}));
test('Independent expected values, presentation coverage and negative cases are enforced',()=>using(f=>{
  f.packet.calculation_cases[0].expected.ml=999;f.sign();assert.equal(f.evaluate().passed,false);
  f.packet.calculation_cases[0].expected.ml=8;f.packet.calculation_cases=f.packet.calculation_cases.filter(c=>c.context.age!=='2 meses');f.sign();assert.equal(f.evaluate().passed,false);
}));
test('One READY regimen reduces exactly one pending scope; the same molecule and other drugs stay pending',()=>using(f=>{
  const catalog=readJson(path.join(f.root,'public-data/catalog.json'));
  const before=reconcileLedger(catalog,undefined,[{scope:f.scope}]);assert.equal(counters(before).pending_total,3);
  const summary=resolveGaps(f.root,{now});assert.equal(summary.pending_total,2);assert.equal(summary.resolved_regimens_total,1);
  const after=readJson(path.join(f.root,'public-data/catalog.json'));
  assert.equal(after.medications[0].resolution,'AUTO_RESEARCH_PENDING');assert.equal(after.medications[1].resolution,'AUTO_RESEARCH_PENDING');
  assert.deepEqual(after.medications[0].ready_regimen_ids,['legacy-id','amox-gas']);assert.deepEqual(after.medications[1],catalog.medications[1]);
  const queue=readJson(path.join(f.root,'public-data/medication-gap-research-queue.json'));assert.ok(!queue.pending.some(s=>s.id===f.scope.id));
  assert.equal(queue.pending_monographs_total,2);
  const bytes=fs.readFileSync(path.join(f.root,'public-data/medication-gap-resolution-audit.json'),'utf8');
  resolveGaps(f.root,{now:'2026-10-06T12:00:00Z'});assert.equal(fs.readFileSync(path.join(f.root,'public-data/medication-gap-resolution-audit.json'),'utf8'),bytes);
}));
test('Invalidating a release reopens just its scope and retracts only resolver-owned IDs',()=>using(f=>{
  resolveGaps(f.root,{now});f.packet.fields.dose.value='changed';
  f.write('clinical-review/medication-gap-resolutions.json',{schema_version:'2.0',requests:[{scope:f.scope,packet:f.packet}]});
  const summary=resolveGaps(f.root,{now});assert.equal(summary.pending_total,3);assert.equal(summary.resolved_regimens_total,0);
  assert.deepEqual(readJson(path.join(f.root,'public-data/catalog.json')).medications[0].ready_regimen_ids,['legacy-id']);
  assert.equal(readJson(path.join(f.root,'public-data/audited-gap-regimens.json')).regimens.length,0);
}));
test('Duplicate requests and monograph-as-regimen attempts fail closed; strict mode writes nothing',()=>using(f=>{
  const catalog=readJson(path.join(f.root,'public-data/catalog.json'));
  assert.throws(()=>reconcileLedger(catalog,undefined,[{scope:{...f.scope,id:'monograph:35:unextracted'}}]));
  assert.throws(()=>reconcileLedger(catalog,undefined,[{scope:f.scope},{scope:{...f.scope,id:'duplicate-target'}}]));
  f.write('clinical-review/medication-gap-resolutions.json',{schema_version:'2.0',requests:[{scope:f.scope,packet:null}]});
  assert.throws(()=>resolveGaps(f.root,{now,strict:true}));assert.ok(!fs.existsSync(path.join(f.root,'public-data/medication-gap-scopes.json')));
}));
test('Removing a packet reopens its READY scope; dry-run check does not write',()=>using(f=>{
  resolveGaps(f.root,{now});
  f.write('clinical-review/medication-gap-resolutions.json',{schema_version:'2.0',requests:[]});
  const summary=resolveGaps(f.root,{now,dryRun:true});assert.equal(summary.pending_total,3);assert.ok(summary.changed.length>0);
  assert.equal(readJson(path.join(f.root,'public-data/medication-gap-scopes.json')).scopes.find(s=>s.id===f.scope.id).status,'READY');
  resolveGaps(f.root,{now});assert.equal(readJson(path.join(f.root,'public-data/medication-gap-scopes.json')).scopes.find(s=>s.id===f.scope.id).status,'AUTO_RESEARCH_PENDING');
}));
test('Rejected packets persist precise blockers and never add a release registry entry',()=>using(f=>{
  delete f.packet.fields.dose;f.sign();f.write('clinical-review/medication-gap-resolutions.json',{schema_version:'2.0',requests:[{scope:f.scope,packet:f.packet}]});
  const summary=resolveGaps(f.root,{now});assert.equal(summary.pending_total,3);assert.deepEqual(summary.accepted,[]);
  assert.equal(readJson(path.join(f.root,'public-data/audited-gap-regimens.json')).regimens.length,0);
  const queue=readJson(path.join(f.root,'public-data/medication-gap-research-queue.json'));
  assert.ok(queue.pending.find(s=>s.id===f.scope.id).block_reasons.some(r=>r.includes('dose')));
}));
test('Corrupt JSON and silently changed scope identities cannot reset the ledger',()=>using(f=>{
  fs.writeFileSync(path.join(f.root,'public-data/medication-gap-scopes.json'),'{');assert.throws(()=>resolveGaps(f.root,{now}));
  const ledger=reconcileLedger(readJson(path.join(f.root,'public-data/catalog.json')),undefined,[{scope:f.scope}]);
  const other=structuredClone(f.scope);other.target.route='IM';assert.throws(()=>reconcileLedger(readJson(path.join(f.root,'public-data/catalog.json')),ledger,[{scope:other}]));
}));
test('Stable scope scheduling skips READY and recent candidates, prioritizes unseen, and retries failures',()=>{
  const scopes=[{id:'ready',status:'READY'},{id:'new',status:'AUTO_RESEARCH_PENDING'},
    {id:'recent',status:'AUTO_RESEARCH_PENDING'},{id:'failed',status:'AUTO_RESEARCH_PENDING'}];
  const results=[{scope_id:'recent',searched_at:'2026-10-04T12:00:00Z',candidate_sources:[{id:'ok'}]},
    {scope_id:'failed',searched_at:'2026-10-03T12:00:00Z',candidate_sources:[{error:'429'}]}];
  assert.deepEqual(selectDiscoveryBatch(scopes,results,now).map(s=>s.id),['new','failed']);
  assert.deepEqual(selectDiscoveryBatch(scopes.filter(s=>s.id!=='recent'),results,now,{limit:1}).map(s=>s.id),['new']);
});
test('Failed rediscovery preserves earlier valid evidence without creating clinical approval',()=>{
  const old=[{fiche:35,searched_at:'2026-10-01',candidate_sources:[{source:'PubMed',id:'1',title:'old'}],operational_status:'NOT_PROMOTED'}];
  const merged=mergeDiscovery(old,[{fiche:35,scope_id:'monograph:35:unextracted',searched_at:now,candidate_sources:[{source:'PubMed',error:'429'}],operational_status:'NOT_PROMOTED'}]);
  assert.equal(merged.length,1);assert.equal(merged[0].candidate_sources.length,2);assert.equal(merged[0].operational_status,'NOT_PROMOTED');
});
test('Empty queue updates stale counts to zero; full batches do not count as clinical cycles',async()=>{
  const f=fixture();try{
    f.write('public-data/catalog.json',{medications:[]});f.write('public-data/medication-gap-research-state.json',{pending_total:498,completed_cycles:18});
    let calls=0;await discover({root:f.root,now,search:async()=>{calls++;return [];}});
    assert.equal(calls,0);assert.equal(readJson(path.join(f.root,'public-data/medication-gap-research-state.json')).pending_total,0);
    f.write('public-data/catalog.json',{medications:[{fiche:35,name:'Amoxicilina',resolution:'AUTO_RESEARCH_PENDING'}]});
    await discover({root:f.root,now,search:async()=>{calls++;return [{source:'test',id:'1'}];}});
    const state=readJson(path.join(f.root,'public-data/medication-gap-research-state.json'));
    assert.equal(state.completed_cycles,18);assert.equal(state.resolved_regimens_total,0);assert.equal(state.pending_total,1);assert.equal(state.discovery_batches,1);
    await discover({root:f.root,now,search:async()=>{calls++;return [];}});assert.equal(calls,1);
  }finally{f.cleanup();}
});
test('NaN, zero, fractional and excessive settings are rejected',()=>{
  for(const value of ['NaN',0,1.5,501])assert.throws(()=>boundedNumber(value,298,1,500));assert.equal(boundedNumber(undefined,298,1,500),298);
});
