import { runNavigatorAgent } from '../src/ai.js';
import { relationships } from '../src/data.js';
import { evidenceRecords, evidenceSnapshot } from '../src/evidence.js';
import { projects } from '../src/projects.js';

export const NAVIGATOR_MODEL = 'qwen/qwen3.8-max-0902';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const CANONICAL_ORIGIN = 'https://monad-city.vercel.app';
const MAX_BODY_BYTES = 4 * 1024;
const MAX_QUESTION_LENGTH = 500;
const DEFAULT_TIMEOUT_MS = 80_000;
const DEFAULT_MAX_CONCURRENT = 2;
const DEFAULT_RATE_LIMIT = 8;
const DEFAULT_RATE_WINDOW_MS = 60_000;
const MAX_RATE_BUCKETS = 2_048;

const JSON_HEADERS = Object.freeze({
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
});

function jsonResponse(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

function allowedOrigins(env) {
  const origins = new Set([CANONICAL_ORIGIN]);
  const deploymentHost = String(env.VERCEL_URL || '').trim().toLowerCase();
  if (/^[a-z0-9.-]+(?::\d+)?$/.test(deploymentHost)) {
    origins.add(`https://${deploymentHost}`);
  }
  return origins;
}

function isAllowedOrigin(origin, env) {
  if (!origin) return false;
  if (allowedOrigins(env).has(origin)) return true;
  if (env.VERCEL) return false;
  try {
    const parsed = new URL(origin);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:')
      && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function requestIp(request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const value = forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown';
  return /^[0-9a-f.:_-]{1,128}$/i.test(value) ? value : 'unknown';
}

async function readBoundedBody(request) {
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    const error = new Error('body-too-large');
    error.code = 'BODY_TOO_LARGE';
    throw error;
  }
  if (!request.body) return '';

  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let total = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        const error = new Error('body-too-large');
        error.code = 'BODY_TOO_LARGE';
        throw error;
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    reader.releaseLock();
  }
}

async function parseQuestion(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
    return { error: jsonResponse(415, { error: 'Content-Type must be application/json.' }) };
  }

  let source;
  try {
    source = await readBoundedBody(request);
  } catch (error) {
    if (error?.code === 'BODY_TOO_LARGE') {
      return { error: jsonResponse(413, { error: 'Request body exceeds 4096 bytes.' }) };
    }
    return { error: jsonResponse(400, { error: 'Request body must be valid UTF-8 JSON.' }) };
  }

  let body;
  try {
    body = JSON.parse(source);
  } catch {
    return { error: jsonResponse(400, { error: 'Request body must be valid JSON.' }) };
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: jsonResponse(400, { error: 'Request body must be an object.' }) };
  }
  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== 'question') {
    return { error: jsonResponse(400, { error: 'Only the question field is accepted.' }) };
  }
  if (typeof body.question !== 'string') {
    return { error: jsonResponse(400, { error: 'Question must be a string.' }) };
  }
  const question = body.question.trim();
  if (!question || question.length > MAX_QUESTION_LENGTH) {
    return { error: jsonResponse(400, { error: 'Question must contain 1 to 500 characters.' }) };
  }
  return { question };
}

function boundedString(value, maximum) {
  if (typeof value !== 'string') return null;
  return value.slice(0, maximum);
}

function sanitizeRecord(record) {
  if (!record || typeof record !== 'object' || typeof record.id !== 'string') return null;
  return {
    id: record.id.slice(0, 160),
    status: boundedString(record.status, 40),
    claim: boundedString(record.claim, 2_000),
    source: boundedString(record.source, 500),
    sourceUrl: boundedString(record.sourceUrl, 2_000),
    publishedAt: boundedString(record.publishedAt, 80),
    scope: boundedString(record.scope, 2_000),
    limitations: Array.isArray(record.limitations)
      ? record.limitations.filter((item) => typeof item === 'string').slice(0, 12).map((item) => item.slice(0, 1_000))
      : [],
    warnings: Array.isArray(record.warnings)
      ? record.warnings.filter((item) => typeof item === 'string').slice(0, 12).map((item) => item.slice(0, 80))
      : [],
    eligible: record.eligible === true,
  };
}

