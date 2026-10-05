# Descoberta e resolução de lacunas por regime — 05/10/2026

## Correção e escopo

A pesquisa em PubMed/Europe PMC/openFDA permanece uma etapa de **descoberta**. Resultados são candidatos `NOT_PROMOTED`, nunca pareceres clínicos. A etapa separada `scripts/resolve-medication-gaps.mjs` avalia pacotes explícitos em `clinical-review/medication-gap-resolutions.json`. Segue o padrão de instalação limitada de `install-priority-block.cjs`: preservar os cadastros, publicar somente o regime ligado a um motor testado e manter as demais indicações pendentes.

Esta alteração não acrescenta doses nem atesta uma nova revisão clínica dos quatro regimes prioritários legados. O manifesto de produção começa vazio. As evidências sintéticas existem somente nos diretórios temporários da suíte de teste. Não há novo regime clínico promovido nesta entrega.

## Contadores e fila

`medication-gap-scopes.json` é o ledger de escopos; a fila e os contadores são projeções derivadas, nunca valores decrementados por ciclo de pesquisa.

| Campo | Significado |
|---|---|
| `pending_total` | Escopos abertos: regimes explícitos + remanescentes de monografias ainda sem inventário integral extraído |
| `pending_regimens_total` | Regimes concretos conhecidos e ainda não resolvidos |
| `pending_monographs_total` | Fichas que possuem pelo menos um escopo pendente |
| `unextracted_monographs_total` | Monografias cujo inventário restante ainda não foi integralmente extraído/auditado |
| `resolved_regimens_total` | Escopos que passaram pelo novo fluxo auditável |
| `existing_ready_regimens_total` | IDs parciais já disponíveis, incluindo o legado; não são contados como novas auditorias |
| `completed_cycles` / `legacy_completed_cycles` | Histórico de varreduras de descoberta; não representa resolução clínica |

Na migração, há **498 remanescentes abertos**, quatro IDs legados preservados e zero novos escopos resolvidos. O número 498 não deve ser reduzido artificialmente para 494: mesmo amoxicilina, dipirona, salbutamol e nistatina + zinco ainda têm indicações/populações/apresentações fora dos regimes instalados. Também não equivale às 1.263 linhas de esquema do PDF: os remanescentes são grupos ainda não extraídos. O contador é conservador e sua unidade é declarada.

Uma solicitação de regime acrescenta um escopo concreto; sua aprovação retira somente esse escopo. O remanescente da ficha fica aberto. Este fluxo deliberadamente não oferece um atalho para declarar uma monografia inteira `READY` ou para encerrar um remanescente sem inventário de suas indicações. A extração futura deve preservar esse remanescente até existir prova de cobertura integral. IDs de escopo são estáveis, a identidade é imutável e escopos clínicos duplicados são rejeitados.

## Contrato do pacote auditável

Cada `requests[]` contém `scope` e `packet`. Para cadastrar um escopo ainda em pesquisa, use `packet: null`; ele fica pendente com motivo explícito. Para resolver:

