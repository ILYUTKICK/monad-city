#!/usr/bin/env node

import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import {
  assertNoSilentOverwrite,
  isIsoTimestamp,
  projectApprovedRelationships,
  validateEvidenceCandidateCore,
  validateRevisionLineage,
} from '../src/evidence-contract.js';
import {
  EVIDENCE_DATA_MODE,
  EVIDENCE_SUPPORT_MODES,
  EVIDENCE_STATUSES,
  EVIDENCE_TYPES,
  EVIDENCE_SNAPSHOT_CREATED_AT,
  EVIDENCE_SNAPSHOT_REVIEWED_AT,
  EVIDENCE_SNAPSHOT_VERSION,
  KNOWN_PROJECT_IDS,
  RELATIONSHIP_TYPES,
  REVIEW_STATUSES,
  evidenceRecords,
  relationshipProposals,
  validateCandidateEvidenceRecord,
} from '../src/evidence.js';

const WORKSPACE_SCHEMA_VERSION = 1;
const DECIDED_STATUSES = new Set(['approved', 'rejected', 'stale']);
const REVIEW_ONLY_FIELDS = new Set(['reviewStatus', 'reviewedAt', 'reviewMetadata']);
const BOOLEAN_OPTIONS = new Set(['strict']);
const REVIEW_POLICY_VERSION = 'phase-3.7-review-policy-v1';
const GOVERNANCE_KIND = 'monad-city-evidence-review-governance';
const GOVERNANCE_SCHEMA_VERSION = '1';
const LEGACY_GOVERNANCE_BINDING = Object.freeze({
  version: 'phase-3.5-v2',
  reviewedAt: '2026-09-22T22:02:32Z',
  canonicalSha256: '8edfddcce8caadb5861b5e2164f7a1d8755e01f6c369eb1cab8e0ffd996d3e58',
});
const LEGACY_REVIEW_METADATA = Object.freeze({
  reviewerRef: 'legacy-unattributed:phase-3.5-v2',
  reviewerRole: 'legacy-unattributed',
  reviewMethod: 'legacy-approved-projection-import',
  decisionReason: 'legacy-approved-projection',
  reviewPolicyVersion: REVIEW_POLICY_VERSION,
});
const REVIEW_METADATA_FIELDS = Object.freeze([
  'reviewerRef',
  'reviewerRole',
  'reviewedAt',
  'reviewMethod',
  'decisionReason',
  'reviewPolicyVersion',
]);
const GOVERNANCE_DECISION_FIELDS = Object.freeze(['subjectId', 'decision', ...REVIEW_METADATA_FIELDS]);
const REVIEWER_REF_PATTERN = /^(reviewer:r-[0-9a-f]{16}|legacy-unattributed:phase-3\.5-v2)$/;
const CANONICAL_POLICY_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const EVIDENCE_DECISION_REASONS = Object.freeze({
  approved: new Set([
    'scope-supported',
    'historical-scope-supported',
    'supported-with-limitations',
    'legacy-approved-projection',
  ]),
  rejected: new Set([
    'source-does-not-support-scope',
    'identity-or-network-mismatch',
    'provenance-insufficient',
    'candidate-duplicate',
    'candidate-withdrawn',
  ]),
  stale: new Set([
    'superseded',
    'source-unavailable-after-review',
    'source-conflict-unresolved',
    'scope-no-longer-inspectable',
    'review-overdue-withdrawal',
  ]),
});
const RELATIONSHIP_DECISION_REASONS = Object.freeze({
  approved: new Set([
    'evidence-resolved',
    'evidence-resolved-with-limitations',
    'legacy-approved-projection',
  ]),
  rejected: new Set([
    'evidence-does-not-support-relationship',
    'endpoint-or-type-mismatch',
    'candidate-duplicate',
    'candidate-withdrawn',
  ]),
  stale: new Set([
    'superseded',
    'supporting-evidence-withdrawn',
    'relationship-scope-no-longer-inspectable',
    'review-overdue-withdrawal',
  ]),
});
const EVIDENCE_REVIEW_METHODS = new Set([
  'manual-source-and-payload-inspection',
  'manual-artifact-and-payload-inspection',
  'manual-cross-source-inspection',
]);
const EVIDENCE_CADENCE_DAYS = Object.freeze({
  'official-directory-listing|mutable-url': 30,
  'project-address-publication|mutable-url': 30,
  'project-declared-relationship|mutable-url': 60,
  'project-declared-relationship|pinned-snapshot': 60,
  'network-configuration|mutable-url': 90,
  'project-documentation|mutable-url': 90,
  'official-launch-record|mutable-url': 180,
  'protocol-registry-snapshot|pinned-snapshot': 365,
  'explorer-transaction|stable-artifact-url': 365,
});
const RELATIONSHIP_CADENCE_DAYS = Object.freeze({
  ecosystem_membership: 30,
  declared_integration: 60,
});
const DAY_IN_MILLISECONDS = 86_400_000;

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function parseArguments(argv) {
  const [command, ...tokens] = argv;
  const options = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    assert(token.startsWith('--'), `Unexpected argument: ${token}`);
    const key = token.slice(2);
    const value = tokens[index + 1];
    if (BOOLEAN_OPTIONS.has(key) && (value === undefined || value.startsWith('--'))) {
      assert(options[key] === undefined, `Option --${key} was supplied more than once`);
      options[key] = true;
      continue;
    }
    assert(value !== undefined && !value.startsWith('--'), `Option --${key} requires a value`);
    assert(options[key] === undefined, `Option --${key} was supplied more than once`);
    options[key] = value;
    index += 1;
  }
  return { command, options };
}

function booleanOption(options, name) {
  const value = options[name] ?? false;
  assert(
    value === true || value === false || value === 'true' || value === 'false',
    `Option --${name} must be omitted, supplied alone, or set to true or false`,
  );
  return value === true || value === 'true';
}

function requireOption(options, name) {
  const value = options[name];
  assert(typeof value === 'string' && value.length > 0, `Missing required option --${name}`);
  return value;
}

function absolute(filePath) {
  return path.resolve(process.cwd(), filePath);
}

function readJson(filePath) {
  const resolved = absolute(filePath);
  let text;
  try {
    text = fs.readFileSync(resolved, 'utf8');
  } catch (error) {
    fail(`Cannot read ${resolved}: ${error.message}`);
  }
  try {
    return { resolved, value: JSON.parse(text) };
  } catch (error) {
    fail(`Invalid JSON in ${resolved}: ${error.message}`);
  }
}

function readText(filePath) {
  const resolved = absolute(filePath);
  try {
    return { resolved, value: fs.readFileSync(resolved, 'utf8') };
  } catch (error) {
    fail(`Cannot read ${resolved}: ${error.message}`);
  }
}

function writeNewJson(filePath, value, inputPaths = []) {
  const resolved = absolute(filePath);
  inputPaths.forEach((inputPath) => {
    assert(resolved !== absolute(inputPath), `Refusing to overwrite input file ${resolved}`);
  });
  try {
    fs.writeFileSync(resolved, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    });
  } catch (error) {
    if (error.code === 'EEXIST') {
      fail(`Refusing to overwrite existing file ${resolved}; choose a new output path`);
    }
    fail(`Cannot write ${resolved}: ${error.message}`);
  }
  return resolved;
}

