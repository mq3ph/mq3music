(()=>{
  const palettes={
    'Name Songs':{a:'#3b1028',b:'#c65d5e',c:'#f2b46f',accent:'#ffd79b'},
    'Inspirational':{a:'#183756',b:'#5d91b0',c:'#f3c96f',accent:'#fff0b0'},
    'OPM':{a:'#101b2b',b:'#6a3d35',c:'#d08a52',accent:'#f4c27c'},
    'Love Songs':{a:'#3a0712',b:'#a92f42',c:'#ef8a70',accent:'#ffd1ad'}
  };
  const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[m]));
  const hash=s=>{let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
  const hairWoman=[
    '<path d="M278 170c-65 4-103 55-96 117 4 35-8 70-30 101 35-6 64-24 82-53 19-30 26-73 20-118 25 16 45 44 54 79 10-49 2-91-30-126Z"/>',
    '<path d="M279 168c-61 6-95 48-95 104 0 31-11 64-29 91 33-8 57-27 72-54 9 28 11 58 7 91 37-37 59-77 57-126-1-43-5-76-12-106Z"/>',
    '<path d="M276 172c-54 5-86 44-86 96 0 40-17 76-44 108 37-5 69-28 86-61 8-15 13-31 15-47 16 3 32 1 47-6-7-47-15-74-18-90Z"/><path d="M177 252c-43 4-71 22-83 53 28-8 55-8 82 1 17-17 18-36 1-54Z"/>',
    '<path d="M279 168c-59 4-94 48-92 105 1 34-8 64-26 91 27-4 50-18 67-40 2 29-3 56-15 82 43-34 68-78 72-131 3-44 1-79-6-107Z"/><path d="M215 205c-22 11-36 31-40 59 15-19 34-33 59-40-2-10-8-16-19-19Z"/>'
  ];
  const hairMan=[
    '<path d="M201 205c11-33 38-51 77-51 30 0 53 10 69 31-28-7-56-2-85 16-21 13-41 17-61 4Z"/>',
    '<path d="M197 211c10-38 42-58 87-58 37 0 63 16 79 47-19-13-42-17-70-11-37 9-69 16-96 22Z"/>',
    '<path d="M199 205c13-34 40-51 80-51 27 0 51 10 71 29-21-4-41-1-61 8-30 14-60 18-90 14Z"/>',
    '<path d="M196 214c9-40 39-61 88-61 35 0 62 14 80 43-31-9-59-5-85 10-29 16-57 19-83 8Z"/>'
  ];
  function cover(title,category){
    const p=palettes[category]||palettes['Name Songs'];const h=hash(title+'|'+category);const woman=(h%2)===0;const hv=Math.floor(h/2)%4;const hair=(woman?hairWoman:hairMan)[hv];
    const figure=woman
      ? '<path d="M267 204c-34 1-55 27-55 62 0 30 14 51 35 60-7 35-26 62-57 82-35 23-61 60-71 111h303c-11-55-40-94-82-116-36-18-55-45-61-79 21-11 34-34 33-62-1-35-17-58-45-58Z"/>'
      : '<path d="M269 202c-35 0-57 25-57 61 0 29 13 51 34 61-6 31-25 55-57 72-48 25-77 67-85 123h332c-8-58-39-101-92-125-32-15-50-39-56-70 22-11 36-34 35-62-1-36-18-60-54-60Z"/>';
    const safeTitle=esc(title||'MQ3');
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.a}"/><stop offset=".55" stop-color="${p.b}"/><stop offset="1" stop-color="${p.c}"/></linearGradient><radialGradient id="sun"><stop offset="0" stop-color="#fff4c9"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></radialGradient><filter id="soft"><feGaussianBlur stdDeviation="20"/></filter></defs><rect width="800" height="800" fill="url(#sky)"/><circle cx="610" cy="230" r="150" fill="url(#sun)" opacity=".85"/><path d="M0 520c120-70 225-75 330-18s220 57 470-40v338H0Z" fill="#15090d" opacity=".72"/><path d="M0 592c165-48 278-39 405 8 116 43 237 42 395 2v198H0Z" fill="#09070a" opacity=".78"/><g transform="translate(140 45)" fill="#09070a">${hair}${figure}</g><rect x="34" y="34" width="732" height="732" rx="26" fill="none" stroke="${p.accent}" stroke-opacity=".34" stroke-width="2"/><text x="400" y="642" text-anchor="middle" fill="#fff0cf" font-family="Georgia,serif" font-size="${safeTitle.length>22?42:54}" letter-spacing="2">${safeTitle}</text><text x="400" y="686" text-anchor="middle" fill="${p.accent}" font-family="Arial,sans-serif" font-size="18" letter-spacing="6">MQ3 MUSIC</text></svg>`)}`;
  }
  function rowTitle(row){const n=row.querySelector('.song-info strong');if(!n)return'';const c=n.cloneNode(true);c.querySelectorAll('.mq3-song-badges').forEach(x=>x.remove());return c.textContent.trim()}
  function rowCategory(row){const s=row.querySelector('.song-info small')?.textContent||'';return s.split('·').pop().trim()}
  function apply(){
    const title=document.getElementById('song-title')?.textContent?.trim();
    const cat=(document.getElementById('song-category')?.textContent||'').replace(/^\s*·\s*/,'').trim();
    const main=document.getElementById('player-cover');if(main&&title&&title!=='Choose your song')main.src=cover(title,cat);
    document.querySelectorAll('.song-row').forEach(row=>{const img=row.querySelector('img');const t=rowTitle(row);if(img&&t)img.src=cover(t,rowCategory(row));});
  }
  const wave=document.getElementById('mq3-waveform');if(wave&&!wave.children.length){for(let i=0;i<72;i++){const b=document.createElement('span');const h=10+Math.round((Math.sin(i*.47)+1)*10+(Math.sin(i*.19+1.7)+1)*8);b.style.height=h+'px';wave.appendChild(b)}}
  let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})};
  new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true});
  schedule();
})();