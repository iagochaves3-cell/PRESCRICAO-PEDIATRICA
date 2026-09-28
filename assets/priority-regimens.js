/* PPS: revisão dirigida de 28/09/2026. READY é por esquema, não por monografia.
 * Valores estruturados de bula/diretriz; não constitui homologação humana independente. */
(function(root){
'use strict';
const version='2026-09-28.priority.1';
const sources={
 cdc:{title:'CDC — Group A Streptococcal Pharyngitis (18/11/2025)',url:'https://www.cdc.gov/group-a-strep/hcp/clinical-guidance/strep-throat.html',kind:'diretriz oficial'},
 ems250:{title:'EMS — amoxicilina 250 mg/5 mL',url:'https://www.ems.com.br/medicamentos/amoxicilina-250mg-5ml/',kind:'fabricante: apresentação'},
 ems400:{title:'EMS — amoxicilina 400 mg/5 mL',url:'https://www.ems.com.br/medicamentos/amoxicilina-400mg/',kind:'fabricante: apresentação'},
 msasma:{title:'Ministério da Saúde — planejamento terapêutico da asma',url:'https://linhasdecuidado.saude.gov.br/portal/asma/unidade-de-atencao-primaria/planejamento-terapeutico/',kind:'diretriz oficial'},
 salb:{title:'GSK — texto da bula profissional Aerolin spray, reproduzido em Bula.com.br',url:'https://bula.com.br/original/aerolin-spray-aerossol',kind:'reprodução da bula; não consulta direta ao Bulário Anvisa'},
 geolab:{title:'Geolab — Bebex N, bula profissional V.04_09/2024, seções 1, 4–8',url:'https://www.geolab.com.br/wp-content/uploads/2021/05/bebex-N_bula-profissional.pdf',kind:'bula no fabricante'},
 dip50:{title:'Opella — Novalgina solução oral 50 mg/mL, bula (20/03/2026)',url:'https://www.novalgina.com.br/produtos/infantil/solucao-oral/bula',kind:'bula no fabricante'},
 dip500:{title:'Opella — Novalgina gotas 500 mg/mL, bula (20/03/2026)',url:'https://www.novalgina.com.br/produtos/adulto/gotas/bula',kind:'bula no fabricante'},
 diptable:{title:'Opella — tabelas de dose e intervalo (01/12/2025)',url:'https://www.novalgina.com.br/dor-e-febre/febre/novalgina-infantil-dosagem',kind:'fabricante: aplicação das tabelas'},
 cps:{title:'Canadian Paediatric Society — antifúngicos, reafirmado 21/11/2024',url:'https://cps.ca/en/documents/position/antifungal-agents-common-infections',kind:'sociedade médica; não comprova apresentação brasileira isolada'}
};
const records=[
 {id:'amox-gas',fiche:35,name:'Amoxicilina',status:'READY',scope:'Faringoamigdalite estreptocócica confirmada; esquema VO 12/12 h, 10 dias; idade auditada ≥3 meses e <18 anos.',minMonths:3,maxMonths:216,category:'Tratamento etiológico',sources:['cdc','ems250','ems400'],presentations:[{id:'amox-250',label:'Suspensão 250 mg/5 mL (50 mg/mL) — frasco reconstituído 150 mL',mgMl:50,bottleMl:150},{id:'amox-400',label:'Suspensão 400 mg/5 mL (80 mg/mL) — frasco reconstituído 100 mL',mgMl:80,bottleMl:100}],variants:[['standard','25 mg/kg/dose; máximo 500 mg/dose']],warnings:'Não usar em alergia relevante a penicilinas; revisar mononucleose, função renal e interações. Não associar automaticamente a outro antibiótico para a mesma faringite.',labelStatus:'Esquema de diretriz; a apresentação brasileira foi confirmada. Não é aprovação integral da monografia.',remaining:'Outras indicações, concentrações, cápsulas, comprimidos, esquema 1x/dia e ajustes de insuficiência renal não foram promovidos neste bloco.'},
 {id:'salbutamol-rescue',fiche:381,name:'Salbutamol',status:'READY',scope:'Resgate ambulatorial em asma/broncoespasmo já avaliado, sem gravidade; idade auditada ≥12 meses e <18 anos. Não é protocolo de crise moderada/grave.',minMonths:12,maxMonths:216,category:'Tratamento de suporte',sources:['msasma','salb'],presentations:[{id:'salb-100',label:'Aerossol dosimetrado 100 mcg de salbutamol BASE/jato — 200 doses',mcgPuff:100,puffs:200}],variants:[['one','1 jato (100 mcg)'],['two','2 jatos (200 mcg), se necessário']],warnings:'Não usar em alergia ao produto; revisar betabloqueador não seletivo, arritmias e tireotoxicose. Reavaliar se alívio durar menos de 3 h ou houver piora. Avaliar tratamento controlador com corticoide inalatório.',labelStatus:'Posologia da bula profissional reproduzida, conciliada com orientação ministerial. Não houve consulta direta da renovação do registro na Anvisa.',remaining:'Nebulização 5 mg/mL, apresentações sistêmicas, lactentes <12 meses e esquemas de crise grave não estão homologados neste bloco; limite etário aqui é do escopo, não contraindicação absoluta.'},
 {id:'nystatin-zinc-diaper',fiche:319,name:'Nistatina + óxido de zinco',status:'READY',scope:'Dermatite de fraldas candidiásica; uso exclusivamente dermatológico. Dose por área, não por peso.',minMonths:0,maxMonths:216,category:'Tratamento etiológico',sources:['geolab','cps'],presentations:[{id:'nyz-60',label:'Pomada dermatológica: nistatina 100.000 UI/g + óxido de zinco 200 mg/g — 60 g',unitsG:100000,zincMgG:200,tubeG:60}],variants:[['standard','Camada fina após higiene e a cada troca de fralda']],warnings:'Não usar em alergia aos componentes nem em grandes áreas de pele ferida. Uso externo; suspender se irritação. Não substituir por creme vaginal ou suspensão oral.',labelStatus:'Indicação e uso pediátrico constam da bula do fabricante. A bula não fixa duração numérica; término guiado pela resolução e reavaliação clínica.',remaining:'Nistatina isolada: não foi confirmada nesta auditoria uma formulação dermatológica brasileira isolada apropriada. Não converter formulação vaginal/oral em pomada de fraldas.'},
 {id:'dipyrone',fiche:null,name:'Dipirona monoidratada',status:'READY',scope:'Dor ou febre em criança avaliada, ≥3 meses e <15 anos, 5–53 kg. Selecionar dose dentro da tabela da apresentação; inicialmente a mínima.',minMonths:3,maxMonths:180,category:'Antitérmico / analgésico',sources:['dip50','dip500','diptable'],presentations:[{id:'dip-50',label:'Solução oral 50 mg/mL — frasco 100 mL',mgMl:50,bottleMl:100},{id:'dip-500',label:'Gotas 500 mg/mL — 20 gotas/mL, 25 mg/gota — frasco 10 ou 20 mL',mgMl:500,dropsMl:20,mgDrop:25}],variants:[['min','Dose mínima da faixa (inicial)'],['max','Dose máxima da faixa, se necessária']],warnings:'Contraindicada se <3 meses OU <5 kg, alergia a pirazolonas, agranulocitose/doença medular, deficiência G6PD, porfiria ou reação a analgésicos. Revisar função renal/hepática, metotrexato e demais interações. A solução contém açúcar e excipientes próprios.',labelStatus:'Dose e limites específicos de bula. Em lacunas entre faixas inteiras, usa-se somente a interseção dos intervalos permitidos nas duas faixas — regra computacional conservadora explícita.',remaining:'Comprimidos, supositórios, injetáveis, outras marcas com gotejador diferente, idade ≥15 anos e peso >53 kg exigem reconciliação própria, não foram promovidos.'}
];
const bands=[
 {lo:5,hi:8,oral:[1.25,2.5],drops:[2,5]},
 {lo:9,hi:15,oral:[2.5,5],drops:[3,10]},
 {lo:16,hi:23,oral:[3.75,7.5],drops:[5,15]},
 {lo:24,hi:30,oral:[5,10],drops:[8,20]},
 {lo:31,hi:45,oral:[7.5,15],drops:[10,30]},
 {lo:46,hi:53,oral:[8.75,17.5],drops:[15,35]}
];
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const fmt=n=>Number(n.toFixed(4)).toLocaleString('pt-BR',{maximumFractionDigits:4});
function parseAge(text){
 const s=norm(text);let months=0,found=false;
 const rest=s.replace(/(\d+(?:[.,]\d+)?)\s*(anos?|a\b|meses?|mes\b|m\b|dias?|d\b)/g,(_,n,u)=>{found=true;const v=Number(n.replace(',','.'));months+=u.startsWith('a')?v*12:u.startsWith('m')?v:v/30.4375;return '';}).replace(/\be\b/g,'').trim();
 return found&&!rest&&Number.isFinite(months)&&months>=0?months:null;
}
function fail(message){throw new Error(message);}
function getBand(weight,key){
 const exact=bands.find(b=>weight>=b.lo&&weight<=b.hi);
 if(exact)return {range:exact[key],daily:exact[key][1]*4,policy:'label'};
 for(let i=0;i<bands.length-1;i++)if(weight>bands[i].hi&&weight<bands[i+1].lo){
  const range=[Math.max(bands[i][key][0],bands[i+1][key][0]),Math.min(bands[i][key][1],bands[i+1][key][1])];
  if(range[0]>range[1])fail('Faixas sem interseção segura.');
  return {range,daily:Math.min(bands[i][key][1],bands[i+1][key][1])*4,policy:'intersection'};
 }
 fail('Peso fora de 5–53 kg: tabela pediátrica não cobre este caso.');
}
function calculate(id,presentationId,variant,context){
 const rec=records.find(x=>x.id===id);if(!rec)fail('Esquema não homologado.');
 const p=rec.presentations.find(x=>x.id===presentationId);if(!p)fail('Apresentação incompatível: não converter entre formas ou vias.');
 const weight=Number(context.weight), age=parseAge(context.age), dx=norm(context.diagnosis);
 if(!Number.isFinite(weight)||weight<=0||weight>250)fail('Informe peso aferido válido.');
 if(age===null)fail('Informe idade com unidade, por exemplo 4 anos ou 2 meses.');
 if(age<rec.minMonths||age>=rec.maxMonths)fail('Idade fora do escopo auditado deste esquema.');
 if(context.clinicalReview!==true)fail('Confirme indicação, contraindicações, interações, ajustes e gravidade deste paciente.');
 if(id==='amox-gas'&&(!/(estreptococ|streptococc|j02\.0|j03\.0)/.test(dx)||/viral|mononucleose/.test(dx)))fail('Este esquema é específico para faringite estreptocócica confirmada, não faringite viral.');
 if(id==='salbutamol-rescue'&&(!/(asma|broncoespasmo)/.test(dx)||/bronquiolite|grave|insuficiencia respiratoria/.test(dx)))fail('Resgate ambulatorial só para asma/broncoespasmo avaliado; não para tosse isolada, bronquiolite ou crise grave.');
 if(id==='nystatin-zinc-diaper'&&(!/candid/.test(dx)||!/fralda/.test(dx)))fail('Confirme dermatite de fraldas candidiásica para este esquema.');
 const r={status:'READY',id,presentationId,weight,ageMonths:age,name:rec.name,presentation:p.label,category:rec.category,mg:null,ml:null,days:null,route:'VO',sources:rec.sources,scope:rec.scope,contraindications:rec.warnings};
 if(id==='amox-gas'){
  r.targetMg=Math.min(weight*25,500);const exactMl=r.targetMg/p.mgMl;
  r.ml=Math.floor((exactMl+1e-9)*10)/10;r.mg=Number((r.ml*p.mgMl).toFixed(8));r.relativeError=(r.targetMg-r.mg)/r.targetMg;
  if(r.ml<=0||r.relativeError>0.05+1e-10)fail('Arredondamento excede 5%; escolher outra concentração ou dispositivo.');
  r.mgPerKg=r.mg/weight;r.dailyMg=r.mg*2;r.totalMl=r.ml*20;r.intervalHours=12;r.days=10;
  r.amount=`${fmt(r.ml)} mL (${fmt(r.mg)} mg) por dose`;r.interval='12/12 horas';r.duration='10 dias';
  r.quantity=`${Math.ceil(Number(r.totalMl.toFixed(6))/p.bottleMl)} frasco(s) de ${p.bottleMl} mL após reconstituição (volume a administrar: ${fmt(r.totalMl)} mL)`;
  r.instructions='Agitar antes de cada dose; medir com seringa oral. Completar os 10 dias. Reconstituir e conservar conforme a bula do produto dispensado.';
  r.formula=`Alvo: min(${fmt(weight)} × 25, 500) = ${fmt(r.targetMg)} mg; ÷ ${p.mgMl} = ${fmt(exactMl)} mL. Arredondamento para baixo a 0,1 mL: ${fmt(r.ml)} mL. Reverso: ${fmt(r.ml)} × ${p.mgMl} = ${fmt(r.mg)} mg = ${fmt(r.mgPerKg)} mg/kg/dose; desvio ${fmt(r.relativeError*100)}%. Teto: 500 mg/dose e 1.000 mg/dia.`;
 }else if(id==='salbutamol-rescue'){
  if(!['one','two'].includes(variant))fail('Selecione 1 ou 2 jatos.');
  r.puffs=variant==='two'?2:1;r.mcg=r.puffs*p.mcgPuff;r.mcgPerKg=r.mcg/weight;r.maxPuffsDay=8;r.intervalHours=6;r.route='Inalatória oral, com espaçador';
  r.amount=`${r.puffs} jato(s) (${r.mcg} mcg de salbutamol base)`;r.interval='Se chiado/falta de ar, respeitar 6 horas entre administrações; máximo 4 administrações/dia neste plano';r.duration='Somente enquanto necessário para alívio; reavaliar se houver aumento da necessidade ou alívio por menos de 3 horas';r.quantity='1 aerossol com 200 doses';
  r.instructions='Agitar. Administrar um jato por vez no espaçador, conforme técnica demonstrada. Não suspender o controlador da asma. Piora respiratória, dificuldade de falar/beber ou falta de alívio exigem atendimento imediato.';
  r.formula=`${r.puffs} × 100 = ${r.mcg} mcg de base = ${fmt(r.mcgPerKg)} mcg/kg/dose (equivalência, não regra ponderal). Reverso: ${r.mcg}/100 = ${r.puffs} jatos. Até 4 administrações/dia; teto deste plano 8 jatos = 800 mcg/dia. Não é o teto de um protocolo de crise grave; não converter em mL.`;
 }else if(id==='nystatin-zinc-diaper'){
  r.route='Tópica dermatológica';r.amount='Aplicar camada fina na área coberta pela fralda';r.interval='Após o banho e a cada troca de fraldas';r.duration='Enquanto houver lesões; se não desaparecerem ou se houver piora/irritação, retornar para reavaliação';r.quantity='1 bisnaga de 60 g';r.instructions='Lavar e secar delicadamente a pele antes de aplicar. Uso externo. Não usar em grandes áreas de pele ferida; suspender se irritação.';
  r.formula='1 g contém 100.000 UI de nistatina + 200 mg de óxido de zinco. A quantidade aplicada depende da área: não há dose em mg/kg, mL por aplicação nem máximo absoluto numérico estabelecidos nesta bula. Não confundir com 25.000 UI/g vaginal.';
 }else if(id==='dipyrone'){
  if(!['min','max'].includes(variant))fail('Selecione dose mínima ou máxima da faixa.');
  const drops=p.id==='dip-500', b=getBand(weight,drops?'drops':'oral'),amount=b.range[variant==='max'?1:0];
  r.boundaryPolicy=b.policy;r.range=b.range;r.ml=drops?amount/p.dropsMl:amount;r.mg=r.ml*p.mgMl;r.mgPerKg=r.mg/weight;r.dailyMaxMg=b.daily*(drops?p.mgDrop:p.mgMl);r.intervalHours=6;
  if(drops)r.drops=amount;
  r.amount=drops?`${amount} gotas (${fmt(r.ml)} mL = ${fmt(r.mg)} mg)`:`${fmt(r.ml)} mL (${fmt(r.mg)} mg)`;
  r.interval='6/6 horas, somente se dor ou febre; máximo 4 administrações em 24 horas';r.duration='Somente se dor ou febre; suspender quando não for necessária. Persistência exige reavaliação';r.quantity=drops?'1 frasco de 10 ou 20 mL, com o gotejador validado':'1 frasco de 100 mL';
  r.instructions=(drops?'Usar o gotejador de 20 gotas/mL desta apresentação.':'Medir com seringa ou copo dosador do produto; não é necessário agitar.')+' Não associar outro produto com dipirona. Suspender e procurar atendimento se surgirem feridas na boca, reação na pele, falta de ar ou febre inesperada/persistente.';
  r.formula=`Tabela desta apresentação: ${fmt(b.range[0])}–${fmt(b.range[1])} ${drops?'gotas':'mL'}/dose. Reverso: ${fmt(r.ml)} × ${p.mgMl} = ${fmt(r.mg)} mg = ${fmt(r.mgPerKg)} mg/kg/dose${drops?`; ${amount} × 25 mg/gota = ${fmt(r.mg)} mg`:''}. Máximo da faixa em 24 h: ${fmt(r.dailyMaxMg)} mg. ${b.policy==='intersection'?'Peso entre faixas: somente interseção dos intervalos adjacentes; peso real preservado.':'Sem aplicar regra de 1 gota/kg.'}`;
 }
 if(r.mg!==null&&p.mgMl&&Math.abs(r.ml*p.mgMl-r.mg)>1e-7)fail('Falha na checagem reversa.');
 return r;
}
const api={version,records,sources,bands,parseAge,calculate};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.PPSPriority=api;
if(!root.document)return;
function mount(){
 const doc=root.document, form=doc.getElementById('prescription-form'), list=doc.getElementById('medication-list');
 if(!form||!list||doc.getElementById('priority-panel'))return;
 const el=(tag,text,cls)=>{const n=doc.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 const context=()=>({weight:doc.getElementById('weight').value,age:doc.getElementById('age').value,diagnosis:doc.getElementById('diagnosis').value,clinicalReview:review.checked});
 const panel=el('section',null,'group');panel.id='priority-panel';panel.dataset.version=version;
 panel.append(el('h3','Esquemas reconciliados — seleção para o receituário'));
 panel.append(el('p','READY refere-se somente à indicação, faixa etária, via e apresentação abaixo. Revisão documental e testes automatizados não equivalem a homologação humana independente.','evidence-intro'));
 const reviewLabel=el('label'),review=el('input');review.type='checkbox';review.id='priority-clinical-review';review.style.cssText='width:16px;min-height:16px;margin-right:8px';
 reviewLabel.append(review,doc.createTextNode('Confirmei, para os esquemas escolhidos, a indicação e ausência de contraindicação, interação impeditiva, ajuste especial renal/hepático ou gravidade que impeça este plano. Na asma, revisei o controlador.'));
 panel.append(reviewLabel);const grid=el('div',null,'evidence-list');panel.append(grid);
 const views=new Map();
 function invalidatePreview(){doc.getElementById('print').disabled=true;doc.getElementById('form-status').textContent='Esquema alterado: prepare e confira novamente o receituário.';}
 function removeComputed(id){list.querySelectorAll('[data-priority-regimen]').forEach(n=>{if(!id||n.dataset.priorityRegimen===id)n.remove();});invalidatePreview();}
 function display(view){try{const r=calculate(view.rec.id,view.presentation.value,view.variant.value,context());view.result.textContent=`READY — ${r.amount}. ${r.interval}. ${r.duration}`;view.formula.textContent=r.formula;}catch(e){view.result.textContent=e.message;view.formula.textContent='';}}
 api.use=(id,pid,variant,evidenceKey)=>{
  const view=views.get(id);try{
   const r=calculate(id,pid,variant,context());
   const selected=[...list.querySelectorAll('.med-card')].filter(c=>c.querySelector('[data-selected]')?.checked&&c.dataset.priorityRegimen!==id);
   const duplicate=selected.some(c=>{const n=norm(c.querySelector('[data-field="name"]')?.value);return id==='amox-gas'?/amoxicilina|benzilpenicilina|penicilina.*benzatina/.test(n):id==='dipyrone'?/dipirona/.test(n):id==='salbutamol-rescue'?/salbutamol/.test(n):/nistatina.*zinco/.test(n);});
   if(duplicate)fail('Já há medicamento/esquema equivalente selecionado. Remova-o antes de trocar, evitando duplicidade.');
   removeComputed(id);doc.getElementById('add-medication').click();const card=list.lastElementChild;card.dataset.priorityRegimen=id;card.dataset.priorityVersion=version;if(evidenceKey)card.dataset.evidenceKey=evidenceKey;
   const set=(key,text)=>{const f=card.querySelector(`[data-field="${key}"]`);if(f){f.value=text||'';if(f.tagName==='SELECT')f.disabled=true;else f.readOnly=true;}};
   set('name',r.name);set('category',r.category);set('indication',r.scope);set('presentation',r.presentation);set('dose',r.amount);set('amount',r.amount);set('route',r.route);set('interval',r.interval);set('duration',r.duration);set('quantity',r.quantity);set('instructions',r.instructions);set('contraindications',r.contraindications);set('evidence',r.formula);
   const selector=card.querySelector('[data-option="presentation"]');selector.replaceChildren(el('option',r.presentation));selector.disabled=true;
   card.querySelector('.posology-status').textContent=`READY — ${version}. Cálculo e apresentação vinculados. Para alterar, use os seletores do bloco reconciliado.`;
   const checkbox=card.querySelector('[data-selected]');checkbox.checked=true;checkbox.dispatchEvent(new Event('change',{bubbles:true}));
   invalidatePreview();if(view){view.result.textContent=`Incluído no receituário: ${r.amount}`;view.formula.textContent=r.formula;}return true;
  }catch(e){if(view)view.result.textContent=e.message;doc.getElementById('form-status').textContent=e.message;return false;}
 };
 for(const rec of records){
  const article=el('article',null,'evidence-card');article.dataset.priorityId=rec.id;article.append(el('strong',rec.name),el('p',rec.scope));
  const presentation=el('select');presentation.setAttribute('aria-label',`Apresentação de ${rec.name}`);rec.presentations.forEach(p=>{const o=el('option',p.label);o.value=p.id;presentation.append(o);});
  const variant=el('select');variant.setAttribute('aria-label',`Posologia de ${rec.name}`);rec.variants.forEach(([v,t])=>{const o=el('option',t);o.value=v;variant.append(o);});
  const result=el('p'),formula=el('p');result.className='priority-result';formula.className='priority-formula';result.setAttribute('aria-live','polite');
  const button=el('button','Adicionar ao receituário','secondary');button.type='button';
  article.append(presentation,variant,result,formula,button,el('p',rec.warnings));
  const details=el('details'),summary=el('summary','Fontes, escopo e apresentações ainda não homologadas');details.append(summary,el('p',rec.labelStatus),el('p',rec.remaining));
  rec.sources.forEach(id=>{const a=el('a',sources[id].title);a.href=sources[id].url;a.target='_blank';a.rel='noopener noreferrer';details.append(a,el('br'));});article.append(details);grid.append(article);
  const view={rec,presentation,variant,result,formula};views.set(rec.id,view);
  [presentation,variant].forEach(control=>control.addEventListener('change',()=>{removeComputed(rec.id);display(view);}));
  button.addEventListener('click',()=>api.use(rec.id,presentation.value,variant.value));display(view);
 }
 list.parentElement.insertBefore(panel,list);
 const printStyle=el('style');printStyle.textContent='@media print { #prescription-form, .shell > header, .shell > .hero, .shell > .footer {display:none!important} .shell {padding:0!important;max-width:none!important} .workspace {display:block!important} #prescription {position:static!important;overflow:visible!important} #prescription .rx-body {padding:0!important} #prescription strong, #prescription h3, #prescription p {color:#111!important} }';doc.head.append(printStyle);
 review.addEventListener('change',()=>{removeComputed();views.forEach(display);});
 ['weight','age','diagnosis'].forEach(id=>doc.getElementById(id).addEventListener('input',()=>{
  review.checked=false;removeComputed();list.querySelectorAll('[data-evidence-key]').forEach(n=>n.remove());doc.querySelectorAll('#evidence-regimens input[type="checkbox"]').forEach(n=>n.checked=false);views.forEach(display);
 }));
 form.addEventListener('change',invalidatePreview);
 form.addEventListener('click',e=>{if(e.target.closest('.remove-button,#add-medication'))invalidatePreview();});
 form.addEventListener('reset',()=>{review.checked=false;root.setTimeout(()=>views.forEach(display));});
 form.addEventListener('submit',()=>{
  if(doc.getElementById('print').disabled)return;
  const selected=[...list.querySelectorAll('.med-card')].filter(c=>c.querySelector('[data-selected]').checked);
  doc.querySelectorAll('#out-medications .rx-med').forEach((item,i)=>{
   const card=selected[i];if(!card?.dataset.priorityRegimen)return;
   const v=k=>card.querySelector(`[data-field="${k}"]`).value;
   item.replaceChildren(el('strong',v('name')),el('p',v('presentation')),el('p',`${v('amount')} · ${v('route')}. ${v('interval')}. ${v('duration')}.`),el('p',v('instructions')),el('p',`Dispensar: ${v('quantity')}`));
  });
 });
}
if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',mount);else mount();
})(typeof window!=='undefined'?window:globalThis);
