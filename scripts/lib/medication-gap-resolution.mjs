import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

export const GAP_FIELDS = ['indication', 'population', 'age_range', 'weight_range', 'route',
  'dose', 'interval', 'duration', 'maximum_per_dose', 'maximum_per_day', 'formulation',
  'concentration', 'brazilian_presentation', 'practical_volume_ml_or_drops_or_tablets',
  'dilution', 'administration_instructions', 'monitoring', 'contraindications',
  'renal_adjustment', 'hepatic_adjustment', 'incompatibilities', 'off_label_status',
  'regimen_level_source'];
export const AUDIT_PASSES = ['structural', 'pharmaceutical_and_mathematical', 'clinical_evidence_and_regulatory'];
export const SOURCE_HIERARCHY = ['ANVISA', 'Ministério da Saúde', 'SES-MG',
  'SBP/sociedades brasileiras', 'bulas/registro oficial', 'diretrizes internacionais', 'PubMed/DOI'];
const text = x => typeof x === 'string' && x.trim().length > 0;
export const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort()
    .map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
export const digest = value => sha256(canonical(value));
export const packetDigest = packet => digest({scope: packet.scope, regimen: packet.regimen,
  fields: packet.fields, evidence: packet.evidence, brazilian_verification: packet.brazilian_verification,
  safety: packet.safety, binding: packet.binding, calculation_cases: packet.calculation_cases});

// Never replace a missing/corrupt audit file with an empty ledger.
export function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { if (e.code === 'ENOENT' && fallback !== undefined) return fallback; throw e; }
}
export function writeJson(file, value) {
  const bytes = JSON.stringify(value, null, 2) + '\n';
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === bytes) return false;
  const temp = file + '.tmp';
  fs.writeFileSync(temp, bytes); fs.renameSync(temp, file); return true;
}
export function verifyArtifact(root, ref) {
  if (!ref || !text(ref.path) || !/^[a-f0-9]{64}$/.test(ref.sha256 || '')) throw new Error('Missing hashed artifact');
  const base = fs.realpathSync(root);
  const file = fs.realpathSync(path.resolve(base, ref.path));
  if (!file.startsWith(base + path.sep)) throw new Error('Artifact outside repository');
  const bytes = fs.readFileSync(file);
  if (sha256(bytes) !== ref.sha256) throw new Error('Stale artifact: ' + ref.path);
  return bytes;
}
function validDate(value, now) {
  return text(value) && Number.isFinite(Date.parse(value)) && Date.parse(value) <= Date.parse(now);
}
function officialBrazilianSource(source) {
  let host; try { host = new URL(source.url).hostname; } catch { return false; }
  if (source.country !== 'BR' || source.primary !== true) return false;
  const domains = {ANVISA: ['anvisa.gov.br', 'gov.br'], MS: ['saude.gov.br', 'gov.br'],
    SES_MG: ['saude.mg.gov.br'], SBP: ['sbp.com.br']};
  if (source.authority === 'OFFICIAL_MANUFACTURER_LABEL') {
    return text(source.manufacturer) && text(source.manufacturer_domain) &&
      (host === source.manufacturer_domain || host.endsWith('.' + source.manufacturer_domain));
  }
  return (domains[source.authority] || []).some(d => host === d || host.endsWith('.' + d));
}
function checkMath(result, presentation) {
  const near = (a,b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a-b) <= 1e-7 * Math.max(1,Math.abs(b));
  if (result.mg !== null && presentation.mgMl && !near(result.ml * presentation.mgMl, result.mg)) throw new Error('mg/mL reverse mismatch');
  if (result.mg !== null && result.mgPerKg !== undefined && !near(result.mg / result.weight, result.mgPerKg)) throw new Error('mg/kg reverse mismatch');
  if (result.drops !== undefined && !near(result.drops * presentation.mgDrop, result.mg)) throw new Error('Drop reverse mismatch');
  if (result.puffs !== undefined && !near(result.puffs * presentation.mcgPuff, result.mcg)) throw new Error('Puff reverse mismatch');
  if (result.dailyMaxMg !== undefined && result.intervalHours && result.mg * 24 / result.intervalHours > result.dailyMaxMg + 1e-7) throw new Error('Daily maximum exceeded');
}

