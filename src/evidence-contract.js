export const REVIEW_STATUSES = Object.freeze([
  'proposed',
  'needs-review',
  'approved',
  'rejected',
  'stale',
]);

export const EVIDENCE_SNAPSHOT_SCHEMA_VERSION = 1;

const REVIEW_ONLY_FIELDS = new Set(['reviewStatus', 'reviewedAt']);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function isIsoTimestamp(value) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableValue(value[key])]),
  );
}

function reviewIndependentRecord(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([key]) => !REVIEW_ONLY_FIELDS.has(key)),
  );
}

export function evidenceFingerprint(record) {
  return JSON.stringify(stableValue(reviewIndependentRecord(record)));
}

export function assertNoSilentOverwrite(previousRecords, nextRecords) {
  const previousById = new Map(previousRecords.map((record) => [record.id, record]));
  nextRecords.forEach((record) => {
    const previous = previousById.get(record.id);
    if (!previous) return;
    assert(
      evidenceFingerprint(previous) === evidenceFingerprint(record),
      `Evidence ${record.id} changed without a new immutable evidence ID and revision lineage`,
    );
  });
  return true;
}

export function validateReviewMetadata(record) {
  assert(
    REVIEW_STATUSES.includes(record.reviewStatus),
    `Evidence ${record.id || '(unknown)'} has invalid reviewStatus`,
  );
  assert(
    record.reviewedAt === null || isIsoTimestamp(record.reviewedAt),
    `Evidence ${record.id || '(unknown)'} has invalid reviewedAt`,
  );
  if (['approved', 'rejected', 'stale'].includes(record.reviewStatus)) {
    assert(record.reviewedAt !== null, `Evidence ${record.id} requires reviewedAt`);
  }
  if (record.reviewStatus === 'proposed' || record.reviewStatus === 'needs-review') {
    assert(record.reviewedAt === null, `Unreviewed evidence ${record.id} must have reviewedAt: null`);
  }
  assert(
    Number.isInteger(record.revision?.sequence) && record.revision.sequence > 0,
    `Evidence ${record.id || '(unknown)'} requires a positive revision.sequence`,
  );
  assert(
    record.revision.supersedesEvidenceId === null ||
      (typeof record.revision.supersedesEvidenceId === 'string' &&
        record.revision.supersedesEvidenceId.length > 0),
    `Evidence ${record.id || '(unknown)'} has invalid revision.supersedesEvidenceId`,
  );
  if (record.revision.sequence === 1) {
    assert(
      record.revision.supersedesEvidenceId === null,
      `Initial evidence ${record.id} cannot supersede another record`,
    );
  } else {
    assert(
      record.revision.supersedesEvidenceId !== null,
      `Evidence ${record.id} revision ${record.revision.sequence} requires a predecessor`,
    );
  }
  return true;
}

