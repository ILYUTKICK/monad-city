// Provider responses are simulated here. These tests never use user settings or the network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createProjectEvidence, relationships, validateDataContract } from '../src/data.js';
import { evidenceRecords, evidenceSnapshot, validateEvidenceContract, validateReviewGovernanceFixtures } from '../src/evidence.js';
import { retrieveNavigator, runDistrictNavigatorChecks } from '../src/retrieval.js';
import { runNavigatorAgent, createToolExecutors } from '../src/ai.js';

// Reuse the actual prototype data without starting its DOM/3D entry point.
const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const projects = structuredClone(vm.runInNewContext(source.match(/const projects = (\[[\s\S]*?\n\]);/)[1]));
projects.forEach((project) => { project.evidence = createProjectEvidence(project.state); });
const input = {
  question: 'Show Kuru sources', projects, relationships, evidenceRecords,
  snapshot: { version: evidenceSnapshot.version, recordCount: evidenceRecords.length, reviewedAt: evidenceSnapshot.reviewedAt },
  settings: { baseUrl: 'https://fixture.invalid/v1', model: 'test-model', apiKey: 'artificial-test-key' },
};
const completion = (content, finish_reason = 'stop') => ({
  choices: [{ finish_reason, message: { role: 'assistant', content } }], model: 'test-model',
});
const selection = (ids = ['E-KURU-CAP-001']) => completion(JSON.stringify({ kind: 'evidence', evidenceIds: ids }));
const tools = (calls = [['get_project_evidence', { projectId: 'kuru' }]]) => ({
  choices: [{ finish_reason: 'tool_calls', message: { role: 'assistant', content: null,
    tool_calls: calls.map(([name, args], index) => ({ id: `call-${index}`, type: 'function', function: { name, arguments: JSON.stringify(args) } })),
  } }],
});

async function withResponses(responses, check, overrides = {}) {
  const original = globalThis.fetch;
  const requests = [];
  let next = 0;
  globalThis.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    const response = responses[next++];
    assert.ok(response, 'unexpected extra provider request');
    return response.status
      ? { ok: false, status: response.status, text: async () => response.detail || '' }
      : { ok: true, json: async () => response };
  };
  try { await check(runNavigatorAgent({ ...input, ...overrides }), requests); }
  finally { globalThis.fetch = original; }
}

test('actual dataset contracts and district retrieval remain valid', () => {
  validateDataContract(projects);
  validateEvidenceContract();
  validateReviewGovernanceFixtures();
  for (const row of runDistrictNavigatorChecks({ projects, relationships, evidenceRecords })) {
    assert.ok(row.pass, `${row.name}: ${row.detail}`);
  }
});

test('multi-round evidence selection displays exact claims and limitations', async () => {
  await withResponses([tools(), selection(['E-KURU-CAP-001', 'E-KURU-CHAIN-001'])], async (promise, requests) => {
    const answer = await promise;
    assert.equal(answer.mode, 'evidence');
    assert.equal(answer.steps.length, 1);
    assert.equal(answer.records.length, 2);
    assert.equal(answer.records[0].claim, evidenceRecords.find((record) => record.id === 'E-KURU-CAP-001').claim);
    assert.match(answer.text, /Claimed —/);
    assert.match(answer.text, /Observed —/);
    assert.match(answer.text, /does not establish current activity/);
    assert.equal(requests.length, 2);
    JSON.parse(requests[1].messages.find((message) => message.role === 'tool').content);
  });
});

test('invented facts and citations with no tool calls are rejected', async () => {
  await withResponses([completion('Kuru is verified and safe. [E-NOT-IN-DATASET-999]')], async (promise) => {
    await assert.rejects(promise, /did not query the graph/);
  });
});

test('a valid global ID cannot be cited unless retrieved in this conversation', async () => {
  await withResponses([tools([['search_projects', { query: 'kuru' }]]), selection()], async (promise) => {
    await assert.rejects(promise, /not retrieved/);
  });
});

test('invented citation is rejected after a real evidence tool read', async () => {
  await withResponses([tools(), selection(['E-NOT-IN-DATASET-999'])], async (promise) => {
    await assert.rejects(promise, /not retrieved/);
  });
});

test('model prose cannot override an otherwise valid evidence selection', async () => {
  const reply = completion(JSON.stringify({ kind: 'evidence', evidenceIds: ['E-KURU-CAP-001'], answer: 'Kuru is safe.' }));
  await withResponses([tools(), reply], async (promise) => {
    await assert.rejects(promise, /unsupported answer fields/);
  });
});

test('unavailable and AI-inferred records cannot support a final answer', async () => {
  for (const change of [
    { source: { ...evidenceRecords[0].source, available: false } },
    { status: 'AI-inferred', supportsFactualClaims: false },
  ]) {
    // Use a non-Kuru record so the local Kuru retrieval contract remains unchanged.
    const record = evidenceRecords.find((item) => item.projectId !== 'kuru');
    const records = evidenceRecords.map((item) => item.id === record.id ? { ...item, ...change } : item);
    await withResponses([tools([['get_project_evidence', { projectId: record.projectId }]]), selection([record.id])], async (promise) => {
      await assert.rejects(promise, /cannot support facts/);
    }, { evidenceRecords: records });
  }
});

test('truncated completion never becomes a displayed answer', async () => {
  await withResponses([tools(), completion('{"kind":"evidence","evidenceIds":["E-KURU', 'length')], async (promise) => {
    await assert.rejects(promise, /incomplete \(token limit\)/);
  });
});

