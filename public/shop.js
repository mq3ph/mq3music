let checkoutSong=null,checkoutOrder=null;
async function shopApi(path,body){const response=await fetch(path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const data=await response.json();if(!response.ok)throw Error(data.error||'Please try again.');return data;}
function openNameRequest(name=''){$('name-request-form').reset();$('requested-name').value=name;$('request-heading').textContent=name?`No song for ${name} yet`:'Request your name song';$('request-message').textContent='';$('name-request').showModal();}
$('cancel-name-request').onclick=()=>$('name-request').close();
$('name-request-form').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{const r=await shopApi('/api/requests',{name:$('requested-name').value,email:$('requested-email').value,website:$('request-website').value,consent:$('request-consent').checked});$('request-message').textContent=r.message;$('name-request-form').reset();}catch(e){$('request-message').textContent=e.message;}finally{b.disabled=false;}};
function confirmPriorityName(name){return new Promise(resolve=>{
 const d=document.createElement('dialog');d.style.cssText='width:min(92vw,520px);background:#15110f;color:#ead9bd;border:1px solid #8f7345;border-radius:18px;padding:26px';
 const kicker=node('p','MQ3 · PRIORITY NAME REQUEST');kicker.style.cssText='font-size:12px;letter-spacing:.16em;color:#d8b36b;font-weight:700';
 const h=node('h2','Priority · 50 Credits?');h.style.cssText='color:#f9dfaa;margin:8px 0 14px';
 const copy=node('p',`Move “${name}” to the priority queue for 50 Credits? When the song is ready, your MP3 + Lyrics copy will be sent to your MQ3 account email.`);copy.style.lineHeight='1.55';
 const note=node('p','This is a name-only request. No personalized story or extra inputs are required.');note.style.cssText='font-size:13px;opacity:.85';
 const actions=node('div');actions.style.cssText='display:flex;gap:10px;flex-wrap:wrap;margin-top:20px';
 const cancel=node('button','Cancel','button');cancel.type='button';cancel.className='button';
 const confirm=node('button','Confirm · 50 Credits','button');confirm.type='button';confirm.className='button primary';
 actions.append(cancel,confirm);d.append(kicker,h,copy,note,actions);document.body.append(d);
 let done=false;const finish=v=>{if(done)return;done=true;if(d.open)d.close();d.remove();resolve(v);};
 cancel.onclick=()=>finish(false);confirm.onclick=()=>finish(true);d.addEventListener('cancel',e=>{e.preventDefault();finish(false)});d.addEventListener('click',e=>{if(e.target===d)finish(false)});d.showModal();cancel.focus();
});}
$('priority-name-request').onclick=async()=>{
 const b=$('priority-name-request'),name=$('requested-name').value.trim();
 if(!name){$('request-message').textContent='Enter the name you want to request.';$('requested-name').focus();return;}
 if(!await confirmPriorityName(name))return;
 b.disabled=true;
 try{
  const r=await shopApi('/api/account/name-priority',{name});
  $('request-message').textContent=r.alreadyPriority
   ? `Priority request already paid for ${r.request?.name||name}. No additional charge.`
   : `Priority confirmed. 50 Credits paid for ${r.request?.name||name}. Your MP3 + Lyrics copy will be sent to your MQ3 account email when the song is ready.`;
  window.dispatchEvent(new CustomEvent('mq3-wallet-updated'));
 }catch(e){$('request-message').textContent=e.message;}finally{b.disabled=false;}
};
function openCheckout(song=null){checkoutSong=song;$('checkout-form').reset();$('checkout-form').classList.remove('hidden');$('reference-form').classList.add('hidden');$('checkout-message').textContent='';$('checkout-title').textContent=song?'Buy '+song.title:'MQ3 membership';const m=window.mq3Catalog?.membership;$('checkout-description').textContent=song?`₱${(song.price/100).toFixed(2)} — full access to this song.`:m?`₱${(m.price/100).toFixed(2)} — ${m.days} days of access to published songs. No automatic renewal.`:'Membership setup is not available yet.';for(const o of $('payment-provider').options)o.disabled=!window.mq3Catalog?.payments?.[o.value];const available=[...$('payment-provider').options].find(o=>!o.disabled);if(available)$('payment-provider').value=available.value;else $('checkout-message').textContent='Payment methods are not connected yet.';$('checkout').showModal();}
$('membership').onclick=()=>openCheckout();$('close-checkout').onclick=$('close-reference').onclick=()=>$('checkout').close();
function paymentInstructions(order){checkoutOrder=order.id;$('checkout-form').classList.add('hidden');$('reference-form').classList.remove('hidden');$('reference-message').textContent='';$('payment-reference').value='';const target=$('payment-instructions');target.replaceChildren(node('p',`Order ${order.id}`),node('p',`Pay ₱${(order.amount/100).toFixed(2)} PHP. Include your order ID if the payment app supports a note.`));if(order.instructions.number){target.append(node('p',`GCash: ${order.instructions.number} · ${order.instructions.account}`));const intlNote=node('p',"Sending from outside the Philippines? You can also send using WorldRemit or Sendwave, funded with your MTN or Airtel Mobile Money balance — straight to the GCash number above. Country: Philippines. If the app asks for the recipient's full legal name, just message me and I'll send it to you.");intlNote.style.cssText='font-size:13px;opacity:.85;margin-top:-4px';target.append(intlNote);}if(order.instructions.url){const link=node('a','Open PayPal payment page','button');link.href=order.instructions.url;link.target='_blank';link.rel='noopener noreferrer';target.append(link);}target.append(node('p','Return here and enter the transaction reference. MQ3 will verify the payment before enabling access.'));}
$('checkout-form').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{paymentInstructions(await shopApi('/api/orders',{kind:checkoutSong?'song':'membership',songId:checkoutSong?.id,email:$('buyer-email').value,provider:$('payment-provider').value}));}catch(e){$('checkout-message').textContent=e.message;}finally{b.disabled=false;}};
$('reference-form').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{await shopApi(`/api/orders/${checkoutOrder}/reference`,{reference:$('payment-reference').value});$('reference-message').textContent='Submitted. Check My purchases for verification status. Keep your payment receipt.';}catch(e){$('reference-message').textContent=e.message;}finally{b.disabled=false;}};
async function purchases(){const list=$('purchase-list');list.textContent='Loading…';try{const orders=await shopApi('/api/my-orders');list.replaceChildren();if(!orders.length)list.append(node('p','No orders in this browser yet.'));orders.forEach(o=>{const item=node('div');item.append(node('p',`${o.kind==='membership'?'Membership':tracks.find(t=>t.id===o.song_id)?.title||'Song'} · ₱${(o.amount/100).toFixed(2)} · ${o.status}`));if(o.expires_at)item.append(node('p','Access until '+new Date(o.expires_at).toLocaleString()));if(['pending','submitted'].includes(o.status)){const b=node('button','Payment details','button');b.onclick=async()=>{try{const order=await shopApi('/api/orders/'+o.id);$('purchases').close();$('checkout').showModal();paymentInstructions(order);}catch(e){toast(e.message);}};item.append(b);}list.append(item);});}catch(e){list.textContent=e.message;}}
$('my-purchases').onclick=()=>{$('purchases').showModal();purchases();};$('refresh-purchases').onclick=purchases;$('close-purchases').onclick=()=>$('purchases').close();
