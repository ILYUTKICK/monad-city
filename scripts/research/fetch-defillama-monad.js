#!/usr/bin/env node
// Build-time research tooling only. Never imported or fetched by the browser.
//
// Fetches the free DefiLlama protocol listing (https://api.llama.fi/protocols) and filters it
// to entries whose `chains` array includes the Monad chain tag. Writes a dated seed artifact
// under data/research/ for the ecosystem intake pipeline (docs/PROJECT_INTAKE_PIPELINE.md).
//
// The artifact is a research seed, not an evidence snapshot: nothing here is a claim,
// verification, or endorsement. Facts drafted from it stay outside any snapshot until a
// human records an approved review decision.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const SOURCE_URL = 'https://api.llama.fi/protocols';
const REQUIRED_CHAIN_TAG = 'Monad';

function utcDateStamp(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const options = { out: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') {
      options.out = argv[i + 1];
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function assertExclusiveOutput(outPath) {
  if (fs.existsSync(outPath)) {
    throw new Error(
      `Refusing to overwrite existing artifact: ${outPath}. ` +
        'Seed artifacts are dated and immutable; delete the stale file by hand or pick a new path.',
    );
  }
}

function canonicalJson(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const fetchedAtUtc = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const outPath = path.resolve(
    options.out ?? path.join('data', 'research', `defillama-monad-${utcDateStamp()}.json`),
  );
  assertExclusiveOutput(outPath);

  const response = await fetch(SOURCE_URL, {
    headers: { accept: 'application/json', 'user-agent': 'monad-city-research/1.0' },
  });
  if (!response.ok) {
    throw new Error(`DefiLlama request failed: HTTP ${response.status} ${response.statusText}`);
  }
  const protocols = await response.json();
  if (!Array.isArray(protocols)) {
    throw new Error('DefiLlama response is not a protocol array');
  }

  const matched = protocols
    .filter(
      (protocol) =>
        Array.isArray(protocol.chains) &&
        protocol.chains.some((chain) => String(chain).toLowerCase() === REQUIRED_CHAIN_TAG.toLowerCase()),
    )
    .map((protocol) => ({
      // Fields kept per docs/PROJECT_INTAKE_PIPELINE.md §1: name, symbol, category, site, address.
      // `slug` identifies the DefiLlama protocol page URL; `chains` proves the Monad tag filter;
      // `twitter` is an alias signal for identity resolution. `tvl` is used ONLY for batch
      // composition (scale plan §5.1 "top 30 by activity/TVL") — it never reaches manifests,
      // placement, size, order, or any city visual.
      name: typeof protocol.name === 'string' ? protocol.name : null,
      symbol: typeof protocol.symbol === 'string' ? protocol.symbol : null,
      category: typeof protocol.category === 'string' && protocol.category.length > 0 ? protocol.category : null,
      site: typeof protocol.url === 'string' && protocol.url.length > 0 ? protocol.url : null,
      address: typeof protocol.address === 'string' && protocol.address.length > 0 ? protocol.address : null,
      slug: typeof protocol.slug === 'string' ? protocol.slug : null,
      chains: protocol.chains,
      twitter: typeof protocol.twitter === 'string' ? protocol.twitter : null,
      tvl: typeof protocol.tvl === 'number' && Number.isFinite(protocol.tvl) ? protocol.tvl : null,
      // Phase 5.3 prep: compact oracle observations (Monad-chain entries only) — the citable
      // basis for future protocol↔oracle relationship candidates. Registry observations only;
      // proof URLs stay attributed to their origin.
      oracles: Array.isArray(protocol.oraclesBreakdown)
        ? protocol.oraclesBreakdown
            .filter((oracle) =>
              Array.isArray(oracle?.chains) && oracle.chains.some((chain) => chain?.chain === REQUIRED_CHAIN_TAG))
            .map((oracle) => ({
              name: typeof oracle.name === 'string' ? oracle.name : null,
              type: typeof oracle.type === 'string' ? oracle.type : null,
              proof: Array.isArray(oracle.proof) ? oracle.proof.filter((url) => typeof url === 'string') : [],
            }))
        : [],
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  if (matched.length === 0) {
    throw new Error(`No protocols matched the ${REQUIRED_CHAIN_TAG} chain tag; refusing to write an empty seed`);
  }

  const artifact = {
    kind: 'monad-city-research-seed',
    source: 'DefiLlama free API (protocol listing)',
    sourceUrl: SOURCE_URL,
    filter: `entries whose chains array includes "${REQUIRED_CHAIN_TAG}"`,
    fetchedAtUtc,
    note:
      'Research seed for the ecosystem intake pipeline. DefiLlama `address` is the protocol address on ' +
      'its dominant chain, not necessarily its Monad deployment; do not treat it as a Monad mainnet ' +
      'address without an explorer check. This artifact is not an evidence snapshot and carries no ' +
      'review status.',
    counts: {
      protocolsFetched: protocols.length,
      monadTagged: matched.length,
    },
    protocols: matched,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, canonicalJson(artifact));
  console.log(`Wrote ${matched.length} ${REQUIRED_CHAIN_TAG}-tagged protocols to ${outPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
