#!/usr/bin/env node
// Prepare an unsigned first publication after retrieving the exact public IPFS files.
// No wallet key, signing or transaction submission is performed by this command.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {webcrypto} from 'node:crypto';
import {verifyRegistryFiles,validateRegistrySnapshot,readJson} from '../../scripts/registry/registry-io.js';
import {hash,rpc,validateRequest,validateRuntime,deploymentFee} from '../../tools/registry-deploy/core.js';
import {hexBytes,encodeWord} from '../../src/onchain-rpc.js';
if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis,'crypto',{value:webcrypto});
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const uri=process.argv[2];
const matched=/^ipfs:\/\/(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,120})\/manifest\.json$/.exec(uri||'');
if(!matched)throw new Error('Provide the uploaded folder URI: ipfs://REAL_CID/manifest.json');
const cid=matched[1];
const primary=process.argv[3];
if(!/^https:\/\/[a-z0-9-]+\.mypinata\.cloud\/ipfs\/$/.test(primary||''))throw new Error('Provide the public Pinata gateway base: https://YOUR-GATEWAY.mypinata.cloud/ipfs/');
const read=relative=>readJson(path.join(root,relative)).value;
const audit=read('data/registry/deployments/monad-testnet-genesis.json');
const artifact=read('contracts/artifacts/MonadCityRegistry.json');
const deploymentRequest=read('tools/registry-deploy/request.json');
await validateRequest(deploymentRequest,artifact);
if(audit.chainId!==10143||audit.status!=='deployment-verified-publication-pending')throw new Error('Missing reviewed Testnet deployment.');
const snapshot=read('data/evidence-snapshots/phase-3.5-v6.json');
await validateRegistrySnapshot(snapshot);
const verified=await verifyRegistryFiles(path.join(root,'data/registry/phase-3.5-v6'),snapshot);
const manifest=verified.manifest;
const files=[['manifest.json','data/registry/phase-3.5-v6/manifest.json'],
 ['evidence-proofs.json','data/registry/phase-3.5-v6/evidence-proofs.json'],
 ['relationship-proofs.json','data/registry/phase-3.5-v6/relationship-proofs.json'],
 [manifest.snapshot.sourcePath,manifest.snapshot.sourcePath]];
const copies=[];
for(const gateway of [primary,'https://ipfs.filebase.io/ipfs/']){
 for(const [remote,local] of files){
  console.log('Retrieving '+gateway+cid+'/'+remote);
  let response;
  for(let attempt=0;attempt<2;attempt++){
   try{response=await fetch(gateway+cid+'/'+remote,{signal:AbortSignal.timeout(60000)});if(attempt===0&&[502,503,504].includes(response.status)){await response.body.cancel();console.log('Retrying temporary gateway error.');continue;}break;}
   catch(error){if(attempt===1)throw new Error('IPFS retrieval timed out: '+gateway+cid+'/'+remote,{cause:error});console.log('Retrying timed-out retrieval.');}
  }
  if(!response.ok)throw new Error('IPFS file returned HTTP '+response.status+': '+gateway+cid+'/'+remote);
  const chunks=[];let size=0;
  for await(const chunk of response.body){size+=chunk.length;if(size>2097152)throw new Error('IPFS file exceeds expected size limit.');chunks.push(chunk);}
  const bytes=Buffer.concat(chunks);
  const expected=fs.readFileSync(path.join(root,local));
  if(!bytes.equals(expected))throw new Error('IPFS bytes differ from the reviewed file: '+remote);
  copies.push({gateway,path:remote,sha256:await hash(bytes)});
 }
}
if(BigInt(await rpc('eth_chainId'))!==10143n)throw new Error('RPC chain mismatch.');
const block=await rpc('eth_getBlockByNumber',['latest',false]);
const runtime=await rpc('eth_getCode',[audit.address,block.number]);
if(await validateRuntime(runtime,artifact)!==audit.runtimeCodeSha256)throw new Error('Runtime pin mismatch.');
const call=async(name,args='')=>rpc('eth_call',[{to:audit.address,data:'0x'+artifact.methodIdentifiers[name]+args},block.number]);
const zero='0x'+'00'.repeat(32);
if(await call('headPublicationId()')!==zero)throw new Error('First publication requires an empty registry.');
if(await call('namespaceId()')!==manifest.namespace.id||await call('deploymentId()')!==audit.deploymentId)throw new Error('Registry identity mismatch.');
const publisherRole=await call('PUBLISHER_ROLE()');
if(BigInt(await call('hasRole(bytes32,address)',encodeWord(publisherRole)+encodeWord(deploymentRequest.transaction.from,'address')))!==1n)throw new Error('Publisher role is missing.');
const createdAt=Date.parse(manifest.snapshot.createdAt)/1000;
const reviewedAt=Date.parse(manifest.snapshot.reviewedAt)/1000;
const signature='publish((bytes32,bytes32,bytes32,bytes32,bytes32,uint64,uint64,uint64,uint64,string))';
const tuple='('+[manifest.snapshot.versionHash,manifest.snapshot.canonicalSha256Bytes32,
 manifest.commitments.evidence.root,manifest.commitments.relationship.root,zero,
 manifest.commitments.evidence.count,manifest.commitments.relationship.count,createdAt,reviewedAt,uri].join(',')+')';
