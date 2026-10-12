// Server endpoint checks use artificial secrets and simulated provider responses only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createNavigatorHandler, NAVIGATOR_MODEL } from '../api/navigator.js';

const productionEnv = Object.freeze({
  OPENROUTER_API_KEY: 'artificial-server-secret',
  VERCEL: '1',
  VERCEL_URL: 'monad-city-preview.vercel.app',
});

function postRequest(body = { question: 'Show Kuru sources' }, {
  origin = 'https://monad-city.vercel.app',
  ip = '203.0.113.10',
  contentType = 'application/json',
} = {}) {
  const headers = { 'content-type': contentType, 'x-forwarded-for': ip };
  if (origin !== null) headers.origin = origin;
  return new Request('https://monad-city.vercel.app/api/navigator', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function completion(message, finishReason = 'stop') {
  return {
    choices: [{ finish_reason: finishReason, message }],
    model: 'provider-normalized-model-name',
  };
}

function toolCall(name, args, id) {
  return {
    id,
    type: 'function',
    function: { name, arguments: JSON.stringify(args) },
  };
}

function successfulResult(overrides = {}) {
  return {
    mode: 'insufficient-evidence',
    model: 'untrusted-provider-model',
    steps: [],
    text: 'The local tools did not establish this claim.',
    ...overrides,
  };
}

test('GET reports only hosted availability and the fixed model', async () => {
  const disabled = createNavigatorHandler({ env: {} });
  const disabledResponse = await disabled.fetch(new Request('https://example.test/api/navigator'));
  assert.equal(disabledResponse.status, 200);
  assert.deepEqual(await disabledResponse.json(), { enabled: false, model: NAVIGATOR_MODEL });

  const enabled = createNavigatorHandler({ env: productionEnv });
  const enabledResponse = await enabled.fetch(new Request('https://example.test/api/navigator'));
  const body = await enabledResponse.json();
  assert.deepEqual(body, { enabled: true, model: 'qwen/qwen3.8-max-0902' });
  assert.doesNotMatch(JSON.stringify(body), /artificial-server-secret/);
  assert.equal(enabledResponse.headers.get('cache-control'), 'no-store');
});

test('three provider rounds use only the server secret, fixed model and four local tools', async () => {
  const originalFetch = globalThis.fetch;
  const providerRequests = [];
  const providerResponses = [
    completion({ role: 'assistant', content: null, tool_calls: [toolCall('search_projects', { query: 'kuru' }, 'search-1')] }, 'tool_calls'),
    completion({ role: 'assistant', content: null, tool_calls: [toolCall('get_project_evidence', { projectId: 'kuru' }, 'evidence-1')] }, 'tool_calls'),
    completion({ role: 'assistant', content: JSON.stringify({ kind: 'evidence', evidenceIds: ['E-KURU-CAP-001'] }) }),
  ];
  globalThis.fetch = async (url, options) => {
    providerRequests.push({ url, options, body: JSON.parse(options.body) });
    const next = providerResponses.shift();
    assert.ok(next, 'unexpected additional provider request');
    return new Response(JSON.stringify(next), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    const handler = createNavigatorHandler({ env: productionEnv });
    const response = await handler.fetch(postRequest());
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.mode, 'evidence');
    assert.equal(body.model, NAVIGATOR_MODEL);
    assert.deepEqual(body.evidenceIds, ['E-KURU-CAP-001']);
    assert.equal(body.records[0].id, 'E-KURU-CAP-001');
    assert.match(body.text, /E-KURU-CAP-001/);
    assert.doesNotMatch(JSON.stringify(body), /artificial-server-secret|provider-normalized-model-name/);

    assert.equal(providerRequests.length, 3);
    for (const request of providerRequests) {
      assert.equal(request.url, 'https://openrouter.ai/api/v1/chat/completions');
      assert.equal(request.options.headers.Authorization, 'Bearer artificial-server-secret');
      assert.equal(request.body.model, NAVIGATOR_MODEL);
      assert.equal(request.body.max_tokens, 700);
      assert.equal(request.body.tools.length, 4);
      assert.deepEqual(request.body.tools.map((tool) => tool.function.name), [
        'search_projects',
        'get_project_evidence',
        'get_project_relationships',
        'get_district_coverage',
      ]);
      assert.equal(request.body.messages[0].role, 'system');
      assert.equal(request.body.messages[1].role, 'user');
      assert.equal(request.body.messages[1].content, 'Show Kuru sources');
      assert.equal(JSON.stringify(request.body).includes('artificial-server-secret'), false);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('request boundary rejects unsupported methods, origins, content and client-controlled fields', async () => {
  let calls = 0;
  const handler = createNavigatorHandler({ env: productionEnv, runAgent: async () => {
    calls += 1;
    return successfulResult();
  } });

  const method = await handler.fetch(new Request('https://example.test/api/navigator', { method: 'PUT' }));
  assert.equal(method.status, 405);
  assert.equal(method.headers.get('allow'), 'GET, POST');
  assert.equal((await handler.fetch(postRequest(undefined, { origin: null }))).status, 403);
  assert.equal((await handler.fetch(postRequest(undefined, { origin: 'https://attacker.example' }))).status, 403);
  assert.equal((await handler.fetch(postRequest(undefined, { contentType: 'text/plain' }))).status, 415);
  assert.equal((await handler.fetch(postRequest({ question: 'Kuru', model: 'attacker/model' }))).status, 400);
  assert.equal((await handler.fetch(postRequest({ question: 'Kuru', messages: [] }))).status, 400);
  assert.equal((await handler.fetch(postRequest({ question: 'Kuru', tools: [] }))).status, 400);
  assert.equal((await handler.fetch(postRequest({ question: 'x'.repeat(501) }))).status, 400);
  assert.equal((await handler.fetch(postRequest({ question: 'x'.repeat(5_000) }))).status, 413);
  assert.equal(calls, 0);
});

test('production accepts the canonical and current deployment origins; local origins stay development-only', async () => {
  const runAgent = async () => successfulResult();
  const production = createNavigatorHandler({ env: productionEnv, runAgent });
  assert.equal((await production.fetch(postRequest())).status, 200);
  assert.equal((await production.fetch(postRequest(undefined, { origin: 'https://monad-city-preview.vercel.app', ip: '203.0.113.11' }))).status, 200);
  assert.equal((await production.fetch(postRequest(undefined, { origin: 'http://localhost:5173', ip: '203.0.113.12' }))).status, 403);

  const development = createNavigatorHandler({ env: { OPENROUTER_API_KEY: 'dev-secret' }, runAgent });
  assert.equal((await development.fetch(postRequest(undefined, { origin: 'http://localhost:5173' }))).status, 200);
  assert.equal((await development.fetch(postRequest(undefined, { origin: 'http://127.0.0.1:5173', ip: '127.0.0.1' }))).status, 200);
});

test('missing server key fails closed without invoking the agent', async () => {
  let called = false;
  const handler = createNavigatorHandler({ env: { VERCEL: '1' }, runAgent: async () => {
    called = true;
    return successfulResult();
  } });
  const response = await handler.fetch(postRequest());
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'Hosted AI is not configured.' });
  assert.equal(called, false);
});

test('an already-cancelled request never starts paid provider work', async () => {
  let called = false;
  const controller = new AbortController();
  const request = postRequest();
  const cancelledRequest = new Request(request, { signal: controller.signal });
  controller.abort();
  const handler = createNavigatorHandler({ env: productionEnv, runAgent: async () => {
    called = true;
    return successfulResult();
  } });
  const response = await handler.fetch(cancelledRequest);
  assert.equal(response.status, 408);
  assert.deepEqual(await response.json(), { error: 'Navigator request was cancelled.' });
  assert.equal(called, false);
});

test('the total request deadline aborts the provider work', async () => {
  let observedAbort = false;
  const handler = createNavigatorHandler({
    env: productionEnv,
    timeoutMs: 10,
    runAgent: ({ signal }) => new Promise(() => {
      signal.addEventListener('abort', () => {
        observedAbort = true;
      }, { once: true });
    }),
  });
  const response = await handler.fetch(postRequest());
  assert.equal(response.status, 504);
  assert.equal(observedAbort, true);
  assert.deepEqual(await response.json(), { error: 'Navigator request timed out.' });
});

test('process-local concurrency and per-IP rate gates are bounded', async () => {
  let release;
  let markStarted;
  const started = new Promise((resolve) => { markStarted = resolve; });
  const concurrent = createNavigatorHandler({
    env: productionEnv,
    maxConcurrent: 1,
    runAgent: async () => {
      markStarted();
      await new Promise((resolve) => { release = resolve; });
      return successfulResult();
    },
  });
  const first = concurrent.fetch(postRequest());
  await started;
  const busy = await concurrent.fetch(postRequest(undefined, { ip: '203.0.113.11' }));
  assert.equal(busy.status, 503);
  assert.deepEqual(await busy.json(), { error: 'Navigator is busy. Try again shortly.' });
  release();
  assert.equal((await first).status, 200);

  const rateLimited = createNavigatorHandler({ env: productionEnv, rateLimit: 1, runAgent: async () => successfulResult() });
  assert.equal((await rateLimited.fetch(postRequest())).status, 200);
  const limited = await rateLimited.fetch(postRequest());
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '60');
});

test('provider failures and invalid agent output are redacted', async () => {
  const privateDetail = 'upstream-body-with-artificial-server-secret';
  for (const runAgent of [
    async () => { throw new Error(privateDetail); },
    async () => ({ mode: 'provider-defined-mode', raw: privateDetail }),
  ]) {
    const handler = createNavigatorHandler({ env: productionEnv, runAgent });
    const response = await handler.fetch(postRequest());
    assert.equal(response.status, 502);
    const text = await response.text();
    assert.equal(text, JSON.stringify({ error: 'Navigator provider request failed.' }));
    assert.doesNotMatch(text, /artificial-server-secret|upstream-body/);
  }
});
