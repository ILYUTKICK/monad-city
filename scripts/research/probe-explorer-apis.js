#!/usr/bin/env node
// Probe public Monad explorer APIs for build-time usability (Phase 5.3 deployment resolution).
//
// Purpose: the 105 App-portal-only pending groups need a Monad mainnet deployment record
// (scale plan §3.1). This script asks ONE question per candidate explorer: can a plain
// dependency-free Node fetch reach a public REST endpoint from a build-time script? It does
// NOT resolve deployments, does not scrape pages, and never invents deployment facts — the
// dated artifact it emits is the evidence base for the explorer-source decision.
//
// Output: data/research/monad-explorer-api-probe-<UTC-date>.json (exclusive creation; a
// same-day re-run needs an explicit --out suffix, mirroring the seed-artifact dating rules).
// Research artifact only: the browser never reads it, nothing here is approved or promoted.

import fs from 'node:fs';
import path from 'node:path';

const PROBES = [
  // Blockscout-style REST v2 candidates
  { id: 'monadexplorer-blockscout-v2', explorer: 'MonadExplorer', baseUrl: 'https://monadexplorer.com', probeUrl: 'https://monadexplorer.com/api/v2/stats', expects: 'blockscout-v2' },
  { id: 'socialscan-monad-v2', explorer: 'SocialScan (Monad)', baseUrl: 'https://monad.socialscan.io', probeUrl: 'https://monad.socialscan.io/api/v2/stats', expects: 'blockscout-v2' },
  { id: 'hoodscan-monad-v2', explorer: 'HoodScan (Monad)', baseUrl: 'https://monad.hoodscan.io', probeUrl: 'https://monad.hoodscan.io/api/v2/stats', expects: 'blockscout-v2' },
  { id: 'monadvision-v2', explorer: 'MonadVision', baseUrl: 'https://monadvision.com', probeUrl: 'https://monadvision.com/api/v2/stats', expects: 'blockscout-v2' },
  { id: 'blockscout-hosted-monad', explorer: 'Blockscout hosted instance', baseUrl: 'https://monad.blockscout.com', probeUrl: 'https://monad.blockscout.com/api/v2/stats', expects: 'blockscout-v2' },
  // Etherscan-compatible candidates
  { id: 'monadscan-v1', explorer: 'MonadScan (V1)', baseUrl: 'https://monadscan.com', probeUrl: 'https://api.monadscan.com/api?module=proxy&action=eth_blockNumber', expects: 'etherscan-v1' },
  { id: 'monadscan-site-v2-path', explorer: 'MonadScan (site /api/v2)', baseUrl: 'https://monadscan.com', probeUrl: 'https://monadscan.com/api/v2/stats', expects: 'etherscan-v2' },
  { id: 'etherscan-v2-multichain-keyless', explorer: 'Etherscan V2 multichain (keyless attempt)', baseUrl: 'https://api.etherscan.io', probeUrl: 'https://api.etherscan.io/v2/api?chainid=143&module=proxy&action=eth_blockNumber', expects: 'etherscan-v2' },
  // Aggregator
  { id: 'routescan-143', explorer: 'Routescan', baseUrl: 'https://api.routescan.io', probeUrl: 'https://api.routescan.io/v2/network/mainnet/evm/143/etherscan/api?module=proxy&action=eth_blockNumber', expects: 'etherscan-v1' },
];

const UA = 'monad-city-research/1.0 (build-time probe; no runtime fetching)';

function classify(json, expects) {
  if (json === null) return 'non-json';
  if (expects === 'blockscout-v2') {
    if (json && typeof json === 'object' && ('total_blocks' in json || 'average_block_time' in json)) return 'json-api-ok';
    if (json && json.error && json.error.code === 'challenge') return 'bot-challenge';
    return 'json-unrecognized';
  }
  if (expects === 'etherscan-v1' || expects === 'etherscan-v2') {
    if (json && typeof json.status === 'string' && json.message) {
      if (json.status === '1') return 'json-api-ok';
      if (/missing|invalid api key/i.test(String(json.result))) return 'requires-api-key';
      if (/deprecated/i.test(String(json.result)) || /v2-migration/i.test(String(json.result))) return 'deprecated-endpoint';
      return 'json-api-error';
    }
    return 'json-unrecognized';
  }
  return 'json-unrecognized';
}

