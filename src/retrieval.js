/**
 * Deterministic, dependency-free retrieval for Monad City's curated graph.
 *
 * The module deliberately does not generate facts. It ranks only fields supplied
 * by the caller and reports whether evidence can support an evidence-dependent
 * query. UI integration remains responsible for rendering the returned answer
 * and applying the map action.
 */

export const NAVIGATOR_INTENTS = Object.freeze({
  DISCOVER: 'discover',
  EXPLAIN: 'explain',
  COMPARE: 'compare',
  TRACE_RELATIONSHIP: 'trace-relationship',
  NAVIGATE: 'navigate',
});

export const NAVIGATOR_OUTCOMES = Object.freeze({
  RESULTS: 'results',
  INSUFFICIENT_EVIDENCE: 'insufficient-evidence',
  NO_RESULT: 'no-result',
  UNSUPPORTED_REQUEST: 'unsupported-request',
  INVALID_QUERY: 'invalid-query',
});

export const NAVIGATOR_QUERY_CLASSES = Object.freeze({
  PROJECT: 'project',
  CATEGORY: 'category',
  CAPABILITY: 'capability',
  RELATIONSHIP: 'relationship',
  EVIDENCE: 'evidence',
});

export const NAVIGATOR_MAP_ACTIONS = Object.freeze({
  FOCUS_PROJECT: 'focus-project',
  FOCUS_DISTRICT: 'focus-district',
  FOCUS_SELECTION: 'focus-selection',
  FOCUS_NEIGHBORHOOD: 'focus-neighborhood',
  PRESERVE_VIEW: 'preserve-view',
});

const RELATIONSHIP_TYPE_TERMS = Object.freeze({
  onchain_interaction: [
    'onchain interaction',
    'onchain interactions',
    'contract interaction',
    'contract interactions',
    'onchain',
  ],
  declared_integration: [
    'declared integration',
    'declared integrations',
    'documented integration',
    'documented integrations',
    'integrate',
    'integrates',
    'integrated',
    'integrated with',
    'integration',
    'integrations',
  ],
  owner_claimed: [
    'owner claimed relationship',
    'owner claimed relationships',
    'owner claimed edge',
    'owner claimed edges',
    'representative claim',
    'representative claims',
  ],
  third_party_attestation: [
    'third party attestation',
    'third party attestations',
    'third party attested relationship',
    'third party attested relationships',
    'third party attested edge',
    'third party attested edges',
    'attestation',
    'attestations',
  ],
  semantic_similarity: [
    'semantic similarity',
    'semantic similarities',
    'similar project',
    'similar projects',
    'similarity',
  ],
  ecosystem_membership: [
    'ecosystem membership',
    'ecosystem memberships',
    'ecosystem directory',
    'ecosystem directories',
    'member',
    'members',
  ],
});

const PROJECT_STATE_TERMS = Object.freeze({
  Observed: ['observed'],
  Claimed: ['claimed'],
  Attested: ['attested'],
  'AI-inferred': ['ai inferred'],
});

const RELATIONSHIP_EVIDENCE_STATE_TERMS = Object.freeze({
  'onchain-observed': [
    'onchain observed relationship',
    'onchain observed relationships',
    'onchain observed edge',
    'onchain observed edges',
    'contract observed relationship',
    'contract observed relationships',
  ],
  'owner-claimed': [
    'owner claimed relationship',
    'owner claimed relationships',
    'owner claimed edge',
    'owner claimed edges',
  ],
  'source-observed': [
    'source observed relationship',
    'source observed relationships',
    'observed source relationship',
    'observed source relationships',
  ],
  'publisher-claimed': [
    'publisher claimed relationship',
    'publisher claimed relationships',
    'documented publisher claim',
    'documented publisher claims',
  ],
  'third-party-attested': [
    'third party attested relationship',
    'third party attested relationships',
    'third party attested edge',
    'third party attested edges',
  ],
  'AI-inferred': [
    'ai inferred relationship',
    'ai inferred relationships',
    'ai inferred edge',
    'ai inferred edges',
  ],
  illustrative: [
    'illustrative relationship',
    'illustrative relationships',
    'illustrative edge',
    'illustrative edges',
    'demo only relationship',
    'demo only relationships',
    'demo only edge',
    'demo only edges',
    'mock relationship',
    'mock relationships',
    'mock edge',
    'mock edges',
  ],
});

const RELATIONSHIP_WORDS = new Set([
  'connect',
  'connects',
  'connected',
  'connection',
  'connections',
  'edge',
  'edges',
  'integrate',
  'integrates',
  'integration',
  'integrations',
  'link',
  'linked',
  'links',
  'related',
  'relates',
  'relation',
  'relations',
  'relationship',
  'relationships',
]);

const EVIDENCE_WORDS = new Set([
  'active',
  'activity',
  'available',
  'attested',
  'citation',
  'citations',
  'cite',
  'cited',
  'cites',
  'claim',
  'claimed',
  'confirmed',
  'contract',
  'contracts',
  'current',
  'deployed',
  'evidence',
  'historical',
  'incomplete',
  'inferred',
  'latest',
  'live',
  'observed',
  'proof',
  'proofs',
  'proven',
  'recent',
  'record',
  'records',
  'stale',
  'conflict',
  'conflicting',
  'missing',
  'published',
  'publication',
  'date',
  'source',
  'sources',
  'sourced',
  'support',
  'supporting',
  'supports',
  'timestamp',
  'timestamped',
  'unavailable',
  'verified',
]);

const QUERY_STOP_WORDS = new Set([
  'a',
  'about',
  'all',
  'an',
  'and',
  'are',
  'between',
  'building',
  'buildings',
  'by',
  'can',
  'compare',
  'crypto',
  'do',
  'does',
  'ecosystem',
  'explain',
  'find',
  'focus',
  'for',
  'give',
  'go',
  'has',
  'have',
  'here',
  'how',
  'i',
  'im',
  'in',
  'is',
  'it',
  'its',
  'landscape',
  'like',
  'me',
  'new',
  'newcomer',
  'of',
  'on',
  'open',
  'or',
  'please',
  'project',
  'projects',
  'show',
  'simple',
  'simply',
  'tell',
  'the',
  'these',
  'this',
  'to',
  'two',
  'vs',
  'what',
  'which',
  'who',
  'why',
  'with',
  'without',
  'no',
]);

const EVIDENCE_REQUIREMENTS = Object.freeze({
  ACTIVE_ONCHAIN: 'active-onchain',
  AVAILABLE_SOURCE: 'available-source',
  BOUNDED_CURRENT: 'bounded-current',
  TIMESTAMPED: 'timestamped',
  VERIFIED: 'verified',
});

const EVIDENCE_RECORD_FILTER_TERMS = Object.freeze({
  stale: ['stale'],
  historical: ['historical'],
  incomplete: ['incomplete'],
  conflict: ['conflict', 'conflicting'],
  unavailable: ['unavailable', 'missing source', 'no source'],
  'missing-published-at': [
    'no published date',
    'missing published date',
    'without published date',
    'no publication date',
    'missing publication date',
    'no timestamp',
    'missing timestamp',
    'without timestamp',
  ],
});

const UNSUPPORTED_CONCLUSION_TERMS = Object.freeze({
  safety: ['safe', 'safety', 'unsafe'],
  legitimacy: ['legit', 'legitimate', 'legitimacy', 'scam', 'trustworthy'],
  endorsement: ['endorse', 'endorsed', 'endorsement', 'recommend', 'recommended', 'recommendation'],
  quality: ['best', 'better', 'good', 'high quality', 'highest quality', 'quality', 'top', 'top ranked', 'ranking'],
  investment: ['invest', 'investing', 'investment', 'buy', 'sell', 'profitable', 'profitability'],
});

/** @typedef {'project'|'category'|'capability'|'relationship'|'evidence'} NavigatorQueryClass */
/** @typedef {'discover'|'explain'|'compare'|'trace-relationship'|'navigate'} NavigatorIntent */
/** @typedef {'results'|'insufficient-evidence'|'no-result'|'unsupported-request'|'invalid-query'} NavigatorOutcome */

/**
 * @typedef {Object} ProjectRecord
 * @property {string} id
 * @property {string} name
 * @property {string} [district]
 * @property {string} [type]
 * @property {string} [tag]
 * @property {string} [description]
 * @property {string} [state]
 * @property {string|null} [site]
 * @property {EvidenceRecord} [evidence]
 */