const encoded=spawnSync('cast',['calldata',signature,tuple],{encoding:'utf8'});
if(encoded.status!==0||encoded.error)throw encoded.error||new Error('Publication encoding failed.');
const data=encoded.stdout.trim();
if(!data.startsWith('0x'+artifact.methodIdentifiers[signature]))throw new Error('Compiled publication selector mismatch.');
const transaction={from:deploymentRequest.transaction.from,to:audit.address,chainId:'0x279f',value:'0x0',data};
const balance=await rpc('eth_getBalance',[transaction.from,'latest']);
const gasPrice=await rpc('eth_gasPrice');
const estimatedGas=await rpc('eth_estimateGas',[{from:transaction.from,to:transaction.to,value:'0x0',data}]);
const fee=deploymentFee(estimatedGas,gasPrice,balance);
const expectedPublicationId=await hash(hexBytes(manifest.domains.publicationId.id+encodeWord(10143n,'uint256')+encodeWord(audit.address,'address')+manifest.snapshot.portableSnapshotId.slice(2)));
const simulated=await rpc('eth_call',[{from:transaction.from,to:transaction.to,value:'0x0',data,gas:fee.gas},'latest']);
if(simulated!==expectedPublicationId)throw new Error('Publication simulation returned an unexpected ID.');
if((await rpc('eth_getBlockByNumber',[block.number,false])).hash!==block.hash)throw new Error('Inspection block changed.');
const output=path.join(root,'tools/registry-publish/request.json');
fs.mkdirSync(path.dirname(output),{recursive:true});
const request={schemaVersion:1,status:'unsigned',transaction,transactionDataSha256:await hash(hexBytes(data)),
 manifestUri:uri,snapshotVersion:manifest.snapshot.version,portableSnapshotId:manifest.snapshot.portableSnapshotId,
 expectedPublicationId,deployment:audit,storageCopies:copies,simulation:{...fee,estimatedGas:BigInt(estimatedGas).toString(),checkedAt:new Date().toISOString(),blockNumber:BigInt(block.number).toString(),blockHash:block.hash},
 note:'Unsigned request only. Recheck wallet, current head, code, chain, content availability, balance and fee before signing. No publication has occurred.'};
fs.writeFileSync(output,JSON.stringify(request,null,2)+'\n');
console.log(JSON.stringify({request:output,manifestUri:uri,verifiedCopies:copies.length,expectedPublicationId,status:'unsigned',...fee},null,2));