export function validateEvidenceCandidateCore(record) {
  const requiredFields = [
    'id',
    'projectId',
    'claim',
    'evidenceType',
    'source',
    'retrievedAt',
    'publishedAt',
    'network',
    'scope',
    'provenance',
    'quality',
    'limitations',
    'reviewStatus',
    'reviewedAt',
    'revision',
  ];
  const missing = requiredFields.filter(
    (field) => !Object.prototype.hasOwnProperty.call(record, field),
  );
  assert(!missing.length, `Evidence ${record.id || '(unknown)'} missing: ${missing.join(', ')}`);
  assert(typeof record.id === 'string' && record.id.length > 0, 'Evidence ID is required');
  assert(typeof record.projectId === 'string' && record.projectId.length > 0, `Evidence ${record.id} lacks projectId`);
  assert(typeof record.claim === 'string' && record.claim.length > 0, `Evidence ${record.id} lacks claim`);
  assert(isIsoTimestamp(record.retrievedAt), `Evidence ${record.id} has invalid retrievedAt`);
  assert(
    record.publishedAt === null || isIsoTimestamp(record.publishedAt),
    `Evidence ${record.id} has invalid publishedAt; absent dates must be null`,
  );
  if (record.reviewedAt !== null) {
    assert(
      Date.parse(record.reviewedAt) >= Date.parse(record.retrievedAt),
      `Evidence ${record.id} cannot be reviewed before retrieval`,
    );
  }
  let parsedSource;
  try {
    parsedSource = new URL(record.source?.url);
  } catch {
    parsedSource = null;
  }
  assert(parsedSource?.protocol === 'https:', `Evidence ${record.id} lacks a direct HTTPS source`);
  assert(
    typeof record.source?.publisher === 'string' && record.source.publisher.length > 0,
    `Evidence ${record.id} lacks publisher`,
  );
  assert(
    typeof record.scope === 'string' && record.scope.length > 0,
    `Evidence ${record.id} lacks scope`,
  );
  assert(
    typeof record.provenance?.kind === 'string' &&
      typeof record.provenance?.notes === 'string' &&
      record.provenance.notes.length > 0,
    `Evidence ${record.id} lacks provenance`,
  );
  assert(
    Array.isArray(record.limitations) && record.limitations.length > 0,
    `Evidence ${record.id} lacks limitations`,
  );
  ['conflict', 'incomplete', 'stale', 'unavailable', 'timeBoundEligible'].forEach((flag) =>
    assert(typeof record.quality?.[flag] === 'boolean', `Evidence ${record.id} lacks quality.${flag}`),
  );
  assert(
    !record.quality.conflict || (Array.isArray(record.conflicts) && record.conflicts.length > 0),
    `Evidence ${record.id} flags conflict without conflict details`,
  );
  validateReviewMetadata(record);
  return true;
}

export function validateRevisionLineage(records, previousRecords = []) {
  const allById = new Map();
  [...previousRecords, ...records].forEach((record) => {
    const existing = allById.get(record.id);
    if (existing) {
      assert(
        evidenceFingerprint(existing) === evidenceFingerprint(record),
        `Duplicate evidence ID ${record.id} has conflicting immutable content`,
      );
    }
    allById.set(record.id, record);
  });

  records.forEach((record) => {
    const predecessorId = record.revision?.supersedesEvidenceId;
    if (!predecessorId) return;
    const predecessor = allById.get(predecessorId);
    assert(predecessor, `Evidence ${record.id} supersedes unknown evidence ${predecessorId}`);
    assert(predecessor.id !== record.id, `Evidence ${record.id} cannot supersede itself`);
    assert(
      predecessor.projectId === record.projectId,
      `Evidence ${record.id} cannot supersede a record for another project`,
    );
    assert(
      predecessor.revision.sequence + 1 === record.revision.sequence,
      `Evidence ${record.id} revision sequence must follow ${predecessorId}`,
    );
  });
  return true;
}

export function projectApprovedEvidence(records) {
  return Object.freeze(records.filter((record) => record.reviewStatus === 'approved'));
}

export function buildApprovedEvidenceSnapshot({
  version,
  createdAt,
  reviewedAt,
  candidateRecords,
  previousCandidateRecords = [],
}) {
  assert(typeof version === 'string' && version.length > 0, 'Snapshot version is required');
  assert(isIsoTimestamp(createdAt), 'Snapshot createdAt must be an ISO timestamp');
  assert(isIsoTimestamp(reviewedAt), 'Snapshot reviewedAt must be an ISO timestamp');
  assert(
    Date.parse(reviewedAt) >= Date.parse(createdAt),
    'Snapshot reviewedAt cannot precede createdAt',
  );
  assert(Array.isArray(candidateRecords), 'Snapshot candidateRecords must be an array');
  candidateRecords.forEach(validateEvidenceCandidateCore);
  assertNoSilentOverwrite(previousCandidateRecords, candidateRecords);
  validateRevisionLineage(candidateRecords, previousCandidateRecords);

  return Object.freeze({
    schemaVersion: EVIDENCE_SNAPSHOT_SCHEMA_VERSION,
    version,
    createdAt,
    reviewedAt,
    dataMode: 'sourced-limited',
    records: projectApprovedEvidence(candidateRecords),
  });
}

