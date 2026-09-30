const form=document.getElementById('song-form');
const generate=document.getElementById('generate-artwork');
const clear=document.getElementById('clear-artwork');
const preview=document.getElementById('artwork-preview');
const label=document.getElementById('artwork-preview-label');
const status=document.getElementById('artwork-generator-status');
const subject=document.getElementById('artwork-subject');
const mood=document.getElementById('artwork-mood');
const scene=document.getElementById('artwork-scene');

function setStatus(text,type=''){
  if(!status)return;status.textContent=text;status.className='artwork-generator-status'+(type?' '+type:'');
}
function syncPreview(){
  if(!form||!preview||!label)return;
  const url=String(form.elements.cover_url?.value||'').trim();
  if(url){preview.src=url;preview.hidden=false;label.textContent='Generated artwork selected. Save the song to make it permanent.';}
  else{preview.removeAttribute('src');preview.hidden=true;label.textContent='No generated artwork saved for this song yet.';}
  setStatus('');
}

async function generateArtwork(){
  if(!form||!generate)return;
  const title=form.elements.title.value.trim();
  const lyrics=form.elements.lyrics.value.trim();
  if(!title){setStatus('Enter the song title first.','error');form.elements.title.focus();return;}
  if(!lyrics){setStatus('Paste the full lyrics first so the artwork can follow the song.','error');form.elements.lyrics.focus();return;}
  const old=generate.textContent;generate.disabled=true;clear.disabled=true;generate.textContent='Generating…';
  setStatus('Creating a photorealistic silhouette from the title and lyrics. This can take a little while.');
  try{
    const r=await fetch('/api/admin/artwork-generate',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({title,lyrics,category:form.elements.category.value,subject:subject.value,mood:mood.value,scene:scene.value})
    });
    let data={};try{data=await r.json();}catch{}
    if(!r.ok)throw Error(data.error||'Artwork generation failed.');
    form.elements.cover_url.value=data.url;
    preview.src=data.url+'?v='+Date.now();preview.hidden=false;
    label.textContent='New artwork ready. Save the song to use it on the public player.';
    setStatus('Artwork generated ✓ You can regenerate for another hairstyle/pose, or save this one.','good');
  }catch(error){setStatus(error.message,'error');}
  finally{generate.disabled=false;clear.disabled=false;generate.textContent=old;}
}

function clearArtwork(){
  if(!form)return;form.elements.cover_url.value='';syncPreview();setStatus('Generated cover cleared. The automatic category fallback will be used after you save.');
}

generate?.addEventListener('click',generateArtwork);
clear?.addEventListener('click',clearArtwork);

if(form){
  const observer=new MutationObserver(()=>{if(!form.hidden)setTimeout(syncPreview,0);});
  observer.observe(form,{attributes:true,attributeFilter:['hidden']});
  form.addEventListener('reset',()=>setTimeout(syncPreview,0));
  form.elements.category?.addEventListener('change',()=>{if(form.elements.category.value==='Love Songs'&&subject.value==='auto')setStatus('Tip: choose “Woman + Man (Love / Duet)” when both should definitely appear.');});
}

syncPreview();
