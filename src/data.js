import {
  EVIDENCE_DATA_MODE,
  evidenceRecords,
  relationshipProposals,
} from './evidence.js';

export const DATA_MODE = 'hybrid';
export const DEMO_DATA_MODE = 'demo';

/**
 * @typedef {'onchain_interaction'|'declared_integration'|'owner_claimed'|'third_party_attestation'|'semantic_similarity'|'ecosystem_membership'} RelationshipType
 * @typedef {'onchain-observed'|'owner-claimed'|'third-party-attested'|'AI-inferred'|'illustrative'|'source-observed'|'publisher-claimed'} RelationshipEvidenceState
 * @typedef {{kind: 'placeholder', title: string, url: null, available: false}} EvidenceSource
 * @typedef {{kind: 'illustrative-placeholder', label: string, actor: null}} EvidenceProvenance
 * @typedef {Object} RelationshipRecord
 * @property {string} id
 * @property {string} from
 * @property {string} to
 * @property {RelationshipType} type
 * @property {RelationshipEvidenceState} evidenceState
 * @property {EvidenceSource} source
 * @property {null} timestamp
 * @property {string} scope
 * @property {EvidenceProvenance} provenance
 * @property {'not-assessed'} confidence
 * @property {'demo'} dataMode
 */

export const PROJECT_STATES = {
  Observed: {
    label: 'Observed',
    meaning: 'Would require a public source showing a project signal.',
  },
  Claimed: {
    label: 'Claimed',
    meaning: 'Would require an attributable claim from a project representative.',
  },
  Attested: {
    label: 'Attested',
    meaning: 'Would require a named third-party attestor, source, scope, and timestamp.',
  },
  'AI-inferred': {
    label: 'AI-inferred',
    meaning: 'A model-proposed classification or relationship; never proof.',
  },
};

export const RELATIONSHIP_TYPES = {
  onchain_interaction: {
    label: 'Onchain interaction',
    description: 'Contract or event evidence shows an interaction.',
  },
  declared_integration: {
    label: 'Declared integration',
    description: 'Project documentation explicitly names an integration.',
  },
  owner_claimed: {
    label: 'Owner-claimed relationship',
    description: 'A project representative submitted the relationship.',
  },
  third_party_attestation: {
    label: 'Third-party attestation',
    description: 'A named external attestor confirmed a bounded claim.',
  },
  semantic_similarity: {
    label: 'Semantic similarity',
    description: 'A model or embedding system suggested a relationship.',
  },
  ecosystem_membership: {
    label: 'Ecosystem membership',
    description: 'A project appears in a curated or official directory.',
  },
};

export const RELATIONSHIP_STATES = {
  'onchain-observed': {
    label: 'Onchain observed',
    shortLabel: 'Onchain',
    meaning: 'Would require contract or event evidence with a source and timestamp.',
    color: '#8fa8c6',
    dash: '',
  },
  'owner-claimed': {
    label: 'Owner claimed',
    shortLabel: 'Claimed',
    meaning: 'Would require a signed or otherwise attributable representative claim.',
    color: '#c8a86c',
    dash: '',
  },
  'third-party-attested': {
    label: 'Third-party attested',
    shortLabel: 'Attested',
    meaning: 'Would require a named attestor, source, scope, and timestamp.',
    color: '#8eaf9b',
    dash: '',
  },
  'AI-inferred': {
    label: 'AI-inferred',
    shortLabel: 'Inferred',
    meaning: 'A scripted similarity suggestion in this prototype; not proof.',
    color: '#b394d8',
    dash: '5 7',
  },
  illustrative: {
    label: 'Illustrative only',
    shortLabel: 'Illustrative',
    meaning: 'A city-layout edge that asserts no factual ecosystem relationship.',
    color: '#77717f',
    dash: '2 7',
  },
  'source-observed': {
    label: 'Source observed',
    shortLabel: 'Observed source',
    meaning: 'A named public artifact was inspected; support is limited to its bounded scope.',
    color: '#8fa8c6',
    dash: '',
  },
  'publisher-claimed': {
    label: 'Publisher claimed',
    shortLabel: 'Publisher claim',
    meaning: 'An identifiable publisher made the bounded statement; this is not a wallet claim.',
    color: '#c8a86c',
    dash: '',
  },
};

