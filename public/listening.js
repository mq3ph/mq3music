import {readIds, writeIds, filterSongs, recentIds} from './library-state.js';
const $ = id => document.getElementById(id);
const el = (tag, text, cls) => { const n = document.createElement(tag); if(text!==undefined&&text!==null) n.textContent=text; if(cls) n.className=cls; return n; };
let songs=[], settings={}, selected=null, platform='youtube', category='All', collection='all', demo=false;
let favorites=[], recent=[], storage=null, loading=false, listenObserver=null;
try { storage=localStorage; favorites=readIds(storage,'mq3-favorites'); recent=readIds(storage,'mq3-recent'); } catch {}

function ensureEnhancementStyles(){
  if(document.getElementById('mq3-enhancement-styles'))return;
  const style=document.createElement('style');style.id='mq3-enhancement-styles';style.textContent=`
    .player-app .song-row.selected img{box-shadow:0 0 0 2px rgba(237,198,109,.72),0 0 16px rgba(237,198,109,.20)}
    .player-app .song-row.selected .play-circle{animation:mq3Pulse 1.8s ease-in-out infinite}
    @keyframes mq3Pulse{0%,100%{opacity:.72;transform:scale(1)}50%{opacity:1;transform:scale(1.08)}}
    @media(prefers-reduced-motion:reduce){.player-app .song-row.selected .play-circle{animation:none}}
    .mq3-song-badges{display:inline-flex;gap:5px;margin-left:7px;vertical-align:middle;flex-wrap:wrap}
    .mq3-song-badge{display:inline-flex;align-items:center;min-height:17px;padding:1px 6px;border:1px solid rgba(237,198,109,.30);border-radius:999px;color:#edc66d;font-size:9px;line-height:1.25;letter-spacing:.35px;text-transform:uppercase;background:rgba(237,198,109,.07)}
    .mq3-empty-state{margin:8px 0 12px;padding:11px 13px;border:1px dashed rgba(151,97,40,.42);border-radius:10px;background:rgba(41,11,7,.28)}
    .mq3-skeleton{pointer-events:none;opacity:.55}
    .mq3-skeleton .mq3-sk-img,.mq3-skeleton .mq3-sk-line{display:block;background:linear-gradient(90deg,rgba(255,255,255,.04),rgba(237,198,109,.11),rgba(255,255,255,.04));background-size:220% 100%;animation:mq3Shimmer 1.35s linear infinite}
    .mq3-skeleton .mq3-sk-img{width:52px;height:52px;border-radius:8px;flex:0 0 auto}.mq3-skeleton .mq3-sk-copy{flex:1}.mq3-skeleton .mq3-sk-line{height:10px;border-radius:7px;margin:7px 0}.mq3-skeleton .mq3-sk-line.short{width:55%}
    @keyframes mq3Shimmer{to{background-position:-220% 0}}
    @media(prefers-reduced-motion:reduce){.mq3-skeleton .mq3-sk-img,.mq3-skeleton .mq3-sk-line{animation:none}}
    .mq3-lyrics-tools{display:flex;justify-content:flex-end;padding:10px 14px 0}.mq3-copy-lyrics{min-height:32px;padding:5px 10px;border-radius:999px;font-size:11px;border-color:rgba(237,198,109,.45);background:transparent}
    .mq3-mini-player{display:none}
    @media(max-width:800px){
      .mq3-mini-player{position:fixed;left:12px;right:12px;bottom:12px;z-index:50;align-items:center;gap:10px;padding:9px 10px;border:1px solid rgba(237,198,109,.48);border-radius:15px;background:rgba(29,6,4,.95);box-shadow:0 14px 34px rgba(0,0,0,.38);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
      .mq3-mini-player.visible{display:flex}.mq3-mini-player img{width:38px;height:38px;border-radius:8px;flex:0 0 auto}.mq3-mini-copy{min-width:0;flex:1}.mq3-mini-copy strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px}.mq3-mini-copy small{display:block;color:#dec6b2;font-size:10px}.mq3-mini-jump{min-height:36px;padding:6px 11px;border-radius:999px;font-size:11px;flex:0 0 auto}
    }
  `;document.head.append(style);
}

