# PedDose | Plano de cuidado pediátrico

Aplicação estática em português para organizar um rascunho de receita domiciliar e orientações à família. O formulário clínico reúne idade, peso e diagnóstico; medicamentos, grupos terapêuticos, apresentação, posologia e orientações são registrados pelo profissional.

## Segurança clínica

- A aplicação não diagnostica, recomenda medicamentos ou calcula posologias. Medicamentos e instruções para cada caso devem ser definidos e conferidos por profissional habilitado.
- O índice de 142 diagnósticos serve apenas para busca/autocompletar do campo. Evolução clínica, cuidados, sinais de alarme e critérios de retorno são preenchidos individualmente pelo profissional.
- Os 498 registros farmacológicos estão em estado `DOCUMENTARY_ONLY`; não existem no acervo atual opções operacionais aprovadas para seletores de medicamento, apresentação ou posologia. A receita impressa contém somente os tópicos medicamentos prescritos, cuidados em casa, evolução clínica esperada, sinais de alarme e retorno ao ponto de atendimento.
- Uma ficha de pesquisa documental para faringoamigdalite estreptocócica compara CDC, IDSA, SBP e metadados PubMed. Os esquemas CDC são apresentados apenas como referência internacional; caixas de seleção ficam desabilitadas e não alimentam a receita. Apresentações brasileiras, consulta à bula Anvisa e revisão clínica local continuam pendentes. Não extrapolar essa ficha aos outros diagnósticos.
- O rascunho não inclui identificação do paciente, responsável, alergias, prescritor, registro profissional ou data. O prescritor ainda deve verificar alergias, contraindicações, indicação e esquema terapêutico antes de orientar a família.
- O documento é um rascunho para revisão e assinatura; não substitui avaliação clínica nem receituário sujeito a exigências legais.
- O catálogo mestre registra 498 monografias, 1.263 linhas de esquemas, 992 linhas apoiadas, 262 restrições e 9 lacunas de validação, conforme os metadados da fonte. O próprio acervo informa que não houve validação clínica humana independente.
- O inventário de proveniência agrupa anexos com o mesmo SHA-256. Cópias idênticas não contam como fontes independentes ou auditorias independentes.
- Os dados inseridos no formulário permanecem no navegador e não são enviados a um serviço.

## Fontes e escopo

`scripts/build-public-data.js` gera `public-data/catalog.json` a partir do JSON canônico de 498 fichas e `public-data/sources.json`, inventário dos anexos por nome, tamanho, categoria e SHA-256. `scripts/build-diagnosis-index.py` extrai os 142 títulos diagnósticos numerados e os módulos do compêndio DOCX, vinculando cada entrada ao hash da fonte. `public-data/clinical-evidence.json` contém uma revisão manual, datada e vinculada a fontes para um único diagnóstico; cada entrada declara jurisdição e estado não operacional. Os anexos integrais não são publicados pelo Pages nem mostrados na interface.

O acervo local inclui catálogos farmacológicos e posológicos, materiais diagnósticos e de semiologia, modelos de receituário, auditorias, governança e materiais de soroterapia. Há arquivos distintos e duplicatas exatas, versões com diferenças e documentos que não puderam ser lidos integralmente. O inventário registra proveniência e integridade, mas não afirma que todas as informações clínicas foram reconciliadas ou validadas.

## Desenvolvimento e publicação

Regerar os índices após atualizar as fontes:

```sh
node scripts/build-public-data.js
python3 scripts/build-diagnosis-index.py
```

O GitHub Actions constrói o site com Jekyll e publica a branch `main` no GitHub Pages. O `_config.yml` exclui documentos-fonte e anexos do artefato web.
