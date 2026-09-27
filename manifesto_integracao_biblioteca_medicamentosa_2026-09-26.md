# Manifesto definitivo — Biblioteca Medicamentosa Pediátrica

## Fonte canônica
- **Arquivo:** `catalogo-base.pdf`
- **Título:** Catálogo Posológico Pediátrico
- **Edição:** 13/09/2026
- **Revisão corrigida:** 14/09/2026
- **SHA-256:** `c5c9f8703c0603bbd5a09bf9723c99296c698e6fb791d05589268672cae82e63`
- **Cobertura documental:** 498 medicamentos; 1 monografia por página; páginas 13–510.
- **Cobertura informada no próprio catálogo:** 1.263 linhas de indicação/esquema; 992 com suporte; 262 restrições; 9 lacunas de validação.

## Regra de integração
1. Integração por **delta aditivo**: não apagar nem substituir conteúdo previamente válido.
2. Os **498 medicamentos** devem existir na biblioteca pesquisável dos projetos terapêuticos pertinentes.
3. Restrição, lacuna, indicação apenas documental, faixa etária, via, apresentação, concentração, máximo, duração e status off-label devem ser preservados.
4. Uma indicação/restrição não pode ser transferida para outra indicação ou faixa etária.
5. Não intercambiar base/sal, apresentação do frasco e concentração final de infusão.
6. Para cálculos, usar dose ponderal + teto da indicação + conversão para volume quando a concentração for inequívoca + checagem reversa independente.
7. Em drogas de alta vigilância, exigir dupla checagem de peso, unidade, concentração final, via e programação da bomba.
8. Lacunas de validação devem permanecer **bloqueadas para prescrição automática** até validação; podem permanecer visíveis/documentais.
9. Publicação somente após testes de integridade, dose, unidades, seleção por idade/peso/apresentação, navegação e regressão.

## Projetos prioritários
- Prescrição Pediátrica Segura
- Medicações na Pediatria / Emergência Pediátrica — Doses e Cálculos
- Folha de Parada

## Projetos terapêuticos adicionais a reconciliar
- Soroterapia Pediátrica
- Protocolos Médicos
- NEXO Clinical
- Receita PED
- Receituário
- Receita para Casa
- Pediatric Flow, quando houver recomendação terapêutica
- Ventilação Mecânica, para sedação/analgesia/bloqueio neuromuscular e fármacos correlatos
- Dermatologia, para terapêuticas tópicas/sistêmicas pertinentes
- Catálogo Posológico/Atualizações em Pediatria, como repositório de origem e atualização

## Artefato de ingestão
`catalogo_posologico_pediatrico_master_498.json` contém as 498 fichas, com nome, número, página, texto integral da monografia e flags documentais. O texto integral é preservado para evitar perda semântica durante a migração.
