import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequestGate } from '../scripts/research-medication-gaps.mjs';

test('serializes requests with a minimum interval', async () => {
  let current=0;
  const waits=[];
  const starts=[];
  const gate=createRequestGate({
    minIntervalMs:400,
    now:()=>current,
    wait:async ms => { waits.push(ms); current+=ms; }
  });
  const values=await Promise.all([1,2,3].map(value=>gate(async () => {
    starts.push(current);
    return value;
  })));
  assert.deepEqual(values,[1,2,3]);
  assert.deepEqual(starts,[0,400,800]);
  assert.deepEqual(waits,[400,400]);
});

test('continues the queue after a failed request', async () => {
  let current=0;
  const gate=createRequestGate({
    minIntervalMs:400,
    now:()=>current,
    wait:async ms => { current+=ms; }
  });
  await assert.rejects(gate(async () => { throw new Error('temporary failure'); }),/temporary failure/);
  assert.equal(await gate(async () => current),400);
});
