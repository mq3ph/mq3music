'use strict';

const $=id=>document.getElementById(id);

const cats=[
  'NAME SONGS',
  'INSPIRATIONAL SONGS',
  'OPM',
  'ORIGINAL SONGS'
];

const subs=[
  'Personalized songs. Made for you.',
  'A little hope. A little light.',
  'Filipino heart. Familiar feeling.',
  'My words. My melodies.'
];

const artwork=[
  'assets/name-series.png',
  'assets/inspirational.png',
  'assets/opm.png',
  'assets/original.png'
];

const symbols=[
  'heart',
  'sun',
  'music',
  'pen'
];

const artFor=t=>
  artwork[cats.indexOf(t.category)]||
  'logo.png';


const icons={

  home:
    '<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',

  compass:
    '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5Z"/>',

  library:
    '<rect x="5" y="5" width="15" height="16" rx="2"/><path d="M3 17V3h13m-1 7v6m0-6 3-1m-3 7c0 2-4 2-4 0s4-2 4 0"/>',

  heart:
    '<path d="M20.5 5.5a5.2 5.2 0 0 0-8.5 1 5.2 5.2 0 0 0-8.5-1C-1 11 12 20 12 20s13-9 8.5-14.5Z"/>',

  search:
    '<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',

  sun:
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',

  music:
    '<path d="M9 17V5l11-2v12M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>',

  pen:
    '<path d="m4 16-1 5 5-1L21 7l-4-4Zm11-11 4 4M4 16l4 4"/>',

  previous:
    '<path d="M5 4v16m14-15L8 12l11 7Z"/>',

  next:
    '<path d="M19 4v16M5 5l11 7-11 7Z"/>',

  volume:
    '<path d="M4 9h4l5-4v14l-5-4H4Zm12-1c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>'

};


function icon(name){

  const el=
    document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    );

  el.setAttribute(
    'viewBox',
    '0 0 24 24'
  );

  el.setAttribute(
    'aria-hidden',
    'true'
  );

  el.innerHTML=
    icons[name]||
    icons.music;

  return el;
}


document
  .querySelectorAll('[data-icon]')
  .forEach(
    el=>
      el.append(
        icon(
          el.dataset.icon
        )
      )
  );


function scrollToSection(id){

  $(id).scrollIntoView({
    behavior:
      matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches
        ?'instant'
        :'smooth',

    block:'start'
  });

}


function activeNav(id){

  document
    .querySelectorAll(
      '.main-nav .nav'
    )
    .forEach(b=>{

      b.classList.toggle(
        'active',
        b.id===id
      );

      if(
        b.id===id
      ){

        b.setAttribute(
          'aria-current',
          'page'
        );

      }else{

        b.removeAttribute(
          'aria-current'
        );

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


const viewedThisPage=
  new Set();


function recordView(id){

  if(
    viewedThisPage.has(id)
  ){
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
   MQ3 LYRICS WINDOW
========================================================= */

function ensureLyricsDialog(){

  let dialog=
    $('mq3-lyrics-dialog');

  if(dialog){
    return dialog;
  }


  dialog=
    document.createElement(
      'dialog'
    );

  dialog.id=
    'mq3-lyrics-dialog';

  dialog.className=
    'mq3-lyrics-dialog';


  const header=
    node(
      'div',
      undefined,
      'lyrics-dialog-head'
    );


  const heading=
    node(
      'div',
      undefined,
      'lyrics-heading'
    );


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


  heading.append(
    kicker,
    title,
    category
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
    ()=>
      dialog.close();


  header.append(
    heading,
    close
  );


  const divider=
    node(
      'div',
      undefined,
      'lyrics-divider'
    );


  const body=
    node(
      'div',
      '',
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


  dialog.append(
    header,
    divider,
    body,
    creditsBox
  );


  dialog.addEventListener(
    'click',
    e=>{

      if(
        e.target===dialog
      ){

        const rect=
          dialog.getBoundingClientRect();

        const inside=
          e.clientX>=rect.left &&
          e.clientX<=rect.right &&
          e.clientY>=rect.top &&
          e.clientY<=rect.bottom;

        if(!inside){
          dialog.close();
        }

      }

    }
  );


  document.body.append(
    dialog
  );

  return dialog;

}


function showLyrics(t){

  if(!t){
    toast(
      'Choose a song first.'
    );

    return;
  }


  const dialog=
    ensureLyricsDialog();


  $('mq3-lyrics-title')
    .textContent=
      t.title||
      'Untitled Song';


  $('mq3-lyrics-category')
    .textContent=
      t.category||
      'MQ3 MUSIC';


  const lyrics=
    String(
      t.lyrics||
      ''
    ).trim();


  $('mq3-lyrics-body')
    .textContent=
      lyrics||
      'Lyrics are not available for this song yet.';


  $('mq3-lyrics-credits')
    .textContent=
      credit(
        t.category
      );


  if(
    !dialog.open
  ){
    dialog.showModal();
  }

}


/* =========================================================
   LYRICS BUTTON INSIDE THE BOTTOM PLAYER
========================================================= */

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
      'Lyrics',
      'player-lyrics'
    );

  button.id=
    'player-lyrics';

  button.type=
    'button';

  button.disabled=
    !current;


  button.onclick=
    ()=>{

      const song=
        tracks.find(
          t=>
            t.id===current
        );

      showLyrics(song);

    };


  nowcat
    .parentElement
    .append(
      button
    );

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

    b.dataset.cat=c;

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
      .append(b);

  }
);


function renderRecent(){

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


  list.forEach(t=>{

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
      node('img');

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
      .append(b);

  });


  $('recent')
    .scrollLeft=
      offset;

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
    .forEach(b=>{

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

    });


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
      node('div');


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


    e.append(copy);


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


      e.append(b);

    }


    $('songs')
      .append(e);

  }


  list.forEach(t=>{

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


    info.append(

      node(
        'div',
        t.title,
        'title'
      ),

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
        )
      )

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

        f.disabled=true;

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

          f.disabled=false;

          toast(
            'Could not save favorite.'
          );

        }

      };


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


    const actions=
      node(
        'div',
        undefined,
        'song-actions'
      );


    actions.append(
      f,
      lyrics
    );


    r.append(
      p,
      img,
      info,
      cat,
      actions
    );


    $('songs')
      .append(r);

  });


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


$('closedetail').onclick=
  ()=>
    $('detail')
      .close();


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


async function start(t){

  if(
    current===t.id
  ){

    toggle();
    return;

  }


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


  $('seek').disabled=
    false;


  const playerLyrics=
    $('player-lyrics');


  if(playerLyrics){
    playerLyrics.disabled=false;
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


audio.onended=
  ()=>
    next(1);


audio.onplay=
  ()=>{

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


audio.onloadedmetadata=
  ()=>
    $('duration')
      .textContent=
        time(
          audio.duration
        );


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
