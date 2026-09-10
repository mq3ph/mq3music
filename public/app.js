'use strict';

const $=id=>document.getElementById(id);
const cats=['NAME SONGS','INSPIRATIONAL SONGS','OPM','ORIGINAL SONGS'];
const subs=['Personalized songs. Made for you.','A little hope. A little light.','Filipino heart. Familiar feeling.','My words. My melodies.'];
const artwork=['assets/name-series.png','assets/inspirational.png','assets/opm.png','assets/original.png'];
const symbols=['heart','sun','music','pen'];
const mq3CoverStyles=[
  'moon',
  'mountain',
  'ocean',
  'forest',
  'sunset',
  'city',
  'guitar',
  'gold',
  'flowers',
  'stars'
];

function mq3CoverIndex(t){
  const seed=
    String(
      t?.id||
      t?.title||
      ''
    );

  let hash=0;

  for(
    let i=0;
    i<seed.length;
    i++
  ){
    hash=
      (
        hash*31+
        seed.charCodeAt(i)
      )>>>0;
  }

  return hash%
    mq3CoverStyles.length;
}

function mq3CoverSvg(style){
  const common=
    `xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"`;

  const svg={
    moon:`
      <svg ${common}>
        <defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#07152f"/><stop offset="1" stop-color="#02050b"/></linearGradient></defs>
        <rect width="300" height="300" fill="url(#g)"/>
        <circle cx="214" cy="72" r="42" fill="#f5df9a"/>
        <path d="M0 185 70 120 118 164 166 108 238 174 300 126V300H0Z" fill="#101a30"/>
        <path d="M0 222 Q75 197 150 222T300 218V300H0Z" fill="#07101d"/>
        <ellipse cx="214" cy="236" rx="45" ry="7" fill="#d5b45a" opacity=".34"/>
      </svg>`,
    mountain:`
      <svg ${common}>
        <defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#f0a14a"/><stop offset=".48" stop-color="#75453d"/><stop offset="1" stop-color="#16121b"/></linearGradient></defs>
        <rect width="300" height="300" fill="url(#g)"/>
        <circle cx="230" cy="86" r="34" fill="#ffd27a" opacity=".9"/>
        <path d="M0 230 72 151 111 194 173 99 300 236V300H0Z" fill="#251d27"/>
        <path d="M131 300 Q142 230 172 176 Q186 149 196 121" fill="none" stroke="#d9b15c" stroke-width="8" opacity=".75"/>
      </svg>`,
    ocean:`
      <svg ${common}>
        <defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#f18f72"/><stop offset=".45" stop-color="#35546c"/><stop offset="1" stop-color="#07141c"/></linearGradient></defs>
        <rect width="300" height="300" fill="url(#g)"/>
        <circle cx="82" cy="105" r="30" fill="#ffd88a" opacity=".9"/>
        <path d="M0 184 Q42 166 83 184T167 184T251 184T335 184V300H0Z" fill="#123344"/>
        <path d="M0 215 Q52 196 104 215T208 215T312 215" fill="none" stroke="#f8dfb0" stroke-width="6" opacity=".75"/>
        <path d="M220 160 300 126V300H258Z" fill="#12181d"/>
      </svg>`,
    forest:`
      <svg ${common}>
        <defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#243c2d"/><stop offset="1" stop-color="#08110b"/></linearGradient></defs>
        <rect width="300" height="300" fill="url(#g)"/>
        <circle cx="157" cy="79" r="54" fill="#e6c56e" opacity=".33"/>
        <g fill="#0d2114">
          <path d="M45 0h28l-9 300H53Z"/><path d="M108 0h24l-6 300h-22Z"/><path d="M205 0h28l7 300h-31Z"/><path d="M258 0h19l13 300h-25Z"/>
        </g>
        <rect x="90" y="205" width="118" height="10" rx="4" fill="#5b3f27"/>
        <rect x="103" y="216" width="8" height="42" fill="#4a321f"/><rect x="188" y="216" width="8" height="42" fill="#4a321f"/>
      </svg>`,
    sunset:`
      <svg ${common}>
        <defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#f67f62"/><stop offset=".5" stop-color="#6f354c"/><stop offset="1" stop-color="#160e19"/></linearGradient></defs>
        <rect width="300" height="300" fill="url(#g)"/>
        <circle cx="150" cy="112" r="38" fill="#ffd180"/>
        <path d="M0 210 Q66 178 132 210T264 207T396 208V300H0Z" fill="#261826"/>
        <path d="M78 235 C108 201 137 201 151 224 C165 201 194 201 224 235 C190 264 167 273 151 281 C135 273 112 264 78 235Z" fill="none" stroke="#e5bd69" stroke-width="7"/>
      </svg>`,
    city:`
      <svg ${common}>
        <defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#10213d"/><stop offset="1" stop-color="#05070d"/></linearGradient></defs>
        <rect width="300" height="300" fill="url(#g)"/>
        <g fill="#101522">
          <rect x="18" y="126" width="46" height="174"/><rect x="71" y="91" width="53" height="209"/><rect x="132" y="142" width="44" height="158"/><rect x="184" y="72" width="58" height="228"/><rect x="248" y="116" width="42" height="184"/>
        </g>
        <g fill="#d6a84f">
          <circle cx="42" cy="157" r="5"/><circle cx="97" cy="119" r="5"/><circle cx="215" cy="104" r="5"/><circle cx="271" cy="150" r="5"/><circle cx="159" cy="176" r="5"/>
        </g>
        <path d="M0 245 Q80 218 150 248T300 242" fill="none" stroke="#b57c38" stroke-width="7" opacity=".45"/>
      </svg>`,
    guitar:`
      <svg ${common}>
        <defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#522b24"/><stop offset="1" stop-color="#0b0707"/></linearGradient></defs>
        <rect width="300" height="300" fill="url(#g)"/>
        <circle cx="118" cy="184" r="64" fill="#c8853c"/>
        <circle cx="118" cy="184" r="24" fill="#24120c"/>
        <rect x="151" y="55" width="25" height="172" rx="10" transform="rotate(24 151 55)" fill="#8c5128"/>
        <path d="M74 183h91" stroke="#f0cf86" stroke-width="4"/>
        <circle cx="225" cy="62" r="28" fill="#d8a95c" opacity=".18"/>
      </svg>`,
    gold:`
      <svg ${common}>
        <defs><radialGradient id="g"><stop stop-color="#6b4a22"/><stop offset=".55" stop-color="#21150d"/><stop offset="1" stop-color="#070505"/></radialGradient></defs>
        <rect width="300" height="300" fill="url(#g)"/>
        <circle cx="150" cy="150" r="98" fill="none" stroke="#d4af37" stroke-width="3" opacity=".7"/>
        <circle cx="150" cy="150" r="72" fill="none" stroke="#d4af37" stroke-width="2" opacity=".45"/>
        <path d="M76 184 150 76l74 108-74 42Z" fill="none" stroke="#f0cf74" stroke-width="5" opacity=".72"/>
        <circle cx="150" cy="150" r="11" fill="#f6d777"/>
      </svg>`,
    flowers:`
      <svg ${common}>
        <defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#4c2c3e"/><stop offset="1" stop-color="#120a10"/></linearGradient></defs>
        <rect width="300" height="300" fill="url(#g)"/>
        <g fill="#f0bdc9" opacity=".9">
          <circle cx="90" cy="115" r="22"/><circle cx="115" cy="95" r="22"/><circle cx="131" cy="124" r="22"/><circle cx="104" cy="139" r="22"/>
          <circle cx="207" cy="180" r="20"/><circle cx="229" cy="162" r="20"/><circle cx="243" cy="187" r="20"/><circle cx="218" cy="202" r="20"/>
        </g>
        <g fill="#d3a640"><circle cx="110" cy="119" r="9"/><circle cx="226" cy="183" r="8"/></g>
        <path d="M109 139 Q130 198 163 254M226 202 Q201 225 164 255" fill="none" stroke="#56724d" stroke-width="8"/>
      </svg>`,
    stars:`
      <svg ${common}>
        <defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#15133c"/><stop offset="1" stop-color="#04050d"/></linearGradient></defs>
        <rect width="300" height="300" fill="url(#g)"/>
        <g fill="#f6df94">
          <circle cx="44" cy="51" r="3"/><circle cx="82" cy="93" r="2"/><circle cx="134" cy="46" r="4"/><circle cx="181" cy="77" r="2"/><circle cx="243" cy="43" r="3"/><circle cx="264" cy="118" r="2"/><circle cx="205" cy="139" r="3"/><circle cx="62" cy="158" r="2"/>
        </g>
        <path d="M0 235 72 178 121 216 174 148 235 204 300 168V300H0Z" fill="#0b1023"/>
        <path d="M148 63 154 79l17 1-13 10 4 17-14-9-14 9 4-17-13-10 17-1Z" fill="#e5c15e"/>
      </svg>`
  }[style]||'';

  return 'data:image/svg+xml;charset=UTF-8,'+
    encodeURIComponent(
      svg.replace(
        /\s+/g,
        ' '
      ).trim()
    );
}