/**
 * @typedef {Object} EvidenceRecord
 * @property {{kind?: string, title?: string, url?: string|null, available?: boolean}} [source]
 * @property {string|null} [timestamp]
 * @property {string} [scope]
 * @property {{kind?: string, label?: string, actor?: string|null}} [provenance]
 * @property {string} [confidence]
 * @property {string} [dataMode]
 */

/**
 * @typedef {Object} RelationshipRecord
 * @property {string} id
 * @property {string} from
 * @property {string} to
 * @property {string} type
 * @property {string} evidenceState
 * @property {{kind?: string, title?: string, url?: string|null, available?: boolean}} [source]
 * @property {string|null} [timestamp]
 * @property {string} [scope]
 * @property {{kind?: string, label?: string, actor?: string|null}} [provenance]
 * @property {string} [confidence]
 * @property {string} [dataMode]
 */

/**
 * @typedef {Object} NavigatorInput
 * @property {string} query
 * @property {ProjectRecord[]} projects
 * @property {RelationshipRecord[]} relationships
 * @property {Object[]} [evidenceRecords] Optional Phase 3 exact-claim evidence records.
 * @property {string[]} [contextProjectIds] Selected projects supplied by the UI for “these two” queries.
 * @property {number} [limit]
 */

function normalize(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/[_/–—-]+/g, ' ')
    .replace(/[^a-zA-Z0-9.]+/g, ' ')
    .trim()
    .toLowerCase();
}

function tokens(value) {
  const normalized = normalize(value);
  return normalized ? normalized.split(/\s+/) : [];
}

function unique(values) {
  return [...new Set(values)];
}

function includesPhrase(haystack, phrase) {
  return ` ${haystack} `.includes(` ${phrase} `);
}

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function compareProjects(left, right) {
  return right.score - left.score || compareText(normalize(left.project.name), normalize(right.project.name)) || compareText(left.project.id, right.project.id);
}

function evidenceRequirement(queryText) {
  if (/\b(active|deployed|live)\b.*\b(contracts?|onchain|activity)\b|\b(onchain|contract)\b.*\b(activity|active|live)\b/.test(queryText)) {
    return EVIDENCE_REQUIREMENTS.ACTIVE_ONCHAIN;
  }
  if (/\b(verified|confirmed|proven)\b/.test(queryText)) {
    return EVIDENCE_REQUIREMENTS.VERIFIED;
  }
  if (/\b(recent|latest|current)\b/.test(queryText)) {
    return EVIDENCE_REQUIREMENTS.BOUNDED_CURRENT;
  }
  if (/\b(timestamped|timestamp)\b/.test(queryText)) {
    return EVIDENCE_REQUIREMENTS.TIMESTAMPED;
  }
  if (/\b(evidence|proofs?|sources?|sourced|cite|cited|cites|citations?)\b/.test(queryText)) {
    return EVIDENCE_REQUIREMENTS.AVAILABLE_SOURCE;
  }
  return null;
}

function unsupportedConclusion(queryText) {
  return Object.entries(UNSUPPORTED_CONCLUSION_TERMS)
    .filter(([, terms]) => terms.some((term) => includesPhrase(queryText, normalize(term))))
    .map(([conclusion]) => conclusion)
    .sort(compareText);
}

function findRequestedEvidenceFilters(queryText) {
  return findRequestedValues(queryText, EVIDENCE_RECORD_FILTER_TERMS);
}

function exactEvidenceSearchText(record) {
  return normalize([
    record?.claim,
    record?.scope,
    record?.provenanceNotes,
    ...(record?.limitations || []),
    JSON.stringify(record?.identifiers || {}),
  ].join(' '));
}

function matchesEvidenceFilter(record, filter) {
  if (filter === 'stale') return record?.quality?.stale === true;
  if (filter === 'historical') {
    return record?.quality?.stale === true || includesPhrase(exactEvidenceSearchText(record), 'historical');
  }
  if (filter === 'incomplete') return record?.quality?.incomplete === true;
  if (filter === 'conflict') return record?.quality?.conflict === true;
  if (filter === 'unavailable') {
    return record?.quality?.unavailable === true || evidenceAvailability(record).hasSource === false;
  }
  if (filter === 'missing-published-at') return record?.publishedAt == null;
  return false;
}

function evidenceAvailability(evidence) {
  const hasSource = Boolean(
    evidence?.source?.available === true &&
      typeof evidence.source.url === 'string' &&
      evidence.source.url.trim(),
  );
  const timestamp = evidence?.timestamp ?? evidence?.publishedAt ?? null;
  const hasTimestamp = Boolean(timestamp && !Number.isNaN(Date.parse(timestamp)));
  const explicitlyUnavailable = evidence?.quality?.unavailable === true;
  const timeBoundEligible = Object.prototype.hasOwnProperty.call(evidence?.quality || {}, 'timeBoundEligible')
    ? evidence.quality.timeBoundEligible === true
    : true;
  return {
    hasSource: hasSource && !explicitlyUnavailable,
    hasTimestamp,
    supportsTimeBoundClaim: hasSource && !explicitlyUnavailable && hasTimestamp && timeBoundEligible,
  };
}

function hasBoundedCurrentCriteria(evidence) {
  const availability = evidenceAvailability(evidence);
  const window = evidence?.identifiers?.observationWindow;
  return Boolean(
    evidence?.dataMode !== 'demo' &&
      availability.supportsTimeBoundClaim &&
      evidence?.quality?.stale !== true &&
      evidence?.quality?.conflict !== true &&
      evidence?.quality?.incomplete !== true &&
      typeof window?.startAt === 'string' &&
      typeof window?.endAt === 'string' &&
      !Number.isNaN(Date.parse(window.startAt)) &&
      !Number.isNaN(Date.parse(window.endAt)) &&
      window.subject &&
      window.measure,
  );
}

function meetsEvidenceRequirement(evidence, requirement, relationship = null) {
  if (!requirement) return true;
  const availability = evidenceAvailability(evidence);
  if (requirement === EVIDENCE_REQUIREMENTS.AVAILABLE_SOURCE) return availability.hasSource;
  if (requirement === EVIDENCE_REQUIREMENTS.TIMESTAMPED) return availability.supportsTimeBoundClaim;
  if (requirement === EVIDENCE_REQUIREMENTS.BOUNDED_CURRENT) {
    return hasBoundedCurrentCriteria(evidence);
  }
  // The trust model has no universal “verified” state. Source presence alone
  // cannot prove an unbounded verification request.
  if (requirement === EVIDENCE_REQUIREMENTS.VERIFIED) return false;
  const hasArtifactIdentifier = Boolean(
    evidence?.identifiers?.transactionHash || evidence?.identifiers?.eventId,
  );
  return Boolean(
    relationship?.type === 'onchain_interaction' &&
      hasArtifactIdentifier &&
      hasBoundedCurrentCriteria(evidence),
  );
}

function findRequestedValues(queryText, vocabulary) {
  return Object.entries(vocabulary)
    .filter(([, terms]) => terms.some((term) => includesPhrase(queryText, normalize(term))))
    .map(([value]) => value)
    .sort(compareText);
}

function findRequestedProjectStates(queryText, relationshipQuery) {
  const hasProjectSubject = /\b(project|projects|profile|profiles)\b/.test(queryText);
  if (relationshipQuery && !hasProjectSubject) return [];
  return findRequestedValues(queryText, PROJECT_STATE_TERMS);
}

function projectSearchText(project) {
  return {
    id: normalize(project.id),
    name: normalize(project.name),
    district: normalize(project.district),
    type: normalize(project.type),
    tag: normalize(project.tag),
    description: normalize(project.description),
    state: normalize(project.state),
    site: normalize(project.site),
  };
}

