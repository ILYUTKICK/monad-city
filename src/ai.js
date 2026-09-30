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

// ---------- agentic layer ----------
// The agent plans, calls LOCAL read-only tools against the deterministic graph, and answers
// with per-claim evidence citations. Tools never touch the network and never mutate data;
// the model only ever sees what the tools return.

export const AGENT_MAX_STEPS = 6;

const AGENT_SYSTEM_PROMPT = [
  'You are the AI Navigator agent of Monad City, a source-grounded map of the Monad ecosystem.',
  'You answer questions about projects, evidence, and relationships by using the provided tools. They query a local, deterministic evidence graph.',
  'How to work:',
  '- Plan silently, call tools as needed (several times if useful), then answer. You have at most 6 tool rounds.',
  '- Prefer get_project_evidence over guessing; use get_district_coverage for landscape questions.',
  'Hard rules:',
  '- State ONLY facts that appear in tool results. Never add facts, addresses, dates, or numbers from your own knowledge.',
  '- After every factual claim, cite the exact evidence record IDs in square brackets, e.g. [E-KURU-CAP-001].',
  '- Preserve status distinctions: "Observed" means an artifact was inspected; "Claimed" means a publisher said so. Never present a claim as verified.',
  '- Never state that any project is verified, safe, legitimate, active, or endorsed.',
  '- If the tools do not establish something (for example current activity), say so plainly instead of guessing.',
  '- No investment advice, no recommendations.',
  '- Answer in the language of the user question.',
  'Output only the final answer text.',
].join('\n');