function sanitizeAgentResult(result) {
  if (!result || typeof result !== 'object') throw new Error('invalid-agent-result');
  const modes = new Set(['evidence', 'coverage', 'insufficient-evidence', 'local-fallback']);
  if (!modes.has(result.mode)) throw new Error('invalid-agent-result');

  const output = {
    mode: result.mode,
    model: NAVIGATOR_MODEL,
    steps: Array.isArray(result.steps)
      ? result.steps.filter((step) => typeof step === 'string').slice(0, 48).map((step) => step.slice(0, 500))
      : [],
  };
  if (typeof result.text === 'string') output.text = result.text.slice(0, 16_000);
  if (typeof result.reason === 'string') output.reason = result.reason.slice(0, 4_000);
  if (Array.isArray(result.evidenceIds)) {
    output.evidenceIds = result.evidenceIds
      .filter((id) => typeof id === 'string')
      .slice(0, 3)
      .map((id) => id.slice(0, 160));
  }
  if (Array.isArray(result.records)) {
    output.records = result.records.slice(0, 3).map(sanitizeRecord).filter(Boolean);
  }
  return output;
}

export function createNavigatorHandler({
  env = process.env,
  runAgent = runNavigatorAgent,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxConcurrent = DEFAULT_MAX_CONCURRENT,
  rateLimit = DEFAULT_RATE_LIMIT,
  rateWindowMs = DEFAULT_RATE_WINDOW_MS,
  now = Date.now,
} = {}) {
  let activeRequests = 0;
  const rateBuckets = new Map();

  function consumeRateLimit(ip) {
    const current = now();
    for (const [key, bucket] of rateBuckets) {
      if (bucket.resetAt <= current) rateBuckets.delete(key);
    }
    let bucket = rateBuckets.get(ip);
    if (!bucket) {
      if (rateBuckets.size >= MAX_RATE_BUCKETS) rateBuckets.delete(rateBuckets.keys().next().value);
      bucket = { count: 0, resetAt: current + rateWindowMs };
      rateBuckets.set(ip, bucket);
    }
    bucket.count += 1;
    return bucket.count <= rateLimit;
  }

  return {
    async fetch(request) {
      if (request.method === 'GET') {
        return jsonResponse(200, {
          enabled: Boolean(env.OPENROUTER_API_KEY),
          model: NAVIGATOR_MODEL,
        });
      }
      if (request.method !== 'POST') {
        return jsonResponse(405, { error: 'Method not allowed.' }, { Allow: 'GET, POST' });
      }
      if (!isAllowedOrigin(request.headers.get('origin'), env)) {
        return jsonResponse(403, { error: 'Origin is not allowed.' });
      }

      const parsed = await parseQuestion(request);
      if (parsed.error) return parsed.error;
      if (request.signal?.aborted) {
        return jsonResponse(408, { error: 'Navigator request was cancelled.' });
      }
      if (!env.OPENROUTER_API_KEY) {
        return jsonResponse(503, { error: 'Hosted AI is not configured.' });
      }
      if (!consumeRateLimit(requestIp(request))) {
        return jsonResponse(429, { error: 'Too many Navigator requests. Try again shortly.' }, { 'Retry-After': String(Math.ceil(rateWindowMs / 1_000)) });
      }
      if (activeRequests >= maxConcurrent) {
        return jsonResponse(503, { error: 'Navigator is busy. Try again shortly.' }, { 'Retry-After': '5' });
      }

      activeRequests += 1;
      const controller = new AbortController();
      let timedOut = false;
      let timer;
      const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          controller.abort();
          reject(Object.assign(new Error('deadline-exceeded'), { name: 'AbortError' }));
        }, timeoutMs);
      });
      const abortForDisconnect = () => controller.abort();
      request.signal?.addEventListener('abort', abortForDisconnect, { once: true });
      if (request.signal?.aborted) controller.abort();

      try {
        if (controller.signal.aborted) {
          return jsonResponse(408, { error: 'Navigator request was cancelled.' });
        }
        const agentWork = runAgent({
          question: parsed.question,
          projects,
          relationships,
          evidenceRecords,
          snapshot: {
            version: evidenceSnapshot.version,
            recordCount: evidenceRecords.length,
            reviewedAt: evidenceSnapshot.reviewedAt,
          },
          settings: {
            baseUrl: OPENROUTER_BASE_URL,
            model: NAVIGATOR_MODEL,
            apiKey: env.OPENROUTER_API_KEY,
          },
          signal: controller.signal,
        });
        const result = await Promise.race([agentWork, deadline]);
        return jsonResponse(200, sanitizeAgentResult(result));
      } catch (error) {
        if (timedOut) {
          return jsonResponse(504, { error: 'Navigator request timed out.' });
        }
        if (request.signal?.aborted || error?.name === 'AbortError') {
          return jsonResponse(408, { error: 'Navigator request was cancelled.' });
        }
        return jsonResponse(502, { error: 'Navigator provider request failed.' });
      } finally {
        clearTimeout(timer);
        request.signal?.removeEventListener('abort', abortForDisconnect);
        activeRequests -= 1;
      }
    },
  };
}

export default createNavigatorHandler();
