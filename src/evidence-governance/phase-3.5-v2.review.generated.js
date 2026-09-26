// Versioned runtime companion for data/evidence-governance/phase-3.5-v2.review.json.
// It contains governance decisions only; evidence payloads remain in the promoted snapshot.
const REVIEW_POLICY_VERSION = 'phase-3.7-review-policy-v1';
// Release-display instant for this runtime only; it is derived-report input, not a decision field.
export const GOVERNANCE_RELEASE_AS_OF = '2026-09-23T00:00:00Z';

const LEGACY_METADATA = Object.freeze({
  reviewerRef: 'legacy-unattributed:phase-3.5-v2',
  reviewerRole: 'legacy-unattributed',
  reviewMethod: 'legacy-approved-projection-import',
  decisionReason: 'legacy-approved-projection',
  reviewPolicyVersion: REVIEW_POLICY_VERSION,
});

const decision = (subjectId, reviewedAt) =>
  Object.freeze({
    subjectId,
    decision: 'approved',
    ...LEGACY_METADATA,
    reviewedAt,
  });

export const APPROVED_EVIDENCE_GOVERNANCE = Object.freeze({
  kind: 'monad-city-evidence-review-governance',
  schemaVersion: '1',
  reviewPolicyVersion: REVIEW_POLICY_VERSION,
  snapshotBinding: Object.freeze({
    version: 'phase-3.5-v2',
    canonicalSha256: '8edfddcce8caadb5861b5e2164f7a1d8755e01f6c369eb1cab8e0ffd996d3e58',
    reviewedAt: '2026-09-22T22:02:32Z',
  }),
  evidenceDecisions: Object.freeze([
    decision('E-MONAD-CAP-001', '2026-09-09T07:43:40Z'),
    decision('E-MONAD-MAINNET-001', '2026-09-09T07:43:40Z'),
    decision('E-MONAD-NET-001', '2026-09-09T07:43:40Z'),
    decision('E-KURU-CAP-001', '2026-09-09T07:43:40Z'),
    decision('E-KURU-CONTRACTS-001', '2026-09-09T07:43:40Z'),
    decision('E-KURU-REGISTRY-001', '2026-09-09T07:43:40Z'),
    decision('E-KURU-CHAIN-001', '2026-09-09T07:43:40Z'),
    decision('E-APRIORI-CAP-001', '2026-09-09T07:43:40Z'),
    decision('E-APRIORI-REGISTRY-001', '2026-09-09T07:43:40Z'),
    decision('E-APRIORI-CHAIN-001', '2026-09-09T07:43:40Z'),
    decision('E-MAGMA-CAP-001', '2026-09-09T07:43:40Z'),
    decision('E-MAGMA-REGISTRY-001', '2026-09-09T07:43:40Z'),
    decision('E-MAGMA-CHAIN-001', '2026-09-09T07:43:40Z'),
    decision('E-SWITCHBOARD-CAP-001', '2026-09-09T07:43:40Z'),
    decision('E-SWITCHBOARD-MEM-001', '2026-09-09T07:43:40Z'),
    decision('E-SWITCHBOARD-REGISTRY-001', '2026-09-09T07:43:40Z'),
    decision('E-PYTH-PUSH-001', '2026-09-09T07:43:40Z'),
    decision('E-PYTH-MEM-001', '2026-09-09T07:43:40Z'),
    decision('E-PYTH-REGISTRY-001', '2026-09-09T07:43:40Z'),
    decision('E-PYTH-CHAIN-001', '2026-09-09T07:43:40Z'),
    decision('E-MAGMA-SWITCHBOARD-001', '2026-09-09T07:43:40Z'),
    decision('E-KURU-MEM-002', '2026-09-22T22:02:32Z'),
  ]),
  relationshipDecisions: Object.freeze([
    decision('monad-apriori', '2026-09-09T07:43:40Z'),
    decision('monad-magma', '2026-09-09T07:43:40Z'),
    decision('monad-switchboard', '2026-09-09T07:43:40Z'),
    decision('magma-switchboard', '2026-09-09T07:43:40Z'),
    decision('monad-kuru-002', '2026-09-22T22:02:32Z'),
    decision('monad-pyth-002', '2026-09-22T22:02:32Z'),
  ]),
});
