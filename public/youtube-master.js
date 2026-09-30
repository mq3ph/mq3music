const $=id=>document.getElementById(id);
const canvas=$('preview');
const ctx=canvas.getContext('2d');
let coverImage=null;
let coverObjectUrl='';
let audioObjectUrl='';
let preset='mq3';
let exporting=false;

const presets={
  mq3:{bg1:'#180402',bg2:'#3b0f09',glow:'#b9772b',line:'#d6aa54'},
  black:{bg1:'#0b0b0c',bg2:'#1c1c20',glow:'#7f6a46',line:'#b99a5b'},
  warm:{bg1:'#1d0d07',bg2:'#4b2a18',glow:'#b97b3a',line:'#d5a45d'}
};

function fitContain(img,maxW,maxH){
  const ratio=Math.min(maxW/img.naturalWidth,maxH/img.naturalHeight);
  return {w:img.naturalWidth*ratio,h:img.naturalHeight*ratio};
}

function roundedRect(x,y,w,h,r){
  const rr=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y);
  ctx.arcTo(x+w,y,x+w,y+h,rr);
  ctx.arcTo(x+w,y+h,x,y+h,rr);
  ctx.arcTo(x,y+h,x,y,rr);
  ctx.arcTo(x,y,x+w,y,rr);
  ctx.closePath();
}

function drawFrame(){
  const p=presets[preset];
  const grad=ctx.createLinearGradient(0,0,1920,1080);
  grad.addColorStop(0,p.bg1);grad.addColorStop(.55,p.bg2);grad.addColorStop(1,p.bg1);
  ctx.fillStyle=grad;ctx.fillRect(0,0,1920,1080);

  const glow=ctx.createRadialGradient(960,500,80,960,500,720);
  glow.addColorStop(0,p.glow+'55');glow.addColorStop(.45,p.glow+'18');glow.addColorStop(1,p.glow+'00');
  ctx.fillStyle=glow;ctx.fillRect(0,0,1920,1080);

  ctx.strokeStyle=p.line+'55';ctx.lineWidth=2;
  roundedRect(70,70,1780,940,28);ctx.stroke();

  if(coverImage){
    const size=fitContain(coverImage,760,760);
    const x=(1920-size.w)/2;
    const y=(1080-size.h)/2;
    ctx.save();
    ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=48;ctx.shadowOffsetY=18;
    roundedRect(x,y,size.w,size.h,12);ctx.clip();
    ctx.drawImage(coverImage,x,y,size.w,size.h);
    ctx.restore();

    ctx.strokeStyle=p.line+'99';ctx.lineWidth=3;
    roundedRect(x,y,size.w,size.h,12);ctx.stroke();
  } else {
    ctx.fillStyle='rgba(255,255,255,.05)';
    roundedRect(580,160,760,760,18);ctx.fill();
    ctx.strokeStyle=p.line+'66';ctx.lineWidth=3;roundedRect(580,160,760,760,18);ctx.stroke();
    ctx.fillStyle='#e8d5b1';ctx.textAlign='center';ctx.font='36px Arial';ctx.fillText('Upload 1:1 album cover',960,535);
  }

  const title=$('song-title').value.trim();
  if(title){
    ctx.textAlign='center';ctx.fillStyle='#f1d28a';ctx.font='600 28px Arial';
    ctx.fillText(title.toUpperCase(),960,1015);
  }
}

function loadImage(file){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file);const img=new Image();
    img.onload=()=>resolve({img,url});img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Could not read cover image.'));};img.src=url;
  });
}

$('cover-file').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    const {img,url}=await loadImage(file);
    if(coverObjectUrl)URL.revokeObjectURL(coverObjectUrl);
    coverObjectUrl=url;coverImage=img;drawFrame();
  }catch(err){alert(err.message);}
});

$('song-title').addEventListener('input',drawFrame);
$('preview-btn').addEventListener('click',drawFrame);

document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{
  preset=b.dataset.preset;
  document.querySelectorAll('[data-preset]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  drawFrame();
}));

function bestMime(){
  const choices=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  return choices.find(t=>MediaRecorder.isTypeSupported(t))||'';
}

function safeFilename(name){return (name||'mq3-youtube-master').replace(/[\\/:*?"<>|]+/g,' ').trim().replace(/\s+/g,'-');}

$('export-btn').addEventListener('click',async()=>{
  if(exporting)return;
  const coverFile=$('cover-file').files[0];
  const audioFile=$('audio-file').files[0];
  if(!coverFile||!coverImage){alert('Upload the album cover first.');return;}
  if(!audioFile){alert('Upload the song audio first.');return;}
  const mime=bestMime();
  if(!mime){alert('This browser cannot export WebM video. Use current Chrome or Edge.');return;}

  exporting=true;
  $('export-btn').disabled=true;
  $('download-link').hidden=true;
  $('progress-wrap').hidden=false;
  $('progress').value=0;
  $('status').textContent='Preparing audio and 1080p canvas…';

  if(audioObjectUrl)URL.revokeObjectURL(audioObjectUrl);
  audioObjectUrl=URL.createObjectURL(audioFile);
  const audio=new Audio(audioObjectUrl);audio.preload='auto';

  try{
    await new Promise((resolve,reject)=>{audio.onloadedmetadata=resolve;audio.onerror=()=>reject(Error('Could not read audio file.'));});
    const ac=new (window.AudioContext||window.webkitAudioContext)();
    await ac.resume();
    const src=ac.createMediaElementSource(audio);
    const dest=ac.createMediaStreamDestination();
    src.connect(dest);src.connect(ac.destination);

    const canvasStream=canvas.captureStream(30);
    const stream=new MediaStream([...canvasStream.getVideoTracks(),...dest.stream.getAudioTracks()]);
    const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8000000,audioBitsPerSecond:192000});
    const chunks=[];
    recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};

    let raf=0;
    const tick=()=>{
      drawFrame();
      const duration=audio.duration||1;
      $('progress').value=Math.min(100,(audio.currentTime/duration)*100);
      $('status').textContent=`Creating video… ${Math.round(audio.currentTime)}s / ${Math.round(duration)}s`;
      if(!audio.ended)raf=requestAnimationFrame(tick);
    };

    const done=new Promise((resolve,reject)=>{
      recorder.onerror=e=>reject(e.error||Error('Video export failed.'));
      recorder.onstop=resolve;
    });

    audio.onended=()=>{
      cancelAnimationFrame(raf);
      if(recorder.state!=='inactive')recorder.stop();
    };

    drawFrame();
    recorder.start(1000);
    await audio.play();
    raf=requestAnimationFrame(tick);
    await done;

    stream.getTracks().forEach(t=>t.stop());
    src.disconnect();dest.disconnect();await ac.close();

    const blob=new Blob(chunks,{type:mime});
    const url=URL.createObjectURL(blob);
    const link=$('download-link');
    link.href=url;
    link.download=safeFilename($('song-title').value)+'-MQ3-1080p.webm';
    link.hidden=false;
    $('progress').value=100;
    $('status').textContent=`Ready · ${(blob.size/1024/1024).toFixed(1)} MB · YouTube-ready WebM`;
  }catch(err){
    $('status').textContent=err.message;
  }finally{
    exporting=false;$('export-btn').disabled=false;
  }
});

drawFrame();
