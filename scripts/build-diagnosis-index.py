import hashlib
import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parent.parent
SOURCE_NAME = 'Compendio_Arsenal_Diagnostico_Pediatria_Emergencia.docx'
SOURCE_PATH = ROOT / SOURCE_NAME
OUTPUT_PATH = ROOT / 'public-data' / 'diagnoses.json'
NAMESPACES = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
STYLE = f"{{{NAMESPACES['w']}}}val"

with zipfile.ZipFile(SOURCE_PATH) as source:
    document = ElementTree.fromstring(source.read('word/document.xml'))

module = ''
diagnoses = []
for paragraph in document.findall('.//w:p', NAMESPACES):
    text = ''.join(node.text or '' for node in paragraph.findall('.//w:t', NAMESPACES)).strip()
    if not text:
        continue
    style_node = paragraph.find('w:pPr/w:pStyle', NAMESPACES)
    style = style_node.attrib.get(STYLE, '') if style_node is not None else ''
    if style == 'Heading1' and text.startswith('MÓDULO '):
        module = text
    match = re.fullmatch(r'Diagnóstico\s+(\d{3}):\s*(.+)', text, flags=re.IGNORECASE)
    if style == 'Heading2' and match:
        diagnoses.append({
            'number': int(match.group(1)),
            'name': match.group(2),
            'module': module,
            'source': SOURCE_NAME,
            'source_sha256': hashlib.sha256(SOURCE_PATH.read_bytes()).hexdigest(),
            'resolution': 'DOCUMENTARY_ONLY'
        })

expected_numbers = list(range(1, 143))
actual_numbers = [entry['number'] for entry in diagnoses]
if actual_numbers != expected_numbers:
    raise ValueError(f'Esperados 142 diagnósticos sequenciais; encontrados {len(actual_numbers)}.')

OUTPUT_PATH.parent.mkdir(exist_ok=True)
OUTPUT_PATH.write_text(json.dumps({
    'schema_version': '1.0',
    'source_title': 'Compêndio — Arsenal Diagnóstico Pediátrico e Emergência',
    'source_file': SOURCE_NAME,
    'source_sha256': diagnoses[0]['source_sha256'],
    'record_count': len(diagnoses),
    'policy': 'Índice documental de títulos; não define diagnóstico, tratamento, dose ou encaminhamento.',
    'diagnoses': diagnoses
}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Índice diagnóstico criado: {len(diagnoses)} títulos; fonte SHA-256 {diagnoses[0]["source_sha256"]}.')