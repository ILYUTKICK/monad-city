#!/usr/bin/env node
// Phase 5.3 — pending-deployment resolution for the 105 App-portal-only intake groups.
//
// Owner decision (2026-09-27, recorded in docs/WORKLOG.md): Etherscan V2 multichain with a
// free API key is the explorer source for Monad mainnet (chainid 143). The key lives OUTSIDE
// the repo (default ~/.config/monad-city/etherscan-key or ETHERSCAN_API_KEY env). It must
// never be committed, logged, or written into any artifact — stored explorer URLs are
// constructed without the apikey parameter.
//
// What this does:
//   1. Match the pending intake groups against candidate-address sources:
//        - the PINNED monad-crypto/protocols registry (same pinned commit the approved
//          protocol-registry-snapshot records cite) — 180 entries, name/slug → Monad addresses;
//        - the CURRENT full DefiLlama protocol list (in-memory capture) — a Monad chain tag
//          is the established §3 inclusion basis (batch-2 vocabulary interpretation), and a
//          dominant-chain address becomes a cross-chain candidate (same address can hold the
//          contract on Monad for deterministic deployments).
//   2. Verify each candidate address on Monad via Etherscan V2: eth_getCode (is a contract
//      deployed?) and getsourcecode (verified ContractName / proxy metadata). The API has no
//      name search — name→address resolution happens ONLY from the seed registries above.
//   3. Emit data/research/pending-deployments-<UTC-date>.json (exclusive creation) with a
//      per-project verdict + source URLs.
//
// This is a research artifact: nothing enters the snapshot without the evidence workflow
// (drafting evidence records + human review). "resolved" never means verified, safe, active,
// or endorsed — it means a Monad deployment record exists with the stated basis.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PINNED_REGISTRY_URL =
  'https://raw.githubusercontent.com/monad-crypto/protocols/36fddcc0021fffe81c7b73a8672347538ec2c9eb/protocols-mainnet.json';
const DEFILLAMA_URL = 'https://api.llama.fi/protocols';
const V2_BASE = 'https://api.etherscan.io/v2/api?chainid=143';
const V2_CALL_DELAY_MS = 420; // this key tier allows 3 calls/sec; stay below
const MAX_ADDRESSES_PER_PROJECT = 6;
const VARIANT_TOKENS = /(v1|v2|v3|amm|dex|cl|clob|staking|exchange|swap|finance)$/;

function normalize(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '').replace(VARIANT_TOKENS, '');
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out') { options.out = argv[i + 1]; i += 1; }
    if (argv[i] === '--key-file') { options.keyFile = argv[i + 1]; i += 1; }
    if (argv[i] === '--report') { options.report = argv[i + 1]; i += 1; }
  }
  return options;
}

function loadKey(options) {
  if (process.env.ETHERSCAN_API_KEY) return process.env.ETHERSCAN_API_KEY.trim();
  const keyFile = options.keyFile ?? path.join(os.homedir(), '.config', 'monad-city', 'etherscan-key');
  const key = fs.readFileSync(keyFile, 'utf8').trim();
  if (!key) throw new Error(`key file ${keyFile} is empty`);
  return key;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isRateLimited(json) {
  return (json.status === '0' && /rate limit/i.test(String(json.result)))
    || /rate limit/i.test(String(json.error?.message ?? ''));
}

async function v2Get(key, params) {
  const url = `${V2_BASE}&${params}&apikey=${key}`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    const json = await res.json();
    if (isRateLimited(json)) {
      await sleep(1200);
      continue;
    }
    return json;
  }
  return { status: '0', message: 'NOTOK', result: 'rate limit persists after retry' };
}