test('provider refusal keeps local result available', async () => {
  await withResponses([completion(null, 'content_filter')], async (promise) => {
    await assert.rejects(promise, /provider declined/);
  });
});

test('unsupported-tools HTTP400 returns local fallback without a plain request', async () => {
  await withResponses([{ status: 400, detail: 'This model does not support tools' }], async (promise, requests) => {
    const answer = await promise;
    assert.equal(answer.mode, 'local-fallback');
    assert.match(answer.reason, /does not support graph tools/);
    assert.equal(requests.length, 1);
    assert.equal(answer.text, undefined);
  });
});

test('unrelated HTTP400 does not masquerade as unsupported tools', async () => {
  await withResponses([{ status: 400, detail: 'Unknown model identifier' }], async (promise, requests) => {
    await assert.rejects(promise, /answered 400/);
    assert.equal(requests.length, 1);
  });
});

test('HTTP error text does not echo provider details into UI', async () => {
  await withResponses([{ status: 401, detail: 'private-provider-detail' }], async (promise) => {
    await assert.rejects(promise, (error) => error.message.includes('Check the API key') && !error.message.includes('private-provider-detail'));
  });
});

test('prohibited conclusions and unmet activity requirements bypass provider', async () => {
  for (const question of ['Is Kuru safe?', 'Which is the best DeFi investment?', 'Find AI projects with active contracts', '']) {
    await withResponses([], async (promise, requests) => {
      assert.equal((await promise).mode, 'local-fallback');
      assert.equal(requests.length, 0);
    }, { question });
  }
});

test('computed coverage can only use a queried scope', async () => {
  await withResponses([tools([['get_district_coverage', {}]]), completion('{"kind":"coverage","scope":"whole city"}')], async (promise) => {
    const answer = await promise;
    assert.equal(answer.mode, 'coverage');
    assert.match(answer.text, /176 project profiles; 172 carry/);
    assert.match(answer.text, /6 sourced, 11 illustrative/);
  });
  await withResponses([tools([['get_district_coverage', { district: 'DeFi' }]]), completion('{"kind":"coverage","scope":"whole city"}')], async (promise) => {
    await assert.rejects(promise, /coverage that was not queried/);
  });
});

test('unknown tool names do not invoke inherited object functions', async () => {
  await withResponses([tools([['constructor', {}]]), completion('{"kind":"insufficient-evidence"}')], async (promise, requests) => {
    const answer = await promise;
    assert.equal(answer.mode, 'insufficient-evidence');
    const toolMessage = requests[1].messages.find((message) => message.role === 'tool');
    assert.match(JSON.parse(toolMessage.content).error, /Unknown tool/);
  });
});

test('tool messages remain complete JSON even when evidence exceeds 6000 characters', async () => {
  const records = evidenceRecords.map((record) => record.id === 'E-KURU-CAP-001'
    ? { ...record, limitations: ['Long fixture limitation. '.repeat(400)] } : record);
  await withResponses([tools(), selection()], async (promise, requests) => {
    await promise;
    const text = requests[1].messages.find((message) => message.role === 'tool').content;
    assert.ok(text.length > 6000);
    assert.ok(JSON.parse(text).records.length);
  }, { evidenceRecords: records });
});

test('planning rounds stay bounded', async () => {
  await withResponses(Array.from({ length: 6 }, () => tools()), async (promise, requests) => {
    await assert.rejects(promise, /used all planning rounds/);
    assert.equal(requests.length, 6);
  });
});

test('malformed, duplicate and excessive final selections are rejected', async () => {
  for (const reply of [completion('```json\n{}\n```'), completion('null'), selection(['E-KURU-CAP-001', 'E-KURU-CAP-001']), selection(evidenceRecords.filter((record) => record.projectId === 'kuru').map((record) => record.id))]) {
    await withResponses([tools(), reply], async (promise) => { await assert.rejects(promise); });
  }
});

test('local source retrieval keeps its Passport selection', () => {
  const result = retrieveNavigator({ query: input.question, projects, relationships, evidenceRecords });
  assert.equal(result.outcome, 'results');
  assert.deepEqual(result.selectedProjectIds, ['kuru']);
});

test('registry tool requires a retrieved ID, awaits a pinned read and keeps withdrawn evidence ineligible', async () => {
  let reads = 0;
  const executors = createToolExecutors({ ...input, registryCheck: async (id) => {
    reads++;
    assert.equal(id, 'E-KURU-CAP-001');
    return { status: 'subject-revoked', included: true, usable: false, blockNumber: '42' };
  } });
  assert.ok((await executors.check_registry_publication({ evidenceId: 'E-KURU-CAP-001' })).error);
  assert.equal(reads, 0);
  executors.get_project_evidence({ projectId: 'kuru' });
  const result = await executors.check_registry_publication({ evidenceId: 'E-KURU-CAP-001', rpcUrl: 'https://untrusted.test' });
  assert.equal(result.status, 'subject-revoked');
  assert.equal(reads, 1);
  assert.equal(executors.get_project_evidence({ projectId: 'kuru' }).records.find((item) => item.id === 'E-KURU-CAP-001').eligible, false);
  assert.equal(createToolExecutors(input).check_registry_publication, undefined);
});

test('agent cannot select an evidence record after observing its onchain withdrawal', async () => {
  await withResponses([tools(), tools([['check_registry_publication', { evidenceId: 'E-KURU-CAP-001' }]]), selection()],
    async (result) => { await assert.rejects(result, /cannot support facts/); },
    { registryCheck: async () => ({ status: 'subject-revoked', usable: false, included: true }) });
});