const artFor=t=>
  t?.artwork||
  t?.artworkUrl||
  t?.image||
  t?.imageUrl||
  t?.cover||
  t?.coverUrl||
  mq3CoverSvg(
    mq3CoverStyles[
      mq3CoverIndex(t)
    ]
  )||
  artwork[
    cats.indexOf(
      t?.category
    )
  ]||
  'logo.png';

const icons={
  home:'<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
  compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5Z"/>',
  library:'<rect x="5" y="5" width="15" height="16" rx="2"/><path d="M3 17V3h13m-1 7v6m0-6 3-1m-3 7c0 2-4 2-4 0s4-2 4 0"/>',
  heart:'<path d="M20.5 5.5a5.2 5.2 0 0 0-8.5 1 5.2 5.2 0 0 0-8.5-1C-1 11 12 20 12 20s13-9 8.5-14.5Z"/>',
  search:'<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  music:'<path d="M9 17V5l11-2v12M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>',
  pen:'<path d="m4 16-1 5 5-1L21 7l-4-4Zm11-11 4 4M4 16l4 4"/>',
  previous:'<path d="M5 4v16m14-15L8 12l11 7Z"/>',
  next:'<path d="M19 4v16M5 5l11 7-11 7Z"/>',
  volume:'<path d="M4 9h4l5-4v14l-5-4H4Zm12-1c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>'
};

function icon(name){
  const el=document.createElementNS('http://www.w3.org/2000/svg','svg');
  el.setAttribute('viewBox','0 0 24 24');
  el.setAttribute('aria-hidden','true');
  el.innerHTML=icons[name]||icons.music;
  return el;
}

document.querySelectorAll('[data-icon]').forEach(el=>el.append(icon(el.dataset.icon)));

function scrollToSection(id){
  $(id).scrollIntoView({
    behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',
    block:'start'
  });
}

function activeNav(id){
  document.querySelectorAll('.main-nav .nav').forEach(b=>{
    b.classList.toggle('active',b.id===id);

    if(b.id===id){
      b.setAttribute('aria-current','page');
    }else{
      b.removeAttribute('aria-current');
    }
  });
}

const credit=c=>
  c===cats[3]
    ?'Lyrics & melodies: MQ3. Music & voice: assisted by Suno.'
    :'Lyrics: AI-generated. Music: generated with Suno. Curated by MQ3.';

let tracks=[];
let filter='';
let onlyFav=false;
let current=null;
let detailId=null;
let db=null;
let url=null;

const viewedThisPage=new Set();

function recordView(id){
  if(viewedThisPage.has(id)){
    return;
  }

  viewedThisPage.add(id);

  fetch(
    '/api/songs/'+
      encodeURIComponent(id)+
      '/view',
    {
      method:'POST'
    }
  )
    .catch(
      ()=>
        viewedThisPage.delete(id)
    );
}

function toast(s){
  $('toast').textContent=s;

  $('toast')
    .classList
    .remove('hidden');

  setTimeout(
    ()=>
      $('toast')
        .classList
        .add('hidden'),
    4200
  );
}

function node(
  tag,
  text,
  cls
){
  const el=
    document.createElement(tag);

  if(
    text!==undefined
  ){
    el.textContent=text;
  }

  if(cls){
    el.className=cls;
  }

  return el;
}


/* =========================================================
   MQ3 LYRICS PANEL
========================================================= */

