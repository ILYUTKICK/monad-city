// Exact, reviewed portable snapshot pins. Adding a release is an explicit code change.
export const REGISTRY_RELEASES = Object.freeze({
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