function unavailableSource(title) {
  return {
    kind: 'placeholder',
    title,
    url: null,
    available: false,
  };
}

function demoProvenance(label) {
  return {
    kind: 'illustrative-placeholder',
    label,
    actor: null,
  };
}

export function createProjectEvidence(state) {
  return {
    source: unavailableSource('No project evidence connected'),
    timestamp: null,
    scope: `Illustrative ${state} project-state example; no supporting evidence is connected.`,
    provenance: demoProvenance('Demo project profile'),
    confidence: 'not-assessed',
    dataMode: DEMO_DATA_MODE,
  };
}

const statePlaceholders = {
  'onchain-observed': {
    sourceTitle: 'No contract or event source connected',
    scope:
      'Demonstrates how an onchain-observed edge would appear; no contract, address, event, or source is connected.',
    provenance: 'Demo onchain-evidence pattern',
  },
  'owner-claimed': {
    sourceTitle: 'No signed owner claim connected',
    scope:
      'Demonstrates how a representative-submitted edge would appear; no wallet signature or attributable claim is connected.',
    provenance: 'Demo owner-claim pattern',
  },
  'third-party-attested': {
    sourceTitle: 'No attestation source connected',
    scope:
      'Demonstrates how a named third-party attestation would appear; no attestor, attestation, or timestamp is connected.',
    provenance: 'Demo attestation pattern',
  },
  'AI-inferred': {
    sourceTitle: 'No model or inference source connected',
    scope:
      'A scripted similarity suggestion derived only from this illustrative prototype graph; no model output or evidence source is connected.',
    provenance: 'Scripted Demo inference',
  },
  illustrative: {
    sourceTitle: 'No source connected',
    scope: 'City-layout connection only; no factual ecosystem relationship is asserted.',
    provenance: 'Illustrative city layout',
  },
};

/**
 * @param {{id: string, from: string, to: string, type: RelationshipType, evidenceState: RelationshipEvidenceState}} input
 * @returns {RelationshipRecord}
 */
function relationship({ id, from, to, type, evidenceState }) {
  const placeholder = statePlaceholders[evidenceState];
  return {
    id,
    from,
    to,
    type,
    evidenceState,
    evidenceIds: [`demo:relationship:${id}:unavailable`],
    source: unavailableSource(placeholder.sourceTitle),
    timestamp: null,
    scope: placeholder.scope,
    provenance: demoProvenance(placeholder.provenance),
    confidence: 'not-assessed',
    dataMode: DEMO_DATA_MODE,
  };
}

/** @type {RelationshipRecord[]} */
export const demoRelationships = Object.freeze([
  relationship({
    id: 'monad-kuru',
    from: 'monad',
    to: 'kuru',
    type: 'onchain_interaction',
    evidenceState: 'onchain-observed',
  }),
  relationship({
    id: 'monad-apriori',
    from: 'monad',
    to: 'aPriori',
    type: 'owner_claimed',
    evidenceState: 'owner-claimed',
  }),
  relationship({
    id: 'monad-magma',
    from: 'monad',
    to: 'magma',
    type: 'ecosystem_membership',
    evidenceState: 'illustrative',
  }),
  relationship({
    id: 'monad-nadfun',
    from: 'monad',
    to: 'nadfun',
    type: 'ecosystem_membership',
    evidenceState: 'illustrative',
  }),
  relationship({
    id: 'monad-switchboard',
    from: 'monad',
    to: 'switchboard',
    type: 'third_party_attestation',
    evidenceState: 'third-party-attested',
  }),
  relationship({
    id: 'kuru-apriori',
    from: 'kuru',
    to: 'aPriori',
    type: 'declared_integration',
    evidenceState: 'illustrative',
  }),
  relationship({
    id: 'kuru-pyth',
    from: 'kuru',
    to: 'pyth',
    type: 'onchain_interaction',
    evidenceState: 'onchain-observed',
  }),
  relationship({
    id: 'apriori-magma',
    from: 'aPriori',
    to: 'magma',
    type: 'owner_claimed',
    evidenceState: 'owner-claimed',
  }),
  relationship({
    id: 'switchboard-pyth',
    from: 'switchboard',
    to: 'pyth',
    type: 'third_party_attestation',
    evidenceState: 'third-party-attested',
  }),
  relationship({
    id: 'switchboard-pixel-forge',
    from: 'switchboard',
    to: 'pixel-forge',
    type: 'onchain_interaction',
    evidenceState: 'onchain-observed',
  }),
  relationship({
    id: 'talus-monad',
    from: 'talus',
    to: 'monad',
    type: 'semantic_similarity',
    evidenceState: 'AI-inferred',
  }),
  relationship({
    id: 'talus-switchboard',
    from: 'talus',
    to: 'switchboard',
    type: 'semantic_similarity',
    evidenceState: 'AI-inferred',
  }),
  relationship({
    id: 'nadfun-pixel-forge',
    from: 'nadfun',
    to: 'pixel-forge',
    type: 'owner_claimed',
    evidenceState: 'owner-claimed',
  }),
  relationship({
    id: 'moca-monad',
    from: 'moca',
    to: 'monad',
    type: 'ecosystem_membership',
    evidenceState: 'illustrative',
  }),
  relationship({
    id: 'moca-talus',
    from: 'moca',
    to: 'talus',
    type: 'semantic_similarity',
    evidenceState: 'AI-inferred',
  }),
]);