function ensureLyricsPanel(){

  let overlay=
    $('mq3-lyrics-overlay');

  if(overlay){
    return overlay;
  }


  overlay=
    node(
      'div',
      undefined,
      'lyrics-overlay hidden'
    );

  overlay.id=
    'mq3-lyrics-overlay';

  overlay.setAttribute(
    'role',
    'presentation'
  );


  const panel=
    node(
      'section',
      undefined,
      'lyrics-panel'
    );

  panel.setAttribute(
    'role',
    'dialog'
  );

  panel.setAttribute(
    'aria-modal',
    'true'
  );

  panel.setAttribute(
    'aria-labelledby',
    'mq3-lyrics-title'
  );


  const close=
    node(
      'button',
      '×',
      'lyrics-close'
    );

  close.type=
    'button';

  close.setAttribute(
    'aria-label',
    'Close lyrics'
  );

  close.onclick=
    closeLyrics;


  const kicker=
    node(
      'div',
      'MQ3 · LYRICS',
      'lyrics-kicker'
    );


  const title=
    node(
      'h2',
      '',
      'lyrics-title'
    );

  title.id=
    'mq3-lyrics-title';


  const category=
    node(
      'div',
      '',
      'lyrics-category'
    );

  category.id=
    'mq3-lyrics-category';


  const divider=
    node(
      'div',
      undefined,
      'lyrics-divider'
    );


  const body=
    node(
      'div',
      undefined,
      'lyrics-body'
    );

  body.id=
    'mq3-lyrics-body';


  const creditsBox=
    node(
      'div',
      undefined,
      'lyrics-credits'
    );


  const creditsLabel=
    node(
      'div',
      'SONG CREDITS',
      'lyrics-credits-label'
    );


  const creditsText=
    node(
      'div',
      '',
      'lyrics-credits-text'
    );

  creditsText.id=
    'mq3-lyrics-credits';


  creditsBox.append(
    creditsLabel,
    creditsText
  );


  panel.append(
    close,
    kicker,
    title,
    category,
    divider,
    body,
    creditsBox
  );


  overlay.append(
    panel
  );


  overlay.addEventListener(
    'click',
    e=>{

      if(
        e.target===overlay
      ){
        closeLyrics();
      }

    }
  );


  document.addEventListener(
    'keydown',
    e=>{

      if(
        e.key==='Escape' &&
        !overlay
          .classList
          .contains(
            'hidden'
          )
      ){
        closeLyrics();
      }

    }
  );


  document.body.append(
    overlay
  );


  return overlay;

}


function closeLyrics(){

  const overlay=
    $('mq3-lyrics-overlay');

  if(!overlay){
    return;
  }


  overlay
    .classList
    .add(
      'hidden'
    );


  document.body
    .classList
    .remove(
      'lyrics-open'
    );

}


function isSectionLabel(text){

  return /^\[[^\]]{1,40}\]$/
    .test(
      text.trim()
    );

}


function renderLyricsBody(raw){

  const body=
    $('mq3-lyrics-body');


  body.replaceChildren();


  const text=
    String(
      raw||
      ''
    )
      .replace(
        /\r\n/g,
        '\n'
      )
      .trim();


  if(!text){

    body.append(
      node(
        'p',
        'Lyrics are not available for this song yet.',
        'lyrics-empty'
      )
    );

    return;

  }


  const parts=
    text
      .split(
        /(\[[^\]]{1,40}\])/g
      )
      .filter(Boolean);


  let hadSection=
    false;


  parts.forEach(
    part=>{

      const clean=
        part.trim();


      if(!clean){
        return;
      }


      if(
        isSectionLabel(
          clean
        )
      ){

        hadSection=
          true;


        body.append(
          node(
            'div',
            clean,
            'lyrics-section-label'
          )
        );


        return;

      }


      const block=
        node(
          'div',
          undefined,
          'lyrics-text-block'
        );


      block.textContent=
        clean;


      body.append(
        block
      );

    }
  );


  if(
    !hadSection &&
    body.children.length===1
  ){

    body
      .firstElementChild
      .classList
      .add(
        'lyrics-text-block--plain'
      );

  }

}


function showLyrics(t){

  if(!t){

    toast(
      'Choose a song first.'
    );

    return;

  }


  const overlay=
    ensureLyricsPanel();


  $('mq3-lyrics-title')
    .textContent=
      t.title||
      'Untitled Song';


  $('mq3-lyrics-category')
    .textContent=
      t.category||
      'MQ3 MUSIC';


  $('mq3-lyrics-credits')
    .textContent=
      credit(
        t.category
      );


  renderLyricsBody(
    t.lyrics
  );


  overlay
    .classList
    .remove(
      'hidden'
    );


  document.body
    .classList
    .add(
      'lyrics-open'
    );


  overlay
    .querySelector(
      '.lyrics-close'
    )
    .focus({
      preventScroll:true
    });

}


/* =========================================================
   PLAYER LYRICS BUTTON
========================================================= */

async function shareSong(song){
  if(!song)return;
  const link=new URL('/',location.href);
  if(['mq3music.com','www.mq3music.com','mq3music-sable.vercel.app'].includes(link.hostname))link.href='https://www.mq3music.com/';
  link.searchParams.set('song',song.id);
  if(navigator.share){
    try{await navigator.share({title:song.title+' · MQ3 Music',text:'Listen to '+song.title+' on MQ3 Music',url:link.href});return;}
    catch(error){if(error.name==='AbortError')return;}
  }
  try{await navigator.clipboard.writeText(link.href);toast('Song link copied.');}
  catch{
    let panel=document.getElementById('mq3-share-song');
    if(!panel){
      panel=document.createElement('dialog');panel.id='mq3-share-song';panel.setAttribute('aria-labelledby','mq3-share-title');
      panel.innerHTML='<h2 id="mq3-share-title">Share this song</h2><p>Press and hold the link to copy it, then paste it into your message.</p><input aria-label="Song link" readonly><button type="button" class="button primary">Done</button>';
      panel.querySelector('button').onclick=()=>panel.close();document.body.append(panel);
    }
    const field=panel.querySelector('input');field.value=link.href;field.style.cssText='width:100%;font-size:16px;margin-bottom:16px;';
    if(!panel.open)panel.showModal();field.focus();field.select();
  }
}

function ensurePlayerLyricsButton(){

  const nowcat=
    $('nowcat');


  if(
    !nowcat||
    $('player-lyrics')
  ){
    return;
  }


  const button=
    node(
      'button',
      '♪ Lyrics',
      'player-lyrics'
    );


  button.id=
    'player-lyrics';


  button.type=
    'button';


  button.disabled=
    !current;


  button.onclick=
    ()=>
      showLyrics(
        tracks.find(
          t=>
            t.id===current
        )
      );


  nowcat
    .parentElement
    .append(
      button
    );

  if(!document.getElementById('player-share')){
    const share=node('button','Share','');share.id='player-share';share.type='button';share.disabled=!current;
    share.setAttribute('aria-label','Share current song');share.style.fontSize='11px';
    share.onclick=()=>shareSong(tracks.find(t=>t.id===current));
    document.querySelector('.controls').append(share);
  }

}


function visible(){

  const q=
    $('search')
      .value
      .toLowerCase();


  return tracks.filter(
    t=>
      (
        !filter||
        t.category===filter
      )&&
      (
        !onlyFav||
        t.favorite
      )&&
      (
        t.title+
        ' '+
        (
          t.names||
          ''
        )
      )
        .toLowerCase()
        .includes(
          q.trim()
        )
  );

}


