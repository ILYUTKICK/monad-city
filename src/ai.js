// Grounded AI layer for the Navigator. The deterministic retrieval in retrieval.js stays the
// source of truth: this module only reformulates what retrieval already returned, from the
// exact approved evidence records, under a strict no-additions contract. No key, no call —
// the Navigator behaves exactly as before.

export const AI_SETTINGS_STORAGE_KEY = 'monad-city.ai-settings';

export const AI_DEFAULTS = Object.freeze({
  // Qwen Cloud is the Metropolis hackathon's official sponsor path: keys are issued in its
  // console, the endpoint is OpenAI-compatible, and the bounty model is qwen3.8-max.
  baseUrl: 'https://maas.qwencloudapi.com/compatible-mode/v1',
  model: 'qwen3.8-max',
  apiKey: '',
});

export function loadAiSettings() {
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem(AI_SETTINGS_STORAGE_KEY) || '{}');
  } catch {
    stored = {};
  }
  return { ...AI_DEFAULTS, ...(typeof stored === 'object' && stored ? stored : {}) };
}

export function saveAiSettings(settings) {
  localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function aiEnabled(settings) {
  return Boolean(settings?.apiKey && settings?.baseUrl && settings?.model);
}

const MAX_RECORDS_IN_PROMPT = 12;

function approvedRecordPayload(records = []) {
  const payload = [];
  for (const record of records) {
    if (record?.reviewStatus && record.reviewStatus !== 'approved') continue;
    if (!record?.id || !record?.claim) continue;
    payload.push({
      id: record.id,
      status: record.status || null,
      claim: record.claim,
      source: record.source?.title || record.source?.url || null,
      sourceUrl: record.source?.url || null,
      publishedAt: record.publishedAt || record.capturedAt || null,
      scope: record.scope || null,
      limitations: record.limitations || null,
      warnings: Object.entries(record.quality || {})
        .filter(([, flagged]) => flagged)
        .map(([flag]) => flag),
    });
    if (payload.length >= MAX_RECORDS_IN_PROMPT) break;
  }
  return payload;
}

export function buildGroundingPayload(result, projects, relationships) {
  const projectIds = [...new Set([...(result.selectedProjectIds || []), ...(result.outOfScopeProjectIds || [])])];
  return {
    question: result.query ?? null,
    deterministicOutcome: result.outcome,
    deterministicAnswer: result.answer?.text ?? null,
    uncertainty: result.uncertainty
      ? { level: result.uncertainty.level, notes: result.uncertainty.notes }
      : null,
    projects: projectIds
      .map((id) => projects.find((project) => project.id === id))
      .filter(Boolean)
      .map((project) => ({ id: project.id, name: project.name, district: project.district, type: project.type })),
    relationships: (result.relationshipContexts || []).map((context) => {
      const relationship = relationships.find((item) => item.id === context.id);
      return {
        id: context.id,
        from: relationship?.from || context.from,
        to: relationship?.to || context.to,
        type: relationship?.type || context.type,
        evidenceState: relationship?.evidenceState || null,
      };
    }),
    evidenceRecords: (result.evidenceReferences || []).flatMap((reference) =>
      approvedRecordPayload(reference.records),
    ),
  };
}

const SYSTEM_PROMPT = [
  'You are the AI Navigator of Monad City, a source-grounded map of the Monad ecosystem.',
  'You receive one JSON payload: the user question, the deterministic retrieval outcome, project profiles, typed relationships, and the exact approved evidence records.',
  'Task: write a short human answer (2-4 sentences) to the question.',
  'Hard rules:',
  '- Use ONLY facts present in the provided evidence records and relationship records. Never add facts, addresses, dates, names, or numbers from your own knowledge.',
  '- Cite exact evidence record IDs in square brackets, e.g. [E-KURU-CAP-001], after each factual claim.',
  '- Preserve status distinctions: "Observed" means an artifact was inspected; "Claimed" means a publisher said so. Never present a claim as verified.',
  '- Never state that any project is verified, safe, legitimate, active, or endorsed.',
  '- If the records do not establish something (for example current activity), say so plainly instead of guessing.',
  '- No investment advice, no recommendations.',
  'Output only the answer text.',
].join('\n');

export async function groundAnswer({ result, projects, relationships, settings, signal }) {
  if (!aiEnabled(settings)) throw new Error('Grounded AI is not configured.');
  const payload = buildGroundingPayload(result, projects, relationships);
  let response;
  try {
    response = await fetch(`${settings.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        temperature: 0.2,
        max_tokens: 320,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(payload) },
        ],
      }),
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new Error(`The AI endpoint could not be reached (${error?.message || 'network error'}).`);
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`The AI endpoint answered ${response.status}. ${detail.slice(0, 160)}`);
  }
  const data = await response.json().catch(() => null);
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('The AI endpoint returned no answer text.');
  return { text, model: data.model || settings.model };
}
