// Exact, reviewed portable snapshot pins. Adding a release is an explicit code change.
export const REGISTRY_RELEASES = Object.freeze({
  'phase-3.5-v9': Object.freeze({
    version: 'phase-3.5-v9',
    canonicalSha256: '8147e7dedb389f2d8da5af63747aed71114692a1c2052fde0f14cd9b8133f088',
    evidenceCount: 217,
    relationshipCount: 194,
  }),
  'phase-3.5-v8': Object.freeze({
    version: 'phase-3.5-v8',
    canonicalSha256: '8ca75224fa4d0c0772387aacb332acbdeb40237d048b7eeacde7b9984b03eb6c',
    evidenceCount: 217,
    relationshipCount: 194,
  }),
  'phase-3.5-v7': Object.freeze({
    version: 'phase-3.5-v7',
    canonicalSha256: '6a6c7cf9830460fca3ce75bdbfd8510b72b6fba70ada136eb145e45a95155d28',
    evidenceCount: 217,
    relationshipCount: 28,
  }),
  'phase-3.5-v6': Object.freeze({
    version: 'phase-3.5-v6',
    canonicalSha256: '9529251e87f2f713391122e1c1373c666ed83dac97c42f5e5ddde685b94e6b3b',
    evidenceCount: 193,
    relationshipCount: 6,
  }),
});

export function reviewedRegistryRelease(version) {
  const release = REGISTRY_RELEASES[version];
  if (!release) throw new Error(`No reviewed registry release is pinned for ${version}`);
  return release;
}