function setFilter(
  c='',
  fav=false
){

  filter=c;
  onlyFav=fav;


  activeNav(
    fav
      ?'favorites'
      :c
        ?'browse'
        :'home'
  );


  render();

}


cats.forEach(
  (c,i)=>{

    const b=
      node(
        'button',
        undefined,
        'category'
      );


    b.dataset.cat=
      c;


    b.style.setProperty(
      '--art',
      `url("${artwork[i]}")`
    );


    const symbol=
      node(
        'span',
        undefined,
        'symbol'
      );


    symbol.append(
      icon(
        symbols[i]
      )
    );


    b.append(
      node(
        'span',
        '0 songs',
        'num'
      ),
      symbol,
      node(
        'strong',
        c
      ),
      node(
        'small',
        subs[i]
      ),
      node(
        'span',
        '›',
        'arrow'
      )
    );


    b.onclick=
      ()=>{

        setFilter(c);

        scrollToSection(
          'library'
        );

      };


    $('categories')
      .append(
        b
      );

  }
);


const listeningKey='mq3-listening-v1';
let listeningHistory=[];
try{
  const saved=JSON.parse(localStorage.getItem(listeningKey)||'[]');
  if(Array.isArray(saved)) listeningHistory=saved.filter(x=>x && typeof x.id==='string' && Number.isFinite(x.at) && Number.isFinite(x.position) && x.position>=0).slice(0,12);
}catch{}
let resumePosition=0;
let lastListeningSave=0;
function saveListening(){
  if(!current || !listeningHistory.some(x=>x.id===current))return;
  const entry=listeningHistory.find(x=>x.id===current);
  entry.position=Number.isFinite(audio.currentTime)?audio.currentTime:0;
  if(audio.ended || (Number.isFinite(audio.duration)&&audio.duration-entry.position<3))entry.position=0;
  try{localStorage.setItem(listeningKey,JSON.stringify(listeningHistory));}catch{}
}
function rememberListening(){
  if(!current)return;
  listeningHistory=[{id:current,at:Date.now(),position:audio.currentTime||0},...listeningHistory.filter(x=>x.id!==current)].slice(0,12);
  saveListening();
}
function renderListeningHistory(){
  let section=$('listening-history');
  if(!section){
    section=node('section');section.id='listening-history';section.style.cssText='margin:24px 0;';
    $('recent-section').insertAdjacentElement('beforebegin',section);
  }
  const available=listeningHistory.map(entry=>({entry,song:tracks.find(t=>t.id===entry.id)})).filter(x=>x.song);
  section.hidden=!available.length || !!filter || onlyFav || !!$('search').value.trim();
  section.replaceChildren();if(section.hidden)return;
  const heading=node('div');heading.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:12px;';
  const clear=node('button','Clear history','text-button');clear.type='button';clear.style.minHeight='44px';
  clear.onclick=()=>{listeningHistory=[];try{localStorage.removeItem(listeningKey);}catch{}renderListeningHistory();};
  heading.append(node('h2','Recently Played'),clear);
  const note=node('p','Saved in this browser. History does not sync between devices.');note.style.cssText='color:#b6aa98;font-size:12px;margin:8px 0 14px;';
  section.append(heading,note);
  const latest=available[0];
  if(latest.entry.position>=3 && current!==latest.song.id){
    const resume=node('button',`Continue ${latest.song.title} from ${time(latest.entry.position)}`,'button primary');
    resume.style.cssText='margin-bottom:14px;max-width:100%;white-space:normal;min-height:48px;';
    resume.onclick=()=>start(latest.song,latest.entry.position);section.append(resume);
  }
  const list=node('div');list.style.cssText='display:flex;gap:12px;overflow-x:auto;padding-bottom:10px;';
  for(const {song,entry} of available){
    const card=node('button',undefined,'recent-card');card.type='button';card.style.cssText='flex:0 0 150px;';
    card.setAttribute('aria-label','Play '+song.title+(entry.position>=3?' from '+time(entry.position):''));
    const art=node('img');art.src=artFor(song);art.alt='';art.loading='lazy';
    card.append(art,node('strong',song.title),node('small',entry.position>=3?'Resume at '+time(entry.position):song.category));
    card.onclick=()=>start(song,entry.position);list.append(card);
  }
  section.append(list);
}

function renderRecent(){
  renderListeningHistory();

  const list=
    tracks
      .filter(
        t=>
          Number.isFinite(
            t.addedAt
          )
      )
      .sort(
        (a,b)=>
          b.addedAt-
          a.addedAt
      )
      .slice(
        0,
        6
      );


  const hidden=
    !list.length||
    !!filter||
    onlyFav||
    !!$('search')
      .value
      .trim();


  $('recent-section')
    .classList
    .toggle(
      'hidden',
      hidden
    );


  if(hidden){
    return;
  }


  const offset=
    $('recent')
      .scrollLeft;


  $('recent')
    .replaceChildren();


  list.forEach(
    t=>{

      const playing=
        current===t.id &&
        !audio.paused;


      const b=
        node(
          'button',
          undefined,
          'recent-card'
        );


      b.setAttribute(
        'aria-label',
        (
          playing
            ?'Pause recent song '
            :'Play recent song '
        )+
        t.title
      );


      b.title=
        t.title;


      const img=
        node(
          'img'
        );


      img.src=
        artFor(t);


      img.alt='';


      img.loading=
        'lazy';


      b.append(
        img,
        node(
          'span',
          playing
            ?'Ⅱ'
            :'▶',
          'card-play'
        ),
        node(
          'strong',
          t.title
        ),
        node(
          'small',
          t.category
        )
      );


      b.onclick=
        ()=>
          start(t);


      $('recent')
        .append(
          b
        );

    }
  );


  $('recent')
    .scrollLeft=
      offset;

}



/* =========================================================
   MQ3 VIRTUAL GIFTS
========================================================= */

const MQ3_GIFTS=[
  {type:'heart',name:'Heart',emoji:'❤️',credits:1},
  {type:'rose',name:'Rose',emoji:'🌹',credits:5},
  {type:'star',name:'Star',emoji:'⭐',credits:10},
  {type:'music_note',name:'Music Note',emoji:'🎵',credits:25},
  {type:'crown',name:'Crown',emoji:'👑',credits:50},
  {type:'shoutout',name:'Shout-out',emoji:'📣',credits:100}
];

let mq3GiftStats={};

async function loadGiftStats({
  rerender=true
}={}){

  try{

    const response=
      await fetch(
        '/api/gifts/song-stats',
        {
          credentials:'same-origin'
        }
      );


    const data=
      await response.json();


    if(!response.ok){

      throw Error(
        data.error||
        'Gift stats could not be loaded.'
      );
    }


    mq3GiftStats=
      data.songs||
      {};


    if(rerender){
      render();
    }


  }catch(error){

    console.error(
      'MQ3 gift stats failed:',
      error
    );
  }
}