export function projectApprovedRelationships(candidateRelationships, approvedEvidenceRecords) {
  const approvedEvidenceIds = new Set(approvedEvidenceRecords.map((record) => record.id));
  approvedEvidenceRecords.forEach((record) =>
    assert(record.reviewStatus === 'approved', `Runtime evidence ${record.id} is not approved`),
  );
  candidateRelationships.forEach((relationship) => {
    assert(
      REVIEW_STATUSES.includes(relationship.reviewStatus),
      `Relationship ${relationship.id || '(unknown)'} has invalid reviewStatus`,
    );
    assert(
      relationship.reviewedAt === null || isIsoTimestamp(relationship.reviewedAt),
      `Relationship ${relationship.id || '(unknown)'} has invalid reviewedAt`,
    );
    if (['approved', 'rejected', 'stale'].includes(relationship.reviewStatus)) {
      assert(relationship.reviewedAt !== null, `Relationship ${relationship.id} requires reviewedAt`);
    }
    assert(
      Number.isInteger(relationship.revision?.sequence) && relationship.revision.sequence > 0,
      `Relationship ${relationship.id || '(unknown)'} requires revision metadata`,
    );
    assert(
      Array.isArray(relationship.evidenceIds) && relationship.evidenceIds.length > 0,
      `Relationship ${relationship.id || '(unknown)'} has no evidence references`,
    );
  });
  return Object.freeze(
    candidateRelationships
      .filter((relationship) => relationship.reviewStatus === 'approved')
      .map((relationship) => {
        assert(
          Array.isArray(relationship.evidenceIds) && relationship.evidenceIds.length > 0,
          `Relationship ${relationship.id} has no evidence references`,
        );
        relationship.evidenceIds.forEach((id) =>
          assert(
            approvedEvidenceIds.has(id),
            `Approved relationship ${relationship.id} references unapproved or unknown evidence ${id}`,
          ),
        );
        return relationship;
      }),
  );
}

export function createEvidenceContractFixtures(baseRecord) {
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const withStatus = (status) => {
    const record = clone(baseRecord);
    record.id = `FIXTURE-${status.toUpperCase()}`;
    record.reviewStatus = status;
    record.reviewedAt = ['approved', 'rejected', 'stale'].includes(status)
      ? '2026-09-09T08:00:00Z'
      : null;
    return record;
  };
  const approved = withStatus('approved');
  const missingSourceUrl = clone(approved);
  missingSourceUrl.id = 'FIXTURE-MISSING-SOURCE-URL';
  missingSourceUrl.source.url = null;
  const missingTimestamp = clone(approved);
  missingTimestamp.id = 'FIXTURE-MISSING-TIMESTAMP';
  delete missingTimestamp.retrievedAt;
  const missingProvenance = clone(approved);
  missingProvenance.id = 'FIXTURE-MISSING-PROVENANCE';
  delete missingProvenance.provenance;
  delete missingProvenance.provenanceNotes;
  const conflict = clone(approved);
  conflict.id = 'FIXTURE-CONFLICT';
  conflict.quality.conflict = true;
  conflict.conflicts = [{ kind: 'fixture-conflict', resolution: 'Maintainer review required.' }];
  const silentOverwrite = clone(baseRecord);
  silentOverwrite.claim = `${silentOverwrite.claim} Changed without a new ID.`;

  return Object.freeze({
    statuses: Object.freeze(Object.fromEntries(REVIEW_STATUSES.map((status) => [status, withStatus(status)]))),
    missingSourceUrl,
    missingTimestamp,
    missingProvenance,
    conflict,
    silentOverwrite,
  });
}

