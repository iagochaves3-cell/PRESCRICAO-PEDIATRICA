import fs from 'node:fs/promises';

const CATALOG = new URL('../public-data/catalog.json', import.meta.url);
const STATE = new URL('../public-data/medication-gap-research-state.json', import.meta.url);
const QUEUE = new URL('../public-data/medication-gap-research-queue.json', import.meta.url);
const CANDIDATES = new URL('../public-data/medication-gap-evidence-candidates.json', import.meta.url);

const batchSize = Math.max(1, Math.min(Number(process.env.RESEARCH_BATCH || 50), 100));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (s='') => String(s).replace(/\s+/g,' ').trim();

async function jsonFetch(url, options={}) {
  const res = await fetch(url, {headers:{'User-Agent':'PPS-evidence-resolver/1.0 (GitHub Actions)'}, ...options});
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

async function main(){
  const catalog=JSON.parse(await fs.readFile(CATALOG,'utf8'));
  let state={cursor:0,last_run:null,completed_cycles:0};
  try { state=JSON.parse(await fs.readFile(STATE,'utf8')); } catch {}
  const pending=catalog.medications.filter(m=>m.resolution==='AUTO_RESEARCH_PENDING');
  if (!pending.length) {
    await fs.writeFile(QUEUE, JSON.stringify({generated_at:new Date().toISOString(),pending:[]},null,2)+'\n');
    return;
  }
  const start=state.cursor % pending.length;
  const batch=Array.from({length:Math.min(batchSize,pending.length)},(_,i)=>pending[(start+i)%pending.length]);
  const results=[];
  for(const med of batch){
    const name=med.name;
    const [pm,ep,fda]=await Promise.all([
      safe('PubMed/NCBI',()=>pubmed(name)),
      safe('Europe PMC',()=>europePmc(name)),
      safe('openFDA drug label',()=>openFda(name))
    ]);
    results.push({
      fiche:med.fiche,name,
      resolution:'AUTO_RESEARCH_PENDING',
      searched_at:new Date().toISOString(),
      candidate_sources:[...pm,...ep,...fda],
      operational_status:'NOT_PROMOTED',
      release_gate:'Requires complete regimen-level extraction plus structural, pharmaceutical/mathematical, and clinical/regulatory triple audit. Brazilian regulatory/society verification remains mandatory when applicable.'
    });
    await sleep(400);
  }
  let existing={schema_version:'1.0',results:[]};
  try { existing=JSON.parse(await fs.readFile(CANDIDATES,'utf8')); } catch {}
  const map=new Map((existing.results||[]).map(x=>[x.fiche,x]));
  for(const r of results) map.set(r.fiche,r);
  const merged={schema_version:'1.0',updated_at:new Date().toISOString(),results:[...map.values()].sort((a,b)=>a.fiche-b.fiche)};
  const next=(start+batch.length)%pending.length;
  if(next<=start && batch.length<pending.length) state.completed_cycles=(state.completed_cycles||0)+1;
  state={...state,cursor:next,last_run:new Date().toISOString(),batch_size:batch.length,pending_total:pending.length,completed_cycles:state.completed_cycles||0};
  await fs.writeFile(CANDIDATES, JSON.stringify(merged,null,2)+'\n');
  await fs.writeFile(STATE, JSON.stringify(state,null,2)+'\n');
  await fs.writeFile(QUEUE, JSON.stringify({
    generated_at:new Date().toISOString(),
    source_hierarchy:['ANVISA','Ministério da Saúde','SES-MG','SBP/sociedades brasileiras','bulas/registro oficial','diretrizes internacionais','PubMed/DOI'],
    rule:'A descoberta de fontes gera candidatos; nunca transforma lacuna em posologia operacional sem auditoria tripla.',
    pending
  },null,2)+'\n');
  console.log(`Research candidates updated for ${results.length} medications; next cursor ${next}/${pending.length}.`);
}
main().catch(e=>{console.error(e);process.exit(1);});