function giftStatsText(songId){

  const stats=
    mq3GiftStats[
      songId
    ];


  if(
    !stats||
    !stats.gifts
  ){
    return '';
  }


  return MQ3_GIFTS
    .map(
      gift=>{

        const count=
          Number(
            stats.gifts[
              gift.type
            ]?.count||
            0
          );


        return count>0
          ?`${gift.emoji} ${count.toLocaleString()}`
          :'';
      }
    )
    .filter(Boolean)
    .join(' · ');
}

/* =========================================================
   MQ3 TOP SUPPORTERS
========================================================= */

async function loadLeaderboard(){

  const list=
    $('leaderboard-list');

  if(!list){
    return;
  }


  try{

    const response=
      await fetch(
        '/api/gifts/leaderboard',
        {
          credentials:'same-origin'
        }
      );


    const data=
      await response.json();


    if(!response.ok){

      throw Error(
        data.error||
        'Top Supporters could not be loaded.'
      );
    }


    const supporters=
      Array.isArray(
        data.supporters
      )
        ?data.supporters
        :[];


    list.replaceChildren();


    if(!supporters.length){

      const empty=
        node(
          'div',
          'No supporters yet. Send a gift and become MQ3’s first Top Supporter. ❤️'
        );

      empty.style.padding=
        '16px';

      empty.style.border=
        '1px solid rgba(212,175,55,.25)';

      empty.style.borderRadius=
        '14px';

      empty.style.opacity=
        '.82';

      list.append(
        empty
      );

      return;
    }


    supporters.forEach(
      supporter=>{

        const rank=
          Number(
            supporter.rank||
            0
          );

        const medal=
          rank===1
            ?'🥇'
            :rank===2
              ?'🥈'
              :rank===3
                ?'🥉'
                :`#${rank}`;


        const credits=
          Number(
            supporter.lifetimeGifted||
            0
          );


        const row=
          node(
            'div'
          );

        row.style.display=
          'grid';

        row.style.gridTemplateColumns=
          '56px minmax(0,1fr) auto';

        row.style.alignItems=
          'center';

        row.style.gap=
          '12px';

        row.style.padding=
          '14px 16px';

        row.style.border=
          '1px solid rgba(212,175,55,.25)';

        row.style.borderRadius=
          '14px';

        row.style.background=
          'rgba(255,255,255,.025)';


        const rankBox=
          node(
            'strong',
            medal
          );

        rankBox.style.fontSize=
          rank<=3
            ?'1.35rem'
            :'1rem';


        const name=
          node(
            'strong',
            supporter.displayName||
            'MQ3 Supporter'
          );

        name.style.overflow=
          'hidden';

        name.style.textOverflow=
          'ellipsis';

        name.style.whiteSpace=
          'nowrap';


        const amount=
          node(
            'span',
            `${credits.toLocaleString()} ${
              credits===1
                ?'Credit'
                :'Credits'
            }`
          );

        amount.style.opacity=
          '.88';

        amount.style.textAlign=
          'right';


        row.append(
          rankBox,
          name,
          amount
        );


        list.append(
          row
        );

      }
    );


  }catch(error){

    console.error(
      'MQ3 leaderboard failed:',
      error
    );


    list.replaceChildren();


    const message=
      node(
        'div',
        'Top Supporters are temporarily unavailable.'
      );

    message.style.padding=
      '16px';

    message.style.border=
      '1px solid rgba(212,175,55,.25)';

    message.style.borderRadius=
      '14px';

    message.style.opacity=
      '.78';


    list.append(
      message
    );
  }
}


/* =========================================================
   MQ3 GIFT CELEBRATIONS
========================================================= */

function playGiftAnimation(gift){

  if(
    !gift||
    matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
  ){
    return;
  }


  const old=
    $('mq3-gift-celebration');

  old?.remove();


  const overlay=
    node(
      'div'
    );

  overlay.id=
    'mq3-gift-celebration';

  overlay.setAttribute(
    'aria-hidden',
    'true'
  );


  Object.assign(
    overlay.style,
    {
      position:'fixed',
      inset:'0',
      zIndex:'99999',
      pointerEvents:'none',
      overflow:'hidden'
    }
  );


  document.body.append(
    overlay
  );


  const addParticle=({
    symbol,
    left,
    top='82%',
    size=30,
    delay=0,
    duration=1800,
    drift=0,
    spin=0
  })=>{

    const particle=
      node(
        'span',
        symbol
      );


    Object.assign(
      particle.style,
      {
        position:'absolute',
        left:`${left}%`,
        top,
        fontSize:`${size}px`,
        lineHeight:'1',
        opacity:'0',
        transform:'translate(-50%,0) scale(.65)',
        filter:'drop-shadow(0 4px 10px rgba(0,0,0,.35))',
        willChange:'transform, opacity',
        transition:'none'
      }
    );


    overlay.append(
      particle
    );


    const animation=
      particle.animate(
        [
          {
            opacity:0,
            transform:
              'translate(-50%,20px) scale(.65) rotate(0deg)'
          },
          {
            opacity:1,
            offset:.16,
            transform:
              'translate(-50%,0) scale(1.05) rotate(0deg)'
          },
          {
            opacity:.95,
            offset:.72,
            transform:
              `translate(calc(-50% + ${drift}px),-55vh) scale(1) rotate(${spin}deg)`
          },
          {
            opacity:0,
            transform:
              `translate(calc(-50% + ${drift*1.25}px),-72vh) scale(.82) rotate(${spin*1.35}deg)`
          }
        ],
        {
          duration,
          delay,
          easing:'cubic-bezier(.18,.7,.2,1)',
          fill:'forwards'
        }
      );


    animation.onfinish=
      ()=>particle.remove();
  };


  const burst=(
    symbol,
    count,
    {
      minSize=24,
      maxSize=42,
      duration=1900
    }={}
  )=>{

    for(
      let i=0;
      i<count;
      i++
    ){

      addParticle({
        symbol,
        left:
          8+
          Math.random()*84,
        size:
          minSize+
          Math.random()*
          (
            maxSize-
            minSize
          ),
        delay:
          Math.random()*420,
        duration:
          duration+
          Math.random()*550,
        drift:
          -70+
          Math.random()*140,
        spin:
          -120+
          Math.random()*240
      });
    }
  };


  const centerMoment=(
    symbol,
    label
  )=>{

    const card=
      node(
        'div'
      );


    Object.assign(
      card.style,
      {
        position:'absolute',
        left:'50%',
        top:'46%',
        transform:'translate(-50%,-50%) scale(.65)',
        textAlign:'center',
        opacity:'0',
        padding:'18px 26px',
        borderRadius:'22px',
        background:'rgba(12,9,9,.76)',
        border:'1px solid rgba(212,175,55,.55)',
        boxShadow:'0 18px 60px rgba(0,0,0,.45)',
        backdropFilter:'blur(7px)'
      }
    );


    const big=
      node(
        'div',
        symbol
      );

    big.style.fontSize=
      'clamp(64px,18vw,112px)';

    big.style.lineHeight=
      '1';


    const words=
      node(
        'strong',
        label
      );

    Object.assign(
      words.style,
      {
        display:'block',
        marginTop:'10px',
        fontSize:'clamp(18px,5vw,28px)',
        letterSpacing:'.08em'
      }
    );


    card.append(
      big,
      words
    );


    overlay.append(
      card
    );


    card.animate(
      [
        {
          opacity:0,
          transform:
            'translate(-50%,-50%) scale(.55)'
        },
        {
          opacity:1,
          offset:.2,
          transform:
            'translate(-50%,-50%) scale(1.08)'
        },
        {
          opacity:1,
          offset:.72,
          transform:
            'translate(-50%,-50%) scale(1)'
        },
        {
          opacity:0,
          transform:
            'translate(-50%,-56%) scale(.92)'
        }
      ],
      {
        duration:2100,
        easing:'cubic-bezier(.2,.75,.2,1)',
        fill:'forwards'
      }
    );
  };


  switch(gift.type){

    case 'heart':
      burst(
        '❤️',
        14,
        {
          minSize:22,
          maxSize:40
        }
      );
      break;


    case 'rose':
      burst(
        '🌹',
        13,
        {
          minSize:24,
          maxSize:42,
          duration:2200
        }
      );
      break;


    case 'star':
      burst(
        '⭐',
        15,
        {
          minSize:20,
          maxSize:38,
          duration:1850
        }
      );
      break;


    case 'music_note':
      burst(
        '🎵',
        8,
        {
          minSize:25,
          maxSize:43,
          duration:2100
        }
      );

      burst(
        '🎶',
        6,
        {
          minSize:24,
          maxSize:40,
          duration:2250
        }
      );
      break;


    case 'crown':
      centerMoment(
        '👑',
        'CROWN GIFT'
      );

      burst(
        '✨',
        18,
        {
          minSize:18,
          maxSize:34,
          duration:2100
        }
      );
      break;


    case 'shoutout':
      centerMoment(
        '📣',
        'SHOUT-OUT!'
      );

      burst(
        '✨',
        10,
        {
          minSize:18,
          maxSize:32
        }
      );

      burst(
        '🎉',
        8,
        {
          minSize:22,
          maxSize:38,
          duration:2200
        }
      );
      break;


    default:
      burst(
        gift.emoji||
        '🎁',
        12
      );
  }


  setTimeout(
    ()=>{
      overlay.remove();
    },
    3300
  );
}