function categoryPattern(category,gold,cream){
  if(category==='Name Songs')return `<circle cx="92" cy="125" r="42" fill="none" stroke="${cream}" stroke-opacity=".14" stroke-width="3"/><circle cx="92" cy="125" r="23" fill="none" stroke="${gold}" stroke-opacity=".18" stroke-width="2"/>`;
  if(category==='OPM')return `<path d="M70 150 C150 105 220 195 300 150 S450 105 530 150" fill="none" stroke="${cream}" stroke-opacity=".13" stroke-width="4"/><path d="M70 173 C150 128 220 218 300 173 S450 128 530 173" fill="none" stroke="${gold}" stroke-opacity=".14" stroke-width="2"/>`;
  if(category==='Inspirational')return `<path d="M425 60v92M380 76l31 75M470 76l-31 75M350 115l61 44M500 115l-61 44" stroke="${cream}" stroke-opacity=".13" stroke-width="4" stroke-linecap="round"/>`;
  return `<path d="M90 145 C120 105 176 110 194 151 C212 110 268 105 298 145" fill="none" stroke="${cream}" stroke-opacity=".12" stroke-width="4"/>`;
}

function playTile(category=''){
  const palette={
    'Love Songs':['#2b0710','#6f1e2a','#e2a25b','#fff0c8'],
    Inspirational:['#0f1f39','#345c86','#d8a34a','#fff2c9'],
    OPM:['#081b20','#1c5660','#d7a15c','#e7f7f3'],
    'Name Songs':['#2b0f3e','#7d3f86','#dca65f','#f8e9ff']
  }[category]||['#1f0908','#5d2115','#d4a24d','#fff0cc'];
  const [bgDark,bgMid,gold,cream]=palette,pattern=categoryPattern(category,gold,cream);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${bgDark}"/><stop offset="58%" stop-color="${bgMid}"/><stop offset="100%" stop-color="#120405"/></linearGradient><radialGradient id="glow" cx="78%" cy="18%" r="40%"><stop offset="0%" stop-color="${cream}" stop-opacity=".92"/><stop offset="22%" stop-color="${gold}" stop-opacity=".36"/><stop offset="100%" stop-color="${gold}" stop-opacity="0"/></radialGradient><radialGradient id="buttonFill" cx="35%" cy="30%" r="80%"><stop offset="0%" stop-color="#fff4dc"/><stop offset="45%" stop-color="#f0cf86"/><stop offset="100%" stop-color="#c9912d"/></radialGradient><linearGradient id="ringStroke" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff2cd"/><stop offset="100%" stop-color="#d6a347"/></linearGradient><linearGradient id="frameStroke" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f1ce7a" stop-opacity=".55"/><stop offset="100%" stop-color="#8e5b22" stop-opacity=".28"/></linearGradient><filter id="buttonShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#000000" flood-opacity=".38"/></filter></defs><rect width="600" height="600" rx="42" fill="url(#bg)"/><rect width="600" height="600" rx="42" fill="url(#glow)"/>${pattern}<path d="M0 436 Q110 340 248 396 T600 358 V600 H0Z" fill="#0b0608" opacity=".48"/><path d="M0 488 Q170 404 336 462 T600 426 V600 H0Z" fill="#1a0d11" opacity=".42"/><path d="M0 505 Q168 434 338 476 T600 446" fill="none" stroke="${gold}" stroke-opacity=".28" stroke-width="3"/><rect x="20" y="20" width="560" height="560" rx="34" fill="none" stroke="url(#frameStroke)" stroke-width="2"/><circle cx="300" cy="318" r="108" fill="${gold}" opacity=".10"/><circle cx="300" cy="318" r="96" fill="${cream}" opacity=".06"/><circle cx="300" cy="318" r="90" fill="none" stroke="url(#ringStroke)" stroke-width="4" opacity=".9"/><g filter="url(#buttonShadow)"><circle cx="300" cy="318" r="74" fill="url(#buttonFill)"/><circle cx="300" cy="318" r="74" fill="none" stroke="#fff4dd" stroke-opacity=".6" stroke-width="2"/><ellipse cx="280" cy="286" rx="36" ry="22" fill="#fffdf6" opacity=".24"/></g><path d="M279 274 L352 318 L279 362 Z" fill="#5a180f"/><g opacity=".82"><rect x="236" y="112" width="128" height="10" rx="5" fill="${gold}" opacity=".42"/><rect x="255" y="132" width="90" height="6" rx="3" fill="${cream}" opacity=".26"/></g><g opacity=".6"><rect x="198" y="482" width="204" height="8" rx="4" fill="${gold}" opacity=".20"/><rect x="226" y="500" width="148" height="6" rx="3" fill="${cream}" opacity=".16"/></g></svg>`;
  return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
}
function coverFor(song){return playTile(song?.category);}
function isNewSong(song){if(!song?.created_at)return false;const t=Date.parse(song.created_at);return Number.isFinite(t)&&Date.now()-t<=14*86400000;}
function persist(key,value){if(!writeIds(storage,key,value))$('status').textContent='Saved for this visit only. Browser storage is unavailable.';}

