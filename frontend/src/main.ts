import { BrowserProvider, Contract, getAddress, isAddress, keccak256, toUtf8Bytes } from 'ethers';
import './style.css';

type Eip1193 = { request(args:{method:string;params?:unknown[]}):Promise<unknown>; on?(event:string,fn:(...args:unknown[])=>void):void; removeListener?(event:string,fn:(...args:unknown[])=>void):void };
type WalletItem = { name:string; icon?:string; provider:Eip1193 };

declare global { interface Window { ethereum?: Eip1193 & { providers?: Eip1193[] } } }

const BOT = { chainId:'0x2a5', chainName:'BOT Chain Mainnet', nativeCurrency:{name:'BOT',symbol:'BOT',decimals:18}, rpcUrls:['https://rpc.botchain.ai'], blockExplorerUrls:['https://scan.botchain.ai'] };
const abi = [
  'function seal(bytes32 commitment) returns (uint256)',
  'function confirmOpening(uint256 receiptId)',
  'function receiptCount() view returns (uint256)',
  'function receipt(uint256) view returns (address author,bytes32 commitment,uint64 sealedAt,uint64 confirmedAt)'
];
const rawAddress = import.meta.env.VITE_MORROWSEAL_ADDRESS || '';
const contractAddress = isAddress(rawAddress) ? getAddress(rawAddress) : '';
let wallet: WalletItem | null = null;
let browserProvider: BrowserProvider | null = null;
let account = '';
let currentDigest = '';
let matchedReceipt: number | null = null;

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="nav">
    <a class="brand" href="#top" aria-label="MorrowSeal home"><span>MS</span>MORROWSEAL</a>
    <div class="nav-proof"><i></i> BOT Chain · 677</div>
    <button class="wallet-button" id="walletButton">Connect a wallet ↗</button>
  </header>
  <main id="top">
    <section class="hero" data-enter>
      <div class="hero-copy">
        <p class="eyebrow">LOCAL COMMITMENT DESK / 01</p>
        <h1>Seal the result.<br><em>Open it later.</em></h1>
        <p class="intro">MORROWSEAL turns private result text into one public commitment. The original text and salt stay in your browser; only the digest can be recorded on BOT Chain.</p>
        <a class="primary" href="#workspace">Seal a result ↗</a>
      </div>
      <div class="hero-machine" aria-label="Commitment workflow preview">
        <div class="machine-head"><span>PRIVATE INPUT</span><span>PUBLIC OUTPUT</span></div>
        <div class="machine-flow">
          <div><b>01</b><strong>Result text</strong><small>Never sent</small></div>
          <span class="flow-line"></span>
          <div><b>02</b><strong>Salt</strong><small>32 random bytes</small></div>
          <span class="flow-line"></span>
          <div class="signal"><b>03</b><strong>Commitment</strong><small>bytes32 receipt</small></div>
        </div>
        <div class="hash-strip">0x7a19…d04c <span>READY TO VERIFY</span></div>
      </div>
    </section>

    <section class="workspace" id="workspace">
      <div class="section-head">
        <p class="eyebrow">WORKSPACE / PRIVATE BY DEFAULT</p>
        <h2>One desk. Two sides of the same proof.</h2>
      </div>
      <div class="desk">
        <article class="pane pane-dark">
          <div class="pane-title"><span>01 / SEAL</span><span>LOCAL</span></div>
          <label>Result context<input id="context" maxlength="80" placeholder="e.g. Experiment batch 24" /></label>
          <label>Private result<textarea id="result" maxlength="1200" placeholder="Write the exact result you will disclose later."></textarea></label>
          <label>Salt<div class="field-row"><input id="salt" class="mono" /><button id="refreshSalt" class="square" aria-label="Generate a new salt">↻</button></div></label>
          <button class="action action-red" id="makeDigest">Create commitment ↗</button>
        </article>

        <article class="pane pane-centre">
          <div class="pane-title"><span>COMMITMENT</span><span>BYTES32</span></div>
          <div class="fingerprint" id="digest">No commitment yet.</div>
          <p class="privacy">The digest can be public. The private result and salt cannot be recovered from it.</p>
          <div class="stack-actions">
            <button id="downloadPrivate" disabled>Download private opening</button>
            <button id="downloadPublic" disabled>Download public receipt</button>
            <button id="sealChain" disabled>Record on BOT Chain ↗</button>
          </div>
          <p class="status" id="chainStatus">${contractAddress ? 'Contract configured. Connect a wallet to record.' : 'Preview mode: deploy MorrowSeal and set VITE_MORROWSEAL_ADDRESS.'}</p>
        </article>

        <article class="pane pane-light">
          <div class="pane-title"><span>02 / OPEN</span><span>LOCAL CHECK</span></div>
          <label>Expected commitment<input id="expected" class="mono" placeholder="0x…" /></label>
          <label>Original context<input id="openContext" maxlength="80" /></label>
          <label>Original result<textarea id="openResult" maxlength="1200"></textarea></label>
          <label>Original salt<input id="openSalt" class="mono" /></label>
          <button class="action" id="verifyOpening">Verify opening ↗</button>
          <div class="verify-result" id="verifyResult">Waiting for an opening.</div>
          <button id="confirmChain" class="quiet" disabled>Confirm local check on-chain</button>
        </article>
      </div>
    </section>

    <section class="sequence">
      <div class="sequence-copy">
        <p class="eyebrow">THE PROOF LINE / THREE STATES</p>
        <h2>Private before.<br>Public at the edge.</h2>
        <p>Nothing hidden becomes readable on-chain. MORROWSEAL records when a wallet published a commitment and, optionally, when that same wallet confirmed a matching local opening.</p>
      </div>
      <div class="timeline">
        <div><span>01</span><strong>Write</strong><p>Keep result text inside the browser.</p></div>
        <div><span>02</span><strong>Seal</strong><p>Publish only a one-way bytes32 commitment.</p></div>
        <div><span>03</span><strong>Open</strong><p>Recompute locally with the exact text and salt.</p></div>
      </div>
    </section>
  </main>
  <footer><div><span>MORROWSEAL / RESULT COMMITMENTS</span><span>BOT CHAIN · NETWORK 677</span></div><p>Private text never leaves this page unless you export it yourself. Review the contract before using real value.</p></footer>

  <dialog id="walletDialog"><form method="dialog"><div class="dialog-head"><h2>Choose a wallet</h2><button value="cancel" aria-label="Close wallet chooser">×</button></div><div id="walletList" class="wallet-list"></div><a class="mobile-link" href="https://metamask.app.link/dapp/${location.host}${location.pathname}">Open this page in MetaMask mobile ↗</a></form></dialog>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
