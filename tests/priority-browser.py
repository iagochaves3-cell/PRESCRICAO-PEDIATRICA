"""End-to-end regression against the actual site, using synthetic non-patient cases."""
import argparse
import io
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from pypdf import PdfReader

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:8000/')
parser.add_argument('--baseline', action='store_true')
args = parser.parse_args()
out = Path('ci-artifacts'); out.mkdir(exist_ok=True)
checks = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 900})
    page.set_default_timeout(20000)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    response = page.goto(args.url, wait_until='domcontentloaded')
    assert response and response.status == 200
    if args.baseline:
        assert page.locator('#priority-panel').count() == 1, 'RED: os esquemas reconciliados ainda não estão integrados à página'
        browser.close()
        raise SystemExit(0)
    expect(page.locator('#priority-panel')).to_be_visible()
    assert page.locator('#priority-panel [data-priority-id]').count() == 4
    checks.append('four_regimens_visible')

    def case(age, weight, diagnosis):
        page.locator('#clear').click()
        expect(page.locator('#medication-list .med-card')).to_have_count(1)
        for selector, text in [('#age', age), ('#weight', str(weight)), ('#diagnosis', diagnosis)]:
            page.locator(selector).fill(text)
        for field in ['care', 'expected-evolution', 'warning-signs', 'return-if']:
            page.locator('#'+field).fill('Texto sintético de teste; não é orientação de um paciente real.')
        page.locator('#priority-clinical-review').check()

    def apply(id_, presentation=None, variant=None):
        block = page.locator(f'[data-priority-id="{id_}"]')
        if presentation:
            block.locator('select').nth(0).select_option(presentation)
        if variant:
            block.locator('select').nth(1).select_option(variant)
        block.get_by_role('button', name='Adicionar ao receituário').click()
        return page.locator(f'#medication-list [data-priority-regimen="{id_}"]')

    case('4 anos', 16, 'Faringite estreptocócica')
    card = apply('amox-gas', 'amox-400')
    expect(card).to_have_count(1)
    assert '5 mL (400 mg)' in card.locator('[data-field="dose"]').input_value()
    assert card.locator('[data-field="dose"]').get_attribute('readonly') is not None
    page.locator('button.primary').click()
    expect(page.locator('#print')).to_be_enabled()
    assert '5 mL (400 mg)' in page.locator('#out-medications').inner_text()
    assert 'Reverso:' not in page.locator('#out-medications').inner_text()
    checks.extend(['amox_16kg_80mgml', 'selected_regimen_in_prescription', 'short_parent_instructions', 'calculated_fields_readonly'])
    page.locator('#prescription').screenshot(path=str(out/'priority-screen.png'))
    page.emulate_media(media='print')
    assert page.locator('#prescription strong').first.evaluate('(e)=>getComputedStyle(e).color') == 'rgb(17, 17, 17)'
    pdf = page.pdf(format='A4', print_background=True)
    (out/'priority-prescription.pdf').write_bytes(pdf)
    reader = PdfReader(io.BytesIO(pdf))
    assert len(reader.pages) == 1, f'Páginas vazias ou fragmentação: {len(reader.pages)} páginas'
    assert 'Amoxicilina' in reader.pages[0].extract_text()
    page.locator('#prescription').screenshot(path=str(out/'priority-print.png'))
    checks.extend(['print_name_black', 'print_one_page_no_blank_pages'])
    page.emulate_media(media='screen')
    page.locator('#weight').fill('10')
    expect(page.locator('#print')).to_be_disabled()
    expect(page.locator('#medication-list [data-priority-regimen]')).to_have_count(0)
    expect(page.locator('#priority-clinical-review')).not_to_be_checked()
    checks.append('weight_change_invalidates_calculation_and_print')

    case('1 ano', 10, 'Faringite estreptocócica')
    card = apply('amox-gas', 'amox-400')
    assert '3,1 mL (248 mg)' in card.locator('[data-field="dose"]').input_value()
    checks.append('amox_10kg_rounding_shown')
    case('1 ano', 10, 'Febre')
    card = apply('dipyrone', 'dip-500', 'min')
    assert '3 gotas (0,15 mL = 75 mg)' in card.locator('[data-field="dose"]').input_value()
    checks.append('dipyrone_10kg_500mgml_drop_factor')
    page.locator('button.primary').click()
    expect(page.locator('#print')).to_be_enabled()
    page.locator('[data-priority-id="dipyrone"] select').nth(0).select_option('dip-50')
    expect(page.locator('#print')).to_be_disabled()
    expect(page.locator('#medication-list [data-priority-regimen]')).to_have_count(0)
    checks.append('presentation_change_invalidates_previous_dose')

    case('2 meses', 3, 'Febre')
    apply('dipyrone', 'dip-50', 'min')
    expect(page.locator('#medication-list [data-priority-regimen]')).to_have_count(0)
    assert 'Idade fora' in page.locator('[data-priority-id="dipyrone"] .priority-result').inner_text()
    checks.append('dipyrone_2months_3kg_blocked')
    case('2 meses', 3, 'Candidíase de fraldas')
    card = apply('nystatin-zinc-diaper')
    assert 'camada fina' in card.locator('[data-field="dose"]').input_value()
    assert '100.000 UI/g' in card.locator('[data-field="presentation"]').input_value()
    assert 'Tópica dermatológica' == card.locator('[data-field="route"]').input_value()
    checks.append('nystatin_zinc_diaper_2months_3kg_no_invented_ml')

    case('4 anos', 16, 'Asma com broncoespasmo')
    card = apply('salbutamol-rescue', 'salb-100', 'two')
    assert '2 jato(s) (200 mcg' in card.locator('[data-field="dose"]').input_value()
    assert 'mL' not in card.locator('[data-field="dose"]').input_value()
    checks.append('salbutamol_16kg_200mcg_not_mg')
    case('1 ano', 10, 'Bronquiolite')
    apply('salbutamol-rescue', 'salb-100', 'one')
    expect(page.locator('#medication-list [data-priority-regimen]')).to_have_count(0)
    checks.append('salbutamol_not_auto_prescribed_for_bronchiolitis')

    case('4 anos', 16, 'Faringite estreptocócica')
    legacy = page.locator('#evidence-regimens article').filter(has_text='25 mg/kg/dose').first
    expect(legacy).to_be_visible()
    legacy.locator('input[type="checkbox"]').check()
    expect(page.locator('#medication-list [data-priority-regimen="amox-gas"]')).to_have_count(1)
    legacy.locator('input[type="checkbox"]').uncheck()
    expect(page.locator('#medication-list [data-priority-regimen="amox-gas"]')).to_have_count(0)
    checks.append('existing_strep_selector_uses_checked_engine_and_unselects')
    apply('amox-gas', 'amox-250')
    benzathine = page.locator('#evidence-regimens article').filter(has_text='Benzilpenicilina benzatina intramuscular').first
    # This is a rejected selection: click, then assert unchecked, rather than check().
    benzathine.locator('input[type="checkbox"]').click()
    expect(benzathine.locator('input[type="checkbox"]')).not_to_be_checked()
    selected_names = page.locator('#medication-list .med-card').evaluate_all('(cards)=>cards.filter(c=>c.querySelector("[data-selected]").checked).map(c=>c.querySelector("[data-field=name]").value)')
    assert len(selected_names) == 1 and selected_names[0] == 'Amoxicilina'
    checks.append('duplicate_etiologic_antibiotics_prevented')
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
    page.locator('#priority-panel').screenshot(path=str(out/'priority-mobile.png'))
    checks.append('mobile_no_horizontal_overflow')
    assert not errors, errors
    checks.append('no_javascript_page_errors')
    report={'status':'PASS','url':args.url,'checks':checks,'count':len(checks),'browser':browser.version,'version':page.locator('#priority-panel').get_attribute('data-version')}
    (out/'priority-browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps(report,ensure_ascii=False))
    browser.close()