function renderSkeletons(){
  const grid=$('song-grid');grid.replaceChildren();
  for(let i=0;i<4;i++){const row=el('div',null,'song-row mq3-skeleton'),img=el('span',null,'mq3-sk-img'),copy=el('span',null,'mq3-sk-copy');copy.append(el('span',null,'mq3-sk-line'),el('span',null,'mq3-sk-line short'));row.append(img,copy);grid.append(row);}
}

function renderCatalog(){
  const matches=filterSongs(songs,{term:$('search').value,category,collection,favorites,recent});
  $('song-grid').replaceChildren();
  const status=$('catalog-status');status.classList.remove('mq3-empty-state');
  status.textContent=matches.length?'':!songs.length?'New songs are on the way. Check back soon.':collection==='favorites'?'No favorites match. Choose a song and tap Save favorite.':collection==='recent'?'No recent songs match. Choose a song to get started.':'No songs match. Try another name or category.';
  if(status.textContent)status.classList.add('mq3-empty-state');
  for(const s of matches){
    const card=el('button',null,'song-row'+(s.id===selected?.id?' selected':''));card.setAttribute('aria-label','Listen to '+s.title);card.setAttribute('aria-pressed',String(s.id===selected?.id));
    const img=el('img');img.src=coverFor(s);img.alt='Play '+s.title;img.loading='lazy';
    const info=el('span',null,'song-info'),titleLine=el('strong',s.title);
    if(s.featured||isNewSong(s)){const badges=el('span',null,'mq3-song-badges');if(s.featured)badges.append(el('span','Featured','mq3-song-badge'));if(isNewSong(s))badges.append(el('span','New','mq3-song-badge'));titleLine.append(badges);}
    info.append(titleLine,el('small',s.artist+' · '+s.category));
    card.append(img,info,el('span',favorites.includes(s.id)?'♥':'▶','play-circle'));card.addEventListener('click',()=>selectSong(s));$('song-grid').append(card);
  }
}

