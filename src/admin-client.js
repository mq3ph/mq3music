import {upload} from '@vercel/blob/client';
const $=id=>document.getElementById(id), cats=['NAME SONGS','INSPIRATIONAL SONGS','OPM','ORIGINAL SONGS'];
let tab='Name Request',songs=[],requests=[],orders=[];
const message=t=>{$('admin-message').textContent=t;};
async function api(path,body){const r=await fetch(path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok){if(r.status===401){$('dashboard').classList.add('hidden');$('login-panel').classList.remove('hidden');}throw Error(data.error||'Request failed.');}return data;}
function node(tag,value,cls){const e=document.createElement(tag);if(value!==undefined)e.textContent=value;if(cls)e.className=cls;return e;}
function button(label,action){const b=node('button',label,'button');b.onclick=async()=>{b.disabled=true;try{await action();}catch(e){message(e.message);}finally{b.disabled=false;}};return b;}
function badge(value){return node('span',value,'badge '+value);}
const money=n=>'₱'+(n/100).toFixed(2),date=v=>v?new Date(v).toLocaleString(): '—';
async function load(){[songs,requests,orders]=await Promise.all([api('/api/admin/songs'),api('/api/admin/requests'),api('/api/admin/orders')]);render();}
async function enter(){const session=await api('/api/admin/session');$('login-panel').classList.add('hidden');$('dashboard').classList.remove('hidden');$('setup').textContent='Connections: '+Object.entries(session.setup).map(([k,v])=>`${k}: ${v?'configured':'needs setup'}`).join(' · ');await load();}
$('login').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{await api('/api/login',{password:$('password').value});$('password').value='';message('');await enter();}catch(e){message(e.message);}finally{b.disabled=false;}};
$('logout').onclick=async()=>{try{await api('/api/logout',{});location.reload();}catch(e){message(e.message);}};
for(const name of ['Name Request',...cats,'GCash','PayPal']){const b=button(name,()=>{tab=name;$('admin-search').value='';render();});$('tabs').append(b);}
for(const c of cats){const o=node('option',c);$('song-category').append(o);}
$('admin-search').oninput=render;
function table(headers){const t=node('table'),head=node('thead'),tr=node('tr');headers.forEach(h=>tr.append(node('th',h)));head.append(tr);t.append(head);const body=node('tbody');t.append(body);$('records').replaceChildren(t);return body;}
function row(body,values){const tr=node('tr');values.forEach(v=>{const td=node('td');if(v instanceof Node)td.append(v);else td.textContent=v??'—';tr.append(td);});body.append(tr);}
function actions(...buttons){const e=node('div');e.append(...buttons);return e;}
function render(){
  [...$('tabs').children].forEach(b=>{b.classList.toggle('active',b.textContent===tab);b.setAttribute('aria-pressed',String(b.textContent===tab));});
  $('new-song').classList.toggle('hidden',!cats.includes(tab));
  const paid=orders.filter(o=>o.status==='paid');$('summary').textContent=`${songs.length} songs · ${requests.filter(r=>r.status==='pending').length} pending name requests · ${paid.length} verified payments · ${money(paid.reduce((n,o)=>n+o.amount,0))} verified revenue`;
  const search=$('admin-search').value.toLowerCase(),match=o=>JSON.stringify(o).toLowerCase().includes(search);
  $('tab-note').textContent='';
  if(cats.includes(tab)){
    $('tab-note').textContent=tab==='ORIGINAL SONGS'?'Lyrics & melodies: MQ3. Music & voice: assisted by Suno.':'Lyrics: AI-generated. Music: generated with Suno. Curated by MQ3.';
    const body=table(['Title','Names','Price','Lyrics','Full audio','Preview','Status','Manage']);
    songs.filter(s=>s.category===tab&&match(s)).forEach(s=>row(body,[s.title,s.names,money(s.price),s.lyrics?'Yes':'No',s.audio_path?'Uploaded':'Missing',s.preview_path?'Uploaded':'None',badge(s.published?'published':'draft'),button('Edit / Upload',()=>editSong(s))]));
  }else if(tab==='Name Request'){
    const body=table(['Date','Name','Email','Status','Matched song','Actions']);requests.filter(match).forEach(r=>row(body,[date(r.created_at),r.name,r.email,badge(r.status),songs.find(s=>s.id===r.song_id)?.title||'—',actions(button('Update',()=>editRequest(r)),button(r.notified_at?'Resend email':'Notify by email',async()=>{if(!confirm(`Send song availability email to ${r.email}?`))return;await api(`/api/admin/requests/${r.id}/notify`,{});message('Email accepted for delivery.');await load();}))]));
  }else{
    $('tab-note').textContent='Manual verification: check the actual amount and transaction reference in your GCash/PayPal account before approving. Membership access is fixed-term and does not auto-renew.';
    const body=table(['Date','Email','Package','Amount','Reference','Status','Access until','Actions']);orders.filter(o=>o.provider===tab.toLowerCase()&&match(o)).forEach(o=>row(body,[date(o.created_at),o.email,o.kind==='membership'?'Membership':songs.find(s=>s.id===o.song_id)?.title||'Song',money(o.amount),o.reference,badge(o.status),date(o.expires_at),actions(...(o.status==='submitted'?[button('Verify paid',async()=>{if(!confirm(`Have you independently verified ${money(o.amount)} and reference ${o.reference} in your ${tab} account?`))return;await api(`/api/admin/orders/${o.id}/review`,{status:'paid',verified:true});await load();}),button('Reject',async()=>{await api(`/api/admin/orders/${o.id}/review`,{status:'rejected'});await load();})]:[]),...(o.status==='paid'?[button('Email access link',async()=>{if(!confirm(`Send a private access link to ${o.email}?`))return;await api(`/api/admin/orders/${o.id}/email`,{});message('Access email accepted for delivery.');})]:[]))]));
  }
  if(!$('records').querySelector('tbody').children.length){const tr=node('tr'),td=node('td','No records in this tab yet.');td.colSpan=9;tr.append(td);$('records').querySelector('tbody').append(tr);}
}
function editSong(s={}){$('song-form').reset();$('song-id').value=s.id||'';$('song-title').value=s.title||'';$('song-category').value=s.category||tab;$('song-names').value=s.names||'';$('song-lyrics').value=s.lyrics||'';$('song-price').value=(s.price||0)/100;$('song-published').checked=!!s.published;$('upload-progress').textContent=s.audio_path?'Existing full audio retained unless you choose a replacement.':'';$('editor').showModal();}
$('new-song').onclick=()=>editSong();$('cancel-editor').onclick=()=>$('editor').close();
$('song-form').onsubmit=async e=>{
  e.preventDefault();const b=$('save-song');b.disabled=true;$('cancel-editor').disabled=true;
  try{
    const files=[['audio',$('full-file').files[0]],['preview',$('preview-file').files[0]]];
    for(const [,f]of files)if(f&&(!f.name.toLowerCase().endsWith('.mp3')||f.size>100*1024*1024||!f.size))throw Error('Choose a non-empty MP3 smaller than 100 MB.');
    const data={id:$('song-id').value||undefined,title:$('song-title').value,category:$('song-category').value,names:$('song-names').value,lyrics:$('song-lyrics').value,price:Math.round(Number($('song-price').value)*100),published:false};
    const saved=await api('/api/admin/songs',data);$('song-id').value=saved.id;data.id=saved.id;
    for(const [kind,file]of files){if(!file)continue;const ticket=await api('/api/admin/upload-ticket',{songId:saved.id,kind});
      await upload(ticket.pathname,file,{access:'private',contentType:'audio/mpeg',handleUploadUrl:'/api/blob/upload',clientPayload:ticket.id,multipart:true,onUploadProgress:p=>$('upload-progress').textContent=`Uploading ${kind}: ${Math.round(p.percentage)}%`});
      await api('/api/admin/upload-finish',{ticket:ticket.id});
    }
    await api('/api/admin/songs',{...data,published:$('song-published').checked});$('editor').close();message('Song saved.');await load();
  }catch(e){$('upload-progress').textContent=e.message+' Saved metadata remains as a draft. Retry or edit it from its category.';message(e.message);}finally{b.disabled=false;$('cancel-editor').disabled=false;}
};
function editRequest(r){$('request-id').value=r.id;$('request-status').value=r.status==='notified'?'available':r.status;$('request-song').replaceChildren();const blank=node('option','Choose a song');blank.value='';$('request-song').append(blank);songs.filter(s=>s.category==='NAME SONGS'&&s.published&&s.audio_path).forEach(s=>{const o=node('option',s.title);o.value=s.id;$('request-song').append(o);});$('request-song').value=r.song_id||'';$('request-editor').showModal();}
$('cancel-request').onclick=()=>$('request-editor').close();$('request-form').onsubmit=async e=>{e.preventDefault();try{await api('/api/admin/requests/'+$('request-id').value,{status:$('request-status').value,songId:$('request-song').value});$('request-editor').close();await load();}catch(e){message(e.message);}};
$('backup').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({exportedAt:new Date().toISOString(),songs,requests,orders},null,2)],{type:'application/json'}));const a=node('a');a.href=url;a.download='mq3-private-metadata-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('Metadata backup downloaded. Keep it private; MP3 files must be backed up separately.');};
enter().catch(e=>{if(!/Log in|Session expired/.test(e.message))message(e.message);});
