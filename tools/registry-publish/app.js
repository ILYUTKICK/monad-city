import { CHAIN, RPC, validateWallet, mon } from '../registry-deploy/core.js';
import { validatePublication, checkAvailability, checkPublication, verifyPublicationReceipt } from './core.js';
import { reviewedRegistryRelease } from '../../scripts/registry/releases.js';
const $ = id => document.getElementById(id);
let request, artifact, bundle, deployment, provider, estimateResult, audit, busy = false, sent = false, validated = false;
let storageKey;
function message(text, error = false) { $('status').textContent = text; $('status').dataset.error = String(error); }
function invalidate() { estimateResult = null; $('estimate').hidden = true; $('publish').disabled = true; }
function renderButtons() {
  $('connect').disabled = busy || !validated || !provider;
  $('network').disabled = busy || !validated || !provider;
  $('check').disabled = busy || !validated || !provider || sent;
  $('publish').disabled = busy || !estimateResult || sent;
  $('receipt').disabled = busy || !validated;
}
async function action(task) {
  if (busy) return;
  busy = true; renderButtons();
  try { await task(); } catch (error) {
    invalidate(); message(error.code === 4001 ? 'Cancelled in wallet. No new transaction was submitted by the page.' : error.message, true);
  } finally { busy = false; renderButtons(); }
}
async function walletReady() {
  const chain = await provider.request({ method: 'eth_chainId' });
  const accounts = await provider.request({ method: 'eth_accounts' });
  validateWallet(chain, accounts, request.transaction.from);
  return { chain, accounts };
}
async function check() {
  invalidate();
  await walletReady();
  message('Checking public IPFS files, registry, balance and network fee…');
  await checkAvailability(request);
  const fee = await checkPublication(request, artifact, deployment);
  await walletReady();
  estimateResult = fee;
  $('balance').textContent = mon(fee.balanceWei) + ' MON';
  $('fee').textContent = mon(fee.maximumFeeWei) + ' MON';
  $('estimate').hidden = false;
  message('Ready for wallet confirmation. The transaction publishes the reviewed snapshot to the existing registry.');
}
function setHash(txHash) {
  if (!/^0x[0-9a-f]{64}$/i.test(txHash)) throw new Error('Invalid transaction hash.');
  $('transaction').value = txHash;
  $('explorer').href = 'https://testnet.monadscan.com/tx/' + txHash;
  $('explorer').hidden = false;
  sent = true;
  try { localStorage.setItem(storageKey, txHash); } catch { /* Receipt can be recovered manually. */ }
}
async function receipt() {
  const txHash = $('transaction').value.trim();
  message('Inspecting the publication receipt and registry…');
  const result = await verifyPublicationReceipt(txHash, request, artifact, bundle, deployment);
  if (!result) { message('Transaction is pending or not found. Check again after it appears in Monad Testnet.'); return; }
  setHash(txHash); audit = result;
  $('result').hidden = false; $('result').textContent = JSON.stringify(audit, null, 2);
  $('download').hidden = false;
  message(`Snapshot published at ${result.address}. Receipt, code and exact commitments match. App activation and finality checks follow separately.`);
}
$('connect').addEventListener('click', () => action(async () => {
  invalidate();
  await provider.request({ method: 'eth_requestAccounts' });
  await walletReady();
  message('Wallet connected. Check the publication to review its estimated fee.');
}));
$('network').addEventListener('click', () => action(async () => {
  invalidate();
  try { await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x279f' }] }); }
  catch (error) {
    if (error.code !== 4902) throw error;
    await provider.request({ method: 'wallet_addEthereumChain', params: [{ chainId: '0x279f', chainName: 'Monad Testnet',
      nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 }, rpcUrls: [RPC],
      blockExplorerUrls: ['https://testnet.monadscan.com'] }] });
  }
  await walletReady(); message('Monad Testnet selected. Check the publication to review the fee.');
}));
$('check').addEventListener('click', () => action(check));
$('publish').addEventListener('click', () => action(async () => {
  // This handler runs only on the owner's explicit button click. No automated signing path.
  if (sent) throw new Error('A publication transaction is already recorded. Check its receipt before another attempt.');
  await check(); // Fresh balance, simulation and fee immediately before opening the wallet.
  const tx = { from: request.transaction.from, to: request.transaction.to, chainId: '0x279f', data: request.transaction.data,
    value: '0x0', gas: estimateResult.gas, gasPrice: estimateResult.gasPrice };
  await walletReady();
  message('Confirm the snapshot publication and network fee in your wallet.');
  sent = true;
  try { localStorage.setItem(storageKey, 'awaiting-wallet'); } catch { /* In-memory guard remains active. */ }
  let txHash;
  try { txHash = await provider.request({ method: 'eth_sendTransaction', params: [tx] }); }
  catch (error) {
    if (error.code === 4001) {
      sent = false;
      try { localStorage.removeItem(storageKey); } catch { /* Nothing sensitive is stored. */ }
      throw error;
    }
    throw new Error('Wallet response was interrupted. Check your wallet history and paste the transaction hash here before attempting another publication.');
  }
  setHash(txHash); invalidate();
  message('Transaction submitted. Check its receipt after the wallet confirms it.');
}));
$('receipt').addEventListener('click', () => action(receipt));
$('download').addEventListener('click', () => {
  if (!audit) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(audit, null, 2) + '\n'], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'monad-city-testnet-publication-receipt.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
await action(async () => {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) throw new Error('This operator page must run on localhost.');
  const load = async url => { const response = await fetch(url, { cache: 'no-store' }); if (!response.ok) throw new Error('Missing publication artifact.'); return response.json(); };
  const release = reviewedRegistryRelease(new URLSearchParams(location.search).get('version') || 'phase-3.5-v6');
  storageKey = `monad-city:testnet:publication:${release.version}:transaction`;
  const requestUrl = release.version === 'phase-3.5-v6' ? './request.json' : `./requests/${release.version}.json`;
  const directory = `../../data/registry/${release.version}`;
  const [prepared, compiled, reviewed, manifest, evidenceArtifact, relationshipArtifact, snapshot] = await Promise.all([
    load(requestUrl), load('../../contracts/artifacts/MonadCityRegistry.json'), load('../../data/registry/deployments/monad-testnet-genesis.json'),
    load(`${directory}/manifest.json`), load(`${directory}/evidence-proofs.json`),
    load(`${directory}/relationship-proofs.json`), load(`../../data/evidence-snapshots/${release.version}.json`)]);
  request = prepared; artifact = compiled; deployment = reviewed; bundle = { manifest, evidenceArtifact, relationshipArtifact, snapshot };
  await validatePublication(request, artifact, bundle, deployment);
  $('contract').textContent = deployment.address;
  $('snapshot').textContent = `${release.version} · ${release.evidenceCount} evidence records · ${release.relationshipCount} relationships`;
  $('predecessor').textContent = 'Previous publication: ' + (request.previousPublicationId || 'Genesis');
  $('unsigned-request').href = requestUrl;
  const gateway = request.storageCopies.find(c => c.gateway.includes('.mypinata.cloud/')).gateway;
  $('content').href = gateway + request.manifestUri.slice(7);
  $('content').textContent = request.manifestUri;
  validated = true;
  $('wallet').textContent = request.transaction.from;
  $('data-hash').textContent = 'Transaction data SHA-256: ' + request.transactionDataSha256;
  provider = window.ethereum;
  if (provider) {
    provider.on?.('accountsChanged', () => { invalidate(); renderButtons(); message('Wallet changed. Recheck the publication.'); });
    provider.on?.('chainChanged', () => { invalidate(); renderButtons(); message('Network changed. Recheck the publication.'); });
    $('provider-note').textContent = 'A wallet extension is available. Connect the publisher address shown above.';
    message('Request verified. Connect your wallet to continue.');
  } else {
    message('Request verified. Open this page in Chrome with your wallet extension to continue.');
  }
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'awaiting-wallet') {
      sent = true; message('A wallet request was opened earlier. Check wallet history and enter its transaction hash; this page will not submit a duplicate.');
    } else if (saved) setHash(saved);
  } catch { /* No private data is stored. */ }
});
