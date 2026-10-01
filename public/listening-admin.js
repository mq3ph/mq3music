const $=id=>document.getElementById(id);
let libraryView='published',missingDetail='';
function setupAdminOverview(){
 const logo=document.querySelector('.brand img');if(logo)logo.src='/assets/logo-headphones.png';
 const hint=document.querySelector('[data-panel="songs"] > p.small');if(hint)hint.textContent='Manage published songs and saved drafts. Edit a draft, check Published, then Save song to restore it.';
 const filters=node('div');filters.className='actions';
 for(const [id,label,choices] of [['library-view','Show songs',[['published','Published'],['drafts','Drafts / Unpublished'],['all','All songs']]],['missing-detail','Song details',[['','All details'],['duration','Missing duration'],['lyrics','Missing lyrics'],['artwork','Missing custom artwork']]]]){const wrap=node('label',label),select=node('select');select.id=id;for(const [value,text] of choices){const option=node('option',text);option.value=value;select.append(option);}select.onchange=()=>{libraryView=$('library-view').value;missingDetail=$('missing-detail').value;renderSongs();};wrap.append(select);filters.append(wrap);}$('song-library-search').closest('.panel').after(filters);
 const section=node('section');section.className='panel';section.append(node('h3','Website visitors'));const note=node('p','Estimated unique browsers, not identified people. Clearing cookies or changing devices counts again. Counts start with this update; song views are separate.');note.className='small';section.append(note);
 const select=node('select');select.setAttribute('aria-label','Visitor reporting period');for(const [value,label] of [['daily','Today'],['weekly','This week'],['monthly','This month'],['all','All time']]){const option=node('option',label);option.value=value;select.append(option);}const refresh=node('button','Refresh visitors'),result=node('p');result.id='visitor-summary';result.setAttribute('role','status');section.append(select,refresh,result);document.querySelector('[data-panel="analytics"]').prepend(section);
 const load=async()=>{refresh.disabled=true;result.textContent='Loading visitors…';try{const r=await api('/admin/visitors?period='+select.value);result.textContent=r.visitors+' unique browsers · '+r.views+' page visits';}catch(e){result.textContent=e.message;}finally{refresh.disabled=false;}};select.onchange=load;refresh.onclick=load;document.querySelector('[data-tab="analytics"]').addEventListener('click',load);
}
let songs=[],report=null,period='daily',editingSongId=null,savingSong=false,createId=crypto.randomUUID();
const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};

function message(text,error=false){$('message').textContent=text;$('message').className=error?'notice error':'notice';}
function formatDuration(seconds){seconds=Number(seconds)||0;if(!seconds)return'';const h=Math.floor(seconds/3600),m=Math.floor((seconds%3600)/60),s=seconds%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;}

