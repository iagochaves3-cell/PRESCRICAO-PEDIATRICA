# Relatório de auditoria tripla — Governança Pediátrica v61

**Data:** 2026-08-24

## Limite operacional importante

A auditoria foi executada sobre as fontes exportadas e bases editáveis. A publicação nos três Sites ao vivo **não foi executada**, porque o editor/repositório interno dos Sites não está disponível nesta sessão. O pacote contém a implementação de referência e critérios de aceite para aplicação no repositório ao vivo.

## Passagem 1 — integridade estrutural

- Monografias: **413**
- Tabelas de dose: **413**
- Linhas de dose: **743**
- Falhas estruturais: **0**
- Estado: **PASS**

## Passagem 2 — estrutura farmacêutica e computacional

- Apresentações sem concentração facilmente parseável: **21**
- Monografias de associação exigindo componente-base: **20**
- Apresentações em gotas sem fator explícito: **27**
- Linhas de dose sem unidade parseável: **43**
- Linhas sem via explícita: **11**
- Linhas sem intervalo/duração explícitos: **79**
- Linguagem excessivamente categórica/jurisdicional: **62**

## Passagem 3 — evidência, regulação e elegibilidade do seletor

- Esquemas com fonte vinculada por indicação/população no DOCX: **0**
- Esquemas que exigem mapeamento antes do seletor: **743**
- Cetirizina 1 mg/mL localizada: **True**
- Ondansetrona 8 mg/mL gotas localizada no acervo original: **False**
- Clobutinol: **SUSPENSO — NÃO OFERTAR**
- Ranitidina: **revalidação regulatória obrigatória antes de qualquer seletor**

## Catálogo de emergência

- Linhas auditadas: **126**
- Falhas estruturais: **0**
- Conversões localizadas: **126**
- Checagens reversas explicitamente OK: **104**
- Falhas reais de checagem reversa: **0**
- Linhas documentais/não aplicáveis à reversa automática: **22**
- Linhas com mensagem genérica ou “não calcular”: **1**
- Linhas off-label: **39**
- Enavo 8 mg/mL presente na planilha-base original: **False**

## Resultado

A base documental não pode ser convertida honestamente em “posologia garantida para tudo” apenas removendo o aviso: isso transformaria lacuna de evidência em dose inventada. A v61 corrige o comportamento com seletor fechado, estados específicos e obrigação de vínculo diagnóstico, apresentação, fonte e auditoria por esquema.