- `scope`: `id`, `fiche`, `kind: REGIMEN` e `target` com `regimen_id`, indicação, população, idade (`age_range`, `min_months`, `max_months`), peso, via e IDs exatos das apresentações.
- `packet.scope`: cópia exata de `scope.target`. `packet.regimen` deve corresponder integralmente ao registro real em `assets/priority-regimens.js`, incluindo identidade, apresentações, variantes e limites. Novo motor/indicação exige implementação e testes de aplicação antes de entrar neste caminho; um JSON isolado não habilita cálculo.
- `fields`: todos os 24 campos da governança v63, cada um com `status`, `value` e `source_ids`. Estados permitidos: `VERIFIED`, `NOT_APPLICABLE` e `NOT_ESTABLISHED_IN_SOURCE`; os dois últimos exigem motivo. Indicação, população, idade, via, dose, formulação, concentração, apresentação brasileira, status off-label e fonte do regime não podem ser dispensados. Máximos numéricos só podem ser não estabelecidos no caso explicitamente auditado de aplicação tópica não quantitativa.
- `evidence[]`: ID, URL HTTPS, localizador de seção/página, data real da verificação, `review_status: VERIFIED_REGIMEN_CONTENT`, lista dos campos apoiados (`supports`) e artefato local com caminho e SHA-256. Cada citação do motor deve estar ligada à evidência por `engine_source_id` e pela mesma URL. Um título/PMID encontrado não é extração de regime.
- `brazilian_verification`: `VERIFIED`, reconciliação, data, IDs de fontes brasileiras primárias com apresentação apoiada e log das buscas prioritárias ANVISA/MS/SES-MG/SBP. Fabricante exige identidade e domínio oficial; agregador não satisfaz esse gate. Registrar limitações sem alegar consulta regulatória não feita.
- `safety`: classificação explícita `high_alert` e `off_label`. Off-label exige fundamento e nível de evidência. Alto risco exige dupla checagem humana documentada com artefato; revisão assistida não a substitui.
- `binding.engine_sha256`: hash dos bytes do motor auditado.
- `calculation_cases`: resultados esperados independentes por apresentação/variante, os três perfis 2 meses/3 kg, 1 ano/10 kg e 4 anos/16 kg, além de negativos para indicação/apresentação incompatíveis e revisão clínica ausente. A resolução executa o motor e as checagens reversas.
- `audits`: três registros `structural`, `pharmaceutical_and_mathematical`, `clinical_evidence_and_regulatory`, cada um `PASS`, atribuição verdadeira, tipo de revisor (`ASSISTED_DOCUMENTARY` ou `HUMAN`), data e artefato JSON hashado. O relatório deve conter o mesmo passe, status, autor/tipo, achados e hash do payload. Não inventar revisores/aprovações.

`packetDigest(packet)` exportado pela biblioteca calcula o SHA-256 canônico do escopo, regime, campos, fontes, verificação brasileira, segurança, motor e casos. Produza os pareceres **depois** da revisão desse payload, vinculando-os a esse hash. Mudança em dose, população, fonte, apresentação, caso ou motor invalida a revisão; artefatos alterados também bloqueiam. Hashes são prova de identidade/reprodutibilidade, não prova independente da veracidade clínica dos pareceres.

## Execução e rastreabilidade

```sh
node --test tests/*.test.cjs tests/*.test.mjs
node scripts/resolve-medication-gaps.mjs
node scripts/research-medication-gaps.mjs
node scripts/resolve-medication-gaps.mjs --check
```

`--check` recalcula os gates e exige que as projeções versionadas estejam consistentes, sem escrever. `--strict` adicional aborta sem escrever se existir pacote rejeitado. No modo normal, propostas rejeitadas produzem somente escopos/motivos pendentes; não entram no registro operacional `audited-gap-regimens.json`.

`medication-gap-resolution-audit.json` preserva decisões por escopo/hash, motivos e referências dos pareceres. Reexecução idêntica não duplica decisões. Ausência posterior de pacote, hash alterado ou falha em reauditoria reabre o escopo e retira apenas IDs pertencentes ao novo resolvedor; IDs legados válidos permanecem disponíveis. Arquivos JSON corrompidos falham explicitamente, sem apagar o histórico.

A descoberta usa IDs estáveis e consulta primeiro escopos sem pesquisa ou com pesquisa mais antiga. Sucessos recentes aguardam sete dias, falhas aguardam um dia (janelas configuráveis); `READY` nunca é pesquisado. Falha em uma nova consulta preserva fontes válidas anteriores. A fila vazia zera os contadores corretamente. Número de buscas/batches é separado do número de regimes resolvidos.

O workflow de pesquisa valida, resolve, descobre e confere a projeção antes de versionar; repete os gates após reconciliar um avanço de `main`. O workflow de verificação é somente leitura. O build customizado de Pages também valida os gates, e o smoke compara motor, estado, fila e registro publicados com os bytes do commit, além das regressões de navegador existentes.

Na validação de publicação, uma execução atrasada do smoke tentou comparar o JSON antigo com a edição já atualizada pelo primeiro ciclo correto. A checagem de artefato agora reconhece um avanço comprovado de `main` pelo endpoint de comparação do GitHub: esse run histórico não emite aprovação de artefato, e a publicação vigente exige seu próprio smoke. Os testes de navegador continuam sendo executados. Um desvio sem avanço de histórico continua falhando; a conferência de bytes não foi dispensada para o commit vigente.
