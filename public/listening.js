import {readIds, writeIds, filterSongs, recentIds} from './library-state.js';
const $ = id => document.getElementById(id);
const el = (tag, text, cls) => { const n = document.createElement(tag); if(text) n.textContent=text; if(cls) n.className=cls; return n; };
let songs=[], settings={}, selected=null, platform='youtube', category='All', collection='all', demo=false;
let favorites=[], recent=[], storage=null, loading=false;
try { storage=localStorage; favorites=readIds(storage,'mq3-favorites'); recent=readIds(storage,'mq3-recent'); } catch {}

function playTile(category=''){
  const palette={
    'Love Songs':['#2b0710','#6f1e2a','#e2a25b','#fff0c8'],
    Inspirational:['#0f1f39','#345c86','#d8a34a','#fff2c9'],
    OPM:['#171521','#5c2a39','#d59a56','#fff0c9'],
    'Name Songs':['#20112f','#6b3d5a','#d7a15e','#fff0cf']
  }[category]||['#1f0908','#5d2115','#d4a24d','#fff0cc'];
  const [bgDark,bgMid,gold,cream]=palette;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${bgDark}"/><stop offset="58%" stop-color="${bgMid}"/><stop offset="100%" stop-color="#120405"/></linearGradient><radialGradient id="glow" cx="78%" cy="18%" r="40%"><stop offset="0%" stop-color="${cream}" stop-opacity=".92"/><stop offset="22%" stop-color="${gold}" stop-opacity=".36"/><stop offset="100%" stop-color="${gold}" stop-opacity="0"/></radialGradient><radialGradient id="buttonFill" cx="35%" cy="30%" r="80%"><stop offset="0%" stop-color="#fff4dc"/><stop offset="45%" stop-color="#f0cf86"/><stop offset="100%" stop-color="#c9912d"/></radialGradient><linearGradient id="ringStroke" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff2cd"/><stop offset="100%" stop-color="#d6a347"/></linearGradient><linearGradient id="frameStroke" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f1ce7a" stop-opacity=".55"/><stop offset="100%" stop-color="#8e5b22" stop-opacity=".28"/></linearGradient><filter id="buttonShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#000000" flood-opacity=".38"/></filter></defs><rect width="600" height="600" rx="42" fill="url(#bg)"/><rect width="600" height="600" rx="42" fill="url(#glow)"/><path d="M0 436 Q110 340 248 396 T600 358 V600 H0Z" fill="#0b0608" opacity=".48"/><path d="M0 488 Q170 404 336 462 T600 426 V600 H0Z" fill="#1a0d11" opacity=".42"/><path d="M0 505 Q168 434 338 476 T600 446" fill="none" stroke="${gold}" stroke-opacity=".28" stroke-width="3"/><rect x="20" y="20" width="560" height="560" rx="34" fill="none" stroke="url(#frameStroke)" stroke-width="2"/><circle cx="300" cy="318" r="108" fill="${gold}" opacity=".10"/><circle cx="300" cy="318" r="96" fill="${cream}" opacity=".06"/><circle cx="300" cy="318" r="90" fill="none" stroke="url(#ringStroke)" stroke-width="4" opacity=".9"/><g filter="url(#buttonShadow)"><circle cx="300" cy="318" r="74" fill="url(#buttonFill)"/><circle cx="300" cy="318" r="74" fill="none" stroke="#fff4dd" stroke-opacity=".6" stroke-width="2"/><ellipse cx="280" cy="286" rx="36" ry="22" fill="#fffdf6" opacity=".24"/></g><path d="M279 274 L352 318 L279 362 Z" fill="#5a180f"/><g opacity=".82"><rect x="236" y="112" width="128" height="10" rx="5" fill="${gold}" opacity=".42"/><rect x="255" y="132" width="90" height="6" rx="3" fill="${cream}" opacity=".26"/></g><g opacity=".6"><rect x="198" y="482" width="204" height="8" rx="4" fill="${gold}" opacity=".20"/><rect x="226" y="500" width="148" height="6" rx="3" fill="${cream}" opacity=".16"/></g></svg>`;
  return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
}
function coverFor(song){return playTile(song?.category);}
function persist(key, value) {
  if(!writeIds(storage,key,value)) $('status').textContent='Saved for this visit only. Browser storage is unavailable.';
}
function renderCatalog() {
  const matches=filterSongs(songs,{term:$('search').value,category,collection,favorites,recent});
  $('song-grid').replaceChildren();
  $('catalog-status').textContent=matches.length?'':!songs.length?'New songs are on the way. Check back soon.':collection==='favorites'?'No favorites match. Choose a song and tap Save favorite.':collection==='recent'?'No recent songs match. Choose a song to get started.':'No songs match. Try another name or category.';
  for(const s of matches) {
    const card=el('button',null,'song-row'+(s.id===selected?.id?' selected':''));
    card.setAttribute('aria-label','Listen to '+s.title);
    card.setAttribute('aria-pressed',String(s.id===selected?.id));
    const img=el('img'); img.src=coverFor(s); img.alt='Play '+s.title; img.loading='lazy';
    const info=el('span',null,'song-info'); info.append(el('strong',s.title),el('small',s.artist+' · '+s.category));
    card.append(img,info,el('span',favorites.includes(s.id)?'♥':'▶','play-circle'));
    card.addEventListener('click',()=>selectSong(s)); $('song-grid').append(card);
  }
}
function updateActions() {
  $('song-actions').hidden=!selected;
  if(!selected) return;
  const saved=favorites.includes(selected.id);
  $('favorite-song').textContent=saved?'♥ Saved favorite':'♡ Save favorite';
  $('favorite-song').setAttribute('aria-pressed',String(saved));
  for(const p of ['youtube','spotify']) {
    const link=$('open-'+p); link.hidden=!selected[p+'_url'];
    if(selected[p+'_url']) link.href=selected[p+'_url']; else link.removeAttribute('href');
  }
}
function updateSpotifyHandoff() {
  const box=$('spotify-fullplay'), link=$('spotify-fullplay-link');
  if(platform==='spotify'&&selected?.spotify_url){box.hidden=false;link.href=selected.spotify_url;}
  else {box.hidden=true;link.removeAttribute('href');}
}
function updateLyrics(){
  const panel=$('lyrics-panel'), text=$('song-lyrics'), lyrics=(selected?.lyrics||'').trim();
  text.textContent=lyrics;
  panel.hidden=!lyrics;
  panel.open=false;
}
function showPlayer() {
  if(!selected) return;
  const url=selected[platform+'_url'];
  for(const p of ['youtube','spotify']) { $(p).disabled=!selected[p+'_url']; $(p).setAttribute('aria-pressed',String(p===platform)); }
  $('player').replaceChildren();
  $('player-note').textContent=platform==='spotify'?'Spotify preview in MQ3. Use the button below for full playback.':'';
  $('spotify-help').hidden=platform!=='spotify';
  updateSpotifyHandoff();
  if(!url) { $('player').append(el('div','No player is available for this song.','player-empty')); return; }
  const iframe=el('iframe'); iframe.title=selected.title+' — '+(platform==='youtube'?'YouTube':'Spotify'); iframe.className=platform;
  iframe.allow='autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
  iframe.allowFullscreen=platform==='spotify'; iframe.referrerPolicy='strict-origin-when-cross-origin';
  iframe.src=platform==='youtube'
    ? 'https://www.youtube.com/embed/'+new URL(url).searchParams.get('v')+'?playsinline=1&rel=0&controls=1&fs=0&disablekb=1&iv_load_policy=3'
    : 'https://open.spotify.com/embed/track/'+new URL(url).pathname.split('/').pop()+'?utm_source=generator&theme=0';
  iframe.addEventListener('error',()=>{$('player-note').textContent='Player unavailable. Use the platform links below to listen.';});
  $('player').append(iframe);
}
function selectSong(song,{track=true,scroll=true}={}) {
  if(selected?.id===song.id) return;
  selected=song;
  $('share-link').hidden=true;
  platform=song.youtube_url?'youtube':song.spotify_url?'spotify':'youtube';
  $('song-title').textContent=song.title; $('song-artist').textContent=song.artist;
  $('song-category').textContent=song.category?' · '+song.category:'';
  const cover=$('player-cover'); cover.src=coverFor(song); cover.alt='Play '+song.title;
  $('status').textContent=''; showPlayer(); updateLyrics(); updateActions();
  recent=recentIds(recent,song.id); persist('mq3-recent',recent); renderCatalog();
  history.replaceState(null,'','/?song='+encodeURIComponent(song.id));
  document.title=song.title+' — '+song.artist+' | MQ3 Music';
  if(track&&!demo) fetch('/api/song-views',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({song_id:song.id})}).catch(()=>{});
  if(scroll&&matchMedia('(max-width:800px)').matches) $('listen').scrollIntoView({behavior:'smooth',block:'start'});
}
$('search').addEventListener('input',()=>{
  renderCatalog();
  const term=$('search').value.trim();
  if(!term)return;
  const match=filterSongs(songs,{term,category,collection,favorites,recent})[0];
  if(match&&match.id!==selected?.id)selectSong(match,{track:false,scroll:false});
});
document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{
  category=b.dataset.category; document.querySelectorAll('[data-category]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); renderCatalog();
}));
document.querySelectorAll('[data-collection]').forEach(b=>b.addEventListener('click',()=>{
  collection=b.dataset.collection; document.querySelectorAll('[data-collection]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); renderCatalog();
}));
for(const p of ['youtube','spotify']) $(p).addEventListener('click',()=>{if(platform===p)return;platform=p;showPlayer();});
$('favorite-song').addEventListener('click',()=>{
  if(!selected)return;
  favorites=favorites.includes(selected.id)?favorites.filter(id=>id!==selected.id):[selected.id,...favorites].slice(0,500);
  persist('mq3-favorites',favorites); updateActions(); renderCatalog();
});
$('share-song').addEventListener('click',async()=>{
  if(!selected)return;
  const url=new URL('/?song='+encodeURIComponent(selected.id),location.origin).href;
  try {
    if(navigator.share) await navigator.share({title:selected.title+' — '+selected.artist,url});
    else { await navigator.clipboard.writeText(url); $('status').textContent='Song link copied.'; }
  } catch(e) {
    if(e.name==='AbortError')return;
    $('share-link').hidden=false; $('share-link').value=url; $('share-link').focus(); $('share-link').select();
    $('status').textContent='Copy this song link to share it.';
  }
});
$('clear-recent').addEventListener('click',()=>{recent=[];persist('mq3-recent',recent);renderCatalog();$('status').textContent='Recent songs cleared on this browser.';});
async function load() {
  if(loading)return; loading=true; $('retry-catalog').hidden=true;
  $('catalog-status').className=''; $('catalog-status').textContent='Loading songs…';
  try {
    const r=await fetch('/api/catalog'); const data=await r.json(); if(!r.ok)throw Error(data.error||'Cannot load songs.');
    songs=data.songs; settings=data.settings; demo=data.demo; $('demo').hidden=!demo;
    for(const [id,key] of [['subscribe-mq3','youtube_channel'],['follow-mq3','spotify_artist']]) {
      const link=$(id); link.hidden=!settings[key];
      if(settings[key]) { const url=new URL(settings[key]); if(id==='subscribe-mq3')url.searchParams.set('sub_confirmation','1'); link.href=url.href; }
    }
    $('support-artist').hidden=!settings.youtube_channel&&!settings.spotify_artist;
    renderCatalog();
    const requested=new URLSearchParams(location.search).get('song');
    const first=requested?songs.find(s=>s.id===requested):songs.find(s=>s.featured)||filterSongs(songs)[0];
    if(first)selectSong(first,{scroll:false});
    else if(requested)$('status').textContent='This song is unavailable. Please choose another.';
  } catch(e) { $('catalog-status').textContent=e.message; $('catalog-status').className='notice error'; $('retry-catalog').hidden=false; }
  finally {loading=false;}
}
$('retry-catalog').addEventListener('click',load);
const options=$('player-options');
document.addEventListener('click',event=>{if(options.open&&!options.contains(event.target))options.open=false;});
options.addEventListener('keydown',event=>{if(event.key==='Escape'){options.open=false;options.querySelector('summary').focus();}});
if('serviceWorker' in navigator)navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))).catch(()=>{});
load();