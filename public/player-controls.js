(()=>{
  const $=id=>document.getElementById(id);
  const category=$('song-category');
  if(category){
    const clean=()=>{const v=category.textContent.replace(/^\s*·\s*/,'').trim();if(v!==category.textContent.trim())category.textContent=v;};
    new MutationObserver(clean).observe(category,{childList:true,characterData:true,subtree:true});clean();
  }

  const root=document.querySelector('.mq3-controls');
  if(!root)return;
  const main=$('mq3-main-play');
  let playing=false;

  function activeIframe(){return document.querySelector('#player iframe');}
  function prepareIframe(){
    const f=activeIframe();if(!f)return;
    if(f.classList.contains('youtube')){
      try{const u=new URL(f.src);if(u.searchParams.get('enablejsapi')!=='1'){u.searchParams.set('enablejsapi','1');u.searchParams.set('origin',location.origin);f.src=u.href;}}catch{}
    }
  }
  function youtubeCommand(func,args=[]){
    const f=activeIframe();if(!f||!f.classList.contains('youtube'))return false;
    try{f.contentWindow.postMessage(JSON.stringify({event:'command',func,args}), '*');return true;}catch{return false;}
  }
  function setPlaying(v){playing=v;main.textContent=v?'Ⅱ':'▶';main.setAttribute('aria-label',v?'Pause':'Play');}
  main.addEventListener('click',()=>{
    const f=activeIframe();
    if(!f)return;
    if(f.classList.contains('youtube')){
      const next=!playing;if(youtubeCommand(next?'playVideo':'pauseVideo'))setPlaying(next);
    }else{
      document.querySelector('.source-stack')?.setAttribute('open','');
      document.querySelector('.source-stack')?.scrollIntoView({behavior:'smooth',block:'nearest'});
    }
  });

  function move(delta){
    const rows=[...document.querySelectorAll('.song-row')];if(!rows.length)return;
    let i=rows.findIndex(r=>r.getAttribute('aria-pressed')==='true');if(i<0)i=0;
    rows[(i+delta+rows.length)%rows.length]?.click();setPlaying(false);
  }
  $('mq3-prev')?.addEventListener('click',()=>move(-1));
  $('mq3-next')?.addEventListener('click',()=>move(1));
  $('mq3-repeat')?.addEventListener('click',()=>{youtubeCommand('seekTo',[0,true]);youtubeCommand('playVideo');setPlaying(true)});
  $('mq3-shuffle')?.addEventListener('click',()=>{
    const rows=[...document.querySelectorAll('.song-row')];if(rows.length<2)return;
    let r=rows[Math.floor(Math.random()*rows.length)];if(r.getAttribute('aria-pressed')==='true')r=rows[(rows.indexOf(r)+1)%rows.length];r.click();setPlaying(false);
  });

  const player=$('player');
  if(player)new MutationObserver(()=>{setPlaying(false);setTimeout(prepareIframe,0)}).observe(player,{childList:true,subtree:true});
  prepareIframe();
})();