function writeNewText(filePath, value, inputPaths = []) {
  const resolved = absolute(filePath);
  inputPaths.forEach((inputPath) => {
    assert(resolved !== absolute(inputPath), `Refusing to overwrite input file ${resolved}`);
  });
  try {
    fs.writeFileSync(resolved, value, {
      encoding: 'utf8',
      flag: 'wx',
    });
  } catch (error) {
    if (error.code === 'EEXIST') {
      fail(`Refusing to overwrite existing file ${resolved}; choose a new output path`);
    }
    fail(`Cannot write ${resolved}: ${error.message}`);
  }
  return resolved;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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

function canonicalJson(value) {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

function snapshotSha256(value) {
  return crypto.createHash('sha256').update(canonicalJson(value)).digest('hex');
}

function assertExactFields(value, expectedFields, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...expectedFields].sort();
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${label} must contain exactly: ${expected.join(', ')}`,
  );
}

function isCanonicalPolicyTimestamp(value) {
  if (typeof value !== 'string' || !CANONICAL_POLICY_TIMESTAMP_PATTERN.test(value)) return false;
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed) && new Date(parsed).toISOString().replace('.000Z', 'Z') === value;
}

function addElapsedDays(timestamp, days) {
  return new Date(Date.parse(timestamp) + days * DAY_IN_MILLISECONDS)
    .toISOString()
    .replace('.000Z', 'Z');
}

function validateDecisionMetadata(
  metadata,
  { kind, decision, subjectId, subjectReviewedAt, allowLegacy = false },
) {
  const label = `${kind === 'evidence' ? 'Evidence' : 'Relationship'} ${subjectId} review metadata`;
  assertExactFields(metadata, REVIEW_METADATA_FIELDS, label);
  assert(DECIDED_STATUSES.has(decision), `${label} has invalid decision ${decision}`);
  assert(REVIEWER_REF_PATTERN.test(metadata.reviewerRef), `${label} has invalid reviewerRef`);
  assert(
    ['evidence-reviewer', 'relationship-reviewer', 'legacy-unattributed'].includes(
      metadata.reviewerRole,
    ),
    `${label} has invalid reviewerRole`,
  );
  assert(isCanonicalPolicyTimestamp(metadata.reviewedAt), `${label} has invalid reviewedAt`);
  assert(
    metadata.reviewedAt === subjectReviewedAt,
    `${label} reviewedAt must equal the subject reviewedAt`,
  );
  assert(
    metadata.reviewPolicyVersion === REVIEW_POLICY_VERSION,
    `${label} has invalid reviewPolicyVersion`,
  );

  const reasons = kind === 'evidence' ? EVIDENCE_DECISION_REASONS : RELATIONSHIP_DECISION_REASONS;
  assert(reasons[decision]?.has(metadata.decisionReason), `${label} has invalid decisionReason`);

  const usesLegacyValue =
    metadata.reviewerRef === LEGACY_REVIEW_METADATA.reviewerRef ||
    metadata.reviewerRole === LEGACY_REVIEW_METADATA.reviewerRole ||
    metadata.reviewMethod === LEGACY_REVIEW_METADATA.reviewMethod ||
    metadata.decisionReason === LEGACY_REVIEW_METADATA.decisionReason;
  if (usesLegacyValue) {
    assert(allowLegacy, `${label} cannot use reserved legacy metadata inline`);
    Object.entries(LEGACY_REVIEW_METADATA).forEach(([field, expected]) =>
      assert(metadata[field] === expected, `${label} must use the complete reserved legacy tuple`),
    );
    assert(decision === 'approved', `${label} legacy compatibility decision must be approved`);
    return true;
  }

  assert(
    /^reviewer:r-[0-9a-f]{16}$/.test(metadata.reviewerRef),
    `${label} must use an opaque reviewer:r- reference`,
  );
  const expectedRole = kind === 'evidence' ? 'evidence-reviewer' : 'relationship-reviewer';
  assert(metadata.reviewerRole === expectedRole, `${label} must use reviewerRole ${expectedRole}`);

  if (metadata.reviewMethod === 'manual-governance-withdrawal') {
    assert(decision === 'stale', `${label} governance withdrawal requires a stale decision`);
    assert(
      ['review-overdue-withdrawal', 'superseded'].includes(metadata.decisionReason),
      `${label} governance withdrawal has invalid decisionReason`,
    );
  } else if (kind === 'evidence') {
    assert(EVIDENCE_REVIEW_METHODS.has(metadata.reviewMethod), `${label} has invalid evidence reviewMethod`);
  } else {
    assert(
      metadata.reviewMethod === 'manual-relationship-evidence-inspection',
      `${label} has invalid relationship reviewMethod`,
    );
  }
  return true;
}

function validateInlineReviewPolicy(workspace, label = 'Artifact') {
  const subjects = [
    ...workspace.candidateRecords.map((subject) => ({ kind: 'evidence', subject })),
    ...workspace.candidateRelationships.map((subject) => ({ kind: 'relationship', subject })),
  ];
  const policyBearing =
    workspace.reviewPolicyVersion !== undefined ||
    subjects.some(({ subject }) => Object.prototype.hasOwnProperty.call(subject, 'reviewMetadata'));
  if (!policyBearing) return false;

  assert(
    workspace.reviewPolicyVersion === REVIEW_POLICY_VERSION,
    `${label} must set reviewPolicyVersion to ${REVIEW_POLICY_VERSION}`,
  );
  subjects.forEach(({ kind, subject }) => {
    const subjectLabel = `${kind === 'evidence' ? 'Evidence' : 'Relationship'} ${subject.id}`;
    if (kind === 'evidence') {
      const key = `${subject.evidenceType}|${subject.source.referenceType}`;
      assert(EVIDENCE_CADENCE_DAYS[key], `${subjectLabel} has unsupported cadence combination ${key}`);
    } else {
      assert(RELATIONSHIP_CADENCE_DAYS[subject.type], `${subjectLabel} has unsupported cadence type ${subject.type}`);
    }
    assert(
      Object.prototype.hasOwnProperty.call(subject, 'reviewMetadata'),
      `${subjectLabel} must contain reviewMetadata under ${REVIEW_POLICY_VERSION}`,
    );
    if (!DECIDED_STATUSES.has(subject.reviewStatus)) {
      assert(subject.reviewMetadata === null, `${subjectLabel} must have reviewMetadata: null before a decision`);
      assert(subject.reviewedAt === null, `${subjectLabel} must have reviewedAt: null before a decision`);
      return;
    }
    assert(subject.reviewMetadata !== null, `${subjectLabel} requires reviewMetadata`);
    validateDecisionMetadata(subject.reviewMetadata, {
      kind,
      decision: subject.reviewStatus,
      subjectId: subject.id,
      subjectReviewedAt: subject.reviewedAt,
      allowLegacy: false,
    });
  });
  return true;
}

function validateGovernanceDecisionCollection({ decisions, subjects, kind }) {
  const label = kind === 'evidence' ? 'evidenceDecisions' : 'relationshipDecisions';
  assert(Array.isArray(decisions), `Governance ${label} must be an array`);
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
  const seen = new Set();
  decisions.forEach((decision) => {
    assertExactFields(decision, GOVERNANCE_DECISION_FIELDS, `Governance ${label} entry`);
    assert(typeof decision.subjectId === 'string' && decision.subjectId.length > 0, `${label} entry lacks subjectId`);
    assert(!seen.has(decision.subjectId), `${label} contains duplicate subject ${decision.subjectId}`);
    seen.add(decision.subjectId);
    const subject = subjectById.get(decision.subjectId);
    assert(subject, `${label} contains extra subject ${decision.subjectId}`);
    assert(decision.decision === subject.reviewStatus, `${label} ${decision.subjectId} decision does not match subject`);
    const metadata = Object.fromEntries(REVIEW_METADATA_FIELDS.map((field) => [field, decision[field]]));
    validateDecisionMetadata(metadata, {
      kind,
      decision: decision.decision,
      subjectId: decision.subjectId,
      subjectReviewedAt: subject.reviewedAt,
      allowLegacy: true,
    });
  });
  assert(
    decisions.length === subjects.length,
    `${label} coverage mismatch: expected ${subjects.length}, received ${decisions.length}`,
  );
  subjects.forEach((subject) => assert(seen.has(subject.id), `${label} is missing subject ${subject.id}`));
  return new Map(decisions.map((decision) => [decision.subjectId, decision]));
}

function evidenceCadence(record, reviewedAt) {
  const key = `${record.evidenceType}|${record.source.referenceType}`;
  const baseCadenceDays = EVIDENCE_CADENCE_DAYS[key];
  assert(baseCadenceDays, `Evidence ${record.id} has unsupported cadence combination ${key}`);
  const candidates = [baseCadenceDays];
  if (record.source.available === false || record.quality.unavailable === true) candidates.push(7);
  if (record.quality.conflict === true) candidates.push(30);
  if (record.quality.incomplete === true) candidates.push(60);
  const cadenceDays = Math.min(...candidates);
  return {
    baseCadenceDays,
    cadenceDays,
    nextReviewAt: addElapsedDays(reviewedAt, cadenceDays),
  };
}

function compareSubjectRows(left, right) {
  if (left.subjectKind !== right.subjectKind) return left.subjectKind < right.subjectKind ? -1 : 1;
  if (left.subjectId === right.subjectId) return 0;
  return left.subjectId < right.subjectId ? -1 : 1;
}

function javascriptLiteral(value) {
  return JSON.stringify(stableValue(value), null, 2)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function promotionModuleSource(snapshot, digest = snapshotSha256(snapshot)) {
  return `// Generated by scripts/evidence-workflow.js promote. Do not edit by hand.\n` +
    `// Approval is bounded to snapshot ${snapshot.version}; it is not project verification or endorsement.\n\n` +
    `function deepFreeze(value) {\n` +
    `  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;\n` +
    `  Object.values(value).forEach(deepFreeze);\n` +
    `  return Object.freeze(value);\n` +
    `}\n\n` +
    `export const APPROVED_EVIDENCE_SNAPSHOT_SHA256 = '${digest}';\n\n` +
    `export const APPROVED_EVIDENCE_SNAPSHOT = deepFreeze(${javascriptLiteral(snapshot)});\n`;
}

function fingerprintWithoutReview(item) {
  return JSON.stringify(
    stableValue(
      Object.fromEntries(
        Object.entries(item).filter(([key]) => !REVIEW_ONLY_FIELDS.has(key)),
      ),
    ),
  );
}

function evidenceWithoutInlineReviewMetadata(record) {
  return Object.fromEntries(Object.entries(record).filter(([key]) => key !== 'reviewMetadata'));
}

function assertNoEvidenceOverwrite(previousRecords, nextRecords) {
  return assertNoSilentOverwrite(
    previousRecords.map(evidenceWithoutInlineReviewMetadata),
    nextRecords.map(evidenceWithoutInlineReviewMetadata),
  );
}

function validateEvidenceLineage(records, previousRecords = []) {
  return validateRevisionLineage(
    records.map(evidenceWithoutInlineReviewMetadata),
    previousRecords.map(evidenceWithoutInlineReviewMetadata),
  );
}

function workspaceFromArtifact(artifact, label = 'artifact') {
  const candidateRecords = artifact.candidateRecords ?? artifact.records ?? artifact.snapshot?.records;
  const candidateRelationships =
    artifact.candidateRelationships ?? artifact.relationships ?? artifact.snapshot?.relationships ?? [];
  assert(Array.isArray(candidateRecords), `${label} does not contain candidateRecords or records`);
  assert(Array.isArray(candidateRelationships), `${label} relationships must be an array`);
  return {
    candidateRecords,
    candidateRelationships,
    version: artifact.version ?? artifact.snapshot?.version ?? artifact.baseSnapshot?.version ?? null,
    reviewPolicyVersion:
      artifact.reviewPolicyVersion ?? artifact.snapshot?.reviewPolicyVersion ?? undefined,
  };
}

function readWorkspace(filePath) {
  const input = readJson(filePath);
  const workspace = workspaceFromArtifact(input.value, input.resolved);
  return { ...input, ...workspace };
}

function checkedInBaseline() {
  return {
    candidateRecords: evidenceRecords,
    candidateRelationships: relationshipProposals,
    version: EVIDENCE_SNAPSHOT_VERSION,
    reviewPolicyVersion: undefined,
  };
}

function readPrevious(filePath) {
  if (!filePath) return checkedInBaseline();
  return workspaceFromArtifact(readJson(filePath).value, absolute(filePath));
}

function assertUniqueIds(items, label) {
  const ids = new Set();
  items.forEach((item) => {
    assert(typeof item?.id === 'string' && item.id.length > 0, `${label} has an item without an ID`);
    assert(!ids.has(item.id), `${label} contains duplicate ID ${item.id}`);
    ids.add(item.id);
  });
}

function assertCandidateHistoryRetained(previousItems, nextItems, label) {
  const nextIds = new Set(nextItems.map((item) => item.id));
  previousItems.forEach((item) =>
    assert(nextIds.has(item.id), `${label} ${item.id} was removed from candidate history`),
  );
}

function validateEvidenceWorkspaceRecord(record) {
  validateEvidenceCandidateCore(record);
  validateCandidateEvidenceRecord(record);
  const label = `Evidence ${record.id}`;
  assert(Array.isArray(record.relatedProjectIds), `${label} relatedProjectIds must be an array`);
  record.relatedProjectIds.forEach((id) =>
    assert(KNOWN_PROJECT_IDS.includes(id), `${label} has unknown related project ${id}`),
  );
  assert(EVIDENCE_TYPES.includes(record.evidenceType), `${label} has invalid evidenceType`);
  assert(EVIDENCE_STATUSES.includes(record.status), `${label} has invalid claim status`);
  assert(record.dataMode === EVIDENCE_DATA_MODE, `${label} has invalid dataMode`);
  assert(
    record.network?.name === 'Monad mainnet' && record.network?.chainId === 143,
    `${label} has invalid network scope`,
  );
  assert(typeof record.source.kind === 'string' && record.source.kind.length > 0, `${label} lacks source kind`);
  assert(typeof record.source.title === 'string' && record.source.title.length > 0, `${label} lacks source title`);
  assert(
    ['mutable-url', 'pinned-snapshot', 'stable-artifact-url'].includes(record.source.referenceType),
    `${label} has invalid source referenceType`,
  );
  assert(
    typeof record.source.presentationMutable === 'boolean',
    `${label} lacks source presentation mutability`,
  );
  assert(EVIDENCE_SUPPORT_MODES.includes(record.supportMode), `${label} has invalid supportMode`);
  assert(
    record.supportedProposition === record.scope,
    `${label} supportedProposition must equal its bounded scope`,
  );
  assert(typeof record.source.available === 'boolean', `${label} lacks source availability`);
  assert(
    record.source.available === !record.quality.unavailable,
    `${label} source and quality availability flags disagree`,
  );
  assert(
    typeof record.provenanceNotes === 'string' &&
      record.provenanceNotes.length > 0 &&
      record.provenance.notes === record.provenanceNotes,
    `${label} has inconsistent provenance notes`,
  );
  assert(
    record.limitations.every((item) => typeof item === 'string' && item.length > 0),
    `${label} limitations must be non-empty strings`,
  );
  if (record.status === 'Observed') {
    assert(record.supportMode === 'artifact-observation-only', `${label} has an invalid Observed support mode`);
  }
  if (record.status === 'Claimed') {
    assert(record.supportMode === 'publisher-statement-only', `${label} has an invalid Claimed support mode`);
  }
  if (record.status === 'Attested') {
    assert(record.supportMode === 'scoped-attestation-only' && record.attestor, `${label} lacks a scoped attestor`);
  }
  if (record.status === 'AI-inferred') {
    assert(
      record.supportMode === 'discovery-only' && record.supportsFactualClaims === false,
      `${label} cannot use AI inference as factual support`,
    );
  }
  return true;
}

function validateRelationshipCandidate(relationship) {
  const label = `Relationship ${relationship?.id || '(unknown)'}`;
  const required = [
    'id',
    'from',
    'to',
    'type',
    'status',
    'evidenceIds',
    'scope',
    'limitations',
    'dataMode',
    'reviewStatus',
    'reviewedAt',
    'revision',
  ];
  const missing = required.filter(
    (field) => !Object.prototype.hasOwnProperty.call(relationship ?? {}, field),
  );
  assert(!missing.length, `${label} missing: ${missing.join(', ')}`);
  assert(KNOWN_PROJECT_IDS.includes(relationship.from), `${label} has unknown from endpoint`);
  assert(KNOWN_PROJECT_IDS.includes(relationship.to), `${label} has unknown to endpoint`);
  assert(relationship.from !== relationship.to, `${label} cannot be self-referential`);
  assert(RELATIONSHIP_TYPES.includes(relationship.type), `${label} has invalid type`);
  assert(EVIDENCE_STATUSES.includes(relationship.status), `${label} has invalid claim status`);
  assert(
    Array.isArray(relationship.evidenceIds) && relationship.evidenceIds.length > 0,
    `${label} requires at least one evidence ID`,
  );
  assert(new Set(relationship.evidenceIds).size === relationship.evidenceIds.length, `${label} repeats an evidence ID`);
  assert(typeof relationship.scope === 'string' && relationship.scope.length > 0, `${label} lacks scope`);
  assert(
    Array.isArray(relationship.limitations) && relationship.limitations.length > 0,
    `${label} lacks limitations`,
  );
  assert(relationship.dataMode === EVIDENCE_DATA_MODE, `${label} has invalid dataMode`);
  assert(REVIEW_STATUSES.includes(relationship.reviewStatus), `${label} has invalid reviewStatus`);
  assert(
    relationship.reviewedAt === null || isIsoTimestamp(relationship.reviewedAt),
    `${label} has invalid reviewedAt`,
  );
  if (DECIDED_STATUSES.has(relationship.reviewStatus)) {
    assert(relationship.reviewedAt !== null, `${label} requires reviewedAt`);
  } else {
    assert(relationship.reviewedAt === null, `${label} must have reviewedAt: null before a decision`);
  }
  assert(
    Number.isInteger(relationship.revision?.sequence) && relationship.revision.sequence > 0,
    `${label} requires a positive revision.sequence`,
  );
  const predecessor = relationship.revision.supersedesRelationshipId;
  assert(
    predecessor === null || (typeof predecessor === 'string' && predecessor.length > 0),
    `${label} has invalid revision.supersedesRelationshipId`,
  );
  if (relationship.revision.sequence === 1) {
    assert(predecessor === null, `${label} initial revision cannot supersede another relationship`);
  } else {
    assert(predecessor !== null, `${label} revision ${relationship.revision.sequence} requires a predecessor`);
  }
  return true;
}

function assertNoRelationshipOverwrite(previousRelationships, nextRelationships) {
  const previousById = new Map(previousRelationships.map((item) => [item.id, item]));
  nextRelationships.forEach((item) => {
    const previous = previousById.get(item.id);
    if (!previous) return;
    assert(
      fingerprintWithoutReview(previous) === fingerprintWithoutReview(item),
      `Relationship ${item.id} changed without a new immutable relationship ID and revision lineage`,
    );
  });
}

function validateRelationshipLineage(relationships, previousRelationships = []) {
  const byId = new Map();
  [...previousRelationships, ...relationships].forEach((item) => {
    const existing = byId.get(item.id);
    if (existing) {
      assert(
        fingerprintWithoutReview(existing) === fingerprintWithoutReview(item),
        `Duplicate relationship ID ${item.id} has conflicting immutable content`,
      );
    }
    byId.set(item.id, item);
  });
  relationships.forEach((item) => {
    const predecessorId = item.revision.supersedesRelationshipId;
    if (!predecessorId) return;
    const predecessor = byId.get(predecessorId);
    assert(predecessor, `Relationship ${item.id} supersedes unknown relationship ${predecessorId}`);
    assert(predecessor.id !== item.id, `Relationship ${item.id} cannot supersede itself`);
    assert(
      predecessor.from === item.from && predecessor.to === item.to,
      `Relationship ${item.id} cannot supersede a relationship with different endpoints`,
    );
    assert(
      predecessor.revision.sequence + 1 === item.revision.sequence,
      `Relationship ${item.id} revision sequence must follow ${predecessorId}`,
    );
  });
}

function validateWorkspace(workspace, previous = checkedInBaseline()) {
  assertUniqueIds(workspace.candidateRecords, 'Candidate evidence');
  assertUniqueIds(workspace.candidateRelationships, 'Candidate relationships');
  workspace.candidateRecords.forEach(validateEvidenceWorkspaceRecord);
  workspace.candidateRelationships.forEach(validateRelationshipCandidate);
  const candidateEvidenceIds = new Set(workspace.candidateRecords.map((record) => record.id));
  workspace.candidateRelationships.forEach((relationship) =>
    relationship.evidenceIds.forEach((evidenceId) =>
      assert(
        candidateEvidenceIds.has(evidenceId),
        `Relationship ${relationship.id} references unknown candidate evidence ${evidenceId}`,
      ),
    ),
  );
  assertCandidateHistoryRetained(previous.candidateRecords, workspace.candidateRecords, 'Evidence');
  assertCandidateHistoryRetained(
    previous.candidateRelationships,
    workspace.candidateRelationships,
    'Relationship',
  );
  assertNoEvidenceOverwrite(previous.candidateRecords, workspace.candidateRecords);
  validateEvidenceLineage(workspace.candidateRecords, previous.candidateRecords);
  assertNoRelationshipOverwrite(previous.candidateRelationships, workspace.candidateRelationships);
  validateRelationshipLineage(workspace.candidateRelationships, previous.candidateRelationships);
  validateInlineReviewPolicy(workspace, 'Workspace');
  const approvedRecords = workspace.candidateRecords.filter(
    (record) => record.reviewStatus === 'approved',
  );
  const approvedRelationships = projectApprovedRelationships(
    workspace.candidateRelationships,
    approvedRecords,
  );
  return { approvedRecords, approvedRelationships };
}

function statusCounts(items) {
  return Object.fromEntries(
    REVIEW_STATUSES.map((status) => [
      status,
      items.filter((item) => item.reviewStatus === status).length,
    ]),
  );
}

function exportWorkspace(options) {
  const out = requireOption(options, 'out');
  const workspace = {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    kind: 'evidence-candidate-workspace',
    baseSnapshot: {
      version: EVIDENCE_SNAPSHOT_VERSION,
      createdAt: EVIDENCE_SNAPSHOT_CREATED_AT,
      reviewedAt: EVIDENCE_SNAPSHOT_REVIEWED_AT,
    },
    candidateRecords: clone(evidenceRecords),
    candidateRelationships: clone(relationshipProposals),
  };
  const resolved = writeNewJson(out, workspace);
  console.log(`Exported review workspace to ${resolved}`);
}

function prepareCommand(options) {
  const workspacePath = requireOption(options, 'workspace');
  const out = requireOption(options, 'out');
  const templateId = requireOption(options, 'template-id');
  const id = requireOption(options, 'id');
  const kind = options.kind ?? 'evidence';
  const mode = options.mode ?? 'new';
  assert(['evidence', 'relationship'].includes(kind), '--kind must be evidence or relationship');
  assert(['new', 'revision'].includes(mode), '--mode must be new or revision');
  assert(templateId !== id, '--id must differ from --template-id');

  const workspace = readWorkspace(workspacePath);
  const previous = readPrevious(options.previous);
  validateWorkspace(workspace, previous);
  const output = clone(workspace.value);
  const collectionName = kind === 'evidence' ? 'candidateRecords' : 'candidateRelationships';
  const collection = output[collectionName];
  assert(Array.isArray(collection), `Workspace does not expose ${collectionName}`);
  assert(!collection.some((item) => item.id === id), `${kind} ${id} already exists`);
  const template = collection.find((item) => item.id === templateId);
  assert(template, `${kind === 'evidence' ? 'Evidence' : 'Relationship'} ${templateId} was not found`);

  const candidate = clone(template);
  candidate.id = id;
  candidate.reviewStatus = 'proposed';
  candidate.reviewedAt = null;
  if (workspace.reviewPolicyVersion !== undefined) candidate.reviewMetadata = null;
  if (kind === 'evidence') {
    candidate.revision = {
      sequence: mode === 'revision' ? template.revision.sequence + 1 : 1,
      supersedesEvidenceId: mode === 'revision' ? template.id : null,
    };
  } else {
    candidate.revision = {
      sequence: mode === 'revision' ? template.revision.sequence + 1 : 1,
      supersedesRelationshipId: mode === 'revision' ? template.id : null,
    };
  }
  collection.push(candidate);

  validateWorkspace(workspaceFromArtifact(output, 'prepared workspace'), previous);
  const resolved = writeNewJson(out, output, [workspacePath, options.previous].filter(Boolean));
  console.log(
    `Prepared proposed ${kind} ${id} (${mode}) in ${resolved}; edit only the new ID, then validate against ${workspace.resolved}`,
  );
}

function validateCommand(options) {
  const workspacePath = requireOption(options, 'workspace');
  const workspace = readWorkspace(workspacePath);
  const result = validateWorkspace(workspace, readPrevious(options.previous));
  console.log(
    JSON.stringify(
      {
        valid: true,
        workspace: workspace.resolved,
        evidence: {
          total: workspace.candidateRecords.length,
          byReviewStatus: statusCounts(workspace.candidateRecords),
          approvedProjection: result.approvedRecords.length,
        },
        relationships: {
          total: workspace.candidateRelationships.length,
          byReviewStatus: statusCounts(workspace.candidateRelationships),
          approvedProjection: result.approvedRelationships.length,
        },
      },
      null,
      2,
    ),
  );
}

function inspectCommand(options) {
  const workspacePath = requireOption(options, 'workspace');
  const id = requireOption(options, 'id');
  const kind = options.kind ?? 'evidence';
  assert(['evidence', 'relationship'].includes(kind), '--kind must be evidence or relationship');
  const workspace = readWorkspace(workspacePath);
  validateWorkspace(workspace, readPrevious(options.previous));
  if (kind === 'evidence') {
    const record = workspace.candidateRecords.find((item) => item.id === id);
    assert(record, `Evidence ${id} was not found`);
    console.log(
      JSON.stringify(
        {
          id: record.id,
          projectId: record.projectId,
          reviewStatus: record.reviewStatus,
          reviewedAt: record.reviewedAt,
          ...(Object.prototype.hasOwnProperty.call(record, 'reviewMetadata')
            ? { reviewMetadata: record.reviewMetadata }
            : {}),
          claimStatus: record.status,
          claim: record.claim,
          evidenceType: record.evidenceType,
          source: record.source,
          retrievedAt: record.retrievedAt,
          publishedAt: record.publishedAt,
          network: record.network,
          scope: record.scope,
          provenance: record.provenance,
          quality: record.quality,
          conflicts: record.conflicts,
          limitations: record.limitations,
          revision: record.revision,
        },
        null,
        2,
      ),
    );
    return;
  }
  const relationship = workspace.candidateRelationships.find((item) => item.id === id);
  assert(relationship, `Relationship ${id} was not found`);
  const byId = new Map(workspace.candidateRecords.map((item) => [item.id, item]));
  console.log(
    JSON.stringify(
      {
        ...relationship,
        evidence: relationship.evidenceIds.map((evidenceId) => {
          const record = byId.get(evidenceId);
          return record
            ? {
                id: record.id,
                reviewStatus: record.reviewStatus,
                claim: record.claim,
                source: record.source,
                provenance: record.provenance,
                scope: record.scope,
              }
            : { id: evidenceId, unavailable: true };
        }),
      },
      null,
      2,
    ),
  );
}

function reviewCommand(options) {
  const workspacePath = requireOption(options, 'workspace');
  const out = requireOption(options, 'out');
  const id = requireOption(options, 'id');
  const status = requireOption(options, 'status');
  const kind = options.kind ?? 'evidence';
  assert(['evidence', 'relationship'].includes(kind), '--kind must be evidence or relationship');
  assert(REVIEW_STATUSES.includes(status), `Invalid review status ${status}`);
  const reviewedAt = options['reviewed-at'] ?? null;
  if (DECIDED_STATUSES.has(status)) {
    assert(isIsoTimestamp(reviewedAt), `--reviewed-at is required for ${status} and must be ISO UTC`);
  } else {
    assert(reviewedAt === null, `Do not supply --reviewed-at for ${status}`);
  }
  const workspace = readWorkspace(workspacePath);
  const previous = readPrevious(options.previous);
  validateWorkspace(workspace, previous);
  const output = clone(workspace.value);
  const collectionName = kind === 'evidence' ? 'candidateRecords' : 'candidateRelationships';
  const collection = output[collectionName];
  assert(Array.isArray(collection), `Workspace does not expose ${collectionName}`);
  const target = collection.find((item) => item.id === id);
  assert(target, `${kind === 'evidence' ? 'Evidence' : 'Relationship'} ${id} was not found`);
  target.reviewStatus = status;
  target.reviewedAt = reviewedAt;
  if (workspace.reviewPolicyVersion !== undefined) {
    if (DECIDED_STATUSES.has(status)) {
      target.reviewMetadata = {
        reviewerRef: requireOption(options, 'reviewer-ref'),
        reviewerRole: requireOption(options, 'reviewer-role'),
        reviewedAt,
        reviewMethod: requireOption(options, 'review-method'),
        decisionReason: requireOption(options, 'decision-reason'),
        reviewPolicyVersion: workspace.reviewPolicyVersion,
      };
    } else {
      target.reviewMetadata = null;
    }
  }
  validateWorkspace(workspaceFromArtifact(output, 'review output'), previous);
  const resolved = writeNewJson(out, output, [workspacePath, options.previous].filter(Boolean));
  console.log(`Wrote ${kind} ${id} as ${status} to ${resolved}`);
}

function approvedProjection(workspace, metadata, previous) {
  assert(typeof metadata.version === 'string' && metadata.version.length > 0, 'Snapshot version is required');
  assert(isIsoTimestamp(metadata.createdAt), 'Snapshot createdAt must be an ISO timestamp');
  assert(isIsoTimestamp(metadata.reviewedAt), 'Snapshot reviewedAt must be an ISO timestamp');
  assert(
    Date.parse(metadata.reviewedAt) >= Date.parse(metadata.createdAt),
    'Snapshot reviewedAt cannot precede createdAt',
  );
  const validated = validateWorkspace(workspace, previous);
  const decisionTimes = [
    ...validated.approvedRecords.map((item) => item.reviewedAt),
    ...validated.approvedRelationships.map((item) => item.reviewedAt),
  ].filter(Boolean);
  decisionTimes.forEach((timestamp) =>
    assert(
      Date.parse(metadata.reviewedAt) >= Date.parse(timestamp),
      `Snapshot reviewedAt ${metadata.reviewedAt} precedes approved decision ${timestamp}`,
    ),
  );
  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    version: metadata.version,
    createdAt: metadata.createdAt,
    reviewedAt: metadata.reviewedAt,
    dataMode: EVIDENCE_DATA_MODE,
    ...(workspace.reviewPolicyVersion
      ? { reviewPolicyVersion: workspace.reviewPolicyVersion }
      : {}),
    records: clone(validated.approvedRecords),
    kind: 'approved-evidence-snapshot',
    relationships: clone(validated.approvedRelationships),
  };
}

