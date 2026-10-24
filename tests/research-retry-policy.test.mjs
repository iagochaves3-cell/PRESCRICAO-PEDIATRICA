import test from 'node:test';
import assert from 'node:assert/strict';
import { selectDiscoveryBatch } from '../scripts/research-medication-gaps.mjs';

const now = '2026-10-24T04:33:22.241Z';
const pending = id => ({id,status:'AUTO_RESEARCH_PENDING'});

test('retries only transient all-failure discovery early', () => {
  const scopes=[pending('unseen'),pending('transient'),pending('permanent'),pending('mixed')];
  const results=[
    {scope_id:'transient',searched_at:'2026-10-22T04:33:22.241Z',candidate_sources:[{error:'429 Too Many Requests'}]},
    {scope_id:'permanent',searched_at:'2026-10-22T04:33:22.241Z',candidate_sources:[{error:'404 Not Found'}]},
    {scope_id:'mixed',searched_at:'2026-10-22T04:33:22.241Z',candidate_sources:[{id:'usable'},{error:'429 Too Many Requests'}]}
  ];
  assert.deepEqual(selectDiscoveryBatch(scopes,results,now,{limit:10,retryHours:24,refreshHours:168}).map(s=>s.id),['unseen','transient']);
});

test('permanent failures and mixed results return at normal refresh', () => {
  const old='2026-10-16T04:33:22.241Z';
  const scopes=[pending('permanent'),pending('mixed')];
  const results=[
    {scope_id:'permanent',searched_at:old,candidate_sources:[{error:'400 Bad Request'}]},
    {scope_id:'mixed',searched_at:old,candidate_sources:[{id:'usable'},{error:'503 Service Unavailable'}]}
  ];
  assert.deepEqual(selectDiscoveryBatch(scopes,results,now,{limit:10,retryHours:24,refreshHours:168}).map(s=>s.id),['mixed','permanent']);
});