function updateActions(){
  $('song-actions').hidden=!selected;if(!selected)return;
  const saved=favorites.includes(selected.id);$('favorite-song').textContent=saved?'♥ Saved favorite':'♡ Save favorite';$('favorite-song').setAttribute('aria-pressed',String(saved));
  for(const p of ['youtube','spotify']){const link=$('open-'+p);link.hidden=!selected[p+'_url'];if(selected[p+'_url'])link.href=selected[p+'_url'];else link.removeAttribute('href');}
}
function updateSpotifyHandoff(){const box=$('spotify-fullplay'),link=$('spotify-fullplay-link');if(platform==='spotify'&&selected?.spotify_url){box.hidden=false;link.href=selected.spotify_url;}else{box.hidden=true;link.removeAttribute('href');}}
function updateLyrics(){const panel=$('lyrics-panel'),text=$('song-lyrics'),lyrics=(selected?.lyrics||'').trim();text.textContent=lyrics;panel.hidden=!lyrics;panel.open=false;const copy=$('copy-lyrics');if(copy)copy.disabled=!lyrics;}
function updateMiniPlayer(){
  const mini=$('mq3-mini-player');if(!mini||!selected)return;
  $('mq3-mini-cover').src=coverFor(selected);$('mq3-mini-title').textContent=selected.title;$('mq3-mini-source').textContent=(platform==='spotify'?'Spotify':'YouTube')+' · '+selected.artist;
}
function setupMiniPlayer(){
  if($('mq3-mini-player'))return;
  const mini=el('div',null,'mq3-mini-player');mini.id='mq3-mini-player';mini.setAttribute('aria-label','Current song');
  const img=el('img');img.id='mq3-mini-cover';img.alt='';const copy=el('div',null,'mq3-mini-copy'),title=el('strong','',null),source=el('small','',null);title.id='mq3-mini-title';source.id='mq3-mini-source';copy.append(title,source);
  const jump=el('button','Player ↑','mq3-mini-jump');jump.type='button';jump.addEventListener('click',()=>$('listen').scrollIntoView({behavior:'smooth',block:'start'}));mini.append(img,copy,jump);document.body.append(mini);
  if('IntersectionObserver' in window){listenObserver=new IntersectionObserver(entries=>{const visible=!entries[0].isIntersecting&&!!selected&&matchMedia('(max-width:800px)').matches;mini.classList.toggle('visible',visible);},{threshold:.12});listenObserver.observe($('listen'));}
}
function setupLyricsTools(){
  const body=document.querySelector('.lyrics-body');if(!body||$('copy-lyrics'))return;
  const tools=el('div',null,'mq3-lyrics-tools'),button=el('button','Copy lyrics','mq3-copy-lyrics');button.id='copy-lyrics';button.type='button';button.addEventListener('click',async()=>{if(!selected?.lyrics)return;try{await navigator.clipboard.writeText(selected.lyrics);button.textContent='Copied ✓';setTimeout(()=>button.textContent='Copy lyrics',1400);}catch{$('status').textContent='Could not copy lyrics on this browser.';}});tools.append(button);body.prepend(tools);
}
function showPlayer(){
  if(!selected)return;const url=selected[platform+'_url'];
  for(const p of ['youtube','spotify']){$(p).disabled=!selected[p+'_url'];$(p).setAttribute('aria-pressed',String(p===platform));}
  $('player').replaceChildren();$('player-note').textContent=platform==='spotify'?'Spotify preview in MQ3. Use the button below for full playback.':'';$('spotify-help').hidden=platform!=='spotify';updateSpotifyHandoff();updateMiniPlayer();
  if(!url){$('player').append(el('div','No player is available for this song.','player-empty'));return;}
  const iframe=el('iframe');iframe.title=selected.title+' — '+(platform==='youtube'?'YouTube':'Spotify');iframe.className=platform;iframe.allow='autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';iframe.allowFullscreen=platform==='spotify';iframe.referrerPolicy='strict-origin-when-cross-origin';iframe.src=platform==='youtube'?'https://www.youtube.com/embed/'+new URL(url).searchParams.get('v')+'?playsinline=1&rel=0&controls=1&fs=0&disablekb=1&iv_load_policy=3':'https://open.spotify.com/embed/track/'+new URL(url).pathname.split('/').pop()+'?utm_source=generator&theme=0';iframe.addEventListener('error',()=>{$('player-note').textContent='Player unavailable. Use the platform links below to listen.';});$('player').append(iframe);
}
function selectSong(song,{track=true,scroll=true}={}){
  if(selected?.id===song.id)return;selected=song;$('share-link').hidden=true;platform=song.youtube_url?'youtube':song.spotify_url?'spotify':'youtube';$('song-title').textContent=song.title;$('song-artist').textContent=song.artist;$('song-category').textContent=song.category?' · '+song.category:'';const cover=$('player-cover');cover.src=coverFor(song);cover.alt='Play '+song.title;$('status').textContent='';showPlayer();updateLyrics();updateActions();recent=recentIds(recent,song.id);persist('mq3-recent',recent);renderCatalog();updateMiniPlayer();history.replaceState(null,'','/?song='+encodeURIComponent(song.id));document.title=song.title+' — '+song.artist+' | MQ3 Music';if(track&&!demo)fetch('/api/song-views',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({song_id:song.id})}).catch(()=>{});if(scroll&&matchMedia('(max-width:800px)').matches)$('listen').scrollIntoView({behavior:'smooth',block:'start'});
}

