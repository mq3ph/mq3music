(()=>{
 const groups={
  'Name Songs':['name-waves','name-bob','name-curls','name-short','name-curly','name-long'],
  Inspirational:['hope-sunrise','hope-path'],
  OPM:['opm-rain','opm-province'],
  'Love Songs':['love-together','love-longing']
 };
 const hash=value=>{let h=2166136261;for(const ch of String(value||'MQ3')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
 const coverForSong=song=>{const choices=groups[song?.category]||Object.values(groups).flat();return '/assets/artworks/'+choices[hash(song?.id||song?.title)%choices.length]+'.webp';};
 const rowTitle=row=>{const n=row.querySelector('.song-info strong');if(!n)return'';const c=n.cloneNode(true);c.querySelectorAll('.mq3-song-badges').forEach(x=>x.remove());return c.textContent.trim();};
 const rowCategory=row=>(row.querySelector('.song-info small')?.textContent||'').split('·').pop().trim();
 function ensureStyles(){if(document.getElementById('mq3-codex-artwork-style'))return;const s=document.createElement('style');s.id='mq3-codex-artwork-style';s.textContent=`
  .player-app .topbar.topbar-hero{position:relative;justify-content:center!important;padding:8px 0 6px!important;min-height:108px!important}
  .player-app .topbar-hero .brand{margin:0 auto!important}
  .player-app .brand img.header-logo{width:clamp(92px,25vw,112px)!important;height:clamp(92px,25vw,112px)!important;object-fit:contain!important}
  .player-app .topbar-hero #demo{position:absolute;right:0;top:12px}
  .player-app .search-block{margin-top:2px!important}
  .player-app .cover-frame{position:relative;max-width:100%;overflow:hidden;border-radius:12px;line-height:0;margin:0 auto}
  .player-app .cover-frame #player-cover{display:block!important;margin:0!important}
  .player-app .artwork-title{position:absolute;bottom:0;left:0;right:0;padding:65px 20px 28px;background:linear-gradient(transparent,rgba(0,0,0,.85));color:#ffe3a0;font:clamp(24px,7vw,38px)/1.15 Georgia,serif;text-align:center;overflow-wrap:anywhere;text-shadow:0 2px 8px #000;line-height:1.15}
  .player-app .artwork-title:empty{display:none}
  .player-app .now-playing-copy{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip-path:inset(50%);white-space:nowrap!important}
  .mq3-controls .mq3-main svg{width:21px;height:21px;display:block;fill:currentColor;margin:auto}
  .mq3-progress:focus-visible{outline:2px solid #f4ca72;outline-offset:5px}
  @media(max-width:520px){.player-app .topbar.topbar-hero{min-height:100px!important}.player-app .brand img.header-logo{width:96px!important;height:96px!important}.player-app .artwork-title{padding:56px 16px 22px;font-size:clamp(22px,8vw,34px)}}
 `;document.head.append(s);}
 function ensureFrame(){
  const img=document.getElementById('player-cover');if(!img)return null;
  let frame=img.closest('.cover-frame');
  if(!frame){frame=document.createElement('div');frame.className='cover-frame';img.parentNode.insertBefore(frame,img);frame.append(img);const title=document.createElement('div');title.id='artwork-title';title.className='artwork-title';frame.append(title);}
  return frame;
 }
 function apply(){
  ensureStyles();const title=document.getElementById('song-title')?.textContent?.trim();
  const cat=(document.getElementById('song-category')?.textContent||'').replace(/^\s*·\s*/,'').trim();
  const main=document.getElementById('player-cover'),frame=ensureFrame();
  if(main&&title&&title!=='Choose your song'){main.src=coverForSong({id:new URLSearchParams(location.search).get('song')||title,title,category:cat});const overlay=frame?.querySelector('#artwork-title');if(overlay)overlay.textContent=title;}
  document.querySelectorAll('.song-row').forEach(row=>{const img=row.querySelector('img'),t=rowTitle(row);if(img&&t)img.src=coverForSong({id:row.dataset.id||t,title:t,category:rowCategory(row)});});
  const mini=document.getElementById('mq3-mini-cover');if(mini&&main?.src)mini.src=main.src;
 }
 let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})};
 new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-pressed']});
 schedule();
})();
