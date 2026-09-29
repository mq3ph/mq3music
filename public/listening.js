import {readIds, writeIds, filterSongs, recentIds} from './library-state.js';
const $ = id => document.getElementById(id);
const el = (tag, text, cls) => { const n = document.createElement(tag); if(text) n.textContent=text; if(cls) n.className=cls; return n; };
let songs=[], settings={}, selected=null, platform='youtube', category='All', collection='all', demo=false;
let favorites=[], recent=[], storage=null, loading=false;
try { storage=localStorage; favorites=readIds(storage,'mq3-favorites'); recent=readIds(storage,'mq3-recent'); } catch {}
function fallbackCover(category=''){const p={"Love Songs":['#4b0d18','#d36a45','#f2b45f'],Inspirational:['#152d4c','#edb34f','#f7df9a'],OPM:['#17212c','#8a3946','#e8a85a'],"Name Songs":['#2a153f','#9b5270','#efc07a']}[category]||['#2a0907','#7a2a16','#d8aa45'];const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${p[0]}"/><stop offset=".58" stop-color="${p[1]}"/><stop offset="1" stop-color="${p[2]}"/></linearGradient><radialGradient id="r"><stop stop-color="#fff4c8" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="600" height="600" fill="url(#g)"/><circle cx="420" cy="150" r="170" fill="url(#r)"/><path d="M0 455 Q145 350 290 430 T600 390 V600 H0Z" fill="#0b0708" opacity=".55"/><path d="M0 500 Q180 405 340 470 T600 430" fill="none" stroke="#f0c36a" stroke-opacity=".35" stroke-width="3"/></svg>`;return'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);}
function coverFor(song) { return song?.cover_url || fallbackCover(song?.category); }
function persist(key, value) {
  if(!writeIds(storage,key,value)) $('status').textContent='Saved for this visit only. Browser storage is unavailable.';
}
function renderCatalog() {
  const matches=filterSongs(songs,{term:$('search').value,category,collection,favorites,recent});
  $('count').textContent=(collection==='all'?'':collection==='favorites'?'Favorites · ':'Recent · ')+matches.length+' song'+(matches.length===1?'':'s');
  $('song-grid').replaceChildren();
  $('catalog-status').textContent=matches.length?'':!songs.length?'New songs are on the way. Check back soon.':collection==='favorites'?'No favorites match. Choose a song and tap Save favorite.':collection==='recent'?'No recent songs match. Choose a song to get started.':'No songs match. Try another name or category.';
  for(const s of matches) {
    const card=el('button',null,'song-row'+(s.id===selected?.id?' selected':''));
    card.setAttribute('aria-label','Listen to '+s.title);
    card.setAttribute('aria-pressed',String(s.id===selected?.id));
    const img=el('img'); img.src=coverFor(s); img.alt=''; img.loading='lazy';
    img.addEventListener('error',()=>{img.src=fallbackCover(s.category);},{once:true});
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
function showPlayer() {
  if(!selected) return;
  const url=selected[platform+'_url'];
  for(const p of ['youtube','spotify']) { $(p).disabled=!selected[p+'_url']; $(p).setAttribute('aria-pressed',String(p===platform)); }
  $('player').replaceChildren();
  $('player-note').textContent=platform==='spotify'?'Spotify may play a preview.':'';
  $('spotify-help').hidden=platform!=='spotify';
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
  if(!song[platform+'_url']) platform=song.youtube_url?'youtube':'spotify';
  $('song-title').textContent=song.title; $('song-artist').textContent=song.artist;
  $('song-category').textContent=song.category?' · '+song.category:'';
  $('song-description').textContent=song.description||'';
  const cover=$('player-cover'); cover.src=coverFor(song); cover.alt=song.title+' cover';
  cover.onerror=()=>{cover.onerror=null;cover.src=fallbackCover(song.category);};
  $('status').textContent=''; showPlayer(); updateActions();
  recent=recentIds(recent,song.id); persist('mq3-recent',recent); renderCatalog();
  history.replaceState(null,'','/?song='+encodeURIComponent(song.id));
  document.title=song.title+' — '+song.artist+' | MQ3 Music';
  if(track&&!demo) fetch('/api/song-views',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({song_id:song.id})}).catch(()=>{});
  if(scroll&&matchMedia('(max-width:800px)').matches) $('listen').scrollIntoView({behavior:'smooth',block:'start'});
}
$('search').addEventListener('input',renderCatalog);
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