function projectionFingerprint(artifact) {
  const workspace = workspaceFromArtifact(artifact);
  return JSON.stringify(
    stableValue({
      records: workspace.candidateRecords.filter((item) => item.reviewStatus === 'approved'),
      relationships: workspace.candidateRelationships.filter(
        (item) => item.reviewStatus === 'approved',
      ),
    }),
  );
}

function snapshotCommand(options) {
  const workspacePath = requireOption(options, 'workspace');
  const out = requireOption(options, 'out');
  const metadata = {
    version: requireOption(options, 'version'),
    createdAt: requireOption(options, 'created-at'),
    reviewedAt: requireOption(options, 'reviewed-at'),
  };
  const workspace = readWorkspace(workspacePath);
  const previous = readPrevious(options.previous);
  const snapshot = approvedProjection(workspace, metadata, previous);
  if (options.previous) {
    const previousArtifact = readJson(options.previous).value;
    const previousVersion = workspaceFromArtifact(previousArtifact).version;
    if (previousVersion === snapshot.version) {
      assert(
        projectionFingerprint(previousArtifact) === projectionFingerprint(snapshot),
        `Approved projection changed but snapshot version ${snapshot.version} was reused`,
      );
    }
  }
  const resolved = writeNewJson(out, snapshot, [workspacePath, options.previous].filter(Boolean));
  console.log(
    `Wrote approved-only snapshot ${snapshot.version} (${snapshot.records.length} evidence, ${snapshot.relationships.length} relationships) to ${resolved}`,
  );
}

