(() => {
  const grid=document.getElementById('home-song-grid');
  if(!grid)return;
  const status=document.getElementById('home-catalog-status');
  document.getElementById('home-year').textContent=new Date().getFullYear();
  function node(tag,text){const el=document.createElement(tag);if(text)el.textContent=text;return el;}
  function play(song){
    let dialog=document.getElementById('home-player');
    if(!dialog){dialog=node('dialog');dialog.id='home-player';dialog.className='home-player';document.body.append(dialog);dialog.addEventListener('close',()=>dialog.replaceChildren());}
    const title=node('h2',song.title||'MQ3 Song');title.id='home-player-title';dialog.setAttribute('aria-labelledby',title.id);dialog.replaceChildren(title);
    const match=String(song.suno_url||'').match(/^https:\/\/suno\.com\/song\/([a-f0-9-]{36})$/i);
    dialog.className=match?'catalog-player':'home-player';
    if(match){const frame=node('iframe');frame.src='https://suno.com/embed/'+match[1];frame.title=(song.title||'Song')+' player';frame.allow='autoplay; encrypted-media; fullscreen';frame.referrerPolicy='strict-origin-when-cross-origin';frame.setAttribute('sandbox','allow-scripts allow-same-origin');const wrap=node('div');wrap.className='catalog-embed-wrap';wrap.append(frame);const brand=node('div');brand.className='catalog-brand';const logo=node('img');logo.src='/logo.png';logo.alt='MQ3';const copy=node('div');copy.className='catalog-brand-copy';const brandTitle=node('strong','Song Creator');const tag=node('small','TURN IDEAS INTO MUSIC');copy.append(brandTitle,tag);brand.append(logo,copy);dialog.prepend(brand);dialog.append(wrap);}
    else {const audio=node('audio');audio.controls=true;audio.preload='none';audio.src='/api/songs/'+encodeURIComponent(song.id)+'/audio';audio.addEventListener('error',()=>{if(!dialog.querySelector('.home-audio-error')){const error=node('p','This audio could not be loaded. Please try again later.');error.className='home-audio-error';dialog.append(error);}});dialog.append(audio);}
    if(song.lyrics){const details=node('details');details.className='catalog-lyrics';details.open=true;const body=node('div',song.lyrics);body.className='catalog-lyrics-body';details.append(node('summary','Lyrics'),body);dialog.append(details);}
    const close=node('button','Close player');close.type='button';close.onclick=()=>dialog.close();dialog.append(close);dialog.showModal();close.focus();
  }
  window.addEventListener('mq3-home-catalog',event=>{
    grid.replaceChildren();
    if(event.detail.error){status.textContent='New releases could not be loaded. ';const retry=node('a','Try again');retry.href='/';status.append(retry);return;}
    // Compatibility for catalog records awaiting the category migration.
    // Only the four reviewed legacy records are reassigned; newer categories win.
    const legacyCategories={
      '60967b6d-c1a0-4ae6-8c5c-526d6cb5e1a1':'OPM',
      '3e3cceb4-f3ee-45c3-89a9-be1ee6365167':'NAME SONGS',
      'd04b7869-c286-45c0-b85f-9b04f23d77b8':'LOVE SONGS',
      'bdc295a8-d62b-46f2-946f-f503d127d28a':'LOVE SONGS'
    };
    const songs=(event.detail.songs||[]).map(song=>song.category==='ORIGINAL SONGS'&&legacyCategories[song.id]?{...song,category:legacyCategories[song.id]}:song);
    if(!songs.length){status.textContent='New music is on the way. Your song could be next.';return;}
    status.textContent='';
    // The catalog contains published songs. Show the newest additions first.
    const addedTime=song=>{
      const time=Date.parse(song.created_at);
      return Number.isFinite(time)?time:0;
    };
    const selected=[...songs].sort((a,b)=>
      addedTime(b)-addedTime(a)||String(a.id).localeCompare(String(b.id))
    ).slice(0,4);
    for(const song of selected){
      const art={'INSPIRATIONAL SONGS':'inspirational','OPM':'opm','LOVE SONGS':'original','NAME SONGS':'name-series'}[song.category]||'original';
      const card=node('article');card.className='home-song';
      const button=node('button');button.type='button';button.className='home-song-play';button.setAttribute('aria-label','Play '+(song.title||'song'));button.onclick=()=>play(song);
      const image=node('img');image.src='/assets/'+art+'.png';image.alt='';image.loading='lazy';image.width=400;image.height=300;
      const icon=node('span','▶');icon.className='home-play-icon';icon.setAttribute('aria-hidden','true');button.append(image,icon);
      const info=node('div');info.className='home-song-info';info.append(node('h3',song.title||'Untitled Song'),node('p',song.names||'An original song from MQ3 Music.'));
      const tag=node('span',song.category||'MQ3 MUSIC');tag.className='home-song-tag';info.append(tag);card.append(button,info);grid.append(card);
    }
  });
})();
