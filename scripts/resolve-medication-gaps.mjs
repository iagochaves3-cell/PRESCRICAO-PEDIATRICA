import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonical, counters, digest, evaluatePacket, loadRuntime, projection,
  readJson, reconcileLedger, writeJson } from './lib/medication-gap-resolution.mjs';

export function resolveGaps(root, {now = new Date().toISOString(), dryRun = false, strict = false} = {}) {
  const data = name => path.join(root,'public-data',name);
  const catalog = readJson(data('catalog.json'));
  const input = readJson(path.join(root,'clinical-review/medication-gap-resolutions.json'));
  if (input.schema_version !== '2.0' || !Array.isArray(input.requests)) throw new Error('Unsupported resolution manifest');
  const previous = readJson(data('medication-gap-scopes.json'), {schema_version:'2.0', scopes:[]});
  const ledger = reconcileLedger(catalog, previous, input.requests);
  const registry = readJson(data('audited-gap-regimens.json'), {schema_version:'2.0', regimens:[]});
  const audit = readJson(data('medication-gap-resolution-audit.json'), {schema_version:'2.0', events:[]});
  const runtime = loadRuntime(root);
  if (new Set(input.requests.map(r => r.scope?.id)).size !== input.requests.length) throw new Error('Duplicate resolution requests');
  const requested = new Map(input.requests.map(r => [r.scope.id,r]));
  const accepted = [], rejected = [];
  for (const scope of ledger.scopes.filter(s => s.kind === 'REGIMEN')) {
    const request = requested.get(scope.id);
    const decision = request?.packet ? evaluatePacket(request.packet, scope, {root, now, ...runtime}) :
      {passed:false, reasons:['No complete audited resolution packet supplied']};
    const decisionHash = digest({packet:request?.packet || null, decision});
    const wasReady = scope.status === 'READY';
    scope.status = decision.passed ? 'READY' : 'AUTO_RESEARCH_PENDING';
    scope.block_reasons = decision.reasons;
    scope.decision_sha256 = decisionHash;
    if (decision.passed) {
      scope.payload_sha256 = decision.payload_sha256;
      scope.resolved_at ||= now;
      accepted.push(scope.id);
    } else { delete scope.resolved_at; delete scope.payload_sha256; rejected.push(scope.id); }
    const lastEvent = audit.events.findLast(e => e.scope_id === scope.id);
    if (lastEvent?.decision_sha256 !== decisionHash) {
      audit.events.push({scope_id:scope.id, fiche:scope.fiche, evaluated_at:now,
        decision_sha256:decisionHash, payload_sha256:decision.payload_sha256 || null,
        transition:wasReady && !decision.passed ? 'REOPENED' : decision.passed ? 'READY' : 'BLOCKED',
        reasons:decision.reasons, audit_artifacts:request?.packet?.audits || null});
    }
  }
  // Registry publication happens only for a passed, runtime-bound regime; never a whole monograph.
  const nextRegistry = {...registry, regimens:ledger.scopes.filter(s => s.kind === 'REGIMEN' && s.status === 'READY').map(s => ({
    scope_id:s.id, target:s.target, payload_sha256:s.payload_sha256, resolved_at:s.resolved_at,
    regimen:requested.get(s.id).packet.regimen, evidence:requested.get(s.id).packet.evidence,
    fields:requested.get(s.id).packet.fields, audits:requested.get(s.id).packet.audits
  }))};
  // Preserve legacy valid IDs. Only IDs owned by this resolver can be retracted on a failed re-audit.
  for (const med of catalog.medications) {
    const ownedBefore = registry.regimens.filter(r => r.regimen.fiche === med.fiche).map(r => r.regimen.id);
    const newlyReady = nextRegistry.regimens.filter(r => r.regimen.fiche === med.fiche).map(r => r.regimen.id);
    const relevant = ledger.scopes.filter(s => s.fiche === med.fiche && s.kind === 'REGIMEN');
    if (!relevant.length && !ownedBefore.length) continue;
    med.gap_resolution_legacy_ready_ids ??= (med.ready_regimen_ids || []).filter(id => !ownedBefore.includes(id));
    med.ready_regimen_ids = [...new Set([...med.gap_resolution_legacy_ready_ids, ...newlyReady])];
    med.audited_gap_regimen_ids = newlyReady;
    med.audited_gap_regimen_registry = 'public-data/audited-gap-regimens.json';
    med.partial_operational_status = med.ready_regimen_ids.length ? 'PARTIALLY_READY' : 'AUTO_RESEARCH_PENDING';
    // resolution / auto_research remain unchanged: unknown and other indication scopes stay pending.
  }
  if (canonical({...ledger, updated_at:undefined}) !== canonical({...previous, updated_at:undefined})) ledger.updated_at = now;
  const timestamp = ledger.updated_at || now;
  const count = counters(ledger);
  const state = {...readJson(data('medication-gap-research-state.json'), {}), schema_version:'2.0', ...count,
    pending_total_unit:'Unresolved scopes, including unextracted monograph remainders',
    existing_ready_regimens_total:new Set(catalog.medications.flatMap(m => m.ready_regimen_ids || [])).size,
    last_resolution_change:timestamp};
  const outputs = [
    [data('medication-gap-scopes.json'),ledger], [data('audited-gap-regimens.json'),nextRegistry],
    [data('medication-gap-resolution-audit.json'),audit], [data('catalog.json'),catalog],
    [data('medication-gap-research-state.json'),state], [data('medication-gap-research-queue.json'),projection(ledger,timestamp)]
  ];
  if (strict && rejected.length) throw new Error('Rejected resolution packets: ' + rejected.join(', '));
  const changed = outputs.filter(([file,value]) =>
    !fs.existsSync(file) || fs.readFileSync(file,'utf8') !== JSON.stringify(value,null,2)+'\n').map(([file]) => path.relative(root,file));
  if (!dryRun) for (const [file,value] of outputs) writeJson(file,value);
  return {...count, accepted, rejected, changed};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const root = fileURLToPath(new URL('../',import.meta.url));
    const dryRun = process.argv.includes('--check');
    const summary = resolveGaps(root,{dryRun, strict:process.argv.includes('--strict')});
    console.log(JSON.stringify(summary,null,2));
    if (dryRun && summary.changed.length) process.exitCode = 1;
  } catch (error) { console.error(error); process.exitCode = 1; }
}