async function api(path,body){
  const r=await fetch('/api'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await r.json();
  if(!r.ok){if(r.status===401){$('dashboard').hidden=true;$('login').hidden=false;$('logout').hidden=true;}throw Object.assign(Error(data.error||'Request failed.'),{status:r.status});}
  return data;
}

function ensureAdminEnhancementStyles(){
  if(document.getElementById('mq3-admin-enhancement-styles'))return;
  const style=document.createElement('style');style.id='mq3-admin-enhancement-styles';style.textContent=`
    .mq3-admin-badges{display:flex;gap:5px;flex-wrap:wrap;align-items:center}.mq3-admin-badge{display:inline-flex;align-items:center;min-height:22px;padding:2px 7px;border:1px solid rgba(237,198,109,.34);border-radius:999px;color:#edc66d;background:rgba(237,198,109,.06);font-size:10px;line-height:1.2;letter-spacing:.25px}.mq3-admin-badge.muted{color:#dec6b2;border-color:rgba(222,198,178,.22);background:rgba(222,198,178,.04)}.mq3-admin-badge.good{color:#f4dfa9}.mq3-admin-actions{display:flex;gap:6px;flex-wrap:wrap}.mq3-admin-actions button{white-space:nowrap}
  `;document.head.append(style);
}

function ensurePremiumConfirmStyles(){
  if(document.getElementById('mq3-premium-confirm-style'))return;
  const style=document.createElement('style');
  style.id='mq3-premium-confirm-style';
  style.textContent=`
    .mq3-premium-confirm{width:min(92vw,520px);max-width:520px;padding:0;border:1px solid #b27b37;border-radius:24px;color:#f7ead7;background:radial-gradient(circle at 78% 8%,rgba(122,43,13,.46) 0%,transparent 38%),linear-gradient(155deg,#4d160d 0%,#300b07 58%,#1d0604 100%);box-shadow:0 30px 85px rgba(0,0,0,.58),inset 0 1px 0 rgba(255,223,155,.14);overflow:hidden}
    .mq3-premium-confirm::backdrop{background:rgba(8,2,1,.72);backdrop-filter:blur(5px)}
    .mq3-premium-confirm-card{padding:26px 26px 18px}.mq3-premium-confirm-kicker{margin:0 0 10px;font-size:11px;font-weight:800;letter-spacing:2.4px;text-transform:uppercase;color:#e9c76c}.mq3-premium-confirm-title{margin:0 0 12px;font-family:Georgia,"Times New Roman",serif;font-size:30px;line-height:1.08;font-weight:400;color:#fff3df}.mq3-premium-confirm-copy{margin:0;color:#e8d3c3;font-size:15px;line-height:1.7}.mq3-premium-confirm-actions{display:flex;justify-content:flex-end;gap:12px;padding:18px 26px 26px}.mq3-premium-confirm-btn{min-width:132px;min-height:46px;padding:0 20px;border-radius:999px;border:1px solid transparent;font:inherit;font-weight:800;cursor:pointer;transition:transform .15s ease,filter .15s ease,box-shadow .15s ease}.mq3-premium-confirm-btn:hover{transform:translateY(-1px);filter:brightness(1.05)}.mq3-premium-confirm-btn:focus-visible{outline:2px solid #f5d77a;outline-offset:3px}.mq3-premium-confirm-btn.cancel{background:#230805;color:#f4e1cf;border-color:#7f4f27}.mq3-premium-confirm-btn.confirm{background:linear-gradient(180deg,#f2cc70,#dba847);color:#2a1207;border-color:#f3cf76;box-shadow:0 8px 18px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,247,207,.55)}.mq3-premium-confirm-btn.danger{background:linear-gradient(180deg,#cc342f,#8f1716);color:#fff;border-color:#ef6d64;box-shadow:0 8px 18px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.12)}
    @media(max-width:640px){.mq3-premium-confirm-card{padding:22px 18px 16px}.mq3-premium-confirm-title{font-size:26px}.mq3-premium-confirm-copy{font-size:14px}.mq3-premium-confirm-actions{padding:16px 18px 20px;flex-direction:column-reverse}.mq3-premium-confirm-btn{width:100%;min-width:0}}
  `;
  document.head.append(style);
}

function premiumConfirm({title='Please confirm',messageText='Are you sure?',confirmText='Confirm',cancelText='Cancel',danger=false}={}){
  ensurePremiumConfirmStyles();
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');dialog.className='mq3-premium-confirm';
    const card=node('div');card.className='mq3-premium-confirm-card';const kicker=node('p','MQ3 Music');kicker.className='mq3-premium-confirm-kicker';const heading=node('h3',title);heading.className='mq3-premium-confirm-title';const copy=node('p',messageText);copy.className='mq3-premium-confirm-copy';card.append(kicker,heading,copy);
    const actions=node('div');actions.className='mq3-premium-confirm-actions';const cancel=node('button',cancelText);cancel.type='button';cancel.className='mq3-premium-confirm-btn cancel';const confirm=node('button',confirmText);confirm.type='button';confirm.className='mq3-premium-confirm-btn '+(danger?'danger':'confirm');actions.append(cancel,confirm);dialog.append(card,actions);document.body.append(dialog);
    let done=false;const finish=value=>{if(done)return;done=true;try{dialog.close();}catch{}dialog.remove();resolve(value);};cancel.addEventListener('click',()=>finish(false));confirm.addEventListener('click',()=>finish(true));dialog.addEventListener('cancel',e=>{e.preventDefault();finish(false);});dialog.addEventListener('click',e=>{if(e.target===dialog)finish(false);});dialog.showModal();setTimeout(()=>confirm.focus(),0);
  });
}

function row(target,values){const tr=node('tr');for(const value of values){const td=node('td');if(value instanceof Node)td.append(value);else td.textContent=String(value);tr.append(td);}$(target).append(tr);}
function badge(text,cls=''){const b=node('span',text);b.className='mq3-admin-badge'+(cls?' '+cls:'');return b;}
function badges(items){const box=node('div');box.className='mq3-admin-badges';items.forEach(([text,cls])=>box.append(badge(text,cls)));return box;}

function updateSelection(){const boxes=[...document.querySelectorAll('.song-select:not(:disabled)')],checked=boxes.filter(b=>b.checked);$('remove-selected').disabled=!checked.length;$('select-all-songs').checked=!!boxes.length&&checked.length===boxes.length;$('select-all-songs').indeterminate=checked.length>0&&checked.length<boxes.length;}

