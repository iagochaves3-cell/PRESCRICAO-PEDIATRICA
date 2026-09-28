# Governança ativa — Farmacoterapia Pediátrica v63

```yaml
configuration:
  id: pediatric-pharmacotherapy-governance
  version: 63.0-auto-evidence-resolution-2026-09-28
  effective_date: 2026-09-28
  locale: pt-BR
  status: ACTIVE_REFERENCE_CONFIGURATION
  applies_to:
    - prescricao-pediatrica-segura
    - emergencia-pediatrica-doses
    - folha-de-parada
    - receituario
    - nexo-clinical
    - receita-ped
    - emergencia
    - medicacoes-na-pediatria
    - protocolos-medicos
    - receita-para-casa
    - medicina-ped

non_negotiable_safety:
  - Never invent dose, presentation, concentration, drop factor, dilution, compatibility, stability, maximum, indication, age limit, or source.
  - Off-label use requires exact indication, population, dose, route, interval, duration, monitoring, evidence level, source, and explicit label.
  - Evidence-limited specialist practice is allowed only as EVIDENCIA_LIMITADA and never becomes first-line automatically.
  - Combination products require calculation_component and concentration for that component.
  - High-alert medication requires independent reverse calculation and human double-check.
  - Every pediatric dose imported from the master catalog must undergo triple audit before it becomes an automatically selectable regimen.
  - Restriction or validation-gap entries may remain searchable/documentary but must not be silently converted into an operational prescription.

allowed_resolution_states:
  READY: "POSOLOGIA OPERACIONAL VALIDADA"
  CONTRAINDICATED_AGE: "MEDICAMENTO CONTRAINDICADO PARA ESTA IDADE"
  CONTRAINDICATED_WEIGHT: "MEDICAMENTO CONTRAINDICADO PARA ESTE PESO"
  CONTRAINDICATED_CLINICAL: "MEDICAMENTO CONTRAINDICADO NESTE CONTEXTO CLÍNICO: {reason}"
  NOT_INDICATED_FOR_DIAGNOSIS: "MEDICAMENTO NÃO INDICADO PARA O DIAGNÓSTICO SELECIONADO"
  SPECIALIST_ONLY: "USO RESTRITO A PROTOCOLO ESPECIALIZADO PARA ESTA INDICAÇÃO"
  REQUIRES_CRITICAL_INPUT: "DADO CLÍNICO OBRIGATÓRIO AUSENTE: {field}"
  REGULATORY_SUSPENDED: "MEDICAMENTO/APRESENTAÇÃO COM USO OU COMERCIALIZAÇÃO SUSPENSOS — NÃO OFERTAR"
  AUTO_RESEARCH_PENDING: "PESQUISA CIENTÍFICA AUTOMÁTICA EM RESOLUÇÃO — NÃO EXIGIR PREENCHIMENTO MANUAL DO USUÁRIO"
  DOCUMENTARY_ONLY: "ESTADO LEGADO — MIGRAR AUTOMATICAMENTE PARA AUTO_RESEARCH_PENDING"

automatic_gap_resolution:
  enabled: true
  user_manual_completion_required: false
  legacy_documentary_only_is_terminal: false
  on_any_medication_gap:
    - set_state_AUTO_RESEARCH_PENDING
    - enqueue_scientific_research
    - preserve_existing_valid_data
    - do_not_auto_select_until_operational_regimen_complete
  gap_fields:
    - indication
    - population
    - age_range
    - weight_range
    - route
    - dose
    - interval
    - duration
    - maximum_per_dose
    - maximum_per_day
    - formulation
    - concentration
    - brazilian_presentation
    - practical_volume_ml_or_drops_or_tablets
    - dilution
    - administration_instructions
    - monitoring
    - contraindications
    - renal_adjustment
    - hepatic_adjustment
    - incompatibilities
    - off_label_status
    - regimen_level_source
  source_hierarchy:
    - ANVISA
    - Ministerio_da_Saude
    - SES_MG
    - SBP_and_relevant_Brazilian_medical_societies
    - official_product_label_and_regulatory_registration
    - recognized_international_guidelines
    - systematic_reviews_and_primary_literature_PubMed_DOI
    - published_specialist_practice_only_if_higher_level_evidence_absent
  automatic_source_discovery:
    enabled: true
    machine_sources:
      - PubMed_NCBI
      - Europe_PMC
      - openFDA_drug_labels
    brazilian_regulatory_and_society_sources:
      priority: highest
      requirement: verify_when_available_before_operational_release
  evidence_rules:
    - Source discovery alone does not make a regimen READY.
    - READY requires complete operational regimen plus regimen-level traceable evidence and triple audit.
    - If trustworthy sources diverge, preserve each applicable regimen with explicit population/indication and citations.
    - If evidence remains insufficient after search, retain a precise scientific block reason and searched-source log; never invent missing data.
  automation_outputs:
    queue: public-data/medication-gap-research-queue.json
    candidates: public-data/medication-gap-evidence-candidates.json
    state: public-data/medication-gap-research-state.json
  ui_policy:
    - Never ask the clinician to type missing pharmacologic evidence as the default resolution path.
    - While unresolved, show only that scientific research is being resolved automatically and the exact missing field/reason.
    - Valid existing regimens remain available and must not be removed by this process.

selector_policy:
  default: deny
  selectable_only_when:
    - diagnosis_relation_is_explicit
    - patient_population_matches
    - complete_operational_regimen
    - presentation_or_formulation_is_compatible
    - regimen_level_source_present
    - triple_audit_passed

calculation_engine:
  rules:
    - Calculate first in original clinical unit.
    - Apply maximum to the same component and time basis as the source.
    - Convert to practical units after dose selection.
    - Reverse-check the rounded practical amount displayed.
    - For infusions calculate mL/h and independently reconstruct the clinical dose.
    - Never confuse mg with mcg, UI with mUI, dose per administration with dose per day, or presentation concentration with final infusion concentration.

triple_audit:
  pass_1: structural
  pass_2: pharmaceutical_and_mathematical
  pass_3: clinical_evidence_and_regulatory

master_catalog_2026_09_26:
  status: ACTIVE_CANONICAL_SOURCE
  source_pdf: catalogo-base.pdf
  source_title: "Catálogo Posológico Pediátrico"
  edition_date: 2026-09-13
  corrected_review_date: 2026-09-14
  source_sha256: c5c9f8703c0603bbd5a09bf9723c99296c698e6fb791d05589268672cae82e63
  expected_monographs: 498
  master_markdown: Biblioteca_Medicamentosa_Pediatrica_MASTER_498.md
  master_json: Biblioteca_Medicamentosa_Pediatrica_MASTER_498.json
  integration_manifest: manifesto_integracao_biblioteca_medicamentosa_2026-09-26.md
  integration_mode: additive_delta
  preserve_existing_valid_content: true
  import_all_498_as_searchable_records: true
  do_not_auto_enable_unvalidated_restriction_lines: true
  preserve_linked_fields:
    - indication
    - population
    - age_range
    - weight_range
    - route
    - dose
    - interval
    - duration
    - maximum
    - formulation
    - concentration
    - monitoring
    - precautions
    - renal_adjustment
    - hepatic_adjustment
    - incompatibilities
    - off_label_status
    - source
  deployment_gate:
    - import_integrity_498_of_498
    - duplicate_name_check
    - unit_check
    - dose_vs_daily_dose_check
    - max_per_dose_and_daily_max_check
    - age_weight_guard_check
    - presentation_component_check
    - reverse_calculation_check
    - high_alert_human_double_check_flag
    - regression_test_existing_regimens

```
