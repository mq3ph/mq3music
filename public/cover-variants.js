(()=>{
  const palettes={
    'Name Songs':{a:'#311024',b:'#a84961',c:'#f09c73',accent:'#ffd5a1'},
    'Inspirational':{a:'#14334f',b:'#5b89a5',c:'#f2c570',accent:'#fff0b0'},
    'OPM':{a:'#101827',b:'#5b3938',c:'#c67c52',accent:'#f2bd7a'},
    'Love Songs':{a:'#3a0712',b:'#a52c43',c:'#ee856c',accent:'#ffd0aa'}
  };
  const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[m]));
  const hash=s=>{let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};

  const womanHair=[
    '<path d="M194 118c-49 5-87 35-104 78-17 45-5 98-31 143 38-12 68-35 88-68 19-31 23-68 18-104 19 7 38 17 55 31 7-25 7-48-2-68-6-10-14-14-24-12Z"/>',
    '<path d="M197 119c-55 3-97 39-111 88-12 43 1 89-20 133 35-11 61-31 79-59 18-29 26-62 25-96 13 11 26 24 37 39 18-36 17-70-10-105Z"/><path d="M116 191c-31 2-56 17-72 43 21-8 43-8 65-1 16-13 18-27 7-42Z"/>',
    '<path d="M191 118c-45 7-80 37-95 79-14 40-4 83-16 124 27-9 49-25 66-47 6 29 1 58-15 87 35-21 61-55 72-93 13-45 10-99-12-150Z"/>',
    '<path d="M196 119c-52 4-92 37-107 84-13 41-2 85-17 128 30-10 55-28 73-54 7-11 13-22 17-34 2 27-2 54-12 81 38-29 62-68 66-113 4-39-2-70-20-92Z"/><path d="M132 159c-23 10-39 28-47 52 20-14 41-20 64-18 1-15-5-27-17-34Z"/>'
  ];
  const manHair=[
    '<path d="M116 148c14-34 47-53 91-51 36 2 64 18 81 48-26-8-52-6-78 4-37 15-68 16-94-1Z"/>',
    '<path d="M113 151c9-38 42-59 91-59 43 0 75 20 91 57-24-17-53-21-85-14-39 9-71 15-97 16Z"/>',
    '<path d="M116 147c13-33 44-51 87-50 31 0 59 12 81 34-20-3-41 1-62 10-42 18-77 20-106 6Z"/>',
    '<path d="M112 155c8-40 39-62 91-63 39 0 70 16 91 48-29-10-58-8-86 4-39 17-71 20-96 11Z"/>'
  ];
  const womanProfile='<path d="M195 123c18 2 35 12 44 28 8 14 9 29 7 45 7 5 12 11 15 17-5 4-10 7-16 9 1 7-1 12-5 16 5 4 6 9 4 14-5 11-15 19-27 23-4 18 0 36 10 51 14 21 37 34 68 43 49 14 82 48 97 103H54c14-54 45-87 93-102 28-9 48-21 61-40 11-17 15-36 10-55-15-6-26-17-32-31-8-19-7-41 0-64 3-9 6-18 9-27Z"/>';
  const manProfile='<path d="M197 122c22 1 40 11 51 28 10 15 12 32 9 50 8 5 14 12 17 18-6 4-12 7-18 9 0 8-2 13-7 17 4 5 5 10 2 15-7 12-18 20-31 23-5 18-1 35 11 50 15 19 39 32 72 41 54 15 90 49 106 105H44c15-56 50-91 103-106 31-9 54-22 69-41 12-15 17-33 12-51-16-5-28-16-35-31-8-18-8-40-1-63 3-10 4-20 5-30Z"/>';

  function cover(title,category){
    const p=palettes[category]||palettes['Name Songs'];const h=hash(title+'|'+category),woman=(h%2)===0,variant=Math.floor(h/2)%4;const hair=(woman?womanHair:manHair)[variant],profile=woman?womanProfile:manProfile;const safeTitle=esc(title||'MQ3');
    const titleSize=safeTitle.length>25?38:safeTitle.length>18?44:52;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.a}"/><stop offset=".56" stop-color="${p.b}"/><stop offset="1" stop-color="${p.c}"/></linearGradient><radialGradient id="sun"><stop offset="0" stop-color="#fff6d8" stop-opacity=".95"/><stop offset=".3" stop-color="${p.accent}" stop-opacity=".48"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></radialGradient><linearGradient id="mist" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff4d2" stop-opacity=".17"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><rect width="800" height="800" fill="url(#sky)"/><circle cx="620" cy="210" r="175" fill="url(#sun)"/><path d="M0 474c118-68 223-78 327-28 111 54 227 58 473-41v395H0Z" fill="#261018" opacity=".62"/><path d="M0 545c165-48 283-40 410 5 118 42 238 42 390 8v242H0Z" fill="#0a070a" opacity=".74"/><rect x="0" y="375" width="800" height="120" fill="url(#mist)" opacity=".65"/><g transform="translate(205 72) scale(1.22)" fill="#07070a">${hair}${profile}</g><rect x="33" y="33" width="734" height="734" rx="28" fill="none" stroke="${p.accent}" stroke-opacity=".30" stroke-width="2"/><rect x="56" y="560" width="688" height="154" rx="24" fill="#10090b" fill-opacity=".58"/><text x="400" y="633" text-anchor="middle" fill="#fff1d5" font-family="Georgia,serif" font-size="${titleSize}" letter-spacing="1.4">${safeTitle}</text><text x="400" y="681" text-anchor="middle" fill="${p.accent}" font-family="Arial,sans-serif" font-size="17" letter-spacing="7">MQ3 MUSIC</text></svg>`)}`;
  }
  function rowTitle(row){const n=row.querySelector('.song-info strong');if(!n)return'';const c=n.cloneNode(true);c.querySelectorAll('.mq3-song-badges').forEach(x=>x.remove());return c.textContent.trim()}
  function rowCategory(row){const s=row.querySelector('.song-info small')?.textContent||'';return s.split('·').pop().trim()}
  function apply(){
    const title=document.getElementById('song-title')?.textContent?.trim();
    const cat=(document.getElementById('song-category')?.textContent||'').replace(/^\s*·\s*/,'').trim();
    const main=document.getElementById('player-cover');if(main&&title&&title!=='Choose your song')main.src=cover(title,cat);
    document.querySelectorAll('.song-row').forEach(row=>{const img=row.querySelector('img');const t=rowTitle(row);if(img&&t)img.src=cover(t,rowCategory(row));});
  }
  const wave=document.getElementById('mq3-waveform');if(wave&&!wave.children.length){for(let i=0;i<64;i++){const b=document.createElement('span');const base=.45+((Math.sin(i*.47)+1)*.18)+((Math.sin(i*.19+1.7)+1)*.12);b.dataset.base=String(base);b.style.height=(16+Math.round(base*30))+'px';wave.appendChild(b)}}
  let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})};
  new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true});
  schedule();
})();