const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'public-data');
const catalogPath = path.join(root, 'Biblioteca_Medicamentosa_Pediatrica_MASTER_498.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

if (catalog.medicamentos.length !== catalog.source.monographs) {
  throw new Error(`Esperadas ${catalog.source.monographs} fichas; encontradas ${catalog.medicamentos.length}.`);
}

const searchableCatalog = {
  schema_version: '1.0',
  source: {
    title: catalog.source.title,
    filename: catalog.source.filename,
    edition_date: catalog.source.edition_date,
    corrected_review_date: catalog.source.corrected_review_date,
    sha256: catalog.source.sha256,
    pages: catalog.source.pages,
    monographs: catalog.source.monographs,
    reported_indication_scheme_lines: catalog.source.document_reported_indication_scheme_lines,
    reported_supported_lines: catalog.source.document_reported_supported_lines,
    reported_restrictions: catalog.source.document_reported_restrictions,
    reported_validation_gaps: catalog.source.document_reported_validation_gaps
  },
  policy: 'Referência documental para conferência profissional. Não selecionar, calcular ou recomendar esquemas automaticamente.',
  medications: catalog.medicamentos.map((entry) => ({
    fiche: entry.ficha,
    name: entry.medicamento,
    source_page: entry.pagina_pdf,
    document_flags: Object.entries(entry.flags_documentais || {})
      .filter(([, value]) => value === true)
      .map(([flag]) => flag),
    resolution: 'DOCUMENTARY_ONLY'
  }))
};

const categories = [
  { name: 'Governança e auditoria', pattern: /govern|auditoria|manifesto|atualiza|pedwb/i },
  { name: 'Farmacoterapia e catálogos', pattern: /biblioteca|cat[áa]logo|farmac|nexo|antit[eé]rm|transcri[cç][aã]o.*dose/i },
  { name: 'Diagnóstico e semiologia', pattern: /diagn[oó]st|semiolog|arsenal|tratado-de-pediatria/i },
  { name: 'Receituários e modelos', pattern: /pedpresc|prescri[cç][aã]o|receitu[aá]rio|prompt mestre/i },
  { name: 'Fluidos e soroterapia', pattern: /soro|soroterapia|calculadora/i }
];

function classify(filename) {
  return categories.find((category) => category.pattern.test(filename))?.name || 'Material complementar';
}

const attachmentPattern = /\.(?:pdf|docx|xlsx|json|md|zip)$/i;
const grouped = new Map();
for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (!entry.isFile() || !attachmentPattern.test(entry.name)) continue;
  const filePath = path.join(root, entry.name);
  const bytes = fs.readFileSync(filePath);
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  const group = grouped.get(sha256) || { sha256, bytes: bytes.length, files: [], categories: new Set() };
  group.files.push(entry.name);
  group.categories.add(classify(entry.name));
  grouped.set(sha256, group);
}

const sourceInventory = {
  schema_version: '1.0',
  method: 'Inventário de arquivos e hashes; igualdade de arquivo não é evidência clínica independente.',
  attachment_count: [...grouped.values()].reduce((total, group) => total + group.files.length, 0),
  unique_content_count: grouped.size,
  duplicate_file_count: [...grouped.values()].reduce((total, group) => total + Math.max(group.files.length - 1, 0), 0),
  groups: [...grouped.values()]
    .map((group) => ({
      sha256: group.sha256,
      bytes: group.bytes,
      files: group.files.sort((first, second) => first.localeCompare(second, 'pt-BR')),
      categories: [...group.categories].sort()
    }))
    .sort((first, second) => first.files[0].localeCompare(second.files[0], 'pt-BR'))
};

const catalogJson = JSON.stringify(searchableCatalog, null, 2);
if (catalogJson.includes('texto_integral_monografia')) {
  throw new Error('O índice público não pode conter o texto integral das monografias.');
}

fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'catalog.json'), `${catalogJson}\n`);
fs.writeFileSync(path.join(output, 'sources.json'), `${JSON.stringify(sourceInventory, null, 2)}\n`);
console.log(`Índice criado: ${searchableCatalog.medications.length} fichas documentais; ${sourceInventory.attachment_count} arquivos em ${sourceInventory.unique_content_count} grupos SHA-256; ${sourceInventory.duplicate_file_count} cópias exatas agrupadas.`);