`;

const $ = <T extends HTMLElement>(q:string) => document.querySelector<T>(q)!;
const toast = (message:string, error=false) => { const el=$<HTMLDivElement>('#toast'); el.textContent=message; el.classList.toggle('error',error); el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),4600); };
const saltInput=$<HTMLInputElement>('#salt');
function newSalt(){ const bytes=crypto.getRandomValues(new Uint8Array(32)); saltInput.value='0x'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(''); }
newSalt();

function digestFor(context:string,result:string,salt:string){ return keccak256(toUtf8Bytes(JSON.stringify({protocol:'MORROWSEAL/1',context:context.trim(),result,salt:salt.trim().toLowerCase()}))); }
function download(name:string,data:unknown){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
function short(address:string){ return `${address.slice(0,6)}…${address.slice(-4)}`; }

$('#refreshSalt').addEventListener('click',newSalt);
$('#makeDigest').addEventListener('click',()=>{
  const context=$<HTMLInputElement>('#context').value.trim(); const result=$<HTMLTextAreaElement>('#result').value.trim(); const salt=saltInput.value.trim();
  if(!context || !result || !/^0x[0-9a-fA-F]{64}$/.test(salt)){ toast('Add a context, result and valid 32-byte salt.',true); return; }
  currentDigest=digestFor(context,result,salt); $('#digest').textContent=currentDigest; $<HTMLInputElement>('#expected').value=currentDigest;
  for(const id of ['downloadPrivate','downloadPublic','sealChain']) $<HTMLButtonElement>(`#${id}`).disabled=false;
  toast('Commitment created locally.');
});
$('#downloadPrivate').addEventListener('click',()=>download('morrowseal-private-opening.json',{protocol:'MORROWSEAL/1',context:$<HTMLInputElement>('#context').value,result:$<HTMLTextAreaElement>('#result').value,salt:saltInput.value,commitment:currentDigest,warning:'Keep private. Anyone with this file can open the commitment.'}));
$('#downloadPublic').addEventListener('click',()=>download('morrowseal-public-receipt.json',{protocol:'MORROWSEAL/1',commitment:currentDigest,network:'BOT Chain',chainId:677,createdAt:new Date().toISOString()}));