function summarizeExactEvidence(record, fallbackId = null) {
  if (!record) {
    return {
      id: fallbackId,
      status: null,
      supportMode: 'unavailable-only',
      supportedProposition: 'Evidence resolution failed; this placeholder supports only that the source is unavailable.',
      claim: null,
      evidenceType: null,
      source: null,
      retrievedAt: null,
      publishedAt: null,
      network: null,
      scope: 'Evidence record unavailable.',
      provenanceNotes: 'No matching evidence record was supplied to the retriever.',
      limitations: ['The referenced evidence record could not be resolved.'],
      quality: {
        conflict: false,
        incomplete: true,
        stale: false,
        unavailable: true,
        timeBoundEligible: false,
      },
      availability: 'unavailable',
      supportsTimeBoundClaim: false,
      supportsFactualClaims: false,
      dataMode: 'sourced-limited',
    };
  }

  const availability = evidenceAvailability(record);
  return {
    id: record.id,
    status: record.status || null,
    supportMode: record.supportMode || null,
    supportedProposition: record.supportedProposition || record.scope || null,
    claim: record.claim || null,
    evidenceType: record.evidenceType || null,
    source: record.source
      ? {
          kind: record.source.kind || null,
          title: record.source.title || null,
          url: record.source.url || null,
          publisher: record.source.publisher || null,
          available: availability.hasSource,
          referenceType: record.source.referenceType || null,
          presentationMutable: record.source.presentationMutable ?? null,
        }
      : null,
    retrievedAt: record.retrievedAt || null,
    publishedAt: record.publishedAt || null,
    network: record.network || null,
    scope: record.scope || null,
    provenanceNotes: record.provenanceNotes || null,
    limitations: Array.isArray(record.limitations) ? [...record.limitations] : [],
    quality: {
      conflict: record.quality?.conflict === true,
      incomplete: record.quality?.incomplete === true,
      stale: record.quality?.stale === true,
      unavailable: record.quality?.unavailable === true || !availability.hasSource,
      timeBoundEligible: record.quality?.timeBoundEligible === true,
    },
    identifiers: record.identifiers || null,
    availability: availability.supportsTimeBoundClaim
      ? 'source-and-timestamp'
      : availability.hasSource
        ? 'source-only'
        : 'unavailable',
    supportsTimeBoundClaim: availability.supportsTimeBoundClaim,
    supportsFactualClaims: record.supportsFactualClaims === true,
    dataMode: record.dataMode || null,
  };
}

function makeEvidenceReference(
  kind,
  id,
  state,
  evidence,
  exactRecords = [],
  expectedEvidenceIds = [],
  resolveExpectedEvidence = true,
) {
  const exactById = new Map(exactRecords.map((record) => [record.id, record]));
  const resolvedRecords = expectedEvidenceIds.length && resolveExpectedEvidence
    ? expectedEvidenceIds.map((evidenceId) => summarizeExactEvidence(exactById.get(evidenceId), evidenceId))
    : exactRecords.map((record) => summarizeExactEvidence(record));
  const exactAvailabilities = resolvedRecords.map((record) => record.availability);
  const availability = evidenceAvailability(evidence);
  const hasExactSource = exactAvailabilities.some((value) => value !== 'unavailable');
  const hasExactTimestamp = exactAvailabilities.some((value) => value === 'source-and-timestamp');
  const hasUnavailableExactRecord = exactAvailabilities.includes('unavailable');
  const quality = resolvedRecords.reduce(
    (summary, record) => ({
      conflict: summary.conflict || record.quality.conflict,
      incomplete: summary.incomplete || record.quality.incomplete,
      stale: summary.stale || record.quality.stale,
      unavailable: summary.unavailable || record.quality.unavailable,
    }),
    { conflict: false, incomplete: false, stale: false, unavailable: false },
  );
  const primary =
    resolvedRecords.find((record) => record.availability === 'source-and-timestamp' && record.source?.url) ||
    resolvedRecords.find((record) => record.availability === 'source-only' && record.source?.url) ||
    resolvedRecords[0] ||
    null;
  const aggregateAvailability = resolvedRecords.length
    ? hasExactSource && hasUnavailableExactRecord
      ? 'partial'
      : hasExactTimestamp
        ? 'source-and-timestamp'
        : hasExactSource
          ? 'source-only'
          : 'unavailable'
    : availability.supportsTimeBoundClaim
      ? 'source-and-timestamp'
      : availability.hasSource
        ? 'source-only'
        : 'unavailable';

  return {
    id: `${kind}:${id}`,
    subjectKind: kind,
    subjectId: id,
    state: resolvedRecords.length ? null : state || null,
    statuses: unique(resolvedRecords.map((record) => record.status).filter(Boolean)).sort(compareText),
    evidenceIds: resolvedRecords.length
      ? resolvedRecords.map((record) => record.id).filter(Boolean)
      : [...expectedEvidenceIds],
    records: resolvedRecords,
    supportModes: unique(resolvedRecords.map((record) => record.supportMode).filter(Boolean)).sort(compareText),
    source: primary?.source || (evidence?.source
      ? {
          kind: evidence.source.kind || null,
          title: evidence.source.title || null,
          url: evidence.source.url || null,
          available: availability.hasSource,
        }
      : null),
    timestamp: primary?.publishedAt || evidence?.timestamp || null,
    scope: primary?.scope || evidence?.scope || null,
    provenance: primary
      ? {
          kind: 'exact-evidence-record',
          label: primary.provenanceNotes,
          actor: primary.source?.publisher || null,
        }
      : evidence?.provenance
      ? {
          kind: evidence.provenance.kind || null,
          label: evidence.provenance.label || null,
          actor: evidence.provenance.actor || null,
        }
      : null,
    confidence: evidence?.confidence || 'not-assessed',
    dataMode: resolvedRecords.length ? 'sourced-limited' : evidence?.dataMode || null,
    availability: aggregateAvailability,
    supportsTimeBoundClaim: hasExactTimestamp || (!resolvedRecords.length && availability.supportsTimeBoundClaim),
    supportsFactualClaims: resolvedRecords.some((record) => record.supportsFactualClaims),
    quality,
  };
}

function classifyIntent(queryText, relationshipQuery, namedProjectCount) {
  if (/\b(compare|versus|vs)\b/.test(queryText)) return NAVIGATOR_INTENTS.COMPARE;
  if (relationshipQuery || (/\bwhy\b/.test(queryText) && namedProjectCount > 1)) {
    return NAVIGATOR_INTENTS.TRACE_RELATIONSHIP;
  }
  if (/\b(explain|what is|tell me about|understand)\b/.test(queryText)) {
    return NAVIGATOR_INTENTS.EXPLAIN;
  }
  if (/\b(show|focus|open|go to|take me)\b/.test(queryText)) return NAVIGATOR_INTENTS.NAVIGATE;
  return NAVIGATOR_INTENTS.DISCOVER;
}

function requirementLabel(requirement) {
  return {
    [EVIDENCE_REQUIREMENTS.ACTIVE_ONCHAIN]: 'active contract or onchain activity',
    [EVIDENCE_REQUIREMENTS.AVAILABLE_SOURCE]: 'available source evidence',
    [EVIDENCE_REQUIREMENTS.BOUNDED_CURRENT]: 'a current or recent state',
    [EVIDENCE_REQUIREMENTS.TIMESTAMPED]: 'timestamped evidence',
    [EVIDENCE_REQUIREMENTS.VERIFIED]: 'verification',
  }[requirement];
}

function requirementFailure(requirement) {
  return {
    [EVIDENCE_REQUIREMENTS.ACTIVE_ONCHAIN]:
      'No matching onchain-interaction record has a non-Demo source and timestamp.',
    [EVIDENCE_REQUIREMENTS.AVAILABLE_SOURCE]:
      'No matching record has an available evidence URL.',
    [EVIDENCE_REQUIREMENTS.BOUNDED_CURRENT]:
      'A dated artifact is not enough: no matching record defines and satisfies a current observation window, subject, and measure.',
    [EVIDENCE_REQUIREMENTS.TIMESTAMPED]:
      'No matching record has both an available evidence URL and a valid timestamp.',
    [EVIDENCE_REQUIREMENTS.VERIFIED]:
      'The trust model has no generic verified state, so an exact bounded claim and its evidence would be required.',
  }[requirement];
}

function datasetMode(projects, relationships, evidenceRecords = []) {
  const modes = unique([
    ...projects.map((project) => project.evidence?.dataMode).filter(Boolean),
    ...relationships.map((relationship) => relationship.dataMode).filter(Boolean),
    ...evidenceRecords.map((record) => record?.dataMode).filter(Boolean),
  ]);
  return modes.length === 1 ? modes[0] : modes.length ? 'mixed' : 'unknown';
}

function emptyMapAction() {
  return {
    type: NAVIGATOR_MAP_ACTIONS.PRESERVE_VIEW,
    view: null,
    focusProjectId: null,
    district: null,
    highlightProjectIds: [],
    highlightRelationshipIds: [],
    openPassportProjectId: null,
  };
}

