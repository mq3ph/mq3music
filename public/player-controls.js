(()=>{
  const $=id=>document.getElementById(id);
  const category=$('song-category');
  if(category){
    const clean=()=>{const v=category.textContent.replace(/^\s*·\s*/,'').trim();if(v!==category.textContent.trim())category.textContent=v;};
    new MutationObserver(clean).observe(category,{childList:true,characterData:true,subtree:true});clean();
  }

  const root=document.querySelector('.mq3-controls');
  if(!root)return;
  const main=$('mq3-main-play'),wave=$('mq3-waveform'),progress=document.querySelector('.mq3-progress'),fill=$('mq3-progress-fill'),dot=$('mq3-progress-dot'),currentLabel=$('mq3-current-time'),durationLabel=$('mq3-duration');
  let playing=false,current=0,duration=Number(document.documentElement.dataset.mq3Duration)||0,last=performance.now(),raf=0,ytState=-1;

  function formatTime(seconds){seconds=Math.max(0,Math.round(Number(seconds)||0));const h=Math.floor(seconds/3600),m=Math.floor((seconds%3600)/60),s=seconds%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;}
  function activeIframe(){return document.querySelector('#player iframe');}
  function youtubeCommand(func,args=[]){
    const f=activeIframe();if(!f||!f.classList.contains('youtube'))return false;
    try{f.contentWindow.postMessage(JSON.stringify({event:'command',func,args}), '*');return true;}catch{return false;}
  }
  function setPlaying(v){playing=!!v;main.textContent=playing?'Ⅱ':'▶';main.setAttribute('aria-label',playing?'Pause':'Play');document.body.classList.toggle('mq3-is-playing',playing);if(playing){last=performance.now();startLoop();}}
  function updateProgress(){
    const total=duration||0,pct=total?Math.max(0,Math.min(100,current/total*100)):0;
    if(fill)fill.style.width=pct+'%';if(dot)dot.style.left=pct+'%';if(currentLabel)currentLabel.textContent=formatTime(current);if(durationLabel)durationLabel.textContent=total?formatTime(total):'--:--';
  }
  function animateWave(now){
    if(!wave)return;const bars=[...wave.children];
    bars.forEach((bar,i)=>{const base=Number(bar.dataset.base||.5);const pulse=playing?(0.64+0.36*Math.sin(now/125+i*.72)+0.18*Math.sin(now/73+i*.29)):0.82;bar.style.transform=`scaleY(${Math.max(.28,base*pulse)})`;bar.style.opacity=playing?String(.72+.24*((Math.sin(now/180+i*.41)+1)/2)):'.72';});
  }
  function frame(now){
    if(playing&&duration&&ytState!==1){const dt=(now-last)/1000;current=Math.min(duration,current+Math.max(0,dt));if(current>=duration){current=duration;setPlaying(false);}}
    last=now;updateProgress();animateWave(now);raf=requestAnimationFrame(frame);
  }
  function startLoop(){if(!raf){last=performance.now();raf=requestAnimationFrame(frame);}}

  main.addEventListener('click',()=>{
    const f=activeIframe();if(!f)return;
    if(f.classList.contains('youtube')){const next=!playing;if(youtubeCommand(next?'playVideo':'pauseVideo'))setPlaying(next);}
    else{document.querySelector('.source-stack')?.setAttribute('open','');document.querySelector('.source-stack')?.scrollIntoView({behavior:'smooth',block:'nearest'});}
  });

  function move(delta){
    const rows=[...document.querySelectorAll('.song-row')];if(!rows.length)return;
    let i=rows.findIndex(r=>r.getAttribute('aria-pressed')==='true');if(i<0)i=0;
    rows[(i+delta+rows.length)%rows.length]?.click();reset();
  }
  function reset(newDuration){current=0;duration=Number(newDuration??document.documentElement.dataset.mq3Duration)||0;ytState=-1;setPlaying(false);updateProgress();}
  $('mq3-prev')?.addEventListener('click',()=>move(-1));
  $('mq3-next')?.addEventListener('click',()=>move(1));
  $('mq3-repeat')?.addEventListener('click',()=>{current=0;youtubeCommand('seekTo',[0,true]);updateProgress();});
  $('mq3-shuffle')?.addEventListener('click',()=>{
    const rows=[...document.querySelectorAll('.song-row')];if(rows.length<2)return;
    let r=rows[Math.floor(Math.random()*rows.length)];if(r.getAttribute('aria-pressed')==='true')r=rows[(rows.indexOf(r)+1)%rows.length];r.click();reset();
  });
  progress?.addEventListener('click',e=>{if(!duration)return;const r=progress.getBoundingClientRect(),ratio=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));current=duration*ratio;youtubeCommand('seekTo',[current,true]);updateProgress();});

  window.addEventListener('mq3-song-selected',e=>reset(e.detail?.duration));
  window.addEventListener('mq3-source-changed',()=>reset());
  window.addEventListener('message',event=>{
    const f=activeIframe();if(!f||event.source!==f.contentWindow||!f.classList.contains('youtube'))return;
    let data=event.data;try{if(typeof data==='string')data=JSON.parse(data);}catch{return;}if(!data||typeof data!=='object')return;
    const info=data.info||{};
    if(Number.isFinite(info.duration)&&info.duration>0){duration=info.duration;document.documentElement.dataset.mq3Duration=String(Math.round(duration));}
    if(Number.isFinite(info.currentTime)&&info.currentTime>=0)current=info.currentTime;
    if(Number.isFinite(info.playerState)){ytState=info.playerState;if(ytState===1)setPlaying(true);else if(ytState===2||ytState===0)setPlaying(false);}
    if(data.event==='onStateChange'&&Number.isFinite(data.info)){ytState=data.info;if(ytState===1)setPlaying(true);else if(ytState===2||ytState===0)setPlaying(false);}
    updateProgress();
  });

  const player=$('player');if(player)new MutationObserver(()=>{reset();setTimeout(()=>{youtubeCommand('addEventListener',['onStateChange']);youtubeCommand('addEventListener',['onReady']);},500);}).observe(player,{childList:true,subtree:true});
  if(wave&&!wave.children.length){for(let i=0;i<64;i++){const b=document.createElement('span');const base=.45+((Math.sin(i*.47)+1)*.18)+((Math.sin(i*.19+1.7)+1)*.12);b.dataset.base=String(base);b.style.height=(16+Math.round(base*30))+'px';wave.appendChild(b);}}
  updateProgress();startLoop();
})();