async function verifyAddress(key, address) {
  // module=proxy answers in the JSON-RPC envelope ({result: "0x..."}), module=contract in the
  // status envelope ({status: "1", result: [...]}) — check the payload shape, not the envelope.
  const code = await v2Get(key, `module=proxy&action=eth_getCode&address=${address}&tag=latest`);
  // Only a hex string is bytecode; error/rate-limit envelopes put prose in `result`.
  const bytecode = typeof code.result === 'string' && /^0x[0-9a-fA-F]*$/.test(code.result) ? code.result : null;
  if (bytecode === null) {
    return { hasCode: false, error: String(code.error?.message ?? code.result ?? 'unknown error').slice(0, 140) };
  }
  if (bytecode.length <= 2) return { hasCode: false };
  const source = await v2Get(key, `module=contract&action=getsourcecode&address=${address}`);
  if (source.status !== '1' || !Array.isArray(source.result) || !source.result[0]) {
    return { hasCode: true, contractName: null, detail: String(source.result ?? '').slice(0, 140) };
  }
  const row = source.result[0];
  return {
    hasCode: true,
    contractName: row.ContractName || null,
    isProxy: row.Proxy === '1',
    implementation: row.Implementation || null,
  };
}

function nameCompatible(contractName, projectName) {
  if (!contractName) return false;
  const a = normalize(contractName);
  const b = normalize(projectName);
  if (!a || !b) return false;
  return a === b || a.startsWith(b) || b.startsWith(a) || a.includes(b) || b.includes(a);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const key = loadKey(options);
  const generatedAtUtc = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const dateStamp = generatedAtUtc.slice(0, 10);

  const outPath = path.resolve(
    options.out ?? path.join('data', 'research', `pending-deployments-${dateStamp}.json`),
  );
  if (!outPath.startsWith(path.resolve('data', 'research') + path.sep)) {
    throw new Error('refusing to write outside data/research/');
  }
  if (fs.existsSync(outPath)) {
    throw new Error(`refusing to overwrite ${outPath} (exclusive creation; pass --out with a fresh suffix)`);
  }

  const reportPath = path.resolve(options.report ?? path.join('data', 'research', 'intake-report-2026-09-27.json'));
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const pending = report.groups.filter((group) => group.outcome === 'pending');
  console.log(`pending groups: ${pending.length}`);

  // ---- candidate source 1: pinned monad-crypto registry ----
  const registry = await (await fetch(PINNED_REGISTRY_URL, { signal: AbortSignal.timeout(20000) })).json();
  const registryIndex = new Map();
  for (const [entryKey, entry] of Object.entries(registry)) {
    if (entryKey === 'CANONICAL') continue; // meta entry, not a project
    const candidate = { registryKey: entryKey, registryName: entry.name ?? entryKey, addresses: entry.addresses ?? {}, live: entry.live === true };
    registryIndex.set(normalize(entryKey), candidate);
    if (entry.name) registryIndex.set(normalize(entry.name), candidate);
  }
  console.log(`registry entries indexed: ${[...registryIndex.keys()].length}`);

  // ---- candidate source 2: current full DefiLlama list (in-memory capture) ----
  const llamaResponse = await (await fetch(DEFILLAMA_URL, { signal: AbortSignal.timeout(60000) })).json();
  const llamaIndex = new Map();
  for (const protocol of llamaResponse) {
    llamaIndex.set(normalize(protocol.name), protocol);
  }
  console.log(`defillama protocols indexed: ${llamaIndex.size}`);

  // ---- resolve + verify ----
  const projects = [];
  const summary = {};

  for (const group of pending) {
    const nameCandidates = [...group.names, ...(group.portalSlugs ?? [])].map(normalize);
    const registryCandidate = nameCandidates.map((n) => registryIndex.get(n)).find(Boolean) ?? null;
    const llamaCandidate = nameCandidates.map((n) => llamaIndex.get(n)).find(Boolean) ?? null;

    const row = {
      proposedId: group.proposedId,
      canonicalName: group.canonicalName,
      portalSlugs: group.portalSlugs ?? [],
      registry: registryCandidate
        ? {
            key: registryCandidate.registryKey,
            name: registryCandidate.registryName,
            live: registryCandidate.live,
            addresses: Object.entries(registryCandidate.addresses).slice(0, MAX_ADDRESSES_PER_PROJECT),
            sourceUrl: PINNED_REGISTRY_URL,
          }
        : null,
      defillama: llamaCandidate
        ? {
            slug: llamaCandidate.slug,
            name: llamaCandidate.name,
            category: llamaCandidate.category ?? null,
            monadListed: Array.isArray(llamaCandidate.chains) && llamaCandidate.chains.includes('Monad'),
            chains: (llamaCandidate.chains ?? []).slice(0, 12),
            dominantAddress: llamaCandidate.address ?? null,
            sourceUrl: DEFILLAMA_URL,
          }
        : null,
      explorer: [],
      verdict: 'no-candidate',
      sourceUrls: [],
    };

    const candidateAddresses = new Map(); // address -> label
    if (registryCandidate) {
      for (const [label, address] of Object.entries(registryCandidate.addresses).slice(0, MAX_ADDRESSES_PER_PROJECT)) {
        candidateAddresses.set(address, `registry:${registryCandidate.registryKey}:${label}`);
      }
    }
    if (!candidateAddresses.size && llamaCandidate?.dominantAddress) {
      candidateAddresses.set(llamaCandidate.dominantAddress, `defillama-dominant:${llamaCandidate.slug}`);
    }

    for (const [address, label] of candidateAddresses) {
      const check = { address, label, ...await verifyAddress(key, address) };
      row.explorer.push(check);
      await sleep(V2_CALL_DELAY_MS);
    }

    const withCode = row.explorer.filter((check) => check.hasCode);
    const withVerifiedName = withCode.filter((check) => nameCompatible(check.contractName, group.canonicalName));

    if (withVerifiedName.length > 0) row.verdict = 'resolved-explorer-verified-name';
    else if (withCode.length > 0) row.verdict = 'resolved-explorer-contract';
    else if (row.defillama?.monadListed) row.verdict = 'resolved-registry-listing';
    else if (row.registry?.addresses?.length || candidateAddresses.size > 0) row.verdict = 'registry-address-no-code';
    else row.verdict = 'no-candidate';

    if (row.registry?.sourceUrl) row.sourceUrls.push(row.registry.sourceUrl);
    if (row.defillama?.sourceUrl) row.sourceUrls.push(row.defillama.sourceUrl);
    if (row.explorer.length > 0) {
      row.sourceUrls.push('https://api.etherscan.io/v2/api?chainid=143 (eth_getCode / getsourcecode; key omitted)');
    }

    summary[row.verdict] = (summary[row.verdict] ?? 0) + 1;
    projects.push(row);
    process.stdout.write(`${row.verdict.padEnd(32)} ${row.canonicalName}\n`);
  }

  const artifact = {
    kind: 'monad-city-research-deployment-resolution',
    schemaVersion: '1',
    generatedAtUtc,
    network: { name: 'Monad mainnet', chainId: 143 },
    question: 'Which App-portal-only pending groups have a resolvable Monad mainnet deployment (scale plan §3 identity key)?',
    method: 'Name→candidate matching ONLY against seed registries (pinned monad-crypto/protocols commit 36fddcc; current api.llama.fi/protocols capture). Candidate addresses verified on Monad via Etherscan V2 multichain (owner key, read from outside the repo; eth_getCode then getsourcecode). The explorer API has no name search — nothing is matched from explorer text alone. Exact normalized-name matches only; no fuzzy merges.',
    verdicts: {
      'resolved-explorer-verified-name': 'candidate address holds a live contract on Monad AND its verified ContractName is compatible with the project name (strongest; still only an observation).',
      'resolved-explorer-contract': 'candidate address holds a live contract on Monad; verified name absent or not name-compatible (registry mapping is the name basis).',
      'resolved-registry-listing': 'current DefiLlama capture lists the protocol on the Monad chain tag (established §3 basis); no address verified.',
      'registry-address-no-code': 'a candidate address exists in the seeds but holds no contract code on Monad — stale registry entry or non-Monad deployment; NOT proof of absence of a deployment.',
      'no-candidate': 'no seed registry matched the name; deployment unresolved. NOT a negative verdict about the project.',
    },
    keyHandling: 'API key read from ~/.config/monad-city/etherscan-key (or ETHERSCAN_API_KEY). Never logged, never stored in this artifact, never committed; explorer URLs above are keyless.',
    summary,
    projects,
    note: 'Research artifact for the intake pipeline. A "resolved" verdict means a deployment record exists with the stated basis — it is not verification, endorsement, safety, activity, or legitimacy. Evidence records drafted from this artifact still require the full review gate before any snapshot.',
  };

  fs.writeFileSync(outPath, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(`\nArtifact written: ${outPath}`);
  console.log(JSON.stringify(summary, null, 1));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