const evidenceById = new Map(evidenceRecords.map((record) => [record.id, record]));

function sourcedEvidenceState(status) {
  return status === 'Claimed' ? 'publisher-claimed' : 'source-observed';
}

function sourcedRelationship(proposal) {
  const records = proposal.evidenceIds.map((id) => evidenceById.get(id));
  const primary = records[0];
  const timestamp = primary.publishedAt || primary.retrievedAt;

  return {
    id: proposal.id,
    from: proposal.from,
    to: proposal.to,
    type: proposal.type,
    claimStatus: proposal.status,
    evidenceState: sourcedEvidenceState(proposal.status),
    evidenceIds: [...proposal.evidenceIds],
    reviewStatus: proposal.reviewStatus,
    reviewedAt: proposal.reviewedAt,
    revision: { ...proposal.revision },
    scope: proposal.scope,
    limitations: [...proposal.limitations],
    dataMode: proposal.dataMode,
    // Phase 1 compatibility preview. evidenceIds is authoritative and must be
    // used by any evidence-aware renderer so secondary sources are not lost.
    source: { ...primary.source },
    timestamp,
    timestampKind: primary.publishedAt ? 'published-at' : 'retrieved-at',
    provenance: {
      kind: 'evidence-record-set',
      label: `${records.length} source-backed evidence record${records.length === 1 ? '' : 's'}`,
      actor: primary.source.publisher,
    },
    confidence: 'not-assessed',
    compatibilityEvidencePreview: {
      primaryEvidenceId: primary.id,
      omittedEvidenceIds: proposal.evidenceIds.slice(1),
    },
  };
}

export const sourcedRelationships = Object.freeze(
  relationshipProposals.map(sourcedRelationship),
);

const demoRelationshipIds = new Set(demoRelationships.map((relationshipRecord) => relationshipRecord.id));
const sourcedRelationshipByDemoReplacementId = new Map(
  sourcedRelationships.flatMap((relationshipRecord) => {
    const replacementId = demoRelationshipIds.has(relationshipRecord.id)
      ? relationshipRecord.id
      : relationshipRecord.revision?.supersedesRelationshipId;
    return demoRelationshipIds.has(replacementId)
      ? [[replacementId, relationshipRecord]]
      : [];
  }),
);
const sourcedRelationshipsReplacingDemo = new Set(
  sourcedRelationshipByDemoReplacementId.values(),
);

export const relationships = Object.freeze([
  ...demoRelationships.map(
    (relationshipRecord) =>
      sourcedRelationshipByDemoReplacementId.get(relationshipRecord.id) || relationshipRecord,
  ),
  ...sourcedRelationships
    .filter((relationshipRecord) => !sourcedRelationshipsReplacingDemo.has(relationshipRecord))
    .sort((left, right) => left.id.localeCompare(right.id)),
]);

const requiredEvidenceFields = [
  'source',
  'timestamp',
  'scope',
  'provenance',
  'confidence',
  'dataMode',
];