function renderSongs(){
  const library=songs.filter(s=>libraryView==='all'||(libraryView==='published'?s.published:!s.published)).sort((a,b)=>a.title.localeCompare(b.title,undefined,{sensitivity:'base'}));
  const term=$('song-library-search').value.trim().toLowerCase();
  const visible=library.filter(s=>!missingDetail||(missingDetail==='duration'?!s.duration_seconds:missingDetail==='lyrics'?!String(s.lyrics||'').trim():!s.cover_url)).filter(s=>[s.title,s.artist,s.category,s.youtube_url?'youtube':'',s.spotify_url?'spotify':'',s.lyrics?'lyrics':'',s.featured?'featured':''].join(' ').toLowerCase().includes(term));
  $('song-rows').replaceChildren();
  for(const s of visible){
    const pick=node('input');pick.type='checkbox';pick.className='song-select';pick.dataset.id=s.id;pick.disabled=!s.published;pick.setAttribute('aria-label','Select '+s.title);pick.addEventListener('change',updateSelection);
    const playerItems=[];if(s.youtube_url)playerItems.push(['YouTube','']);if(s.spotify_url)playerItems.push(['Spotify','']);if(!playerItems.length)playerItems.push(['Needs links','muted']);
    const statusItems=[[s.published?'Published':'Draft / Unpublished',s.published?'good':'muted']];if(String(s.lyrics||'').trim())statusItems.push(['Lyrics','']);if(s.duration_seconds)statusItems.push([formatDuration(s.duration_seconds),'']);if(s.featured)statusItems.push(['Featured','']);
    const actions=node('div');actions.className='mq3-admin-actions';
    const edit=node('button','Edit');edit.type='button';edit.addEventListener('click',()=>editSong(s));
    const duplicate=node('button','Duplicate');duplicate.type='button';duplicate.addEventListener('click',()=>duplicateSong(s));
    actions.append(edit,duplicate);
    row('song-rows',[pick,s.title,s.category,badges(playerItems),badges(statusItems),actions]);
  }
  if(!visible.length)row('song-rows',['','No songs match these filters.','','','','']);
  $('library-count').textContent=visible.length+' shown · '+library.length+' in this view';$('select-all-songs').checked=false;$('select-all-songs').indeterminate=false;$('remove-selected').disabled=true;
}

async function loadSongs(){songs=await api('/admin/songs');renderSongs();}

function fillSongForm(s,{duplicate=false}={}){
  const f=$('song-form');f.reset();editingSongId=duplicate?null:(s?.id||null);createId=crypto.randomUUID();f.elements.id.value=editingSongId||'';f.elements.cover_url.value=s?.cover_url||'';
  if(s){for(const[k,v]of Object.entries(s)){const input=f.elements.namedItem(k);if(input&&k!=='cover_url'&&k!=='id'&&k!=='duration_seconds'){if(input.type==='checkbox')input.checked=!!v;else input.value=v??'';}}f.elements.duration.value=formatDuration(s.duration_seconds);}
  else{f.elements.artist.value='manny III';f.elements.category.value='Name Songs';f.elements.published.checked=true;f.elements.featured.checked=false;f.elements.duration.value='';}
  if(duplicate&&s){f.elements.title.value=s.title+' (Copy)';f.elements.published.checked=true;f.elements.featured.checked=false;}
  $('editor-title').textContent=duplicate?'Duplicate song':editingSongId?'Edit song':'Add new song';f.hidden=false;f.dispatchEvent(new Event('mq3-song-form-loaded'));f.scrollIntoView({behavior:'smooth',block:'start'});f.elements.title.focus();if(duplicate)f.elements.title.select();
}
function editSong(s=null){if(savingSong)return;fillSongForm(s);}
function duplicateSong(s){if(savingSong)return;fillSongForm(s,{duplicate:true});message('Duplicate ready. Rename it if needed, then save.');}

async function loadAnalytics(){report=await api('/admin/analytics?period='+period);$('total-views').textContent=report.total.toLocaleString();$('legacy-views').textContent=report.legacy_total.toLocaleString();$('period-label').textContent={daily:'Today',weekly:'This week',monthly:'This month',all:'Since migration'}[period];$('analytics-rows').replaceChildren();for(const s of report.songs)row('analytics-rows',[s.title,s.category,s.views,s.legacy_views]);}
async function loadAudience(){const rows=await api('/admin/audience');$('audience-rows').replaceChildren();rows.forEach((s,i)=>{const previous=rows[i+1];const delta=key=>previous?((s[key]-previous[key]>=0?'+':'')+(s[key]-previous[key])):'—';row('audience-rows',[s.recorded_on.slice(0,10),s.youtube_subscribers,delta('youtube_subscribers'),s.spotify_followers,delta('spotify_followers'),s.note]);});if(!rows.length)row('audience-rows',['No snapshots yet.','','','','','']);}
async function loadSettings(){const s=await api('/admin/settings');for(const key of['youtube_channel','spotify_artist'])$('settings-form').elements[key].value=s[key]||'';}
async function enter(){await loadSongs();$('login').hidden=true;$('dashboard').hidden=false;$('logout').hidden=false;}