function makeMapAction({ intent, projects, relationships, categories }) {
  const projectIds = projects.map((project) => project.id);
  const relationshipIds = relationships.map((relationship) => relationship.id);
  const focusProjectId = projectIds[0] || null;
  const districts = unique(projects.map((project) => project.district).filter(Boolean));
  let type = NAVIGATOR_MAP_ACTIONS.FOCUS_SELECTION;
  let view = 'city';

  if (intent === NAVIGATOR_INTENTS.TRACE_RELATIONSHIP) {
    type = NAVIGATOR_MAP_ACTIONS.FOCUS_NEIGHBORHOOD;
    view = 'graph';
  } else if (projectIds.length === 1) {
    type = NAVIGATOR_MAP_ACTIONS.FOCUS_PROJECT;
  } else if (categories.length === 1 && districts.length === 1) {
    type = NAVIGATOR_MAP_ACTIONS.FOCUS_DISTRICT;
  }

  return {
    type,
    view,
    focusProjectId,
    district: districts.length === 1 ? districts[0] : null,
    highlightProjectIds: projectIds,
    highlightRelationshipIds: relationshipIds,
    openPassportProjectId: focusProjectId,
  };
}

function answerTemplate({
  outcome,
  intent,
  query,
  selectedProjects,
  relationships,
  evidenceRequirement: requirement,
  queryClasses,
  mode,
  resultModes = [],
  requestedEvidenceFilters = [],
  matchedEvidenceRecordCount = 0,
  coverage = null,
}) {
  const names = selectedProjects.map((project) => project.name);
  const searched = queryClasses.length ? queryClasses.join(', ') : 'project graph';
  const hasSourced = resultModes.includes('sourced-limited');
  const hasDemo = resultModes.includes('demo');
  const sourcedSubsetNote = coverage && coverage.totalProjects > 0
    ? ` These results come from the limited source-backed subset (${coverage.sourceBackedProjects} of ${coverage.totalProjects} shown projects carry exact records); each source supports only its displayed bounded scope.`
    : ' These results come from the limited source-backed subset; each source supports only its displayed bounded scope.';
  const evidenceNote = hasSourced && hasDemo
    ? ' Results mix a limited source-backed subset with explicitly illustrative Demo records; inspect each evidence scope before drawing a factual conclusion.'
    : hasSourced
      ? sourcedSubsetNote
      : hasDemo || mode === 'demo'
        ? ' All matching profiles and edges are illustrative Demo data, not factual ecosystem claims.'
        : '';

  if (outcome === NAVIGATOR_OUTCOMES.INVALID_QUERY) {
    return {
      id: 'invalid-query',
      text: 'Ask for a project, category, capability, relationship, or evidence pattern in the Demo dataset.',
      nextStep: 'Try “Show me the DeFi landscape” or “Who is connected to Monad?”',
    };
  }

  if (outcome === NAVIGATOR_OUTCOMES.UNSUPPORTED_REQUEST) {
    return {
      id: 'unsupported-request',
      text: 'I can help inspect projects and their evidence, but I can’t determine which project is safe, legitimate, endorsed, highest quality, best, or suitable as an investment.',
      nextStep: 'Ask for a specific capability, relationship, source, or bounded factual claim instead.',
    };
  }

  if (outcome === NAVIGATOR_OUTCOMES.NO_RESULT) {
    return {
      id: 'no-result',
      text: `No local dataset match was found for “${query}”. I searched ${searched}; nothing was added to or inferred beyond the supplied records.`,
      nextStep: 'Try a project name, district, capability such as “oracle”, or a broader relationship query.',
    };
  }

  if (outcome === NAVIGATOR_OUTCOMES.INSUFFICIENT_EVIDENCE) {
    const subject = names.length ? ` for ${names.join(', ')}` : '';
    return {
      id: 'insufficient-evidence',
      text: `There is not enough evidence${subject} to establish ${requirementLabel(requirement)}. ${requirementFailure(requirement)}`,
      nextStep: 'Inspect the returned evidence placeholders; do not treat the highlighted result as verified, active, real, or confirmed.',
    };
  }

  if (requestedEvidenceFilters.length) {
    return {
      id: 'evidence-filter-results',
      text: `I found ${matchedEvidenceRecordCount} exact evidence record${matchedEvidenceRecordCount === 1 ? '' : 's'} matching ${requestedEvidenceFilters.join(' or ')} for ${names.join(', ')}.${evidenceNote}`,
      nextStep: 'Inspect each returned record; the filter describes that record only, not the project as a whole.',
    };
  }

  if (intent === NAVIGATOR_INTENTS.TRACE_RELATIONSHIP) {
    return {
      id: 'relationship-results',
      text: `I found ${relationships.length} typed edge${relationships.length === 1 ? '' : 's'} involving ${names.join(', ')}.${evidenceNote}`,
      nextStep: 'Open a highlighted Passport to inspect the edge type, scope, source availability, and timestamp.',
    };
  }

  if (intent === NAVIGATOR_INTENTS.COMPARE) {
    return {
      id: 'compare-results',
      text: `I selected ${names.join(' and ')} for a structured comparison.${evidenceNote}`,
      nextStep: 'Compare their profile fields and evidence references; unavailable evidence must remain visibly unresolved.',
    };
  }

  return {
    id: 'project-results',
    text: `I found ${names.length} profile${names.length === 1 ? '' : 's'} matching “${query}”: ${names.join(', ')}.${evidenceNote}`,
    nextStep: 'Open a highlighted Passport to inspect why it matched and what evidence is available.',
  };
}

/**
 * Search the supplied project graph without mutating it or consulting external services.
 *
 * Determinism rules: fixed field weights, score descending, then normalized project
 * name and stable id ascending. Relationships are always returned by stable id.
 *
 * @param {NavigatorInput} input
 * @returns {{
 *   query: string,
 *   normalizedQuery: string,
 *   intent: NavigatorIntent,
 *   queryClasses: NavigatorQueryClass[],
 *   outcome: NavigatorOutcome,
 *   answer: {id: string, text: string, nextStep: string},
 *   selectedProjectIds: string[],
 *   primaryProjectId: string|null,
 *   matches: Array<{projectId: string, score: number, matchedFields: string[], matchedTerms: string[]}>,
 *   evidenceReferences: Object[],
 *   relationshipContexts: Object[],
 *   uncertainty: {level: 'low'|'medium'|'high', codes: string[], notes: string[]},
 *   mapAction: Object,
 *   diagnostics: Object
 * }}
 */