const wallets:WalletItem[]=[];
window.addEventListener('eip6963:announceProvider' as keyof WindowEventMap,(event:Event)=>{ const detail=(event as CustomEvent).detail; if(detail?.provider && !wallets.some(w=>w.provider===detail.provider)) wallets.push({name:detail.info?.name||'Browser wallet',icon:detail.info?.icon,provider:detail.provider}); });
window.dispatchEvent(new Event('eip6963:requestProvider'));
function discoverWallets(){
  if(window.ethereum?.providers) window.ethereum.providers.forEach((p,i)=>{ if(!wallets.some(w=>w.provider===p)) wallets.push({name:`Browser wallet ${i+1}`,provider:p}); });
  else if(window.ethereum && !wallets.some(w=>w.provider===window.ethereum)) wallets.push({name:'Browser wallet',provider:window.ethereum});
  return wallets;
}
async function ensureBot(provider:Eip1193){
  const chain=await provider.request({method:'eth_chainId'}) as string;
  if(chain.toLowerCase()===BOT.chainId) return;
  try { await provider.request({method:'wallet_switchEthereumChain',params:[{chainId:BOT.chainId}]}); }
  catch(e:unknown){ const code=(e as {code?:number}).code; if(code!==4902 && code!==-32603) throw e; await provider.request({method:'wallet_addEthereumChain',params:[BOT]}); }
}
async function connect(item:WalletItem){
  wallet=item; const accounts=await item.provider.request({method:'eth_requestAccounts'}) as string[]; if(!accounts?.length) throw new Error('No account returned.');
  await ensureBot(item.provider); browserProvider=new BrowserProvider(item.provider); account=getAddress(accounts[0]); $('#walletButton').textContent=short(account); toast(`${item.name} connected on BOT Chain.`);
  item.provider.on?.('accountsChanged',(...args)=>{ const list=args[0] as string[]; account=list?.[0]?getAddress(list[0]):''; $('#walletButton').textContent=account?short(account):'Connect a wallet ↗'; });
  item.provider.on?.('chainChanged',()=>location.reload());
}
async function openWallets(){
  const dialog=$<HTMLDialogElement>('#walletDialog'); const list=$<HTMLDivElement>('#walletList'); list.replaceChildren(); const found=discoverWallets();
  if(!found.length){ const p=document.createElement('p'); p.textContent='No injected wallet was found. Install MetaMask or open this page inside a wallet browser.'; list.append(p); }
  found.forEach(item=>{ const b=document.createElement('button'); b.type='button'; if(item.icon){ const img=document.createElement('img'); img.src=item.icon; img.alt=''; b.append(img); } b.append(document.createTextNode(item.name)); b.addEventListener('click',async()=>{ try{ await connect(item); dialog.close(); }catch(e){ toast((e as Error).message||'Wallet connection was rejected.',true); } }); list.append(b); }); dialog.showModal();
}
$('#walletButton').addEventListener('click',openWallets);

async function contract(write=false){
  if(!contractAddress) throw new Error('Contract address is not configured.');
  if(!browserProvider || !account){ await openWallets(); throw new Error('Connect a wallet, then try again.'); }
  await ensureBot(wallet!.provider); const code=await browserProvider.getCode(contractAddress); if(code==='0x') throw new Error('No contract bytecode found at this address on BOT Chain.');
  return new Contract(contractAddress,abi,write?await browserProvider.getSigner():browserProvider);
}
$('#sealChain').addEventListener('click',async()=>{ try{ if(!currentDigest) throw new Error('Create a commitment first.'); $('#chainStatus').textContent='Waiting for wallet confirmation…'; const c=await contract(true); const tx=await c.seal(currentDigest); $('#chainStatus').textContent='Transaction submitted. Waiting for confirmation…'; const receipt=await tx.wait(); matchedReceipt=Number((await (await contract()).receiptCount())-1n); $('#chainStatus').textContent=`Recorded in block ${receipt.blockNumber}. Receipt #${matchedReceipt}.`; toast('Commitment recorded on BOT Chain.'); }catch(e){ $('#chainStatus').textContent=(e as Error).message; toast((e as Error).message,true); } });

$('#verifyOpening').addEventListener('click',()=>{
  const expected=$<HTMLInputElement>('#expected').value.trim(); const context=$<HTMLInputElement>('#openContext').value; const result=$<HTMLTextAreaElement>('#openResult').value; const salt=$<HTMLInputElement>('#openSalt').value;
  if(!/^0x[0-9a-fA-F]{64}$/.test(expected) || !context.trim() || !result.trim() || !/^0x[0-9a-fA-F]{64}$/.test(salt)){ toast('Complete the commitment, context, result and 32-byte salt.',true); return; }
  const got=digestFor(context,result,salt); const match=got.toLowerCase()===expected.toLowerCase(); const out=$('#verifyResult'); out.textContent=match?'MATCH — this opening recreates the commitment.':'NO MATCH — at least one character or the salt differs.'; out.classList.toggle('match',match); $<HTMLButtonElement>('#confirmChain').disabled=!match || matchedReceipt===null; toast(match?'Opening verified locally.':'Opening does not match.',!match);
});
$('#confirmChain').addEventListener('click',async()=>{ try{ if(matchedReceipt===null) throw new Error('Record this commitment first.'); const c=await contract(true); const tx=await c.confirmOpening(matchedReceipt); await tx.wait(); toast('Local opening confirmation recorded.'); }catch(e){ toast((e as Error).message,true); } });