// Phase 3.7 governance is deliberately separate from the immutable evidence payload.
// These helpers mirror the local workflow's validation and cadence rules for the static runtime.
export const REVIEW_GOVERNANCE_POLICY_VERSION = 'phase-3.7-review-policy-v1';
export const REVIEW_GOVERNANCE_KIND = 'monad-city-evidence-review-governance';
export const REVIEW_GOVERNANCE_SCHEMA_VERSION = '1';
export const REVIEW_GOVERNANCE_LEGACY_BINDING = Object.freeze({
  version: 'phase-3.5-v2',
  canonicalSha256: '8edfddcce8caadb5861b5e2164f7a1d8755e01f6c369eb1cab8e0ffd996d3e58',
  reviewedAt: '2026-09-22T22:02:32Z',
});

const REVIEW_GOVERNANCE_LEGACY_METADATA = Object.freeze({
  reviewerRef: 'legacy-unattributed:phase-3.5-v2',
  reviewerRole: 'legacy-unattributed',
  reviewMethod: 'legacy-approved-projection-import',
  decisionReason: 'legacy-approved-projection',
  reviewPolicyVersion: REVIEW_GOVERNANCE_POLICY_VERSION,
});
const GOVERNANCE_DECISION_FIELDS = Object.freeze([
  'subjectId',
  'decision',
  'reviewerRef',
  'reviewerRole',
  'reviewedAt',
  'reviewMethod',
  'decisionReason',
  'reviewPolicyVersion',
]);
const GOVERNANCE_METADATA_FIELDS = GOVERNANCE_DECISION_FIELDS.slice(2);
const CANONICAL_POLICY_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const GOVERNANCE_REVIEWER_REF = /^(reviewer:r-[0-9a-f]{16}|legacy-unattributed:phase-3\.5-v2)$/;
const GOVERNANCE_EVIDENCE_CADENCE_DAYS = Object.freeze({
  'official-directory-listing|mutable-url': 30,
  'project-address-publication|mutable-url': 30,
  'project-declared-relationship|mutable-url': 60,
  'network-configuration|mutable-url': 90,
  'project-documentation|mutable-url': 90,
  'official-launch-record|mutable-url': 180,
  'protocol-registry-snapshot|pinned-snapshot': 365,
  'explorer-transaction|stable-artifact-url': 365,
});
const GOVERNANCE_RELATIONSHIP_CADENCE_DAYS = Object.freeze({
  ecosystem_membership: 30,
  declared_integration: 60,
});
const DAY_IN_MILLISECONDS = 86_400_000;

