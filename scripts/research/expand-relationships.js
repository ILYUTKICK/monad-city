#!/usr/bin/env node
// Bounded, build-time source collection. Creates candidates, never approvals or runtime data.
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const date = '2026-10-10';
const basePath = 'data/evidence-snapshots/phase-3.5-v6.json';
const base = JSON.parse(fs.readFileSync(basePath));
// Restore lineage references omitted from approved-only snapshots. These are withheld,
// needs-review historical payloads, never renewed approvals or withdrawal decisions.
const historicalRecords = new Map(base.records.map(r => [r.id, r]));
const historicalRelationships = new Map(base.relationships.map(r => [r.id, r]));
for (const version of [5, 4, 3, 2, 1]) {
  const prior = JSON.parse(fs.readFileSync(`data/evidence-snapshots/phase-3.5-v${version}.json`));
  for (const [items, map] of [[prior.records, historicalRecords], [prior.relationships, historicalRelationships]]) {
    for (const payload of items) if (!map.has(payload.id)) map.set(payload.id, { ...payload, reviewStatus: 'needs-review', reviewedAt: null, reviewMetadata: null });
  }
}
const beefyCommit = 'b7098b467950b1ac01dbb248241bbc9bfae72e0b';
const perplCommit = '25ab6e2c75c8f84d0550da8c3be30af49ad631f2';
const beefyUrl = `https://raw.githubusercontent.com/beefyfinance/beefy-v2/${beefyCommit}/src/config/vault/monad.json`;
const captured = new Map();
const digest = text => createHash('sha256').update(text).digest('hex');
async function capture(url, publisher, title, required, pinned = false) {
  if (captured.has(url)) return captured.get(url);
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const text = await response.text();
  for (const token of required) if (!text.toLowerCase().includes(token.toLowerCase())) throw new Error(`${url}: missing source token ${token}`);
  const source = { url, publisher, title, kind: pinned ? 'repository-file' : 'documentation-html',
    referenceType: pinned ? 'pinned-snapshot' : 'mutable-url', presentationMutable: !pinned, available: true };
  const item = { source, retrievedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    responseSha256: digest(text), httpStatus: response.status, requiredTokensFound: required, text };
  captured.set(url, item);
  return item;
}
const collected = await capture(beefyUrl, 'Beefy Finance', 'Beefy Monad vault configuration at pinned commit', ['"network": "monad"'], true);
const vaults = JSON.parse(collected.text);
const rows = [];
const commonLimit = 'Publisher declaration only; no transaction, live allocation, reciprocal confirmation, performance or safety claim is established.';
function add({ id, from, to, claim, scope, capturedSource, identifiers = {}, evidenceIds = [], limitations = [], incomplete = false }) {
  const evidenceId = `E-${id.toUpperCase()}-001`;
  const notes = `Source and exact payload inspected for ${from} → ${to}. Response SHA-256 ${capturedSource.responseSha256}. Scope is limited to the publisher's named product/configuration, not a general partnership.`;
  const record = { id: evidenceId, projectId: from, relatedProjectIds: [to], claim,
    evidenceType: 'project-declared-relationship', status: 'Claimed', supportMode: 'publisher-statement-only',
    supportsFactualClaims: true, supportedProposition: scope, scope, network: { name: 'Monad mainnet', chainId: 143 },
    source: capturedSource.source, retrievedAt: capturedSource.retrievedAt, publishedAt: null,
    provenance: { kind: 'manual-curation', notes }, provenanceNotes: notes, identifiers,
    limitations: [commonLimit, ...limitations], conflicts: [],
    quality: { unavailable: false, stale: false, conflict: false, incomplete, timeBoundEligible: false },
    dataMode: 'sourced-limited', reviewStatus: 'needs-review', reviewedAt: null, reviewMetadata: null,
    revision: { sequence: 1, supersedesEvidenceId: null } };
  const relationship = { id, from, to, type: 'declared_integration', status: 'Claimed',
    evidenceIds: [evidenceId, ...evidenceIds], scope, limitations: record.limitations,
    dataMode: 'sourced-limited', reviewStatus: 'needs-review', reviewedAt: null, reviewMetadata: null,
    revision: { sequence: 1, supersedesRelationshipId: null } };
  rows.push({ record, relationship });
}
const platforms = [
  ['aave-v3', 'Aave V3', 'aave', 'aavev3-monad-usdc'],
  ['morpho-blue', 'Morpho', 'morpho', 'morpho-v2-monad-august-usdc-v2'],
  ['euler', 'Euler', 'euler', 'euler-monad-alphagrowth-ausd'],
  ['curve', 'Curve', 'curve', 'curve-monad-mon-lsts'],
  ['balancer', 'Balancer', 'balancer', 'balancerv3-monad-usdt0-ausd-usdc'],
  ['neverland', 'Neverland', 'neverland', 'neverland-monad-wmon'],
  ['pancakeswap', 'PancakeSwap', 'pancakeswap', 'pancake-cow-monad-wmon-usdc-rp'],
  ['uniswap', 'Uniswap', 'uniswap', 'uniswap-cow-monad-wbtc-usdc-rp'],
  ['gearbox', 'Gearbox', 'gearbox', 'gearbox-monad-edge-usdc'],
  ['curvance', 'Curvance', 'curvance', 'curvance-monad-ausd-earnausd-ausd'],
];
for (const [to, name, platformId, vaultId] of platforms) {
  const v = vaults.find(v => v.id === vaultId);
  if (!v || v.network !== 'monad' || v.platformId !== platformId || v.status !== 'active') throw new Error(`Invalid selected vault ${vaultId}`);
  const scope = `Beefy configuration maps Monad product ${vaultId} (${v.name}) to platform ${name}; this is a documented strategy dependency.`;
  add({ id: `beefy-${to}`, from: 'beefy', to, claim: `Beefy's pinned Monad configuration names ${name} as the platform for ${vaultId}.`, scope, capturedSource: collected,
    identifiers: { contracts: [{ address: v.earnContractAddress, role: 'Publisher-listed Beefy product', runtimeDisposition: 'candidate' }] },
    limitations: ['The configuration status field is not independently observed activity; this record does not establish the product is operating now.'] });
}
const registryUrl = 'https://raw.githubusercontent.com/monad-crypto/protocols/36fddcc0021fffe81c7b73a8672347538ec2c9eb/protocols-mainnet.json';
const registrySource = await capture(registryUrl, 'Monad protocol registry contributors', 'Pinned Monad mainnet protocol registry', ['StakedMonad', 'shmonad', 'gMON'], true);
const registry = JSON.parse(registrySource.text);
const basket = vaults.find(v => v.id === 'curve-monad-mon-lsts');
const coins = basket.zaps[0].methods[0].coins.map(a => a.toLowerCase());
const tokenRows = [];
for (const [to, name, token, entry, address] of [
  ['kintsu', 'Kintsu', 'sMON', 'kintsu', '0xA3227C5969757783154C60bF0bC1944180ed81B9'],
  ['magma', 'Magma', 'gMON', 'magma', '0x8498312A6B3CbD158bf0c93AbdCF29E6e4F55081'],
  ['shmonad', 'ShMonad', 'shMON', 'fastlane', '0x1B68626dCa36c7fE922fD2d55E4f631d962dE19c'],
]) {
  if (!coins.includes(address.toLowerCase()) || !Object.values(registry[entry].addresses).some(a => a.toLowerCase() === address.toLowerCase())) throw new Error(`Token identity mismatch ${to}`);
  let identityId = 'E-MAGMA-REGISTRY-001';
  if (to !== 'magma') {
    identityId = `E-${to.toUpperCase()}-TOKEN-MAPPING-001`;
    const scope = `Pinned Monad registry entry ${entry} maps ${name}'s staking token address ${address}; listing/address identity only.`;
    const notes = `Manually inspected registry entry ${entry} and exact address. Response SHA-256 ${registrySource.responseSha256}.`;
    tokenRows.push({ id: identityId, projectId: to, relatedProjectIds: [], claim: scope, scope, supportedProposition: scope,
      evidenceType: 'protocol-registry-snapshot', status: 'Observed', supportMode: 'artifact-observation-only', supportsFactualClaims: true,
      source: { ...registrySource.source, kind: 'registry-json' }, network: { name: 'Monad mainnet', chainId: 143 },
      retrievedAt: registrySource.retrievedAt, publishedAt: '2026-09-07T21:59:59Z',
      provenance: { kind: 'manual-curation', notes }, provenanceNotes: notes,
      identifiers: { contracts: [{ address, role: 'Registry-listed staking token', runtimeDisposition: 'candidate' }] },
      limitations: ['Historical pinned mapping, not current deployment, control, token backing, safety or measured activity.', ...(to === 'shmonad' ? ['Registry uses the Fastlane parent entry; this record maps only the named shMON token, not all Fastlane contracts.'] : [])],
      conflicts: [], quality: { unavailable: false, stale: false, conflict: false, incomplete: false, timeBoundEligible: false },
      dataMode: 'sourced-limited', reviewStatus: 'needs-review', reviewedAt: null, reviewMetadata: null, revision: { sequence: 1, supersedesEvidenceId: null } });
  }
  add({ id: `beefy-${to}-asset`, from: 'beefy', to, capturedSource: collected, evidenceIds: [identityId],
    claim: `Beefy's pinned configuration includes ${token} and address ${address} in curve-monad-mon-lsts; the pinned Monad registry maps that address to ${name}.`,
    scope: `Documented asset dependency through Beefy's Curve basket on Monad: ${token}, mapped to ${name} by exact published address; not a bilateral partnership.`,
    limitations: ['Exposure is through a Curve pool; balances, token backing, redemption and current execution were not checked.'] });
}
const curators = [
  ['steakhouse-financial', 'Steakhouse Financial', 'steakhouse', 'morpho-monad-steakhouse-prime-weth'],
  ['hyperithm', 'Hyperithm', 'hyperithm', 'morpho-monad-hyperithm-usdc'],
  ['august-digital', 'August Digital', 'august-digital', 'morpho-v2-monad-august-usdc-v2'],
];
for (const [to, name, curatorId, vaultId] of curators) {
  const v = vaults.find(v => v.id === vaultId);
  if (v.curatorId !== curatorId || v.network !== 'monad') throw new Error(`Curator mapping mismatch ${vaultId}`);
  add({ id: `beefy-${to}-vault`, from: 'beefy', to, capturedSource: collected,
    claim: `Beefy's Monad configuration identifies ${name} as curator for ${vaultId} and links a named Morpho vault.`,
    scope: `Beefy product ${vaultId} links ${v.underlyingPlatformUrl} and assigns curatorId ${curatorId}; only this product association is supported.`,
    limitations: ['Curator identity is a publisher label, not independently verified control of a curator address.'] });
  const page = await capture(v.underlyingPlatformUrl, 'Morpho Association', `Morpho Monad vault — ${name}`, [name.split(' ')[0], 'Monad']);
  add({ id: `${to}-morpho-vault`, from: to, to: 'morpho-blue', capturedSource: page,
    claim: `Morpho's Monad interface identifies a vault associated with ${name} at ${v.underlyingPlatformUrl.split('/')[5]}.`,
    scope: `Morpho's Monad vault page associates ${name} with the specific named vault; publisher identification, not independently verified curator authority.`,
    identifiers: { contracts: [{ address: v.underlyingPlatformUrl.split('/')[5], role: 'Publisher-listed Morpho vault', runtimeDisposition: 'candidate' }] },
    limitations: ['The page contains changing financial metrics; no metrics, live allocation, wallet identity or onchain curator role are included in this claim.'] });
}
const agora = await capture('https://www.agora.finance/blog/ausd-now-borderless-onchain', 'Agora', 'AUSD: Now Borderless Onchain', ['LayerZero', 'Monad', 'OFT']);
add({ id: 'agora-layerzero-oft', from: 'agora', to: 'layerzero-v2', capturedSource: agora,
  claim: 'Agora announces adoption of LayerZero OFT for AUSD and identifies Monad as the first upgrade.',
  scope: 'Agora’s announcement associates AUSD with LayerZero OFT and Monad; the announcement describes both adoption and future rollout, not a tested bridge route.',
  limitations: ['Rollout language is prospective in part; current routes, peer configuration and bridge security were not checked.'] });
