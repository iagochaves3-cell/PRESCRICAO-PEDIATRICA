# PedDose | Plano de cuidado pediátrico

Aplicação estática em português para organizar um rascunho de receita domiciliar e orientações à família. O formulário clínico reúne idade, peso e diagnóstico; medicamentos, grupos terapêuticos, apresentação, posologia e orientações são registrados pelo profissional.

## Segurança clínica

- A aplicação não diagnostica. Esquemas podem ser calculados automaticamente apenas quando um diagnóstico possui núcleo operacional explicitamente validado; a indicação e a conferência final permanecem sob responsabilidade do profissional habilitado.
- O índice de 142 diagnósticos serve apenas para busca/autocompletar do campo. Evolução clínica, cuidados, sinais de alarme e critérios de retorno são preenchidos individualmente pelo profissional.
- O catálogo farmacológico geral permanece majoritariamente documental. Núcleos operacionais auditados e liberados incluem faringoamigdalite estreptocócica (amoxicilina VO e benzilpenicilina benzatina IM), crise de asma/broncoespasmo leve a moderada (salbutamol 100 mcg/jato), dermatite das fraldas com candidíase secundária (nistatina + óxido de zinco e nistatina tópica) e dipirona VO para dor/febre com critérios de idade/peso.
- A ficha de faringoamigdalite estreptocócica foi reconciliada com fonte brasileira, CDC e apresentações brasileiras: amoxicilina 25 mg/kg/dose 12/12 h por 10 dias (máx. 500 mg/dose; 250 mg/5 mL ou 400 mg/5 mL) e benzilpenicilina benzatina 600.000 UI <27 kg / 1.200.000 UI ≥27 kg, IM, dose única, estão operacionais. Alternativas por alergia seguem documentais.
- O rascunho não inclui identificação do paciente, responsável, alergias, prescritor, registro profissional ou data. O prescritor ainda deve verificar alergias, contraindicações, indicação e esquema terapêutico antes de orientar a família.
- O documento é um rascunho para revisão e assinatura; não substitui avaliação clínica nem receituário sujeito a exigências legais.
- O catálogo mestre registra 498 monografias, 1.263 linhas de esquemas, 992 linhas apoiadas, 262 restrições e 9 lacunas de validação, conforme os metadados da fonte. O próprio acervo informa que não houve validação clínica humana independente.
- O inventário de proveniência agrupa anexos com o mesmo SHA-256. Cópias idênticas não contam como fontes independentes ou auditorias independentes.
- Os dados inseridos no formulário permanecem no navegador e não são enviados a um serviço.


- Fechamento clínico READY 28/09/2026: amoxicilina (faringoamigdalite), salbutamol 100 mcg/jato (asma/broncoespasmo leve-moderado), nistatina tópica, nistatina + óxido de zinco e dipirona VO foram promovidos após auditoria tripla documentada.

## Fontes e escopo

`scripts/build-public-data.js` gera `public-data/catalog.json` a partir do JSON canônico de 498 fichas e `public-data/sources.json`, inventário dos anexos por nome, tamanho, categoria e SHA-256. `scripts/build-diagnosis-index.py` extrai os 142 títulos diagnósticos numerados e os módulos do compêndio DOCX, vinculando cada entrada ao hash da fonte. `public-data/clinical-evidence.json` contém revisão datada e vinculada a fontes; a faringoamigdalite estreptocócica possui núcleo operacional explícito e alternativas documentais separadas. Os anexos integrais não são publicados pelo Pages nem mostrados na interface.

O acervo local inclui catálogos farmacológicos e posológicos, materiais diagnósticos e de semiologia, modelos de receituário, auditorias, governança e materiais de soroterapia. Há arquivos distintos e duplicatas exatas, versões com diferenças e documentos que não puderam ser lidos integralmente. O inventário registra proveniência e integridade, mas não afirma que todas as informações clínicas foram reconciliadas ou validadas.

## Desenvolvimento e publicação

Regerar os índices após atualizar as fontes:

```sh
node scripts/build-public-data.js
python3 scripts/build-diagnosis-index.py
```

O GitHub Actions constrói o site com Jekyll e publica a branch `main` no GitHub Pages. O `_config.yml` exclui documentos-fonte e anexos do artefato web.

## Resolução auditável das lacunas medicamentosas

Descoberta e resolução clínica são etapas separadas. `scripts/resolve-medication-gaps.mjs` promove somente escopos por regime com pacote completo, fontes em nível de campo, verificação brasileira, auditoria tripla vinculada por hash e cálculo testado. A fila é derivada do ledger `medication-gap-scopes.json`; resolver um regime não encerra outras indicações da mesma monografia. Pesquisas recentes deixam de ser repetidas a cada ciclo.

Na migração, permanecem 498 remanescentes de monografias ainda sem inventário integral extraído, quatro IDs READY legados e zero novos regimes promovidos. A unidade de `pending_total` está explícita; ciclos de descoberta não reduzem pendências clínicas. Consulte o [contrato e as decisões do fluxo](clinical-review/medication-gap-resolution-flow.md).

```sh
node --test tests/*.test.cjs tests/*.test.mjs
node scripts/resolve-medication-gaps.mjs
node scripts/resolve-medication-gaps.mjs --check
```