function validateApprovedSnapshot(artifact, previous = null) {
  assert(artifact.kind === 'approved-evidence-snapshot', 'File is not an approved evidence snapshot');
  assert(artifact.schemaVersion === WORKSPACE_SCHEMA_VERSION, 'Snapshot has an unsupported schemaVersion');
  assert(typeof artifact.version === 'string' && artifact.version.length > 0, 'Snapshot lacks version');
  assert(artifact.dataMode === EVIDENCE_DATA_MODE, 'Snapshot has an invalid dataMode');
  assert(isIsoTimestamp(artifact.createdAt), 'Snapshot has invalid createdAt');
  assert(isIsoTimestamp(artifact.reviewedAt), 'Snapshot has invalid reviewedAt');
  assert(Date.parse(artifact.reviewedAt) >= Date.parse(artifact.createdAt), 'Snapshot reviewedAt precedes createdAt');
  const workspace = workspaceFromArtifact(artifact, 'snapshot');
  assert(
    workspace.candidateRecords.every((item) => item.reviewStatus === 'approved'),
    'Snapshot contains non-approved evidence',
  );
  assert(
    workspace.candidateRelationships.every((item) => item.reviewStatus === 'approved'),
    'Snapshot contains non-approved relationships',
  );
  assertUniqueIds(workspace.candidateRecords, 'Snapshot evidence');
  assertUniqueIds(workspace.candidateRelationships, 'Snapshot relationships');
  workspace.candidateRecords.forEach(validateEvidenceWorkspaceRecord);
  workspace.candidateRelationships.forEach(validateRelationshipCandidate);
  validateInlineReviewPolicy(workspace, 'Snapshot');
  projectApprovedRelationships(workspace.candidateRelationships, workspace.candidateRecords);
  if (previous) {
    assertNoEvidenceOverwrite(previous.candidateRecords, workspace.candidateRecords);
    assertNoRelationshipOverwrite(previous.candidateRelationships, workspace.candidateRelationships);
    validateEvidenceLineage(workspace.candidateRecords, previous.candidateRecords);
    validateRelationshipLineage(workspace.candidateRelationships, previous.candidateRelationships);
  }
  return workspace;
}