const perpl = await capture(`https://raw.githubusercontent.com/PerplFoundation/api-docs/${perplCommit}/README.md`, 'Perpl Foundation', 'Perpl API documentation — pinned network configuration', ['143', 'AUSD', '0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a'], true);
add({ id: 'perpl-agora-collateral', from: 'perpl', to: 'agora', capturedSource: perpl, evidenceIds: ['E-AGORA-REGISTRY-001'],
  claim: 'Perpl’s mainnet configuration names AUSD as collateral on chain 143, at the same token address mapped to Agora in the pinned Monad registry.',
  scope: 'Documented collateral dependency: Perpl mainnet uses the published AUSD token address associated with Agora in the Monad registry.',
  identifiers: { contracts: [{ address: '0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a', role: 'Documented AUSD collateral', runtimeDisposition: 'candidate' }] },
  limitations: ['Documentation and address correspondence do not prove a live deposited balance, reserve backing or transaction execution.'] });
// LeverUp's own article states oracle architecture; it does not expose a Monad-specific feed mapping.
const lever = await capture('https://paragraph.com/@leverup/oracle-price-integrity-permissioned-validators', 'LeverUp', 'Oracle Integrity: Why Permissioned Validators and Protection Triggers Matter for Perp DEXs', ['LeverUp', 'Pyth Pro', 'permissioned']);
add({ id: 'leverup-pyth-oracle', from: 'leverup', to: 'pyth', capturedSource: lever, evidenceIds: ['E-LEVERUP-MEM-001'], incomplete: true,
  claim: 'LeverUp’s own article states that its oracle system relies on Pyth prices and describes its upgrade to Pyth Pro.',
  scope: 'Oracle-provider architecture declared by LeverUp, a Monad-listed project; the article does not establish an exact Monad mainnet feed or contract mapping.',
  limitations: ['Chain context comes from the existing Monad directory record. The article alone does not identify a chain-specific feed, deployed adapter, freshness or latency.'] });