$('search').addEventListener('input',()=>{renderCatalog();const term=$('search').value.trim();if(!term)return;const match=filterSongs(songs,{term,category,collection,favorites,recent})[0];if(match&&match.id!==selected?.id)selectSong(match,{track:false,scroll:false});});
document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{category=b.dataset.category;document.querySelectorAll('[data-category]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderCatalog();}));
document.querySelectorAll('[data-collection]').forEach(b=>b.addEventListener('click',()=>{collection=b.dataset.collection;document.querySelectorAll('[data-collection]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderCatalog();}));
for(const p of ['youtube','spotify'])$(p).addEventListener('click',()=>{if(platform===p)return;platform=p;showPlayer();});
$('favorite-song').addEventListener('click',()=>{if(!selected)return;favorites=favorites.includes(selected.id)?favorites.filter(id=>id!==selected.id):[selected.id,...favorites].slice(0,500);persist('mq3-favorites',favorites);updateActions();renderCatalog();});
$('share-song').addEventListener('click',async()=>{if(!selected)return;const url=new URL('/?song='+encodeURIComponent(selected.id),location.origin).href,text=`Listen to “${selected.title}” by ${selected.artist} on MQ3 Music.`;try{if(navigator.share)await navigator.share({title:selected.title+' — '+selected.artist,text,url});else{await navigator.clipboard.writeText(text+' '+url);$('status').textContent='Song link copied.';}}catch(e){if(e.name==='AbortError')return;$('share-link').hidden=false;$('share-link').value=url;$('share-link').focus();$('share-link').select();$('status').textContent='Copy this song link to share it.';}});
$('clear-recent').addEventListener('click',()=>{recent=[];persist('mq3-recent',recent);renderCatalog();$('status').textContent='Recent songs cleared on this browser.';});

async function load(){
  if(loading)return;loading=true;$('retry-catalog').hidden=true;$('catalog-status').className='';$('catalog-status').textContent='';renderSkeletons();
  try{const r=await fetch('/api/catalog');const data=await r.json();if(!r.ok)throw Error(data.error||'Cannot load songs.');songs=data.songs;settings=data.settings;demo=data.demo;$('demo').hidden=!demo;for(const[id,key]of[['subscribe-mq3','youtube_channel'],['follow-mq3','spotify_artist']]){const link=$(id);link.hidden=!settings[key];if(settings[key]){const url=new URL(settings[key]);if(id==='subscribe-mq3')url.searchParams.set('sub_confirmation','1');link.href=url.href;}}$('support-artist').hidden=!settings.youtube_channel&&!settings.spotify_artist;renderCatalog();const requested=new URLSearchParams(location.search).get('song');const first=requested?songs.find(s=>s.id===requested):songs.find(s=>s.featured)||filterSongs(songs)[0];if(first)selectSong(first,{scroll:false});else if(requested)$('status').textContent='This song is unavailable. Please choose another.';}catch(e){$('song-grid').replaceChildren();$('catalog-status').textContent=e.message;$('catalog-status').className='notice error';$('retry-catalog').hidden=false;}finally{loading=false;}
}
$('retry-catalog').addEventListener('click',load);
const options=$('player-options');document.addEventListener('click',event=>{if(options.open&&!options.contains(event.target))options.open=false;});options.addEventListener('keydown',event=>{if(event.key==='Escape'){options.open=false;options.querySelector('summary').focus();}});
ensureEnhancementStyles();setupMiniPlayer();setupLyricsTools();
if('serviceWorker' in navigator)navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>r.unregister()))).catch(()=>{});
load();