// These are machine checks of submitted, attributed reviews; they do not invent a clinical review.
export function evaluatePacket(packet, scope, {root, now, core, engineBytes}) {
  const reasons = [];
  const require = (ok, reason) => { if (!ok) reasons.push(reason); };
  if (!packet || !scope) return {passed: false, reasons: ['Unknown scope']};
  require(scope.kind === 'REGIMEN', 'A monograph remainder cannot be promoted as a regimen');
  require(canonical(packet.scope) === canonical(scope.target), 'Exact indication/population/route/presentation scope mismatch');
  const reg = packet.regimen || {}, payloadHash = packetDigest(packet);
  const engineRecord = core.records.find(r => r.id === scope.target.regimen_id);
  require(reg.id === scope.target.regimen_id && reg.fiche === scope.fiche, 'Regimen identity mismatch');
  require(engineRecord && canonical({...engineRecord, fiche: scope.fiche}) === canonical(reg), 'No identical tested runtime binding');
  require(packet.binding?.engine_sha256 === sha256(engineBytes), 'Runtime changed since audit');
  require(Array.isArray(reg.presentations) && reg.presentations.length > 0 &&
    canonical(reg.presentations.map(p => p.id).sort()) === canonical([...(scope.target.presentation_ids || [])].sort()), 'Presentation coverage mismatch');
  require(text(scope.target.indication) && text(scope.target.population) && text(scope.target.route) &&
    text(scope.target.age_range) && text(scope.target.weight_range), 'Incomplete scope');
  require(scope.target.min_months === reg.minMonths && scope.target.max_months === reg.maxMonths,
    'Runtime age bounds differ from the audited scope');
  const evidence = Array.isArray(packet.evidence) ? packet.evidence : [];
  const ids = new Set(evidence.map(e => e.id));
  require(evidence.length > 0 && ids.size === evidence.length, 'Missing/duplicate regimen evidence');
  for (const e of evidence) {
    let url; try { url = new URL(e.url); } catch {}
    require(text(e.id) && url?.protocol === 'https:' && text(e.locator) && e.review_status === 'VERIFIED_REGIMEN_CONTENT' &&
      validDate(e.verified_at, now), 'Unverified regimen-level evidence: ' + e.id);
    try { verifyArtifact(root, e.artifact); } catch (error) { reasons.push(error.message); }
  }
  for (const id of reg.sources || []) {
    require(evidence.some(e => e.engine_source_id === id && e.url === core.sources[id]?.url),
      'Runtime source is not linked to verified evidence: ' + id);
  }
  for (const field of GAP_FIELDS) {
    const f = packet.fields?.[field];
    require(f && ['VERIFIED', 'NOT_APPLICABLE', 'NOT_ESTABLISHED_IN_SOURCE'].includes(f.status) &&
      text(f.value) && (f.status === 'VERIFIED' || text(f.reason)) && Array.isArray(f.source_ids) && f.source_ids.length > 0 &&
      f.source_ids.every(id => ids.has(id) && evidence.find(e => e.id === id).supports?.includes(field)), 'Missing or unsupported field: ' + field);
    if (['indication', 'population', 'age_range', 'route', 'dose', 'formulation', 'concentration', 'brazilian_presentation', 'off_label_status', 'regimen_level_source'].includes(field)) {
      require(f?.status === 'VERIFIED', 'Required operational field cannot be waived: ' + field);
    }
    if (['maximum_per_dose', 'maximum_per_day'].includes(field) && f?.status !== 'VERIFIED') {
      require(packet.safety?.non_quantitative_topical === true && scope.target.route === 'Tópica dermatológica', 'Quantitative maximum cannot be waived');
    }
  }
  for (const field of ['indication','population','age_range','weight_range','route']) {
    require(packet.fields?.[field]?.value === scope.target[field], 'Field differs from exact scope: ' + field);
  }
  const br = packet.brazilian_verification;
  require(br?.status === 'VERIFIED' && text(br.reconciliation) && validDate(br.verified_at, now) &&
    Array.isArray(br.source_ids) && br.source_ids.length > 0 && br.source_ids.every(id => {
      const e = evidence.find(e => e.id === id); return e && officialBrazilianSource(e);
    }), 'Brazilian primary verification missing');
  require((br?.source_ids || []).some(id => evidence.find(e => e.id === id)?.supports?.includes('brazilian_presentation')), 'Brazilian presentation not verified');
  require(Array.isArray(br?.priority_search_log) && ['ANVISA', 'MS', 'SES_MG', 'SBP'].every(authority =>
    br.priority_search_log.some(x => x.authority === authority && text(x.url) && text(x.result) && validDate(x.checked_at, now))), 'Brazilian priority search not documented');
  require(typeof packet.safety?.high_alert === 'boolean' && typeof packet.safety?.off_label === 'boolean', 'Safety classification missing');
  if (packet.safety?.off_label) require(text(packet.safety.off_label_justification) && text(packet.safety.evidence_level), 'Off-label basis missing');
  if (packet.safety?.high_alert) {
    require(packet.safety.human_double_check?.status === 'PASS' && packet.safety.human_double_check?.reviewer_kind === 'HUMAN' &&
      text(packet.safety.human_double_check?.reviewed_by) && validDate(packet.safety.human_double_check?.reviewed_at, now), 'High-alert human double-check missing');
    try { verifyArtifact(root, packet.safety.human_double_check?.artifact); } catch (error) { reasons.push(error.message); }
  }
  for (const pass of AUDIT_PASSES) {
    const a = packet.audits?.[pass];
    require(a?.status === 'PASS' && a.payload_sha256 === payloadHash && text(a.reviewed_by) &&
      ['ASSISTED_DOCUMENTARY', 'HUMAN'].includes(a.reviewer_kind) && validDate(a.reviewed_at, now), 'Missing/stale audit: ' + pass);
    try {
      const report = JSON.parse(verifyArtifact(root, a?.artifact));
      require(report.pass === pass && report.payload_sha256 === payloadHash && report.status === 'PASS' &&
        report.reviewed_by === a.reviewed_by && report.reviewer_kind === a.reviewer_kind && text(report.findings), 'Audit report mismatch: ' + pass);
    } catch (error) { reasons.push(error.message); }
  }
  const cases = packet.calculation_cases || [];
  require(cases.length > 0, 'Missing independent calculation cases');
  require([[3,'2 meses'],[10,'1 ano'],[16,'4 anos']].every(([w,a]) => cases.some(c => c.context?.weight === w && c.context?.age === a)), 'Three mandatory paediatric profiles missing');
  require(['INCOMPATIBLE_PRESENTATION', 'INCOMPATIBLE_INDICATION', 'CLINICAL_REVIEW_REQUIRED'].every(tag => cases.some(c => c.tag === tag && c.expect_blocked === true)), 'Negative safety regressions missing');
  for (const p of reg.presentations || []) for (const [variant] of reg.variants || []) {
    require(cases.some(c => !c.expect_blocked && c.presentation_id === p.id && c.variant === variant), 'Untested presentation/variant: ' + p.id + '/' + variant);
  }
  for (const c of cases) {
    try {
      const result = core.calculate(reg.id, c.presentation_id, c.variant, c.context);
      require(!c.expect_blocked, 'Expected safety block failed: ' + c.tag);
      require(c.expected && Object.keys(c.expected).length > 0, 'Missing independently expected result');
      for (const [key,value] of Object.entries(c.expected || {})) require(result[key] === value, 'Calculation mismatch: ' + key);
      checkMath(result, reg.presentations.find(p => p.id === c.presentation_id));
    } catch (e) {
      require(c.expect_blocked === true && text(c.error_contains) && String(e.message).includes(c.error_contains), 'Calculation/safety failure: ' + e.message);
    }
  }
  return {passed: reasons.length === 0, reasons: [...new Set(reasons)], payload_sha256: payloadHash};
}