function loadCommand(options) {
  const snapshotPath = requireOption(options, 'snapshot');
  const input = readJson(snapshotPath);
  const previous = options.previous ? readPrevious(options.previous) : null;
  const workspace = validateApprovedSnapshot(input.value, previous);
  console.log(
    JSON.stringify(
      {
        valid: true,
        snapshot: input.resolved,
        version: input.value.version,
        createdAt: input.value.createdAt,
        reviewedAt: input.value.reviewedAt,
        evidenceRecords: workspace.candidateRecords.length,
        relationships: workspace.candidateRelationships.length,
        approvedOnly: true,
        sha256: snapshotSha256(input.value),
      },
      null,
      2,
    ),
  );
}

function validateGovernanceCompanion(governance, snapshot, digest, workspace) {
  assertExactFields(
    governance,
    [
      'kind',
      'schemaVersion',
      'reviewPolicyVersion',
      'snapshotBinding',
      'evidenceDecisions',
      'relationshipDecisions',
    ],
    'Governance companion',
  );
  assert(governance.kind === GOVERNANCE_KIND, 'Governance companion has invalid kind');
  assert(
    governance.schemaVersion === GOVERNANCE_SCHEMA_VERSION,
    'Governance companion has unsupported schemaVersion',
  );
  assert(
    governance.reviewPolicyVersion === REVIEW_POLICY_VERSION,
    'Governance companion has invalid reviewPolicyVersion',
  );
  assertExactFields(
    governance.snapshotBinding,
    ['version', 'canonicalSha256', 'reviewedAt'],
    'Governance snapshotBinding',
  );
  assert(
    governance.snapshotBinding.version === snapshot.version,
    'Governance snapshotBinding.version does not match snapshot',
  );
  assert(
    governance.snapshotBinding.reviewedAt === snapshot.reviewedAt,
    'Governance snapshotBinding.reviewedAt does not match snapshot',
  );
  assert(
    governance.snapshotBinding.canonicalSha256 === digest,
    'Governance snapshotBinding.canonicalSha256 does not match snapshot',
  );
  Object.entries(LEGACY_GOVERNANCE_BINDING).forEach(([field, expected]) =>
    assert(
      governance.snapshotBinding[field] === expected,
      `Compatibility governance ${field} must equal ${expected}`,
    ),
  );

  const evidenceDecisions = validateGovernanceDecisionCollection({
    decisions: governance.evidenceDecisions,
    subjects: workspace.candidateRecords,
    kind: 'evidence',
  });
  const relationshipDecisions = validateGovernanceDecisionCollection({
    decisions: governance.relationshipDecisions,
    subjects: workspace.candidateRelationships,
    kind: 'relationship',
  });
  [...governance.evidenceDecisions, ...governance.relationshipDecisions].forEach((decision) =>
    Object.entries(LEGACY_REVIEW_METADATA).forEach(([field, expected]) =>
      assert(
        decision[field] === expected,
        `Compatibility governance ${decision.subjectId} must use the complete reserved legacy tuple`,
      ),
    ),
  );
  return { evidenceDecisions, relationshipDecisions };
}