export function validateDataContract(projects) {
  const projectIds = new Set(projects.map((project) => project.id));
  const relationshipIds = new Set();

  projects.forEach((project) => {
    const missing = requiredEvidenceFields.filter(
      (field) => !Object.prototype.hasOwnProperty.call(project.evidence, field),
    );
    if (missing.length) {
      throw new Error(`Project ${project.id} is missing evidence fields: ${missing.join(', ')}`);
    }
  });

  const validateRelationshipShape = (item) => {
    const missing = [
      'id',
      'from',
      'to',
      'type',
      'evidenceState',
      'evidenceIds',
      ...requiredEvidenceFields,
    ].filter((field) => !Object.prototype.hasOwnProperty.call(item, field));

    if (missing.length) {
      throw new Error(`Relationship ${item.id || '(unknown)'} is missing fields: ${missing.join(', ')}`);
    }
    if (relationshipIds.has(item.id)) {
      throw new Error(`Duplicate relationship id: ${item.id}`);
    }
    if (!projectIds.has(item.from) || !projectIds.has(item.to)) {
      throw new Error(`Relationship ${item.id} references an unknown project`);
    }
    if (!RELATIONSHIP_TYPES[item.type]) {
      throw new Error(`Relationship ${item.id} has an unknown type: ${item.type}`);
    }
    if (!RELATIONSHIP_STATES[item.evidenceState]) {
      throw new Error(`Relationship ${item.id} has an unknown evidence state: ${item.evidenceState}`);
    }
    relationshipIds.add(item.id);
  };

  demoRelationships.forEach((item) => {
    if (item.dataMode !== DEMO_DATA_MODE) {
      throw new Error(`Demo relationship ${item.id} must remain in Demo mode`);
    }
    if (item.source.available || item.source.url !== null || item.timestamp !== null) {
      throw new Error(`Demo relationship ${item.id} must use an unavailable evidence placeholder`);
    }
    if (
      item.evidenceIds.length !== 1 ||
      item.evidenceIds[0] !== `demo:relationship:${item.id}:unavailable`
    ) {
      throw new Error(`Demo relationship ${item.id} must retain its explicit unavailable evidence reference`);
    }
  });

  relationships.forEach((item) => {
    validateRelationshipShape(item);
    if (item.dataMode === DEMO_DATA_MODE) {
      if (item.source.available || item.source.url !== null || item.timestamp !== null) {
        throw new Error(`Demo relationship ${item.id} must use an unavailable evidence placeholder`);
      }
      return;
    }
    if (item.dataMode !== EVIDENCE_DATA_MODE) {
      throw new Error(`Relationship ${item.id} has an unknown data mode`);
    }
    if (!['Observed', 'Claimed'].includes(item.claimStatus)) {
      throw new Error(`Sourced relationship ${item.id} has an unsupported claim status`);
    }
    if (!Array.isArray(item.evidenceIds) || !item.evidenceIds.length) {
      throw new Error(`Sourced relationship ${item.id} has no evidence IDs`);
    }
    if (item.reviewStatus !== 'approved' || !item.reviewedAt) {
      throw new Error(`Sourced relationship ${item.id} is not review-approved`);
    }
    item.evidenceIds.forEach((id) => {
      if (!evidenceById.has(id) || evidenceById.get(id).reviewStatus !== 'approved') {
        throw new Error(`Sourced relationship ${item.id} references unknown evidence ${id}`);
      }
    });
    if (item.type === 'ecosystem_membership' && item.evidenceState !== 'source-observed') {
      throw new Error(`Membership relationship ${item.id} must not be presented as an onchain, owner, or attestation pattern`);
    }
  });

  if (demoRelationships.length !== 15) {
    throw new Error('The explicit Demo fallback must contain exactly 15 relationships');
  }
  const expectedSourced = relationshipProposals.length;
  const expectedHybrid = demoRelationships.length - sourcedRelationshipsReplacingDemo.size + expectedSourced;
  if (sourcedRelationships.length !== expectedSourced || relationships.length !== expectedHybrid) {
    throw new Error('The hybrid graph must preserve every approved sourced relationship and its Demo fallback join');
  }
  if (relationshipIds.size !== relationships.length) {
    throw new Error('The active hybrid graph contains duplicate relationship IDs');
  }

  return true;
}