export const AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_projects',
      description: 'Search Monad ecosystem project profiles by free text. Returns matching projects with id, name, district, type, and tag.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Free-text query, e.g. "lending" or "kuru"' },
          district: { type: 'string', description: 'Optional district filter: DeFi, Infrastructure, AI, Gaming, Identity' },
          limit: { type: 'integer', description: 'Maximum results to return (default 8)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_project_evidence',
      description: 'Get the exact approved evidence records for one project (use an id returned by search_projects). Each record carries id, status, claim, source, timestamp, and scope.',
      parameters: {
        type: 'object',
        properties: { projectId: { type: 'string' } },
        required: ['projectId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_project_relationships',
      description: 'Get typed relationships for one project: the other endpoint, relationship type, evidence state, and supporting evidence record ids.',
      parameters: {
        type: 'object',
        properties: { projectId: { type: 'string' } },
        required: ['projectId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_district_coverage',
      description: 'Get coverage facts for one district or the whole city: how many projects exist, how many carry approved evidence records, and relationship counts by provenance class. Omit district for the whole city.',
      parameters: {
        type: 'object',
        properties: { district: { type: 'string', description: 'District name; omit for whole-city coverage' } },
      },
    },
  },
];

export function createToolExecutors({ projects, relationships, evidenceRecords, snapshot }) {
  const approvedRecords = evidenceRecords.filter((record) => record?.reviewStatus === 'approved');
  const normalize = (value) => String(value ?? '').toLowerCase().trim();
  const recordPayload = (record) => ({
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

  return {
    search_projects(args) {
      const query = normalize(args?.query);
      const district = args?.district ? normalize(args.district) : null;
      const limit = Math.min(Number(args?.limit) || 8, 20);
      if (!query) return { matches: [], note: 'Empty query.' };
      const scored = [];
      for (const project of projects) {
        if (district && normalize(project.district) !== district) continue;
        const haystacks = {
          name: normalize(project.name),
          id: normalize(project.id),
          type: normalize(project.type),
          tag: normalize(project.tag),
          description: normalize(project.description),
          district: normalize(project.district),
        };
        let score = 0;
        if (haystacks.name === query || haystacks.id === query) score = 100;
        else if (haystacks.name.startsWith(query)) score = 80;
        else if (haystacks.name.includes(query)) score = 60;
        else if (Object.values(haystacks).some((value) => value.includes(query))) score = 40;
        else if (query.split(/\s+/).length > 1 && query.split(/\s+/).every((word) => Object.values(haystacks).some((value) => value.includes(word)))) score = 30;
        if (score) scored.push({ score, project });
      }
      scored.sort((left, right) => right.score - left.score || left.project.name.localeCompare(right.project.name));
      return {
        matches: scored.slice(0, limit).map(({ project }) => ({
          id: project.id,
          name: project.name,
          district: project.district,
          type: project.type,
          tag: project.tag,
        })),
        totalMatches: scored.length,
      };
    },

    get_project_evidence(args) {
      const projectId = normalize(args?.projectId);
      const project = projects.find((item) => normalize(item.id) === projectId || normalize(item.name) === projectId);
      if (!project) return { error: `Unknown project "${args?.projectId}". Use search_projects first.` };
      const records = approvedRecords
        .filter((record) => record.projectId === project.id)
        .slice(0, 15)
        .map(recordPayload);
      return {
        project: { id: project.id, name: project.name, district: project.district, type: project.type },
        approvedRecordCount: records.length,
        records,
        note: records.length ? null : 'This project has no approved evidence records; nothing can be established about it.',
      };
    },

    get_project_relationships(args) {
      const projectId = normalize(args?.projectId);
      const project = projects.find((item) => normalize(item.id) === projectId || normalize(item.name) === projectId);
      if (!project) return { error: `Unknown project "${args?.projectId}". Use search_projects first.` };
      const approvedIds = new Set(approvedRecords.map((record) => record.id));
      const edges = relationships
        .filter((relationship) => relationship.from === project.id || relationship.to === project.id)
        .map((relationship) => ({
          id: relationship.id,
          from: relationship.from,
          to: relationship.to,
          type: relationship.type,
          evidenceState: relationship.evidenceState || null,
          dataMode: relationship.dataMode || null,
          supportingEvidenceIds: (relationship.evidenceIds || []).filter((id) => approvedIds.has(id)),
        }));
      return { project: project.id, relationships: edges };
    },

    get_district_coverage(args) {
      const district = args?.district ? normalize(args.district) : null;
      const scope = district
        ? projects.filter((project) => normalize(project.district) === district)
        : projects;
      if (district && !scope.length) {
        return { error: `Unknown district "${args.district}". Districts: DeFi, Infrastructure, AI, Gaming, Identity.` };
      }
      const sourced = new Set(approvedRecords.map((record) => record.projectId));
      const scopeIds = new Set(scope.map((project) => project.id));
      const edges = relationships.filter((relationship) => scopeIds.has(relationship.from) || scopeIds.has(relationship.to));
      const byProvenance = {};
      for (const edge of edges) {
        const key = edge.dataMode === 'sourced-limited' && edge.reviewStatus === 'approved' ? 'sourced' : 'illustrative-or-declared';
        byProvenance[key] = (byProvenance[key] || 0) + 1;
      }
      return {
        scope: district || 'whole city',
        projects: scope.length,
        projectsWithApprovedEvidence: scope.filter((project) => sourced.has(project.id)).length,
        relationships: edges.length,
        relationshipsByProvenance: byProvenance,
        snapshot: snapshot ? { version: snapshot.version, records: snapshot.recordCount, reviewedAt: snapshot.reviewedAt } : null,
      };
    },
  };
}

function summarizeToolStep(name, args, result) {
  const argText = Object.entries(args || {})
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(', ');
  if (result?.error) return `${name}(${argText}) → error: ${result.error}`;
  if (name === 'search_projects') return `${name}(${argText}) → ${result?.totalMatches ?? result?.matches?.length ?? 0} match(es)`;
  if (name === 'get_project_evidence') return `${name}(${argText}) → ${result?.approvedRecordCount ?? 0} record(s)`;
  if (name === 'get_project_relationships') return `${name}(${argText}) → ${result?.relationships?.length ?? 0} edge(s)`;
  if (name === 'get_district_coverage') return `${name}(${argText}) → ${result?.projectsWithApprovedEvidence ?? '?'}/${result?.projects ?? '?'} projects with evidence`;
  return `${name}(${argText})`;
}

async function chatCompletion({ settings, body, signal }) {
  let response;
  try {
    response = await fetch(`${settings.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new Error(`The AI endpoint could not be reached (${error?.message || 'network error'}).`);
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const error = new Error(`The AI endpoint answered ${response.status}. ${detail.slice(0, 160)}`);
    error.status = response.status;
    error.detail = detail.slice(0, 300);
    throw error;
  }
  return response.json();
}

export async function runNavigatorAgent({ question, projects, relationships, evidenceRecords, snapshot, settings, signal, onStep }) {
  if (!aiEnabled(settings)) throw new Error('Grounded AI is not configured.');
  const executors = createToolExecutors({ projects, relationships, evidenceRecords, snapshot });
  const messages = [
    { role: 'system', content: AGENT_SYSTEM_PROMPT },
    { role: 'user', content: String(question || '').slice(0, 500) },
  ];
  const steps = [];

  const runOnce = (withTools) => chatCompletion({
    settings,
    signal,
    body: {
      model: settings.model,
      temperature: 0.2,
      max_tokens: 700,
      messages,
      ...(withTools ? { tools: AGENT_TOOLS, tool_choice: 'auto' } : {}),
    },
  });

  let response = null;
  for (let round = 0; round < AGENT_MAX_STEPS; round += 1) {
    try {
      response = await runOnce(true);
    } catch (error) {
      // Some OpenAI-compatible endpoints reject the tools parameter; fall back to a plain
      // grounded answer instead of failing the whole feature.
      if (round === 0 && error?.status === 400) {
        response = await runOnce(false);
        break;
      }
      throw error;
    }
    const message = response?.choices?.[0]?.message;
    if (!message) throw new Error('The AI endpoint returned no message.');
    if (Array.isArray(message.tool_calls) && message.tool_calls.length) {
      messages.push({ role: 'assistant', content: message.content || null, tool_calls: message.tool_calls });
      for (const call of message.tool_calls) {
        const name = call?.function?.name;
        let args = {};
        try { args = JSON.parse(call?.function?.arguments || '{}'); } catch { /* keep empty args */ }
        let result;
        try {
          result = executors[name] ? executors[name](args) : { error: `Unknown tool "${name}".` };
        } catch (toolError) {
          result = { error: toolError?.message || 'Tool execution failed.' };
        }
        const summary = summarizeToolStep(name, args, result);
        steps.push(summary);
        onStep?.({ type: 'tool', summary });
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result).slice(0, 6000),
        });
      }
      continue;
    }
    const text = message.content?.trim();
    if (!text) throw new Error('The agent returned no answer text.');
    onStep?.({ type: 'answer' });
    return { text, model: response.model || settings.model, steps };
  }
  throw new Error('The agent used all planning rounds without answering. Try a narrower question.');
}
