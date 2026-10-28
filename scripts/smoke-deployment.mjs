#!/usr/bin/env node
// Static deployment smoke test: no clinical dose promotion or patient data.
import { readFileSync, existsSync } from 'node:fs';
import { strict as assert } from 'node:assert';
const html = readFileSync('index.html','utf8');
assert.match(html, /<!doctype html>/i);
assert.match(html, /<html[^>]+lang="pt-BR"/i);
assert.match(html, /<title>PedDose/i);
for (const p of ['public-data/catalog.json','public-data/clinical-evidence.json']) {
  assert.ok(existsSync(p), 'Missing deployment data: '+p);
  JSON.parse(readFileSync(p,'utf8'));
}
const cfg=readFileSync('_config.yml','utf8');
assert.match(cfg,/clinical-review\//);
assert.match(cfg,/tests\//);
console.log('Static structure and JSON smoke checks passed; browser and clinical validation still required.');