function submit(id,handler){$(id).addEventListener('submit',async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;const label=b.textContent;b.textContent='Saving…';try{await handler(e.target);}catch(err){message(err.message,true);}finally{b.disabled=false;b.textContent=label;}});}
submit('login',async f=>{await api('/login',{password:f.elements.password.value});f.reset();await enter();message('Signed in.');});
$('logout').addEventListener('click',async()=>{try{await api('/logout',{});location.reload();}catch(e){message(e.message,true);}});

submit('song-form',async f=>{
  if(savingSong)return;const title=f.elements.title.value.trim();const duplicate=songs.find(s=>s.id!==editingSongId&&s.title.trim().toLowerCase()===title.toLowerCase());
  if(duplicate){const proceed=await premiumConfirm({title:'Duplicate title',messageText:`“${title}” already exists in your song library. Do you still want to save another song with the same title?`,confirmText:'Save anyway',cancelText:'Go back'});if(!proceed)return;}
  const body=Object.fromEntries(new FormData(f));body.id=editingSongId||'';body.client_id=createId;body.published=f.elements.published.checked;body.featured=f.elements.featured.checked;
  const controls=[...f.elements].filter(x=>!x.disabled);savingSong=true;controls.forEach(x=>x.disabled=true);
  try{message('Saving song…');await api('/admin/songs',body);f.hidden=true;editingSongId=null;f.elements.id.value='';await loadSongs();message(body.published?'Saved and published ✓':'Draft saved ✓');}finally{savingSong=false;controls.forEach(x=>x.disabled=false);}
});

$('new-song').addEventListener('click',()=>editSong(null));
$('cancel-song').addEventListener('click',()=>{if(savingSong)return;editingSongId=null;$('song-form').hidden=true;$('song-form').reset();$('song-form').elements.id.value='';});
$('song-library-search')?.addEventListener('input',renderSongs);
$('select-all-songs').addEventListener('change',e=>{document.querySelectorAll('.song-select:not(:disabled)').forEach(b=>b.checked=e.target.checked);updateSelection();});

$('remove-selected').addEventListener('click',async()=>{
  const ids=[...document.querySelectorAll('.song-select:checked')].map(b=>b.dataset.id);if(!ids.length)return;
  const proceed=await premiumConfirm({title:'Unpublish selected songs?',messageText:`${ids.length} selected song${ids.length===1?'':'s'} will be removed from the public library. The song data will stay saved in the database.`,confirmText:'Unpublish',cancelText:'Keep songs',danger:true});if(!proceed)return;
  const button=$('remove-selected');button.disabled=true;const label=button.textContent;button.textContent='Unpublishing…';
  try{for(const id of ids){const s=songs.find(x=>x.id===id);if(!s)continue;await api('/admin/songs',{...s,duration:formatDuration(s.duration_seconds),published:false,featured:false});}await loadSongs();message(`${ids.length} song${ids.length===1?'':'s'} unpublished.`);}catch(err){message(err.message,true);}finally{button.textContent=label;updateSelection();}
});

submit('settings-form',async f=>{await api('/admin/settings',Object.fromEntries(new FormData(f)));message('Platform links saved.');});
submit('audience-form',async f=>{const body=Object.fromEntries(new FormData(f));body.youtube_subscribers=Number(body.youtube_subscribers);body.spotify_followers=Number(body.spotify_followers);await api('/admin/audience',body);await loadAudience();message('Audience snapshot saved.');});

document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',async()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-pressed',x===b));document.querySelectorAll('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==b.dataset.tab);try{if(b.dataset.tab==='analytics')await loadAnalytics();if(b.dataset.tab==='audience')await loadAudience();if(b.dataset.tab==='settings')await loadSettings();}catch(e){message(e.message,true);}}));
document.querySelectorAll('[data-period]').forEach(b=>b.addEventListener('click',async()=>{period=b.dataset.period;document.querySelectorAll('[data-period]').forEach(x=>x.setAttribute('aria-pressed',x===b));try{await loadAnalytics();}catch(e){message(e.message,true);}}));

$('export-analytics').addEventListener('click',()=>{if(!report)return;const cell=v=>'"'+String(v).replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';const rows=[['Song','Category','Website views ('+report.period+')','Historical views'],...report.songs.map(s=>[s.title,s.category,s.views,s.legacy_views])];const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=node('a');a.href=url;a.download='mq3-website-views-'+report.period+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});

setupAdminOverview();ensureAdminEnhancementStyles();
$('audience-form').elements.recorded_on.value=new Date(Date.now()+8*3600000).toISOString().slice(0,10);
enter().catch(e=>{if(!e.message.includes('sign in'))message(e.message,true);});