export function retrieveNavigator(input) {
  const {
    query,
    projects,
    relationships,
    evidenceRecords: suppliedEvidenceRecords = [],
    contextProjectIds = [],
    limit = 10,
  } = input || {};

  if (!Array.isArray(projects) || !Array.isArray(relationships)) {
    throw new TypeError('retrieveNavigator requires projects and relationships arrays.');
  }
  if (!Array.isArray(suppliedEvidenceRecords)) {
    throw new TypeError('retrieveNavigator evidenceRecords must be an array when supplied.');
  }

  const rawQuery = String(query ?? '').trim();
  const queryText = normalize(rawQuery);
  const requestedEvidenceFilters = findRequestedEvidenceFilters(queryText);
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const exactEvidenceById = new Map(
    suppliedEvidenceRecords
      .filter((record) => record && typeof record.id === 'string')
      .map((record) => [record.id, record]),
  );
  const matchingExactEvidenceRecords = requestedEvidenceFilters.length
    ? suppliedEvidenceRecords.filter((record) =>
        requestedEvidenceFilters.some((filter) => matchesEvidenceFilter(record, filter)),
      )
    : suppliedEvidenceRecords;
  const exactEvidenceForProject = (projectId, matchedOnly = false) =>
    (matchedOnly ? matchingExactEvidenceRecords : suppliedEvidenceRecords)
      .filter((record) => record?.projectId === projectId)
      .sort((left, right) => compareText(left.id, right.id));
  const exactEvidenceForRelationship = (relationship) =>
    (relationship.evidenceIds || [])
      .map((id) => exactEvidenceById.get(id))
      .filter(Boolean);
  const mode = datasetMode(projects, relationships, suppliedEvidenceRecords);
  // Coverage stats are derived from the live inputs, never hardcoded: the sourced subset
  // grows every batch and the copy must follow (scale plan §7).
  const sourceBackedProjectIds = new Set(
    suppliedEvidenceRecords
      .filter((record) => record?.reviewStatus === 'approved')
      .map((record) => record.projectId),
  );
  const coverage = {
    sourceBackedProjects: projects.filter((project) => sourceBackedProjectIds.has(project.id)).length,
    totalProjects: projects.length,
  };

  if (!queryText) {
    const intent = NAVIGATOR_INTENTS.DISCOVER;
    const outcome = NAVIGATOR_OUTCOMES.INVALID_QUERY;
    return {
      query: rawQuery,
      normalizedQuery: queryText,
      intent,
      queryClasses: [],
      outcome,
      answer: answerTemplate({ outcome, intent, query: rawQuery, selectedProjects: [], relationships: [], evidenceRequirement: null, queryClasses: [], mode, resultModes: [], coverage }),
      selectedProjectIds: [],
      primaryProjectId: null,
      matches: [],
      evidenceReferences: [],
      relationshipContexts: [],
      uncertainty: {
        level: 'high',
        codes: ['empty-query'],
        notes: ['No retrieval was run because the query was empty.'],
      },
      mapAction: emptyMapAction(),
      diagnostics: {
        datasetMode: mode,
        searchedFields: [],
        evidenceRequirement: null,
        requestedCategories: [],
        requestedProjectStates: [],
        requestedRelationshipTypes: [],
        requestedEvidenceStates: [],
        requestedEvidenceFilters: [],
        matchedEvidenceIds: [],
        capabilityTerms: [],
        contextProjectIds: [],
        unsupportedReasons: [],
        ambiguousStateTerms: [],
      },
    };
  }

  const searchableProjects = projects.map((project) => ({ project, text: projectSearchText(project) }));
  const namedProjects = searchableProjects
    .filter(({ text }) => includesPhrase(queryText, text.name) || includesPhrase(queryText, text.id))
    .map(({ project }) => project);
  const contextIsReferenced =
    /\b(this project|that project|these projects|these two|these buildings|selected project|selected projects|current project|both projects|they|them|it)\b/.test(queryText) ||
    (contextProjectIds.length > 0 && /\b(compare|connected|connections|relationship|relationships)\b/.test(queryText));
  const contextProjects = contextIsReferenced
    ? unique(contextProjectIds)
        .map((id) => projectById.get(id))
        .filter(Boolean)
    : [];
  const referredProjects = namedProjects.length ? namedProjects : contextProjects;
  const categoryValues = unique(projects.map((project) => project.district).filter(Boolean));
  let requestedCategories = categoryValues
    .filter((category) => includesPhrase(queryText, normalize(category)))
    .sort(compareText);
  const requestedRelationshipTypes = findRequestedValues(queryText, RELATIONSHIP_TYPE_TERMS);
  const relationshipQuery =
    requestedRelationshipTypes.length > 0 ||
    tokens(queryText).some((token) => RELATIONSHIP_WORDS.has(token));
  const requestedProjectStates = findRequestedProjectStates(queryText, relationshipQuery);
  const requestedEvidenceStates = findRequestedValues(
    queryText,
    RELATIONSHIP_EVIDENCE_STATE_TERMS,
  );
  if (
    requestedProjectStates.includes('AI-inferred') ||
    requestedEvidenceStates.includes('AI-inferred')
  ) {
    requestedCategories = requestedCategories.filter((category) => normalize(category) !== 'ai');
  }
  const ambiguousStateTerms = relationshipQuery && !requestedProjectStates.length && !requestedEvidenceStates.length
    ? ['observed', 'claimed', 'attested', 'inferred'].filter((term) =>
        includesPhrase(queryText, term),
      )
    : [];
  const unsupportedReasons = unsupportedConclusion(queryText);

  // Unsupported conclusions are refused before capability extraction so terms
  // such as “best” or “safe” can never degrade into an ordinary ranked search.
  if (unsupportedReasons.length) {
    const intent = classifyIntent(queryText, relationshipQuery, referredProjects.length);
    const queryClasses = [];
    if (referredProjects.length) queryClasses.push(NAVIGATOR_QUERY_CLASSES.PROJECT);
    if (requestedCategories.length) queryClasses.push(NAVIGATOR_QUERY_CLASSES.CATEGORY);
    if (relationshipQuery) queryClasses.push(NAVIGATOR_QUERY_CLASSES.RELATIONSHIP);
    const selectedProjects = referredProjects;
    const outcome = NAVIGATOR_OUTCOMES.UNSUPPORTED_REQUEST;
    const evidenceReferences = selectedProjects.map((project) =>
      makeEvidenceReference(
        'project',
        project.id,
        project.state,
        project.evidence,
        exactEvidenceForProject(project.id),
      ),
    );

    return {
      query: rawQuery,
      normalizedQuery: queryText,
      intent,
      queryClasses,
      outcome,
      answer: answerTemplate({
        outcome,
        intent,
        query: rawQuery,
        selectedProjects,
        relationships: [],
        evidenceRequirement: null,
        queryClasses,
        mode,
        resultModes: unique(evidenceReferences.map((reference) => reference.dataMode).filter(Boolean)),
        coverage,
      }),
      selectedProjectIds: selectedProjects.map((project) => project.id),
      primaryProjectId: selectedProjects[0]?.id || null,
      matches: selectedProjects.map((project) => ({
        projectId: project.id,
        score: 120,
        matchedFields: ['project'],
        matchedTerms: [project.name],
      })),
      evidenceReferences,
      relationshipContexts: [],
      uncertainty: {
        level: 'high',
        codes: ['unsupported-request'],
        notes: ['The requested conclusion was not assessed or ranked.'],
      },
      mapAction: emptyMapAction(),
      diagnostics: {
        datasetMode: mode,
        searchedFields: referredProjects.length ? ['id', 'name'] : [],
        evidenceRequirement: null,
        requestedCategories,
        requestedProjectStates,
        requestedRelationshipTypes,
        requestedEvidenceStates,
        requestedEvidenceFilters,
        matchedEvidenceIds: [],
        capabilityTerms: [],
        contextProjectIds: contextProjects.map((project) => project.id),
        unsupportedReasons,
        ambiguousStateTerms,
      },
    };
  }

  const requirement = requestedEvidenceFilters.length ? null : evidenceRequirement(queryText);
  const queryTokenList = tokens(queryText);
  const reservedTokens = new Set([
    ...QUERY_STOP_WORDS,
    ...RELATIONSHIP_WORDS,
    ...EVIDENCE_WORDS,
    ...requestedCategories.flatMap(tokens),
    ...referredProjects.flatMap((project) => tokens(`${project.id} ${project.name}`)),
    ...requestedRelationshipTypes.flatMap((type) => tokens(type)),
    ...requestedProjectStates.flatMap((state) => tokens(state)),
    ...requestedEvidenceStates.flatMap((state) => tokens(state)),
  ]);
  const capabilityTerms = unique(queryTokenList.filter((token) => token.length > 1 && !reservedTokens.has(token)));
  const intent = classifyIntent(queryText, relationshipQuery, referredProjects.length);
  const queryClasses = [];
  if (referredProjects.length) queryClasses.push(NAVIGATOR_QUERY_CLASSES.PROJECT);
  if (requestedCategories.length) queryClasses.push(NAVIGATOR_QUERY_CLASSES.CATEGORY);
  if (capabilityTerms.length) queryClasses.push(NAVIGATOR_QUERY_CLASSES.CAPABILITY);
  if (relationshipQuery || requestedEvidenceStates.length) queryClasses.push(NAVIGATOR_QUERY_CLASSES.RELATIONSHIP);
  if (
    requirement ||
    requestedProjectStates.length ||
    requestedEvidenceStates.length ||
    requestedEvidenceFilters.length
  ) {
    queryClasses.push(NAVIGATOR_QUERY_CLASSES.EVIDENCE);
  }

  const scores = searchableProjects.map(({ project, text }) => {
    let score = 0;
    const matchedFields = [];
    const matchedTerms = [];
    const named = referredProjects.some((item) => item.id === project.id);

    if (named) {
      score += 120;
      matchedFields.push('project');
      matchedTerms.push(project.name);
    }

    if (
      requestedEvidenceFilters.length &&
      matchingExactEvidenceRecords.some((record) => record.projectId === project.id)
    ) {
      score += 60;
      matchedFields.push('exact-evidence-filter');
      matchedTerms.push(...requestedEvidenceFilters);
    }

    requestedCategories.forEach((category) => {
      if (normalize(category) === text.district) {
        score += 50;
        matchedFields.push('category');
        matchedTerms.push(category);
      }
    });

    requestedProjectStates.forEach((state) => {
      if (normalize(state) === text.state) {
        score += 30;
        matchedFields.push('project-state');
        matchedTerms.push(state);
      }
    });

    capabilityTerms.forEach((term) => {
      if (tokens(text.type).includes(term)) {
        score += 18;
        matchedFields.push('type');
        matchedTerms.push(term);
      } else if (tokens(text.tag).includes(term)) {
        score += 10;
        matchedFields.push('tag');
        matchedTerms.push(term);
      } else if (tokens(text.description).includes(term)) {
        score += 6;
        matchedFields.push('description');
        matchedTerms.push(term);
      } else if (tokens(text.name).includes(term) || tokens(text.id).includes(term)) {
        score += 45;
        matchedFields.push('project');
        matchedTerms.push(term);
      }
    });

    return {
      project,
      score,
      matchedFields: unique(matchedFields),
      matchedTerms: unique(matchedTerms),
    };
  });

  let matchingRelationships = relationships.filter((relationship) => {
    if (ambiguousStateTerms.length) return false;
    const matchesProject =
      !referredProjects.length ||
      referredProjects.some((project) => relationship.from === project.id || relationship.to === project.id);
    const matchesType =
      !requestedRelationshipTypes.length || requestedRelationshipTypes.includes(relationship.type);
    const matchesState =
      !requestedEvidenceStates.length || requestedEvidenceStates.includes(relationship.evidenceState);
    const matchesRequirement =
      requirement !== EVIDENCE_REQUIREMENTS.ACTIVE_ONCHAIN ||
      (relationship.type === 'onchain_interaction' && relationship.evidenceState === 'onchain-observed');
    return matchesProject && matchesType && matchesState && matchesRequirement;
  });

  if (referredProjects.length > 1 && intent === NAVIGATOR_INTENTS.TRACE_RELATIONSHIP) {
    const referredIds = new Set(referredProjects.map((project) => project.id));
    matchingRelationships = matchingRelationships.filter(
      (relationship) => referredIds.has(relationship.from) && referredIds.has(relationship.to),
    );
  }

  matchingRelationships.sort((left, right) => compareText(left.id, right.id));

  if (relationshipQuery || requestedEvidenceStates.length || requirement) {
    matchingRelationships.forEach((relationship) => {
      [relationship.from, relationship.to].forEach((id) => {
        const scored = scores.find((item) => item.project.id === id);
        if (!scored) return;
        scored.score += referredProjects.some((project) => project.id === id) ? 35 : 22;
        scored.matchedFields.push('relationship');
        scored.matchedTerms.push(relationship.type);
      });
    });
  }

  const hasExplicitEntityConstraint =
    referredProjects.length ||
    requestedCategories.length ||
    requestedProjectStates.length ||
    capabilityTerms.length;
  if (
    requirement &&
    requirement !== EVIDENCE_REQUIREMENTS.ACTIVE_ONCHAIN &&
    requirement !== EVIDENCE_REQUIREMENTS.VERIFIED &&
    !hasExplicitEntityConstraint
  ) {
    scores.forEach((item) => {
      item.score += 1;
      item.matchedFields.push('evidence-candidate');
      item.matchedTerms.push(requirement);
    });
  }
  let ranked = scores.filter((item) => item.score > 0);

  if (requestedCategories.length) {
    ranked = ranked.filter((item) => requestedCategories.includes(item.project.district));
  }
  if (requestedProjectStates.length) {
    ranked = ranked.filter((item) => requestedProjectStates.includes(item.project.state));
  }
  if (requestedEvidenceFilters.length) {
    ranked = ranked.filter((item) =>
      matchingExactEvidenceRecords.some((record) => record.projectId === item.project.id),
    );
  }
  if (capabilityTerms.length) {
    ranked = ranked.filter((item) => item.matchedFields.some((field) => ['type', 'tag', 'description', 'project'].includes(field)));
  }
  if (referredProjects.length && intent !== NAVIGATOR_INTENTS.TRACE_RELATIONSHIP) {
    ranked = ranked.filter((item) => referredProjects.some((project) => project.id === item.project.id));
  }
  if ((relationshipQuery || requestedEvidenceStates.length) && !matchingRelationships.length && !hasExplicitEntityConstraint) {
    ranked = [];
  }

  const hasTopicalConstraint =
    requestedCategories.length > 0 ||
    requestedProjectStates.length > 0 ||
    capabilityTerms.length > 0;
  if (hasTopicalConstraint) {
    const topicalProjectIds = new Set(ranked.map((item) => item.project.id));
    matchingRelationships = matchingRelationships.filter(
      (relationship) =>
        topicalProjectIds.has(relationship.from) || topicalProjectIds.has(relationship.to),
    );
  }

  ranked.sort(compareProjects);
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(20, Math.floor(limit))) : 10;
  if (intent === NAVIGATOR_INTENTS.TRACE_RELATIONSHIP) {
    matchingRelationships = matchingRelationships.slice(0, safeLimit);
  }
  let selectedProjects = ranked.slice(0, safeLimit).map((item) => item.project);

  if (intent === NAVIGATOR_INTENTS.TRACE_RELATIONSHIP && matchingRelationships.length) {
    const relationshipProjectIds = unique(
      matchingRelationships.flatMap((relationship) => [relationship.from, relationship.to]),
    );
    selectedProjects = relationshipProjectIds
      .map((id) => projectById.get(id))
      .filter(Boolean)
      .sort((left, right) => {
        const leftTopical = ranked.some((item) => item.project.id === left.id) ? 0 : 1;
        const rightTopical = ranked.some((item) => item.project.id === right.id) ? 0 : 1;
        const leftAnchor = referredProjects.some((project) => project.id === left.id) ? 0 : 1;
        const rightAnchor = referredProjects.some((project) => project.id === right.id) ? 0 : 1;
        return (
          leftTopical - rightTopical ||
          leftAnchor - rightAnchor ||
          compareText(normalize(left.name), normalize(right.name))
        );
      });
  }

  const shouldReturnRelationships =
    relationshipQuery ||
    requestedEvidenceStates.length > 0 ||
    requirement === EVIDENCE_REQUIREMENTS.ACTIVE_ONCHAIN;
  let relevantRelationships = shouldReturnRelationships ? matchingRelationships.filter((relationship) => {
    const selectedIds = new Set(selectedProjects.map((project) => project.id));
    if (intent === NAVIGATOR_INTENTS.TRACE_RELATIONSHIP) {
      return selectedIds.has(relationship.from) && selectedIds.has(relationship.to);
    }
    return selectedIds.has(relationship.from) || selectedIds.has(relationship.to);
  }) : [];

  const genericVerification =
    requirement === EVIDENCE_REQUIREMENTS.VERIFIED && referredProjects.length === 0;
  if (genericVerification) {
    selectedProjects = [];
    relevantRelationships = [];
  }

  const evidenceCandidates = [
    ...selectedProjects.flatMap((project) => {
      const exactRecords = exactEvidenceForProject(project.id, requestedEvidenceFilters.length > 0);
      return exactRecords.length
        ? exactRecords.map((evidence) => ({ evidence, relationship: null }))
        : [{ evidence: project.evidence, relationship: null }];
    }),
    ...relevantRelationships.flatMap((relationship) => {
      const exactRecords = exactEvidenceForRelationship(relationship);
      return exactRecords.length
        ? exactRecords.map((evidence) => ({ evidence, relationship }))
        : [{ evidence: relationship, relationship }];
    }),
  ];
  const evidenceSatisfied =
    !requirement ||
    evidenceCandidates.some(({ evidence, relationship }) =>
      meetsEvidenceRequirement(evidence, requirement, relationship),
    );

  let outcome = NAVIGATOR_OUTCOMES.RESULTS;
  if (genericVerification) {
    outcome = NAVIGATOR_OUTCOMES.INSUFFICIENT_EVIDENCE;
  } else if (
    (relationshipQuery || requestedEvidenceStates.length > 0) &&
    relevantRelationships.length === 0 &&
    requirement !== EVIDENCE_REQUIREMENTS.ACTIVE_ONCHAIN
  ) {
    outcome = NAVIGATOR_OUTCOMES.NO_RESULT;
    selectedProjects = [];
  } else if (requirement && !evidenceSatisfied && selectedProjects.length) {
    outcome = NAVIGATOR_OUTCOMES.INSUFFICIENT_EVIDENCE;
  } else if (!selectedProjects.length && !relevantRelationships.length) {
    outcome = NAVIGATOR_OUTCOMES.NO_RESULT;
  }

  const evidenceReferences = [
    ...selectedProjects.map((project) =>
      makeEvidenceReference(
        'project',
        project.id,
        project.state,
        project.evidence,
        exactEvidenceForProject(project.id, requestedEvidenceFilters.length > 0),
      ),
    ),
    ...relevantRelationships.map((relationship) =>
      makeEvidenceReference(
        'relationship',
        relationship.id,
        relationship.claimStatus || relationship.evidenceState,
        relationship,
        exactEvidenceForRelationship(relationship),
        relationship.evidenceIds || [],
        suppliedEvidenceRecords.length > 0,
      ),
    ),
  ];
  const relationshipContexts = relevantRelationships.map((relationship) => ({
    id: relationship.id,
    from: relationship.from,
    to: relationship.to,
    type: relationship.type,
    evidenceState: relationship.evidenceState,
    scope: relationship.scope || null,
    evidenceReferenceId: `relationship:${relationship.id}`,
    evidenceIds: [...(relationship.evidenceIds || [])],
    claimStatus: relationship.claimStatus || null,
    supportsTimeBoundClaim: exactEvidenceForRelationship(relationship).some(
      (record) => evidenceAvailability(record).supportsTimeBoundClaim,
    ) || (!relationship.evidenceIds?.length && evidenceAvailability(relationship).supportsTimeBoundClaim),
    dataMode: relationship.dataMode || null,
  }));
  const selectedIds = new Set(selectedProjects.map((project) => project.id));
  const selectedMatches = ranked
    .filter((item) => selectedIds.has(item.project.id))
    .map((item) => ({
      projectId: item.project.id,
      score: item.score,
      matchedFields: unique(item.matchedFields).sort(compareText),
      matchedTerms: unique(item.matchedTerms).sort(compareText),
    }));
  const uncertaintyCodes = [];
  const uncertaintyNotes = [];
  const resultModes = unique(evidenceReferences.map((reference) => reference.dataMode).filter(Boolean));
  const returnedExactEvidenceIds = unique(
    evidenceReferences.flatMap((reference) => reference.records.map((record) => record.id).filter(Boolean)),
  ).sort(compareText);

  if (resultModes.includes('demo')) {
    uncertaintyCodes.push('demo-data');
    uncertaintyNotes.push('Demo records are illustrative and do not establish factual ecosystem claims.');
  }
  if (
    evidenceReferences.some(
      (reference) => reference.availability === 'unavailable' || reference.quality?.unavailable,
    )
  ) {
    uncertaintyCodes.push('evidence-unavailable');
    uncertaintyNotes.push('At least one relevant record has no available source or timestamp.');
  }
  if (evidenceReferences.some((reference) => reference.quality?.stale)) {
    uncertaintyCodes.push('evidence-stale');
    uncertaintyNotes.push('At least one relevant source is explicitly stale for part of its scope.');
  }
  if (evidenceReferences.some((reference) => reference.quality?.conflict)) {
    uncertaintyCodes.push('evidence-conflicting');
    uncertaintyNotes.push('At least one relevant evidence set contains an explicit source conflict.');
  }
  if (evidenceReferences.some((reference) => reference.quality?.incomplete)) {
    uncertaintyCodes.push('evidence-incomplete');
    uncertaintyNotes.push('At least one relevant evidence set is explicitly incomplete.');
  }
  if (outcome === NAVIGATOR_OUTCOMES.NO_RESULT) {
    uncertaintyCodes.push('no-match');
    uncertaintyNotes.push('The local curated dataset contains no matching record.');
  }
  if (outcome === NAVIGATOR_OUTCOMES.INSUFFICIENT_EVIDENCE) {
    uncertaintyCodes.push('requirement-unsatisfied');
    uncertaintyNotes.push(`The result cannot establish ${requirementLabel(requirement)}.`);
  }

  const uncertaintyLevel =
    uncertaintyCodes.includes('demo-data') ||
    outcome === NAVIGATOR_OUTCOMES.INSUFFICIENT_EVIDENCE ||
    outcome === NAVIGATOR_OUTCOMES.NO_RESULT
      ? 'high'
      : uncertaintyCodes.length
        ? 'medium'
        : 'low';
  const mapAction =
    outcome === NAVIGATOR_OUTCOMES.NO_RESULT ||
    (!selectedProjects.length && !relevantRelationships.length)
    ? emptyMapAction()
    : makeMapAction({
        intent:
          intent === NAVIGATOR_INTENTS.TRACE_RELATIONSHIP && !relevantRelationships.length
            ? NAVIGATOR_INTENTS.DISCOVER
            : intent,
        projects: selectedProjects,
        relationships: relevantRelationships,
        categories: requestedCategories,
      });
  const answer = answerTemplate({
    outcome,
    intent,
    query: rawQuery,
    selectedProjects,
    relationships: relevantRelationships,
    evidenceRequirement: requirement,
    queryClasses,
    mode,
    resultModes,
    requestedEvidenceFilters,
    coverage,
    matchedEvidenceRecordCount: returnedExactEvidenceIds.length,
  });

  return {
    query: rawQuery,
    normalizedQuery: queryText,
    intent,
    queryClasses,
    outcome,
    answer,
    selectedProjectIds: selectedProjects.map((project) => project.id),
    primaryProjectId: selectedProjects[0]?.id || null,
    matches: selectedMatches,
    evidenceReferences,
    relationshipContexts,
    uncertainty: {
      level: uncertaintyLevel,
      codes: uncertaintyCodes,
      notes: uncertaintyNotes,
    },
    mapAction,
    diagnostics: {
      datasetMode: mode,
      searchedFields: ['id', 'name', 'district', 'type', 'tag', 'description', 'project state', 'relationship type', 'relationship evidence state', 'evidence availability', 'timestamp'],
      evidenceRequirement: requirement,
      requestedCategories,
      requestedProjectStates,
      requestedRelationshipTypes,
      requestedEvidenceStates,
      requestedEvidenceFilters,
      matchedEvidenceIds: returnedExactEvidenceIds,
      capabilityTerms,
      contextProjectIds: contextProjects.map((project) => project.id),
      unsupportedReasons: [],
      ambiguousStateTerms,
    },
  };
}