async function probeOne(entry) {
  const result = {
    id: entry.id,
    explorer: entry.explorer,
    probeUrl: entry.probeUrl,
    httpStatus: null,
    contentType: null,
    classification: 'error',
    detail: null,
    probedAtUtc: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  };
  try {
    const res = await fetch(entry.probeUrl, {
      headers: { accept: 'application/json', 'user-agent': UA },
      signal: AbortSignal.timeout(15000),
    });
    result.httpStatus = res.status;
    result.contentType = res.headers.get('content-type');
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { json = null; }
    if (res.status === 403 && /just a moment|cloudflare/i.test(text)) {
      result.classification = 'bot-challenge';
      result.detail = 'Cloudflare browser challenge; not reachable from a build-time script.';
    } else if (res.status === 404) {
      result.classification = 'not-found';
      result.detail = text.slice(0, 120);
    } else if (res.status === 429) {
      result.classification = classify(json, entry.expects) === 'bot-challenge' ? 'bot-challenge' : 'rate-limited';
      result.detail = json?.error?.message ?? text.slice(0, 120);
    } else if (res.ok) {
      result.classification = classify(json, entry.expects);
      result.detail = json
        ? JSON.stringify(json).slice(0, 200)
        : `non-JSON ${result.contentType ?? ''} body (len ${text.length})`;
    } else {
      result.classification = 'http-error';
      result.detail = text.slice(0, 120);
    }
  } catch (error) {
    result.detail = String(error.cause?.code ?? error.message).slice(0, 200);
  }
  return result;
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out') { options.out = argv[i + 1]; i += 1; }
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const dateStamp = new Date().toISOString().slice(0, 10);
  const outPath = path.resolve(
    options.out ?? path.join('data', 'research', `monad-explorer-api-probe-${dateStamp}.json`),
  );
  if (!outPath.startsWith(path.resolve('data', 'research') + path.sep)) {
    throw new Error('refusing to write outside data/research/');
  }
  if (fs.existsSync(outPath)) {
    throw new Error(`refusing to overwrite ${outPath} (exclusive creation; pass --out with a fresh suffix)`);
  }

  const probes = [];
  for (const entry of PROBES) probes.push(await probeOne(entry));

  const usable = probes.filter((p) => p.classification === 'json-api-ok');
  const keyed = probes.filter((p) => p.classification === 'requires-api-key');
  const verdict = {
    keylessPublicApiUsable: usable.length > 0,
    usableIds: usable.map((p) => p.id),
    keyedOnlyIds: keyed.map((p) => p.id),
    conclusion: usable.length > 0
      ? 'A keyless public explorer API answered; deployment-resolution work may proceed against it.'
      : keyed.length > 0
        ? 'No keyless public explorer API is reachable from a build-time script. The reliable route (Etherscan V2 multichain, chainid 143) requires an API key — an owner explorer-source decision. No deployment facts may be drafted until that decision or a keyless source appears.'
        : 'No public explorer API (keyless or keyed) was reachable; do not draft deployment facts.',
  };

  const artifact = {
    kind: 'monad-city-research-probe',
    schemaVersion: '1',
    generatedAtUtc: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    question: 'Is there a reliable PUBLIC Monad mainnet explorer API usable at build time (dependency-free Node fetch, no browser, no secrets)?',
    network: { name: 'Monad mainnet', chainId: 143 },
    method: 'Plain HTTPS GET per candidate REST endpoint with a JSON accept header and a research user-agent; response classified (json-api-ok / requires-api-key / bot-challenge / deprecated-endpoint / not-found / error). No scraping, no challenge solving, no retries.',
    verdict,
    probes,
    note: 'Research probe only. It resolves no deployments and asserts no project facts; it never enters the runtime and is never fetched by the browser. Re-runs on a new UTC date create a new dated artifact.',
  };

  fs.writeFileSync(outPath, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(`Probe artifact written: ${outPath}`);
  console.log(`verdict: ${verdict.conclusion}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
