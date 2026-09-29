# Revisão dirigida dos medicamentos prioritários — 28/09/2026

## Escopo e significado de READY

Esta revisão abrange somente as fichas 35 (amoxicilina), 166 (dipirona), 318 (nistatina), 319 (nistatina + óxido de zinco) e 381 (salbutamol). READY aplica-se a um regime com indicação, população, apresentação e via definidos. Não libera toda a monografia nem as 498 fichas. Não houve homologação clínica humana independente.

O histórico e o índice de 498 medicamentos foram preservados. A propriedade global `resolution` permanece inalterada para que indicações ainda não resolvidas continuem na fila; `ready_regimen_ids` identifica os regimes operacionais parciais. O registro estruturado é `public-data/priority-regimens.json` e a auditoria de candidatos é `public-data/priority-candidate-audit.json`.

## Auditoria dos candidatos realmente encontrados

Na fotografia de candidatos utilizada, amoxicilina, nistatina isolada e salbutamol tinham cinco registros cada; dipirona e nistatina + zinco não tinham candidato válido. Houve oito erros de requisição nas cinco fichas: respostas 429 do PubMed e 400/404 da openFDA, incluindo consultas com nomes em português e combinações não adequadas à sintaxe da API.

Parte dos títulos era incompatível com a indicação, população ou finalidade desta implementação: erradicação de H. pylori, estudos em adultos, preparações vaginais e até efluentes hospitalares. A triagem por metadados não equivale a leitura integral nem permite aprovação de posologia. Nenhum desses candidatos foi promovido pelo mero fato de ter sido encontrado. A consulta dirigida às fontes abaixo substituiu esse atalho. O arquivo de auditoria preserva os títulos, identificadores, erros, instante e hash do conjunto de candidatos.

## Decisões

| Regime | Apresentações vinculadas | Escopo operacional |
|---|---|---|
| Amoxicilina, faringoamigdalite estreptocócica confirmada | Suspensão 250 mg/5 mL (50 mg/mL), frasco reconstituído 150 mL; 400 mg/5 mL (80 mg/mL), frasco 100 mL | 25 mg/kg/dose VO 12/12 h por 10 dias; alvo máximo 500 mg/dose. Escopo auditado: 3 meses a <18 anos, sem ajuste especial ou contraindicação. |
| Salbutamol, resgate ambulatorial de asma/broncoespasmo avaliado | Aerossol 100 mcg de salbutamol base/jato, 200 doses | 1–2 jatos por administração, com espaçador. Plano conservador PRN com intervalo de 6 h, até quatro administrações/dia e máximo 8 jatos/dia. Não é protocolo de crise moderada/grave. Escopo: 12 meses a <18 anos. |
| Nistatina + óxido de zinco, dermatite de fraldas candidiásica | Pomada dermatológica 100.000 UI/g + 200 mg/g; 60 g | Camada fina após higiene e a cada troca de fraldas. Não calcular mg/kg ou mL por aplicação. A bula não fixa duração numérica nem máximo absoluto; reavaliar persistência/piora/irritação. |
| Dipirona para dor/febre, criança avaliada | Solução 50 mg/mL, 100 mL; gotas 500 mg/mL, 20 gotas/mL, 25 mg/gota, frascos 10/20 mL | Tabela própria de cada forma, faixa mínima inicialmente selecionada e máxima disponível. Intervalo de 6 h PRN, até quatro administrações/dia. Escopo: ≥3 meses e <15 anos, 5–53 kg. |

**Nistatina isolada para fraldas não foi promovida.** A revisão não confirmou apresentação dermatológica brasileira isolada apropriada. Isso não prova inexistência do produto. Formulações oral e vaginal não foram convertidas em dermatológicas. A opção tópica nistatina + zinco foi resolvida separadamente.

Também não foram promovidos nesta revisão: salbutamol nebulização/sistêmico ou crise grave, outras indicações e esquemas de amoxicilina, dipirona injetável/comprimidos/supositórios, marcas com outro gotejador ou ajustes especiais. Os limites etários de escopo do software não devem ser interpretados como contraindicações absolutas de toda a molécula.

## Fontes e reconciliação