function ensureGiftDialog(){
  let dialog=$('mq3-gift-dialog');
  if(dialog) return dialog;

  dialog=node('dialog',undefined,'mq3-gift-dialog');
  dialog.id='mq3-gift-dialog';

  const box=node('div',undefined,'mq3-gift-box');
  const title=node('h2','Send a Gift');
  title.id='mq3-gift-title';

  const song=node('p','','mq3-gift-song');
  song.id='mq3-gift-song';

  const choices=node('div',undefined,'mq3-gift-choices');
  choices.id='mq3-gift-choices';

  const close=node('button','Cancel','button');
  close.type='button';
  close.onclick=()=>dialog.close();

  box.append(title,song,choices,close);
  dialog.append(box);

  dialog.addEventListener('click',e=>{
    if(e.target===dialog) dialog.close();
  });

  document.body.append(dialog);
  return dialog;
}

async function sendGift(song,gift){
  try{
    const response=await fetch(
      '/api/gifts/send',
      {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'same-origin',
        body:JSON.stringify({
          songId:song.id,
          giftType:gift.type
        })
      }
    );

    const data=await response.json();

    if(!response.ok){
      if(response.status===401){
        toast('Sign in first to send a gift.');
        $('mq3-gift-dialog')?.close();
        $('account-button')?.click();
        return;
      }
      throw Error(data.error||'Gift could not be sent.');
    }

    $('mq3-gift-dialog')?.close();

    playGiftAnimation(
      gift
    );

    toast(
      `${gift.emoji} ${gift.name} sent to "${song.title}"! ${data.wallet.balance} Credits left.`
    );

    const accountButton=$('account-button');
    if(accountButton){
      accountButton.textContent=`🪙 ${data.wallet.balance} Credits`;
    }

    window.dispatchEvent(
      new CustomEvent(
        'mq3-wallet-updated',
        {detail:data.wallet}
      )
    );

    await loadGiftStats();
    await loadLeaderboard();

  }catch(e){
    toast(e.message||'Gift could not be sent.');
  }
}

function songGiftsEnabled(song){return song.gifts_enabled===true || (!song.suno_url && song.gifts_enabled!==false);}

function openGiftDialog(song){
  if(!songGiftsEnabled(song)){toast('Gifts are not enabled for this song.');return;}
  const dialog=ensureGiftDialog();

  $('mq3-gift-song').textContent=song.title;

  const choices=$('mq3-gift-choices');
  choices.replaceChildren();

  MQ3_GIFTS.forEach(gift=>{
    const button=node(
      'button',
      `${gift.emoji} ${gift.name} · ${gift.credits}`,
      'button mq3-gift-choice'
    );

    button.type='button';

    button.onclick=async()=>{
      button.disabled=true;
      await sendGift(song,gift);
      button.disabled=false;
    };

    choices.append(button);
  });

  dialog.showModal();
}