function governanceCheckCommand(options) {
  const snapshotPath = requireOption(options, 'snapshot');
  const governancePath = requireOption(options, 'governance');
  const asOf = requireOption(options, 'as-of');
  const strict = booleanOption(options, 'strict');
  assert(
    isCanonicalPolicyTimestamp(asOf),
    '--as-of must be a canonical UTC instant in YYYY-MM-DDTHH:mm:ssZ form',
  );

  const snapshotInput = readJson(snapshotPath);
  const workspace = validateApprovedSnapshot(snapshotInput.value);
  const digest = snapshotSha256(snapshotInput.value);
  const governanceInput = readJson(governancePath);
  const decisions = validateGovernanceCompanion(
    governanceInput.value,
    snapshotInput.value,
    digest,
    workspace,
  );

  const evidenceCalculationById = new Map();
  const rows = workspace.candidateRecords.map((record) => {
    const decision = decisions.evidenceDecisions.get(record.id);
    const cadence = evidenceCadence(record, decision.reviewedAt);
    evidenceCalculationById.set(record.id, cadence);
    return {
      subjectKind: 'evidence',
      subjectId: record.id,
      reviewedAt: decision.reviewedAt,
      baseCadenceDays: cadence.baseCadenceDays,
      nextReviewAt: cadence.nextReviewAt,
      dueBasis: 'subject-cadence',
      asOf,
      reviewDue: Date.parse(asOf) >= Date.parse(cadence.nextReviewAt),
    };
  });

  workspace.candidateRelationships.forEach((relationship) => {
    const decision = decisions.relationshipDecisions.get(relationship.id);
    const baseCadenceDays = RELATIONSHIP_CADENCE_DAYS[relationship.type];
    assert(baseCadenceDays, `Relationship ${relationship.id} has unsupported cadence type ${relationship.type}`);
    const ownNextReviewAt = addElapsedDays(decision.reviewedAt, baseCadenceDays);
    const supportingEvidence = relationship.evidenceIds
      .map((evidenceId) => {
        const calculation = evidenceCalculationById.get(evidenceId);
        assert(calculation, `Relationship ${relationship.id} references unresolved evidence ${evidenceId}`);
        return { evidenceId, nextReviewAt: calculation.nextReviewAt };
      })
      .sort((left, right) => {
        const timeDifference = Date.parse(left.nextReviewAt) - Date.parse(right.nextReviewAt);
        if (timeDifference !== 0) return timeDifference;
        return left.evidenceId < right.evidenceId ? -1 : left.evidenceId > right.evidenceId ? 1 : 0;
      });
    const earliestEvidence = supportingEvidence[0];
    const cappedByEvidence = Date.parse(earliestEvidence.nextReviewAt) < Date.parse(ownNextReviewAt);
    const nextReviewAt = cappedByEvidence ? earliestEvidence.nextReviewAt : ownNextReviewAt;
    rows.push({
      subjectKind: 'relationship',
      subjectId: relationship.id,
      reviewedAt: decision.reviewedAt,
      baseCadenceDays,
      nextReviewAt,
      dueBasis: cappedByEvidence
        ? `supporting-evidence:${earliestEvidence.evidenceId}`
        : 'subject-cadence',
      asOf,
      reviewDue: Date.parse(asOf) >= Date.parse(nextReviewAt),
    });
  });

  rows.sort(compareSubjectRows);
  const evidenceRows = rows.filter((row) => row.subjectKind === 'evidence');
  const relationshipRows = rows.filter((row) => row.subjectKind === 'relationship');
  const dueRows = rows.filter((row) => row.reviewDue);
  console.log(
    JSON.stringify(
      {
        valid: true,
        reviewPolicyVersion: REVIEW_POLICY_VERSION,
        snapshot: {
          path: snapshotInput.resolved,
          version: snapshotInput.value.version,
          reviewedAt: snapshotInput.value.reviewedAt,
          canonicalSha256: digest,
        },
        governance: governanceInput.resolved,
        asOf,
        strict,
        summary: {
          subjects: rows.length,
          evidence: evidenceRows.length,
          relationships: relationshipRows.length,
          reviewCurrent: rows.length - dueRows.length,
          reviewDue: dueRows.length,
        },
        rows,
      },
      null,
      2,
    ),
  );
  if (strict && dueRows.length > 0) process.exitCode = 2;
}