const workspace = { schemaVersion: base.schemaVersion, kind: 'evidence-candidate-workspace',
  reviewPolicyVersion: base.reviewPolicyVersion,
  baseSnapshot: { version: base.version, createdAt: base.createdAt, reviewedAt: base.reviewedAt },
  candidateRecords: [...historicalRecords.values(), ...tokenRows, ...rows.map(r => r.record)],
  candidateRelationships: [...historicalRelationships.values(), ...rows.map(r => r.relationship)] };
const research = { kind: 'monad-city-relationship-expansion-research', schemaVersion: 1,
  generatedAt: new Date().toISOString(), baseSnapshot: basePath,
  status: 'maintainer-review-required', method: 'Bounded primary-source fetches and manual payload inspection; no automatic approval, no indexer.',
  restoredLineageOnly: { evidence: [...historicalRecords.keys()].filter(id => !base.records.some(r => r.id === id)),
    relationships: [...historicalRelationships.keys()].filter(id => !base.relationships.some(r => r.id === id)) },
  sources: [...captured.values()].map(({ text, ...metadata }) => metadata),
  beefySelections: vaults.filter(v => platforms.some(p => p[3] === v.id) || curators.some(c => c[3] === v.id))
    .map(({ id, name, network, platformId, curatorId, assets, earnContractAddress, underlyingPlatformUrl }) => ({ id, name, network, platformId, curatorId, assets, earnContractAddress, underlyingPlatformUrl })),
  supportingTokenRecords: tokenRows.map(r => ({ id: r.id, claim: r.claim, sourceUrl: r.source.url })),
  relationships: rows.map(({ record, relationship }) => ({ id: relationship.id, from: relationship.from, to: relationship.to, evidenceId: record.id,
    sourceUrl: record.source.url, scope: relationship.scope, limitations: relationship.limitations, incomplete: record.quality.incomplete })),
  limitations: ['Source response hashes document this retrieval; mutable URLs are not content-addressed archives.', 'No published timestamps inferred from retrieval time.', 'No automatic review or runtime promotion.'] };
for (const [name, value] of [['candidates', workspace], ['research', research]]) {
  const output = `data/research/relationship-expansion-${date}.${name}.json`;
  fs.writeFileSync(output, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  console.log(output);
}
console.log(`${rows.length} new relationships, ${rows.length + tokenRows.length} new evidence records, all needs-review.`);