export function reconcileLedger(catalog, prior = {schema_version: '2.0', scopes: []}, requests = []) {
  const ledger = structuredClone(prior);
  if (ledger.schema_version !== '2.0' || !Array.isArray(ledger.scopes)) throw new Error('Unsupported gap ledger');
  if (new Set(ledger.scopes.map(s => s.id)).size !== ledger.scopes.length) throw new Error('Duplicate scope IDs');
  const meds = new Map(catalog.medications.map(m => [m.fiche,m]));
  for (const m of meds.values()) {
    if (!['AUTO_RESEARCH_PENDING', 'DOCUMENTARY_ONLY'].includes(m.resolution)) continue;
    const id = `monograph:${m.fiche}:unextracted`;
    if (!ledger.scopes.some(s => s.id === id)) ledger.scopes.push({id, fiche: m.fiche, name: m.name,
      kind: 'UNEXTRACTED_MONOGRAPH', status: 'AUTO_RESEARCH_PENDING',
      reason: 'Inventory of remaining indication/population/presentation regimes has not been fully extracted and audited.',
      excluded_existing_ready_regimen_ids: m.ready_regimen_ids || []});
  }
  for (const request of requests) {
    const s = request.scope, m = meds.get(s?.fiche);
    if (!m || s?.kind !== 'REGIMEN' || !text(s.id) || s.id.startsWith('monograph:') || !s.target) throw new Error('Invalid requested regimen scope');
    const existing = ledger.scopes.find(x => x.id === s.id);
    if (existing && (existing.fiche !== s.fiche || canonical(existing.target) !== canonical(s.target))) throw new Error('Scope identity is immutable: ' + s.id);
    if (!existing) ledger.scopes.push({...s, name:m.name, status:'AUTO_RESEARCH_PENDING'});
  }
  for (const s of ledger.scopes) {
    if (!meds.has(s.fiche) || !['REGIMEN', 'UNEXTRACTED_MONOGRAPH'].includes(s.kind) ||
      !['READY', 'AUTO_RESEARCH_PENDING'].includes(s.status) || (s.kind === 'UNEXTRACTED_MONOGRAPH' && s.status !== 'AUTO_RESEARCH_PENDING')) throw new Error('Invalid persisted scope: ' + s.id);
  }
  const targets = ledger.scopes.filter(s => s.kind === 'REGIMEN').map(s => canonical({fiche:s.fiche,target:s.target}));
  if (new Set(targets).size !== targets.length) throw new Error('Duplicate clinical scope under different IDs');
  ledger.scopes.sort((a,b) => a.fiche-b.fiche || a.id.localeCompare(b.id));
  return ledger;
}
export function counters(ledger) {
  const pending = ledger.scopes.filter(s => s.status !== 'READY');
  return {total_scopes:ledger.scopes.length, pending_total:pending.length,
    pending_monographs_total:new Set(pending.map(s => s.fiche)).size,
    pending_regimens_total:pending.filter(s => s.kind === 'REGIMEN').length,
    unextracted_monographs_total:pending.filter(s => s.kind === 'UNEXTRACTED_MONOGRAPH').length,
    resolved_regimens_total:ledger.scopes.filter(s => s.kind === 'REGIMEN' && s.status === 'READY').length};
}
export function projection(ledger, now) {
  return {schema_version:'2.0', generated_at:now, ...counters(ledger), source_hierarchy:SOURCE_HIERARCHY,
    count_unit:'Unresolved explicit regimen scopes plus unextracted monograph remainders; not a count of all clinical indication lines.',
    rule:'Discovery never releases a regimen. READY closes only the exact audited scope; remaining indications stay blocked.',
    pending:ledger.scopes.filter(s => s.status !== 'READY')};
}
export function loadRuntime(root) {
  const file = path.join(root,'assets/priority-regimens.js');
  const require = createRequire(import.meta.url);
  // This is trusted, checked-out application code, never a path/command supplied by a packet.
  delete require.cache[require.resolve(file)];
  return {core:require(file), engineBytes:fs.readFileSync(file)};
}