function render(){

  const list=
    visible();


  $('prev').disabled=
    $('next').disabled=
      !list.length;


  document
    .querySelectorAll(
      '.category'
    )
    .forEach(
      b=>{

        b.classList.toggle(
          'chosen',
          filter===b.dataset.cat
        );


        b.setAttribute(
          'aria-pressed',
          String(
            filter===
            b.dataset.cat
          )
        );


        const n=
          tracks.filter(
            t=>
              t.category===
              b.dataset.cat
          ).length;


        b.querySelector(
          '.num'
        ).textContent=
          n+
          ' song'+
          (
            n===1
              ?''
              :'s'
          );

      }
    );


  $('listtitle')
    .textContent=
      onlyFav
        ?'Your favorites'
        :filter||
          'Your song library';


  $('count')
    .textContent=
      list.length+
      ' song'+
      (
        list.length===1
          ?''
          :'s'
      );


  $('songs')
    .replaceChildren();


  if(
    !list.length
  ){

    const e=
      node(
        'div',
        undefined,
        'empty'
      );


    const copy=
      node(
        'div'
      );


    const q=
      $('search')
        .value
        .trim();


    copy.append(
      node(
        'h3',
        onlyFav
          ?'Keep the songs you love.'
          :q
            ?'No matching song yet.'
            :'New music is on its way.'
      ),
      node(
        'p',
        onlyFav
          ?'Tap the heart beside a song to save it here.'
          :'Explore the collections or request a personalized name song.'
      )
    );


    e.append(
      copy
    );


    if(
      !onlyFav&&
      (
        !filter||
        filter===cats[0]
      )
    ){

      const b=
        node(
          'button',
          'Request a name song',
          'button'
        );


      b.onclick=
        ()=>
          openNameRequest(q);


      e.append(
        b
      );

    }


    $('songs')
      .append(
        e
      );

  }


  list.forEach(
    t=>{

      const playing=
        current===t.id &&
        !audio.paused;


      const r=
        node(
          'div',
          undefined,
          'row'+
          (
            playing
              ?' is-playing'
              :''
          )
        );


      const p=
        node(
          'button',
          playing
            ?'Ⅱ'
            :'▶',
          'round'
        );


      p.setAttribute(
        'aria-label',
        (
          playing
            ?'Pause '
            :'Play '
        )+
        t.title
      );


      p.onclick=
        ()=>
          start(t);


      const img=
        node(
          'img',
          undefined,
          'track-art'
        );


      img.src=
        artFor(t);


      img.alt='';


      img.loading=
        'lazy';


      const info=
        node(
          'div',
          undefined,
          'track-info'
        );


      const title=
        node(
          'div',
          t.title,
          'title'
        );


      const meta=
        node(
          'small',
          'MQ3 · '+
          (
            t.price
              ?'₱'+
                (
                  t.price/
                  100
                ).toFixed(2)
              :'Free'
          ),
          'track-meta'
        );


      const lyrics=
        node(
          'button',
          'Lyrics',
          'lyrics-button'
        );


      lyrics.setAttribute(
        'aria-label',
        'Open lyrics for '+
        t.title
      );


      lyrics.onclick=
        ()=>
          showLyrics(t);


      const gift=
        node(
          'button',
          '🎁 Gift',
          'lyrics-button'
        );


      gift.setAttribute(
        'aria-label',
        'Send a gift to '+
        t.title
      );


      if(!songGiftsEnabled(t))gift.style.display='none';
      gift.onclick=
        ()=>
          openGiftDialog(t);


      const giftStats=
        node(
          'small',
          giftStatsText(
            t.id
          ),
          'track-gift-stats'
        );


      giftStats.style.display=
        giftStats.textContent
          ?'block'
          :'none';

      giftStats.style.marginTop=
        '7px';

      giftStats.style.opacity=
        '.86';

      giftStats.style.fontSize=
        '.88rem';


      const share=node('button','Share','lyrics-button');
      share.type='button';share.setAttribute('aria-label','Share '+t.title);share.onclick=()=>shareSong(t);
      info.append(
        title,
        meta,
        lyrics,
        gift,
        share,
        giftStats
      );


      const cat=
        node(
          'small',
          t.category,
          'catlabel'
        );


      const f=
        node(
          'button',
          t.favorite
            ?'♥'
            :'♡',
          'fav'
        );


      f.setAttribute(
        'aria-label',
        (
          t.favorite
            ?'Unfavorite '
            :'Favorite '
        )+
        t.title
      );


      f.setAttribute(
        'aria-pressed',
        String(
          t.favorite
        )
      );


      f.onclick=
        async()=>{

          f.disabled=
            true;


          try{

            await persist({
              ...t,
              favorite:
                !t.favorite
            });


            t.favorite=
              !t.favorite;


            render();

          }catch{

            f.disabled=
              false;


            toast(
              'Could not save favorite.'
            );

          }

        };


      r.append(
        p,
        img,
        info,
        cat,
        f
      );


      $('songs')
        .append(
          r
        );

    }
  );


  renderRecent();

}


function goHome(){

  $('search').value='';


  setFilter();


  window.scrollTo({
    top:0,
    behavior:'instant'
  });

}


function goLibrary(){

  $('search').value='';


  setFilter();


  activeNav(
    'librarynav'
  );


  scrollToSection(
    'library'
  );

}


function goBrowse(){

  $('search').value='';


  setFilter();


  activeNav(
    'browse'
  );


  scrollToSection(
    'collections'
  );

}


$('home').onclick=
  goHome;


document
  .querySelector(
    '.brand'
  )
  .onclick=
    e=>{

      e.preventDefault();

      goHome();

    };


$('browse').onclick=
  goBrowse;


$('librarynav').onclick=
  goLibrary;


$('favorites').onclick=
  ()=>{

    $('search').value='';


    setFilter(
      '',
      true
    );


    scrollToSection(
      'library'
    );

  };


$('search').oninput=
  ()=>{

    activeNav(
      onlyFav
        ?'favorites'
        :'librarynav'
    );


    render();

  };


$('search').onkeydown=
  e=>{

    if(
      e.key==='Enter'
    ){

      if(
        !visible().length&&
        $('search')
          .value
          .trim()&&
        (
          !filter||
          filter===cats[0]
        )
      ){

        openNameRequest(
          $('search')
            .value
            .trim()
        );

      }else{

        scrollToSection(
          'library'
        );

      }

    }

  };


$('explore').onclick=
  goBrowse;


$('seeall').onclick=
  goLibrary;


$('listen').onclick=
  ()=>{

    if(
      !tracks.length
    ){

      goBrowse();

      return;

    }


    goLibrary();


    const t=
      tracks.find(
        t=>
          t.id===current
      )||
      visible()[0];


    start(t);

  };


if(
  $('closedetail')
){

  $('closedetail').onclick=
    ()=>
      $('detail')
        .close();

}


function persist(t){

  return new Promise(
    (
      resolve,
      reject
    )=>{

      try{

        const favorites=
          JSON.parse(
            localStorage.getItem(
              'mq3-favorites'
            )||
            '{}'
          );


        favorites[t.id]=
          t.favorite;


        localStorage.setItem(
          'mq3-favorites',
          JSON.stringify(
            favorites
          )
        );


        resolve();

      }catch(e){

        reject(e);

      }

    }
  );

}


const audio=
  $('audio');


audio.volume=
  .8;


ensurePlayerLyricsButton();


