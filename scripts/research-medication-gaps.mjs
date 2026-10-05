import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { counters, projection, readJson, reconcileLedger, writeJson } from './lib/medication-gap-resolution.mjs';

export function boundedNumber(value, fallback, min, max) {
  const n = Number(value ?? fallback);
  if (!Number.isFinite(n) || n < min || n > max || !Number.isInteger(n)) throw new Error('Invalid research setting: ' + value);
  return n;
}
const batchSize = boundedNumber(process.env.RESEARCH_BATCH, 298, 1, 500);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (s='') => String(s).replace(/\s+/g,' ').trim();

async function jsonFetch(url, options={}) {
  const {signal, ...rest}=options;
  const timeoutMs=boundedNumber(process.env.RESEARCH_FETCH_TIMEOUT_MS,8000,2000,60000);
  const res = await fetch(url, {
    headers:{'User-Agent':'PPS-evidence-resolver/1.0 (GitHub Actions)'},
    ...rest,
    signal:signal || AbortSignal.timeout(timeoutMs)
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.json();
}

async function pubmed(term) {
  const q = encodeURIComponent(`"${term}"[Title/Abstract] AND (child OR pediatric OR paediatric OR infant OR adolescent)`);
  const search = await jsonFetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=5&sort=pub+date&term=${q}`);
  const ids = search?.esearchresult?.idlist || [];
  if (!ids.length) return [];
  await sleep(350);
  const sum = await jsonFetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}`);
  return ids.map(id => {
    const x=sum.result?.[id]||{};
    return {source:'PubMed/NCBI', id, title:clean(x.title), published:x.pubdate||null, url:`https://pubmed.ncbi.nlm.nih.gov/${id}/`};
  });
}

async function europePmc(term) {
  const q = encodeURIComponent(`TITLE_ABS:"${term}" AND (pediatric OR paediatric OR child OR infant OR adolescent)`);
  const data = await jsonFetch(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&pageSize=5&sort=CITED desc&query=${q}`);
  return (data?.resultList?.result||[]).map(x=>({
    source:'Europe PMC',
    id:x.pmid||x.pmcid||x.id||null,
    title:clean(x.title),
    published:x.firstPublicationDate||x.pubYear||null,
    doi:x.doi||null,
    url:x.pmid?`https://europepmc.org/article/MED/${x.pmid}`:(x.pmcid?`https://europepmc.org/article/PMC/${x.pmcid}`:null)
  }));
}

async function openFda(term) {
  const q = encodeURIComponent(`openfda.generic_name:"${term}" OR openfda.brand_name:"${term}"`);
  const data = await jsonFetch(`https://api.fda.gov/drug/label.json?limit=3&search=${q}`);
  return (data?.results||[]).map((x,i)=>({
    source:'openFDA drug label',
    id:x.id||`label-${i+1}`,
    title:clean([...(x.openfda?.brand_name||[]), ...(x.openfda?.generic_name||[])].join(' / ')) || term,
    published:x.effective_time||null,
    route:x.openfda?.route||[],
    dosage_and_administration:(x.dosage_and_administration||[]).slice(0,1).map(clean),
    pediatric_use:(x.pediatric_use||[]).slice(0,1).map(clean),
    url:'https://open.fda.gov/apis/drug/label/'
  }));
}

async function safe(label, fn) {
  try { return await fn(); }
  catch (e) { return [{source:label,error:String(e.message||e)}]; }
}

// A discovery pass is not a clinical closure. Stable scope IDs replace the shrinking-array cursor.
export function selectDiscoveryBatch(scopes, results, now, {limit=298, refreshHours=168, retryHours=24}={}) {
  const previous = new Map(results.map(r => [r.scope_id || `monograph:${r.fiche}:unextracted`,r]));
  return scopes.filter(s => s.status !== 'READY').map(scope => ({scope,previous:previous.get(scope.id)}))
    .filter(({previous:r}) => {
      if (!r || !Number.isFinite(Date.parse(r.searched_at))) return true;
      const failed = !r.candidate_sources?.some(c => !c.error) || r.candidate_sources.some(c => c.error);
      return Date.parse(now)-Date.parse(r.searched_at) >= (failed ? retryHours : refreshHours)*3600000;
    }).sort((a,b) => (Date.parse(a.previous?.searched_at) || 0)-(Date.parse(b.previous?.searched_at) || 0) || a.scope.id.localeCompare(b.scope.id))
    .slice(0,limit).map(x => x.scope);
}
export function mergeDiscovery(existing, fresh) {
  const map = new Map(existing.map(r => [r.scope_id || `monograph:${r.fiche}:unextracted`,r]));
  for (const r of fresh) {
    const old = map.get(r.scope_id);
    const valid = new Map((old?.candidate_sources || []).filter(c => !c.error).map(c => [candidateKey(c),c]));
    for (const c of r.candidate_sources.filter(c => !c.error)) valid.set(candidateKey(c),c);
    map.set(r.scope_id,{...old,...r,candidate_sources:[...valid.values(),...r.candidate_sources.filter(c => c.error)]});
  }
  return [...map.values()].sort((a,b) => a.fiche-b.fiche || String(a.scope_id || '').localeCompare(String(b.scope_id || '')));
}
function candidateKey(c) { return `${c.source}:${c.doi || c.id || c.url || c.title}`; }