- [CDC, faringite por estreptococo do grupo A, 18/11/2025](https://www.cdc.gov/group-a-strep/hcp/clinical-guidance/strep-throat.html): indicação e regime de amoxicilina 25 mg/kg/dose duas vezes/dia, 10 dias, máximo 500 mg/dose.
- [EMS, amoxicilina 250 mg/5 mL](https://www.ems.com.br/medicamentos/amoxicilina-250mg-5ml/) e [400 mg/5 mL](https://www.ems.com.br/medicamentos/amoxicilina-400mg/): apresentações e volumes reconstituídos. Não são confirmação de todos os produtos do mercado.
- [Ministério da Saúde, planejamento terapêutico da asma](https://linhasdecuidado.saude.gov.br/portal/asma/unidade-de-atencao-primaria/planejamento-terapeutico/): contexto assistencial, resgate e necessidade de revisão do controlador.
- [Texto da bula profissional GSK de Aerolin spray, reproduzido em Bula.com.br](https://bula.com.br/original/aerolin-spray-aerossol): 100 mcg de base/jato, uma inalação podendo aumentar para duas, até quatro vezes/dia. **Limitação de proveniência:** documento reproduzido fora do domínio do fabricante; não se confirmou diretamente a renovação do registro na Anvisa. A interface explicita isso. A exigência de reavaliação com alívio inferior a três horas não deve ser confundida com permissão para escalar doses em casa.
- [Geolab, Bebex N, bula profissional V.04_09/2024](https://www.geolab.com.br/wp-content/uploads/2021/05/bebex-N_bula-profissional.pdf): composição ativa, indicação pediátrica, via externa, higiene, camada fina a cada troca e contraindicações. Foi utilizada a composição do corpo atual da bula, não linhas históricas de alterações.
- [Canadian Paediatric Society, antifúngicos em crianças, reafirmado em 2024](https://cps.ca/en/documents/position/antifungal-agents-common-infections): contexto da candidíase de fraldas; não comprova apresentação brasileira isolada.
- [Opella/Novalgina, solução 50 mg/mL](https://www.novalgina.com.br/produtos/infantil/solucao-oral/bula), [gotas 500 mg/mL](https://www.novalgina.com.br/produtos/adulto/gotas/bula) e [tabelas de dose](https://www.novalgina.com.br/dor-e-febre/febre/novalgina-infantil-dosagem): apresentações, tabelas específicas, idade/peso mínimos, intervalo, máximos e contraindicações. Não se aplica a regra de uma gota/kg.

## Regras de cálculo explícitas

Amoxicilina: alvo = mínimo(peso × 25 mg/kg, 500 mg); volume = alvo/concentração. A implementação arredonda para baixo a 0,1 mL, admite desvio relativo até 5% e mostra alvo, volume efetivo e dose efetiva. Esta é uma política computacional explícita, **não uma frase atribuída ao CDC**. Exemplos: 16 kg e 80 mg/mL → 5 mL = 400 mg; 10 kg e 80 mg/mL → alvo 250 mg, volume efetivo 3,1 mL = 248 mg. Para desvio >5%, a apresentação é recusada.

Dipirona: dose vem da tabela da apresentação. Para pesos entre duas faixas inteiras impressas, só é permitida a interseção dos intervalos de dose das faixas adjacentes, preservando o peso real. A reversão usa mL × mg/mL e, nas gotas verificadas, gotas × 25 mg/gota. mg/kg é mostrado como equivalência, não como substituto da tabela.

Salbutamol: jatos × 100 mcg de base; mcg/kg é equivalência, não algoritmo de dose ponderal. Não se inventa volume em mL para o aerossol.

Pomada: 1 g contém 100.000 UI + 200 mg; sem transformar camada fina em uma massa/volume supostamente exatos.

## Verificação e publicação

Os comandos de teste são `node --test tests/priority-regimens.test.cjs` e `python tests/priority-browser.py`. O workflow `PPS priority release` só grava os arquivos integrados após ambos passarem, além de `git diff --check`. Evidências são preservadas como artefato do Actions. O workflow `PPS priority production smoke` compara o JavaScript publicado com o commit implantado e repete o teste funcional na URL pública após o Pages concluir.

A verificação cobre seleção e remoção, concentrações, dose e reversão, limites, três perfis (4 anos/16 kg, 1 ano/10 kg, 2 meses/3 kg), duplicidade de tratamento etiológico, mudança de peso/idade/apresentação, invalidação de dose antiga, impressão e ausência de erros JavaScript. A captura de impressão usa apenas dados sintéticos.

A confirmação do caso clínico continua sendo tarefa do prescritor: indicação, contraindicações, interações, ajustes especiais e gravidade. Não se exige dele digitar a bibliografia ou completar manualmente a posologia destes regimes. Este bloco não estabelece sincronização com o SiteGPT nativo; a implantação verificável é no repositório/GitHub Pages.
