# PedDose | Plano de cuidado pediátrico

Aplicação estática em português para organizar um rascunho de prescrição domiciliar e orientações à família. O formulário reúne dados da criança, peso, diagnóstico, alergias confirmadas, medicamento e apresentação digitados pelo profissional, cuidados em casa, evolução esperada, sinais de alarme, critérios de retorno e identificação do prescritor.

## Segurança clínica

- A aplicação não diagnostica, calcula doses nem recomenda medicamentos. Cada esquema deve ser definido e conferido por profissional habilitado.
- O índice permite buscar os 142 títulos diagnósticos documentados; seus campos de evolução, sinais de alarme e retorno são preenchidos pelo profissional para cada atendimento, não gerados a partir apenas do título.
- Os seletores separados de apresentação e posologia permanecem bloqueados até haver opções vinculadas à indicação, população, apresentação compatível, fonte e auditoria clínica exigida pela governança v62. O acervo publicado ainda não contém opções operacionais aprovadas.
- O documento gerado é um rascunho para revisão e assinatura; não substitui avaliação clínica nem receituário sujeito a exigências legais.
- A biblioteca mostra nomes, fichas, páginas e sinalizações documentais do catálogo mestre. Não disponibiliza o texto integral das monografias como conduta nem habilita seleção ou prescrição automática.
- O catálogo mestre registra 498 monografias, 1.263 linhas de esquemas, 992 linhas apoiadas, 262 restrições e 9 lacunas de validação, conforme os metadados da fonte. O próprio acervo informa que não houve validação clínica humana independente.
- O inventário de proveniência agrupa anexos com o mesmo SHA-256. Cópias idênticas não contam como fontes independentes ou auditorias independentes.
- Os dados inseridos no formulário permanecem no navegador e não são enviados a um serviço.

## Fontes e escopo

`scripts/build-public-data.js` gera `public-data/catalog.json` a partir do JSON canônico de 498 fichas e `public-data/sources.json`, inventário dos anexos por nome, tamanho, categoria e SHA-256. `scripts/build-diagnosis-index.py` extrai os 142 títulos diagnósticos numerados e os módulos do compêndio DOCX, vinculando cada entrada ao hash da fonte. Esses índices contêm metadados e títulos; não contêm capítulos, monografias completas ou condutas clínicas. Os anexos integrais não são publicados pelo Pages.

O acervo local inclui catálogos farmacológicos e posológicos, materiais diagnósticos e de semiologia, modelos de receituário, auditorias, governança e materiais de soroterapia. Há arquivos distintos e duplicatas exatas, versões com diferenças e documentos que não puderam ser lidos integralmente. O inventário registra proveniência e integridade, mas não afirma que todas as informações clínicas foram reconciliadas ou validadas.

## Desenvolvimento e publicação

Regerar os índices após atualizar as fontes:

```sh
node scripts/build-public-data.js
python3 scripts/build-diagnosis-index.py
```

O GitHub Actions constrói o site com Jekyll e publica a branch `main` no GitHub Pages. O `_config.yml` exclui documentos-fonte e anexos do artefato web.