function check(condition, message) {
  if (!condition) throw new Error(`Navigator contract check failed: ${message}`);
}

/**
 * Focused Phase 3 checks for consumers that own the project fixture. This is
 * exported instead of running at module load because `projects` remains owned
 * by the UI module. It is deterministic and performs no network or file I/O.
 */
export function runNavigatorDeterministicChecks({
  projects,
  relationships,
  evidenceRecords,
  demoRelationships = [],
}) {
  check(Array.isArray(projects) && projects.length >= 6, 'project fixture is missing');
  check(Array.isArray(relationships), 'hybrid relationships are missing');
  check(Array.isArray(evidenceRecords), 'evidence records are missing');
  check(evidenceRecords.length === 22, 'expected 22 evidence records');
  check(
    new Set(evidenceRecords.map((record) => record.projectId)).size === 6,
    'expected exactly six source-backed project IDs',
  );
  check(
    !evidenceRecords.some((record) => record.status === 'Attested'),
    'the sourced slice must not synthesize Attested evidence',
  );
  check(
    !evidenceRecords.some(
      (record) => record.status === 'AI-inferred' && record.supportsFactualClaims,
    ),
    'AI-inferred evidence must not support factual claims',
  );

  const evidenceIds = new Set(evidenceRecords.map((record) => record.id));
  const sourcedRelationships = relationships.filter(
    (relationship) => relationship.dataMode === 'sourced-limited',
  );
  check(sourcedRelationships.length === 6, 'expected six active sourced relationships');
  check(new Set(relationships.map((relationship) => relationship.id)).size === relationships.length, 'active relationship IDs must be unique');
  sourcedRelationships.forEach((relationship) => {
    check(relationship.evidenceIds?.length > 0, `${relationship.id} lacks evidence IDs`);
    check(
      relationship.evidenceIds.every((id) => evidenceIds.has(id)),
      `${relationship.id} has an unresolved evidence ID`,
    );
  });
  if (demoRelationships.length) {
    check(demoRelationships.length === 15, 'expected 15 explicit Demo fallback relationships');
    check(relationships.length === 17, 'expected 17 active hybrid relationships');
    check(
      demoRelationships.every((relationship) => relationship.dataMode === 'demo'),
      'Demo fallback relationships must remain illustrative',
    );
  }

  const sourceResult = retrieveNavigator({
    query: 'What sources support Kuru?',
    projects,
    relationships,
    evidenceRecords,
  });
  const kuruReference = sourceResult.evidenceReferences.find(
    (reference) => reference.subjectKind === 'project' && reference.subjectId === 'kuru',
  );
  check(sourceResult.outcome === NAVIGATOR_OUTCOMES.RESULTS, 'source-backed project query failed');
  check(kuruReference?.evidenceIds.length > 0 && kuruReference.availability !== 'unavailable', 'Kuru sources were not returned');

  const phaseTwoCompatibleResult = retrieveNavigator({
    query: 'Explain Talus',
    projects,
    relationships,
  });
  check(
    phaseTwoCompatibleResult.outcome === NAVIGATOR_OUTCOMES.RESULTS &&
      phaseTwoCompatibleResult.evidenceReferences[0]?.id === 'project:talus' &&
      Array.isArray(phaseTwoCompatibleResult.evidenceReferences[0]?.records),
    'the evidenceRecords-omitted call contract regressed',
  );

  const relationshipResult = retrieveNavigator({
    query: 'Explain the Magma Switchboard declared integration sources',
    projects,
    relationships,
    evidenceRecords,
  });
  const relationshipContext = relationshipResult.relationshipContexts.find(
    (relationship) => relationship.id === 'magma-switchboard',
  );
  check(
    relationshipResult.outcome === NAVIGATOR_OUTCOMES.RESULTS &&
      relationshipContext?.evidenceIds.includes('E-MAGMA-SWITCHBOARD-001'),
    'source-backed relationship evidence was not returned',
  );

  const mixedResult = retrieveNavigator({
    query: 'Show sources',
    projects,
    relationships,
    evidenceRecords,
  });
  const mixedModes = new Set(mixedResult.evidenceReferences.map((reference) => reference.dataMode));
  check(mixedModes.has('demo') && mixedModes.has('sourced-limited'), 'mixed sourced and Demo behavior was not disclosed');
  check(/mix/i.test(mixedResult.answer.text), 'mixed answer lacks an explicit disclosure');

  const pythResult = retrieveNavigator({
    query: 'Show evidence for Pyth',
    projects,
    relationships,
    evidenceRecords,
  });
  ['evidence-stale', 'evidence-conflicting', 'evidence-incomplete'].forEach((code) =>
    check(pythResult.uncertainty.codes.includes(code), `Pyth evidence did not propagate ${code}`),
  );

  const staleOrIncompleteResult = retrieveNavigator({
    query: 'What evidence is stale or incomplete?',
    projects,
    relationships,
    evidenceRecords,
  });
  const expectedStaleOrIncompleteIds = evidenceRecords
    .filter((record) => record.quality.stale || record.quality.incomplete)
    .map((record) => record.id)
    .sort(compareText);
  check(
    staleOrIncompleteResult.outcome === NAVIGATOR_OUTCOMES.RESULTS &&
      JSON.stringify(staleOrIncompleteResult.diagnostics.matchedEvidenceIds) ===
        JSON.stringify(expectedStaleOrIncompleteIds),
    'stale-or-incomplete query did not return the exact matching records',
  );
  check(
    staleOrIncompleteResult.evidenceReferences.every((reference) =>
      reference.records.every((record) => record.quality.stale || record.quality.incomplete),
    ),
    'stale-or-incomplete references included unmatched project context',
  );

  const noPublishedDateResult = retrieveNavigator({
    query: 'Show records with no published date',
    projects,
    relationships,
    evidenceRecords,
  });
  const expectedNoPublishedDateIds = evidenceRecords
    .filter((record) => record.publishedAt === null)
    .map((record) => record.id)
    .sort(compareText);
  check(
    noPublishedDateResult.outcome === NAVIGATOR_OUTCOMES.RESULTS &&
      JSON.stringify(noPublishedDateResult.diagnostics.matchedEvidenceIds) ===
        JSON.stringify(expectedNoPublishedDateIds) &&
      noPublishedDateResult.evidenceReferences.every((reference) =>
        reference.records.every((record) => record.publishedAt === null),
      ),
    'no-published-date query did not return only null publishedAt records',
  );

  const conflictOnlyResult = retrieveNavigator({
    query: 'Show conflicting evidence',
    projects,
    relationships,
    evidenceRecords,
  });
  check(
    conflictOnlyResult.outcome === NAVIGATOR_OUTCOMES.RESULTS &&
      conflictOnlyResult.evidenceReferences.every((reference) =>
        reference.records.every((record) => record.quality.conflict),
      ),
    'conflict-only query included a non-conflicting record',
  );

  const unavailableRecords = evidenceRecords.map((record) =>
    record.id === 'E-KURU-CAP-001'
      ? {
          ...record,
          source: { ...record.source, available: false },
          quality: { ...record.quality, unavailable: true },
        }
      : record,
  );
  const unavailableResult = retrieveNavigator({
    query: 'Show Kuru sources',
    projects,
    relationships,
    evidenceRecords: unavailableRecords,
  });
  check(
    unavailableResult.uncertainty.codes.includes('evidence-unavailable'),
    'source failure did not degrade to explicit uncertainty',
  );
  const partialKuruReference = unavailableResult.evidenceReferences.find(
    (reference) => reference.subjectId === 'kuru',
  );
  check(
    partialKuruReference?.availability === 'partial' &&
      Boolean(partialKuruReference.source?.url) &&
      partialKuruReference.quality.unavailable,
    'partial availability did not select a truthful available preview source',
  );

  const unavailableOnlyResult = retrieveNavigator({
    query: 'Show unavailable evidence',
    projects,
    relationships,
    evidenceRecords: unavailableRecords,
  });
  check(
    unavailableOnlyResult.outcome === NAVIGATOR_OUTCOMES.RESULTS &&
      unavailableOnlyResult.diagnostics.matchedEvidenceIds.length === 1 &&
      unavailableOnlyResult.diagnostics.matchedEvidenceIds[0] === 'E-KURU-CAP-001' &&
      unavailableOnlyResult.evidenceReferences[0]?.availability === 'unavailable' &&
      unavailableOnlyResult.uncertainty.codes.includes('evidence-unavailable'),
    'unavailable-only query did not return the exact unavailable record',
  );

  const unsupportedResult = retrieveNavigator({
    query: 'Is Kuru safe?',
    projects,
    relationships,
    evidenceRecords,
  });
  check(
    unsupportedResult.outcome === NAVIGATOR_OUTCOMES.UNSUPPORTED_REQUEST &&
      unsupportedResult.mapAction.type === NAVIGATOR_MAP_ACTIONS.PRESERVE_VIEW,
    'unsupported request behavior regressed',
  );

  const noResult = retrieveNavigator({
    query: 'Find quantum bridge projects',
    projects,
    relationships,
    evidenceRecords,
  });
  check(
    noResult.outcome === NAVIGATOR_OUTCOMES.NO_RESULT &&
      noResult.mapAction.type === NAVIGATOR_MAP_ACTIONS.PRESERVE_VIEW,
    'no-result preserve-view behavior regressed',
  );

  ['Find DeFi projects with active contracts', 'Show the current Pyth contract'].forEach((query) => {
    const result = retrieveNavigator({ query, projects, relationships, evidenceRecords });
    check(
      result.outcome === NAVIGATOR_OUTCOMES.INSUFFICIENT_EVIDENCE,
      `${query} must remain insufficient without exact bounded criteria`,
    );
  });

  return {
    evidenceRecordCount: evidenceRecords.length,
    sourcedProjectCount: new Set(evidenceRecords.map((record) => record.projectId)).size,
    demoRelationshipCount: demoRelationships.length || null,
    sourcedRelationshipCount: sourcedRelationships.length,
    activeRelationshipCount: relationships.length,
    staleOrIncompleteMatchCount: expectedStaleOrIncompleteIds.length,
    noPublishedDateMatchCount: expectedNoPublishedDateIds.length,
    conflictMatchCount: conflictOnlyResult.diagnostics.matchedEvidenceIds.length,
    unavailableMatchCount: unavailableOnlyResult.diagnostics.matchedEvidenceIds.length,
  };
}