function promoteCommand(options) {
  const snapshotPath = requireOption(options, 'snapshot');
  const expectedVersion = requireOption(options, 'expect-version');
  const expectedReviewedAt = requireOption(options, 'expect-reviewed-at');
  const expectedSha256 = requireOption(options, 'expect-sha256').toLowerCase();
  const out = requireOption(options, 'out');
  const input = readJson(snapshotPath);
  const previous = options.previous ? readPrevious(options.previous) : null;
  const workspace = validateApprovedSnapshot(input.value, previous);
  const digest = snapshotSha256(input.value);

  assert(
    /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(input.value.version),
    'Snapshot version is not safe for a versioned generated filename',
  );
  assert(
    input.value.version === expectedVersion,
    `Snapshot version ${input.value.version} does not match explicit confirmation ${expectedVersion}`,
  );
  assert(
    input.value.reviewedAt === expectedReviewedAt,
    `Snapshot reviewedAt ${input.value.reviewedAt} does not match explicit confirmation ${expectedReviewedAt}`,
  );
  assert(/^[a-f0-9]{64}$/.test(expectedSha256), '--expect-sha256 must be a 64-character SHA-256');
  assert(
    digest === expectedSha256,
    `Snapshot SHA-256 ${digest} does not match explicit confirmation ${expectedSha256}`,
  );

  const resolvedOut = absolute(out);
  assert(
    path.basename(resolvedOut) === `${input.value.version}.generated.js`,
    `Promotion output must be named ${input.value.version}.generated.js`,
  );

  const resolved = writeNewText(
    out,
    promotionModuleSource(input.value, digest),
    [snapshotPath, options.previous].filter(Boolean),
  );
  console.log(
    `Promoted explicitly confirmed snapshot ${input.value.version} (${workspace.candidateRecords.length} evidence, ${workspace.candidateRelationships.length} relationships, sha256 ${digest}) to ${resolved}`,
  );
}