function openSunoSong(t){
  const match=String(t.suno_url||'').match(/^https:\/\/suno\.com\/song\/([a-f0-9-]{36})$/i);
  if(!match){toast('This Suno link is unavailable.');return;}
  saveListening();audio.pause();
  let dialog=$('mq3-suno-dialog');
  if(!dialog){
    dialog=document.createElement('dialog');dialog.id='mq3-suno-dialog';
    dialog.className='mq3-suno-dialog';document.body.append(dialog);
    dialog.addEventListener('close',()=>{dialog.replaceChildren();});
  }
  dialog.replaceChildren();
  const heading=node('h2',t.title);heading.id='mq3-suno-title';dialog.setAttribute('aria-labelledby',heading.id);
  const frame=document.createElement('iframe');
  frame.src='https://suno.com/embed/'+match[1];frame.title=t.title+' - Suno player';
  frame.allow='autoplay; encrypted-media; fullscreen';frame.referrerPolicy='strict-origin-when-cross-origin';
  frame.style.cssText='width:100%;height:240px;border:0;border-radius:16px;background:#171310';
  const share=node('button','Share','button');share.type='button';share.onclick=()=>shareSong(t);
  const close=node('button','Close player','button');close.type='button';close.onclick=()=>dialog.close();
  const controls=node('div');controls.style.cssText='display:flex;flex-wrap:wrap;gap:10px;margin:16px 0';controls.append(share,close);
  if(songGiftsEnabled(t)){const gift=node('button','Send a gift','button');gift.type='button';gift.onclick=()=>openGiftDialog(t);controls.prepend(gift);}
  const help=node('p','If playback does not start, close this player and try again.','muted');
  const lyrics=node('details');const summary=node('summary','Lyrics');const body=node('div',t.lyrics||'Lyrics have not been added yet.');body.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;margin-top:16px;line-height:1.7';lyrics.append(summary,body);
  dialog.append(heading,frame,controls,help,lyrics);dialog.showModal();close.focus();
}

async function start(t,position=0){
  if(t.suno_url){openSunoSong(t);return;}
  if($('mq3-suno-dialog')?.open)$('mq3-suno-dialog').close();


  if(
    current===t.id
  ){

    toggle();

    return;

  }


  saveListening();
  resumePosition=Number.isFinite(position)?Math.max(0,position):0;

  url=
    '/api/songs/'+
    encodeURIComponent(
      t.id
    )+
    '/audio';


  current=
    t.id;


  $('seek').value=
    0;


  $('elapsed')
    .textContent=
      '0:00';


  $('duration')
    .textContent=
      '0:00';


  audio.src=
    url;


  $('nowtitle')
    .textContent=
      t.title;


  $('nowcat')
    .textContent=
      t.category;


  $('nowart').src=
    artFor(t);


  $('play').disabled=
    false;
  if($('player-share'))$('player-share').disabled=false;


  $('seek').disabled=
    false;


  if(
    $('player-lyrics')
  ){

    $('player-lyrics')
      .disabled=
        false;

  }


  try{

    await audio.play();

  }catch{

    toast(
      'Unable to play this audio.'
    );

  }


  render();

}


function toggle(){

  if(!current){
    return;
  }


  if(
    audio.paused
  ){

    audio
      .play()
      .catch(
        ()=>
          toast(
            'Unable to play this audio.'
          )
      );

  }else{

    audio.pause();

  }

}


$('play').onclick=
  toggle;


function next(delta){

  const list=
    visible();


  if(
    !list.length
  ){
    return;
  }


  let i=
    list.findIndex(
      t=>
        t.id===current
    );


  start(
    list[
      i<0
        ?(
            delta>0
              ?0
              :list.length-1
          )
        :(
            i+
            delta+
            list.length
          )%
          list.length
    ]
  );

}


$('prev').onclick=
  ()=>
    next(-1);


$('next').onclick=
  ()=>
    next(1);


audio.onended=()=>{saveListening();next(1);};


audio.onplay=
  ()=>{
    rememberListening();

    if(current){
      recordView(current);
    }


    $('play')
      .textContent=
        'Ⅱ';


    $('play')
      .setAttribute(
        'aria-label',
        'Pause'
      );


    render();

  };


audio.onpause=
  ()=>{
    saveListening();

    $('play')
      .textContent=
        '▶';


    $('play')
      .setAttribute(
        'aria-label',
        'Play'
      );


    render();

  };


const time=n=>
  Number.isFinite(n)
    ?Math.floor(
        n/
        60
      )+
      ':'+
      String(
        Math.floor(
          n%
          60
        )
      ).padStart(
        2,
        '0'
      )
    :'0:00';


audio.ontimeupdate=
  ()=>{
    if(Date.now()-lastListeningSave>5000){saveListening();lastListeningSave=Date.now();}

    $('elapsed')
      .textContent=
        time(
          audio.currentTime
        );


    $('duration')
      .textContent=
        time(
          audio.duration
        );


    $('seek').value=
      audio.duration
        ?audio.currentTime/
          audio.duration*
          100
        :0;

  };


audio.onloadedmetadata=()=>{
  $('duration').textContent=time(audio.duration);
  if(resumePosition>0 && Number.isFinite(audio.duration)){
    const target=resumePosition<audio.duration-3?resumePosition:0;
    resumePosition=0;
    try{audio.currentTime=target;}catch{}
  }
};
window.addEventListener('pagehide',saveListening);
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveListening();});
audio.addEventListener('seeked',saveListening);

audio.onerror=
  ()=>
    toast(
      'Audio unavailable.'
    );


$('seek').oninput=
  ()=>{

    if(
      Number.isFinite(
        audio.duration
      )
    ){

      audio.currentTime=
        audio.duration*
        Number(
          $('seek').value
        )/
        100;

    }

  };


$('volume').oninput=
  ()=>
    audio.volume=
      Number(
        $('volume').value
      );


async function loadCatalog(){

  try{

    const r=
      await fetch(
        '/api/catalog'
      );


    const data=
      await r.json();


    if(!r.ok){

      throw Error(
        data.error||
        'Could not load songs.'
      );

    }


    let favorites={};


    try{

      favorites=
        JSON.parse(
          localStorage.getItem(
            'mq3-favorites'
          )||
          '{}'
        );

    }catch{}


    tracks=
      data.songs.map(
        t=>({
          ...t,
          favorite:
            !!favorites[t.id]
        })
      );


    window.mq3Catalog=
      data;


    render();


    const id=
      new URLSearchParams(
        location.search
      ).get(
        'song'
      );


    if(id){

      const found=
        tracks.find(
          t=>
            t.id===id
        );


      if(found){

        $('search').value=
          found.title;


        render();


        scrollToSection(
          'library'
        );

      }

    }

  }catch(e){

    $('songs')
      .replaceChildren(
        node(
          'p',
          e.message,
          'notice'
        )
      );


    toast(
      e.message
    );

  }

}


render();

loadCatalog();
loadGiftStats();
loadLeaderboard();