export async function discover({now=new Date().toISOString(), search, root=fileURLToPath(new URL('../',import.meta.url))}={}) {
  const file = name => path.join(root,'public-data',name);
  const catalog = readJson(file('catalog.json'));
  const ledger = reconcileLedger(catalog,readJson(file('medication-gap-scopes.json'),{schema_version:'2.0',scopes:[]}));
  const existing = readJson(file('medication-gap-evidence-candidates.json'),{schema_version:'2.0',results:[]});
  const state = readJson(file('medication-gap-research-state.json'),{});
  const pending = ledger.scopes.filter(s => s.status !== 'READY');
  const refreshHours = boundedNumber(process.env.RESEARCH_REFRESH_HOURS,168,1,8760);
  const retryHours = boundedNumber(process.env.RESEARCH_RETRY_HOURS,24,1,8760);
  const batch = selectDiscoveryBatch(pending,existing.results,now,{
    limit:batchSize,
    refreshHours,retryHours
  });
  const concurrency = boundedNumber(process.env.RESEARCH_CONCURRENCY,3,1,5);
  const results = [];
  const research = search || (async scope => {
    const term = scope.kind === 'REGIMEN' ? `${scope.name} ${scope.target.indication}` : scope.name;
    const [pm,ep,fda] = await Promise.all([
      safe('PubMed/NCBI',()=>pubmed(term)), safe('Europe PMC',()=>europePmc(term)),
      safe('openFDA drug label',()=>openFda(scope.name))
    ]);
    return [...pm,...ep,...fda];
  });
  for (let offset=0;offset<batch.length;offset+=concurrency) {
    const chunk = await Promise.all(batch.slice(offset,offset+concurrency).map(async scope => ({
      fiche:scope.fiche,name:scope.name,scope_id:scope.id,scope_kind:scope.kind,
      resolution:'AUTO_RESEARCH_PENDING',searched_at:now,
      candidate_sources:await research(scope),operational_status:'NOT_PROMOTED',
      release_gate:'Discovery only. Complete exact-scope evidence, Brazilian verification and triple audit must pass scripts/resolve-medication-gaps.mjs.'
    })));
    results.push(...chunk);
    if (!search && offset+concurrency<batch.length) await sleep(400);
  }
  if (results.length) writeJson(file('medication-gap-evidence-candidates.json'),{
    ...existing,schema_version:'2.0',updated_at:now,results:mergeDiscovery(existing.results,results)
  });
  writeJson(file('medication-gap-scopes.json'),ledger);
  const count = counters(ledger);
  writeJson(file('medication-gap-research-state.json'),{...state,schema_version:'2.0',...count,
    pending_total_unit:'Unresolved scopes, including unextracted monograph remainders',
    last_discovery_check:now,last_run:results.length ? now : state.last_run || null,
    batch_size:results.length,discovery_batches:(state.discovery_batches || 0)+(results.length ? 1 : 0),
    discovery_scopes_searched:results.length,discovery_scopes_deferred:pending.length-batch.length,
    legacy_completed_cycles:state.legacy_completed_cycles ?? state.completed_cycles ?? 0,
    completed_cycles_meaning:'Legacy discovery traversal count; never clinical resolution',
    research_refresh_hours:refreshHours,research_retry_hours:retryHours,
    scheduling:'Stable scope IDs; fresh discoveries are deferred; failures use the separate retry window'
  });
  writeJson(file('medication-gap-research-queue.json'),projection(ledger,ledger.updated_at || now));
  return {searched:results.length,deferred:pending.length-batch.length,...count};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  discover().then(result=>console.log(JSON.stringify(result,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
}