function assertExactFields(value, expectedFields, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...expectedFields].sort();
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${label} must contain exactly: ${expected.join(', ')}`);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

export function isCanonicalReviewGovernanceTimestamp(value) {
  if (typeof value !== 'string' || !CANONICAL_POLICY_TIMESTAMP.test(value)) return false;
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed) && new Date(parsed).toISOString().replace('.000Z', 'Z') === value;
}

function addElapsedDays(timestamp, days) {
  return new Date(Date.parse(timestamp) + days * DAY_IN_MILLISECONDS)
    .toISOString()
    .replace('.000Z', 'Z');
}

function decisionReasons(kind, decision) {
  const byKind = {
    evidence: {
      approved: ['scope-supported', 'historical-scope-supported', 'supported-with-limitations', 'legacy-approved-projection'],
      rejected: ['source-does-not-support-scope', 'identity-or-network-mismatch', 'provenance-insufficient', 'candidate-duplicate', 'candidate-withdrawn'],
      stale: ['superseded', 'source-unavailable-after-review', 'source-conflict-unresolved', 'scope-no-longer-inspectable', 'review-overdue-withdrawal'],
    },
    relationship: {
      approved: ['evidence-resolved', 'evidence-resolved-with-limitations', 'legacy-approved-projection'],
      rejected: ['evidence-does-not-support-relationship', 'endpoint-or-type-mismatch', 'candidate-duplicate', 'candidate-withdrawn'],
      stale: ['superseded', 'supporting-evidence-withdrawn', 'relationship-scope-no-longer-inspectable', 'review-overdue-withdrawal'],
    },
  };
  return byKind[kind]?.[decision] ?? [];
}

function validateGovernanceDecision(decision, subject, kind) {
  const label = `${kind === 'evidence' ? 'Evidence' : 'Relationship'} ${decision?.subjectId || '(unknown)'} governance decision`;
  assertExactFields(decision, GOVERNANCE_DECISION_FIELDS, label);
  assert(typeof decision.subjectId === 'string' && decision.subjectId.length > 0, `${label} lacks subjectId`);
  assert(['approved', 'rejected', 'stale'].includes(decision.decision), `${label} has invalid decision`);
  assert(decision.decision === subject.reviewStatus, `${label} does not match subject reviewStatus`);
  assert(GOVERNANCE_REVIEWER_REF.test(decision.reviewerRef), `${label} has invalid reviewerRef`);
  assert(['evidence-reviewer', 'relationship-reviewer', 'legacy-unattributed'].includes(decision.reviewerRole), `${label} has invalid reviewerRole`);
  assert(isCanonicalReviewGovernanceTimestamp(decision.reviewedAt), `${label} has invalid reviewedAt`);
  assert(decision.reviewedAt === subject.reviewedAt, `${label} reviewedAt does not match subject`);
  assert(decision.reviewPolicyVersion === REVIEW_GOVERNANCE_POLICY_VERSION, `${label} has invalid reviewPolicyVersion`);
  assert(decisionReasons(kind, decision.decision).includes(decision.decisionReason), `${label} has invalid decisionReason`);

  Object.entries(REVIEW_GOVERNANCE_LEGACY_METADATA).forEach(([field, expected]) =>
    assert(decision[field] === expected, `${label} must use the complete reserved legacy tuple`),
  );
  assert(decision.decision === 'approved', `${label} legacy compatibility decision must be approved`);
}

function validateGovernanceDecisionCollection(decisions, subjects, kind) {
  assert(Array.isArray(decisions), `Governance ${kind} decisions must be an array`);
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
  const seen = new Set();
  decisions.forEach((decision) => {
    assert(!seen.has(decision?.subjectId), `Governance ${kind} decisions contain duplicate subject ${decision?.subjectId}`);
    const subject = subjectById.get(decision?.subjectId);
    assert(subject, `Governance ${kind} decisions contain extra subject ${decision?.subjectId}`);
    seen.add(decision.subjectId);
    validateGovernanceDecision(decision, subject, kind);
  });
  assert(decisions.length === subjects.length, `Governance ${kind} decision coverage mismatch: expected ${subjects.length}, received ${decisions.length}`);
  subjects.forEach((subject) => assert(seen.has(subject.id), `Governance ${kind} decisions missing subject ${subject.id}`));
  return new Map(decisions.map((decision) => [decision.subjectId, decision]));
}

export function validateReviewGovernanceCompanion({ governance, snapshot, snapshotSha256, evidenceRecords, relationshipProposals }) {
  assertExactFields(governance, ['kind', 'schemaVersion', 'reviewPolicyVersion', 'snapshotBinding', 'evidenceDecisions', 'relationshipDecisions'], 'Governance companion');
  assert(governance.kind === REVIEW_GOVERNANCE_KIND, 'Governance companion has invalid kind');
  assert(governance.schemaVersion === REVIEW_GOVERNANCE_SCHEMA_VERSION, 'Governance companion has unsupported schemaVersion');
  assert(governance.reviewPolicyVersion === REVIEW_GOVERNANCE_POLICY_VERSION, 'Governance companion has invalid reviewPolicyVersion');
  assertExactFields(governance.snapshotBinding, ['version', 'canonicalSha256', 'reviewedAt'], 'Governance snapshotBinding');
  assert(typeof snapshotSha256 === 'string' && /^[a-f0-9]{64}$/.test(snapshotSha256), 'Runtime snapshot lacks a canonical SHA-256');
  assert(governance.snapshotBinding.version === snapshot?.version, 'Governance snapshotBinding.version does not match snapshot');
  assert(governance.snapshotBinding.reviewedAt === snapshot?.reviewedAt, 'Governance snapshotBinding.reviewedAt does not match snapshot');
  assert(governance.snapshotBinding.canonicalSha256 === snapshotSha256, 'Governance snapshotBinding.canonicalSha256 does not match snapshot');
  Object.entries(REVIEW_GOVERNANCE_LEGACY_BINDING).forEach(([field, expected]) =>
    assert(governance.snapshotBinding[field] === expected, `Compatibility governance ${field} must equal ${expected}`),
  );
  const evidenceDecisions = validateGovernanceDecisionCollection(governance.evidenceDecisions, evidenceRecords, 'evidence');
  const relationshipDecisions = validateGovernanceDecisionCollection(governance.relationshipDecisions, relationshipProposals, 'relationship');
  return deepFreeze({ evidenceDecisions, relationshipDecisions });
}

export function calculateEvidenceReviewCadence(record, reviewedAt) {
  assert(isCanonicalReviewGovernanceTimestamp(reviewedAt), `Evidence ${record?.id || '(unknown)'} has invalid governance reviewedAt`);
  const key = `${record?.evidenceType}|${record?.source?.referenceType}`;
  const baseCadenceDays = GOVERNANCE_EVIDENCE_CADENCE_DAYS[key];
  assert(baseCadenceDays, `Evidence ${record?.id || '(unknown)'} has unsupported cadence combination ${key}`);
  const candidates = [baseCadenceDays];
  if (record.source.available === false || record.quality?.unavailable === true) candidates.push(7);
  if (record.quality?.conflict === true) candidates.push(30);
  if (record.quality?.incomplete === true) candidates.push(60);
  const cadenceDays = Math.min(...candidates);
  return deepFreeze({ baseCadenceDays, cadenceDays, nextReviewAt: addElapsedDays(reviewedAt, cadenceDays) });
}

export function calculateRelationshipReviewCadence(relationship, reviewedAt, evidenceCadenceById) {
  assert(isCanonicalReviewGovernanceTimestamp(reviewedAt), `Relationship ${relationship?.id || '(unknown)'} has invalid governance reviewedAt`);
  const baseCadenceDays = GOVERNANCE_RELATIONSHIP_CADENCE_DAYS[relationship?.type];
  assert(baseCadenceDays, `Relationship ${relationship?.id || '(unknown)'} has unsupported cadence type ${relationship?.type}`);
  assert(Array.isArray(relationship.evidenceIds) && relationship.evidenceIds.length > 0, `Relationship ${relationship?.id || '(unknown)'} has no evidence references`);
  const ownNextReviewAt = addElapsedDays(reviewedAt, baseCadenceDays);
  const supportingEvidence = relationship.evidenceIds
    .map((evidenceId) => {
      const cadence = evidenceCadenceById.get(evidenceId);
      assert(cadence, `Relationship ${relationship.id} references unresolved evidence ${evidenceId}`);
      return { evidenceId, nextReviewAt: cadence.nextReviewAt };
    })
    .sort((left, right) => Date.parse(left.nextReviewAt) - Date.parse(right.nextReviewAt) || left.evidenceId.localeCompare(right.evidenceId));
  const earliestEvidence = supportingEvidence[0];
  const cappedByEvidence = Date.parse(earliestEvidence.nextReviewAt) < Date.parse(ownNextReviewAt);
  return deepFreeze({
    baseCadenceDays,
    nextReviewAt: cappedByEvidence ? earliestEvidence.nextReviewAt : ownNextReviewAt,
    dueBasis: cappedByEvidence ? `supporting-evidence:${earliestEvidence.evidenceId}` : 'subject-cadence',
  });
}

function compareGovernanceRows(left, right) {
  return left.subjectKind.localeCompare(right.subjectKind) || left.subjectId.localeCompare(right.subjectId);
}

export function createReviewGovernanceReport({ governance, snapshot, snapshotSha256, evidenceRecords, relationshipProposals, asOf }) {
  assert(isCanonicalReviewGovernanceTimestamp(asOf), 'Governance asOf must be a canonical UTC instant in YYYY-MM-DDTHH:mm:ssZ form');
  const decisions = validateReviewGovernanceCompanion({ governance, snapshot, snapshotSha256, evidenceRecords, relationshipProposals });
  const evidenceCadenceById = new Map();
  const rows = evidenceRecords.map((record) => {
    const decision = decisions.evidenceDecisions.get(record.id);
    const cadence = calculateEvidenceReviewCadence(record, decision.reviewedAt);
    evidenceCadenceById.set(record.id, cadence);
    return {
      subjectKind: 'evidence', subjectId: record.id, reviewedAt: decision.reviewedAt,
      baseCadenceDays: cadence.baseCadenceDays, nextReviewAt: cadence.nextReviewAt,
      dueBasis: 'subject-cadence', asOf, reviewDue: Date.parse(asOf) >= Date.parse(cadence.nextReviewAt),
    };
  });
  relationshipProposals.forEach((relationship) => {
    const decision = decisions.relationshipDecisions.get(relationship.id);
    const cadence = calculateRelationshipReviewCadence(relationship, decision.reviewedAt, evidenceCadenceById);
    rows.push({
      subjectKind: 'relationship', subjectId: relationship.id, reviewedAt: decision.reviewedAt,
      baseCadenceDays: cadence.baseCadenceDays, nextReviewAt: cadence.nextReviewAt,
      dueBasis: cadence.dueBasis, asOf, reviewDue: Date.parse(asOf) >= Date.parse(cadence.nextReviewAt),
    });
  });
  rows.sort(compareGovernanceRows);
  const reviewDue = rows.filter((row) => row.reviewDue).length;
  return deepFreeze({
    reviewPolicyVersion: REVIEW_GOVERNANCE_POLICY_VERSION,
    asOf,
    snapshotBinding: governance.snapshotBinding,
    summary: { subjects: rows.length, evidence: evidenceRecords.length, relationships: relationshipProposals.length, reviewCurrent: rows.length - reviewDue, reviewDue },
    rows,
  });
}

export function createReviewGovernanceFixtures({ baseEvidence, baseRelationship, governance }) {
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const unavailableConflict = clone(baseEvidence);
  unavailableConflict.id = 'FIXTURE-UNAVAILABLE-CONFLICT';
  unavailableConflict.source.available = false;
  unavailableConflict.quality.unavailable = true;
  unavailableConflict.quality.conflict = true;
  const staleApproved = clone(baseEvidence);
  staleApproved.id = 'FIXTURE-QUALITY-STALE';
  staleApproved.quality.stale = true;
  staleApproved.reviewStatus = 'approved';
  const missingMetadataGovernance = clone(governance);
  delete missingMetadataGovernance.evidenceDecisions[0].reviewMethod;
  const invalidBindingGovernance = clone(governance);
  invalidBindingGovernance.snapshotBinding.canonicalSha256 = '0'.repeat(64);
  return deepFreeze({
    currentAsOf: '2026-09-23T00:00:00Z',
    dueBoundaryAsOf: '2026-10-09T07:43:40Z',
    unavailableConflict,
    staleApproved,
    relationshipEvidenceCap: { relationship: clone(baseRelationship), supportingEvidenceId: unavailableConflict.id },
    missingMetadataGovernance,
    invalidBindingGovernance,
  });
}