async function verifyPromotionCommand(options) {
  const snapshotPath = requireOption(options, 'snapshot');
  const modulePath = requireOption(options, 'module');
  const input = readJson(snapshotPath);
  const previous = options.previous ? readPrevious(options.previous) : null;
  const workspace = validateApprovedSnapshot(input.value, previous);
  const digest = snapshotSha256(input.value);
  const promoted = readText(modulePath);
  assert(
    promoted.value === promotionModuleSource(input.value, digest),
    `Promoted module ${promoted.resolved} does not exactly match deterministic output for approved snapshot ${digest}`,
  );
  console.log(
    JSON.stringify(
      {
        valid: true,
        snapshot: input.resolved,
        module: promoted.resolved,
        version: input.value.version,
        reviewedAt: input.value.reviewedAt,
        evidenceRecords: workspace.candidateRecords.length,
        relationships: workspace.candidateRelationships.length,
        approvedOnly: true,
        deeplyFrozen: true,
        sha256: digest,
      },
      null,
      2,
    ),
  );
}

function diffCollection(previousItems, currentItems, fingerprint) {
  const previousById = new Map(previousItems.map((item) => [item.id, item]));
  const currentById = new Map(currentItems.map((item) => [item.id, item]));
  const added = [...currentById.keys()].filter((id) => !previousById.has(id)).sort();
  const removed = [...previousById.keys()].filter((id) => !currentById.has(id)).sort();
  const shared = [...currentById.keys()].filter((id) => previousById.has(id)).sort();
  const contentChanged = shared.filter(
    (id) => fingerprint(previousById.get(id)) !== fingerprint(currentById.get(id)),
  );
  const reviewStatusChanged = shared
    .filter((id) => previousById.get(id).reviewStatus !== currentById.get(id).reviewStatus)
    .map((id) => ({
      id,
      from: previousById.get(id).reviewStatus,
      to: currentById.get(id).reviewStatus,
    }));
  return {
    added,
    removed,
    contentChanged,
    reviewStatusChanged,
    unchanged: shared.filter(
      (id) => !contentChanged.includes(id) && !reviewStatusChanged.some((item) => item.id === id),
    ).length,
  };
}

function diffCommand(options) {
  const previousPath = requireOption(options, 'previous');
  const currentPath = requireOption(options, 'current');
  const previous = readWorkspace(previousPath);
  const current = readWorkspace(currentPath);
  assertUniqueIds(previous.candidateRecords, 'Previous evidence');
  assertUniqueIds(current.candidateRecords, 'Current evidence');
  assertUniqueIds(previous.candidateRelationships, 'Previous relationships');
  assertUniqueIds(current.candidateRelationships, 'Current relationships');
  console.log(
    JSON.stringify(
      {
        previous: { path: previous.resolved, version: previous.version },
        current: { path: current.resolved, version: current.version },
        evidence: diffCollection(
          previous.candidateRecords,
          current.candidateRecords,
          fingerprintWithoutReview,
        ),
        relationships: diffCollection(
          previous.candidateRelationships,
          current.candidateRelationships,
          fingerprintWithoutReview,
        ),
      },
      null,
      2,
    ),
  );
}

function printHelp() {
  console.log(`Evidence snapshot workflow (local files only; never fetches sources)

Commands:
  export   --out <workspace.json>
  prepare  --workspace <workspace.json> --kind evidence|relationship
           --template-id <existing-id> --id <new-id> [--mode new|revision]
           --out <new-workspace.json> [--previous <file>]
  validate --workspace <workspace.json> [--previous <workspace-or-snapshot.json>]
  inspect  --workspace <workspace.json> --id <id> [--kind evidence|relationship] [--previous <file>]
  review   --workspace <workspace.json> --kind evidence|relationship --id <id>
           --status proposed|needs-review|approved|rejected|stale
           [--reviewed-at <ISO UTC>] [--reviewer-ref <opaque-ref>]
           [--reviewer-role <controlled-role>] [--review-method <controlled-method>]
           [--decision-reason <controlled-reason>]
           --out <new-workspace.json> [--previous <file>]
  snapshot --workspace <workspace.json> --version <version> --created-at <ISO UTC>
           --reviewed-at <ISO UTC> --out <new-snapshot.json> [--previous <file>]
  load     --snapshot <snapshot.json> [--previous <workspace-or-snapshot.json>]
  diff     --previous <workspace-or-snapshot.json> --current <workspace-or-snapshot.json>
  promote  --snapshot <approved-snapshot.json> --expect-version <version>
           --expect-reviewed-at <ISO UTC> --expect-sha256 <canonical-sha256>
           --out <version.generated.js> [--previous <workspace-or-snapshot.json>]
  verify-promotion --snapshot <approved-snapshot.json> --module <version.generated.js>
                   [--previous <workspace-or-snapshot.json>]
  governance-check --snapshot <approved-snapshot.json> --governance <review.json>
                   --as-of <YYYY-MM-DDTHH:mm:ssZ> [--strict]

Every writing command refuses to overwrite an input or existing output file.
Payload edits require a new immutable evidence/relationship ID and explicit revision lineage.
Promotion requires exact version, reviewedAt, and canonical SHA-256 confirmation.
Governance checks are read-only; --strict exits 2 when valid subjects are review-due.`);
}

async function main() {
  const { command, options } = parseArguments(process.argv.slice(2));
  const commands = {
    export: exportWorkspace,
    prepare: prepareCommand,
    validate: validateCommand,
    inspect: inspectCommand,
    review: reviewCommand,
    snapshot: snapshotCommand,
    load: loadCommand,
    diff: diffCommand,
    promote: promoteCommand,
    'verify-promotion': verifyPromotionCommand,
    'governance-check': governanceCheckCommand,
  };
  if (!command || command === 'help' || command === '--help') {
    printHelp();
    return;
  }
  assert(commands[command], `Unknown command ${command}; run with help for usage`);
  await commands[command](options);
}

try {
  await main();
} catch (error) {
  console.error(`Evidence workflow error: ${error.message}`);
  process.exitCode = 1;
}
