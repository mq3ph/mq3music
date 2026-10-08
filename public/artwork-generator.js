import {buildArtworkCommand} from './artwork-command.js';
const $=id=>document.getElementById(id),form=$('song-form'),generate=$('generate-artwork'),clear=$('clear-artwork'),preview=$('artwork-preview'),label=$('artwork-preview-label'),status=$('artwork-generator-status'),command=$('artwork-command'),copy=$('copy-artwork-command'),upload=$('artwork-upload');
let revision=0,uploadController=null,uploading=false;
const assistant=$('artwork-assistant'),countryField=$('artwork-country-field'),country=$('artwork-country'),openAssistant=$('open-artwork-ai');
function selectedAssistant(){return assistant.value==='meta'?'Meta AI':'ChatGPT';}
function syncAssistant(){const ai=selectedAssistant();generate.textContent='Build '+ai+' Command';openAssistant.href=assistant.value==='meta'?'https://www.meta.ai/':'https://chatgpt.com/';openAssistant.textContent='Open '+ai+' ↗';countryField.style.display=form.elements.category.value==='Name Songs'?'block':'none';}
function setStatus(text,type=''){status.textContent=text;status.className='artwork-generator-status'+(type?' '+type:'');}
function syncPreview(){const url=form.elements.cover_url.value.trim();preview.hidden=!url;if(url)preview.src=url;else preview.removeAttribute('src');label.textContent=url?'Selected artwork. Save the song to use it in the player.':'No custom artwork selected. Automatic category artwork will be used.';}
function reset(){revision++;uploadController?.abort();uploadController=null;uploading=false;upload.disabled=false;clear.disabled=false;upload.value='';assistant.value='chatgpt';country.value='';command.value='';copy.disabled=true;copy.textContent='Copy command';syncPreview();syncAssistant();setStatus('');}
function selectedText(id){const select=$(id);return select.options[select.selectedIndex].text;}
generate.addEventListener('click',()=>{const title=form.elements.title.value.trim();if(!title){setStatus('Enter a song title first.','error');form.elements.title.focus();return;}
 command.value=buildArtworkCommand({assistant:selectedAssistant(),country:country.value.trim(),title,artist:form.elements.artist.value.trim(),category:form.elements.category.value,lyrics:form.elements.lyrics.value.trim()||'(No lyrics supplied. Use only the provided details.)',subject:selectedText('artwork-subject'),mood:selectedText('artwork-mood'),scene:selectedText('artwork-scene')});copy.disabled=false;setStatus('Command ready. Copy it and paste into '+selectedAssistant()+'.','good');});
copy.addEventListener('click',async()=>{if(!command.value)return;try{await navigator.clipboard.writeText(command.value);copy.textContent='Copied ✓';setStatus('Paste into '+selectedAssistant()+', choose a concept, then ask it to generate the image.','good');}catch{command.focus();command.select();setStatus('Command selected. Press Ctrl+C (or use Copy on your phone).');}});
clear.addEventListener('click',()=>{revision++;form.elements.cover_url.value='';upload.value='';syncPreview();setStatus('Save the song to use the automatic category artwork.');});
form.addEventListener('submit',e=>{if(uploading){e.preventDefault();e.stopImmediatePropagation();setStatus('Wait for the artwork upload before saving the song.');}},true);
upload.addEventListener('change',async()=>{
 const file=upload.files[0];if(!file)return;
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024||!file.size){setStatus('Choose a PNG, JPG or WebP image up to 5 MB.','error');upload.value='';return;}
 const token=++revision;uploading=true;upload.disabled=true;clear.disabled=true;uploadController=new AbortController();setStatus('Checking and uploading artwork…');
 try{
  const bitmap=await createImageBitmap(file);bitmap.close();if(token!==revision)return;
  const r=await fetch('/api/admin/cover-upload',{method:'POST',headers:{'Content-Type':file.type},body:file,signal:uploadController.signal});let data={};try{data=await r.json();}catch{}
  if(!r.ok)throw Error(data.error||'Upload failed. Please try again.');
  if(typeof data.url!=='string'||!data.url.startsWith('/api/covers/'))throw Error('Upload did not return a valid artwork link.');
  if(token!==revision)return;
  form.elements.cover_url.value=data.url;syncPreview();setStatus('Artwork uploaded ✓ Click Save song to apply it.','good');
 }catch(e){if(token===revision&&e.name!=='AbortError')setStatus(e.message||'Could not upload that image.','error');}
 finally{if(token===revision){uploading=false;uploadController=null;upload.disabled=false;clear.disabled=false;upload.value='';}}
});
form.addEventListener('mq3-song-form-loaded',reset);
form.addEventListener('reset',()=>{revision++;uploadController?.abort();setTimeout(reset,0);});
for(const input of [form.elements.title,form.elements.artist,form.elements.category,form.elements.lyrics,$('artwork-subject'),$('artwork-mood'),$('artwork-scene'),assistant,country])input.addEventListener('input',()=>{syncAssistant();if(command.value){command.value='';copy.disabled=true;setStatus('Song details changed. Build a fresh command before copying.');}});
assistant.addEventListener('change',()=>{syncAssistant();if(command.value){command.value='';copy.disabled=true;setStatus('Assistant changed. Build a fresh command before copying.');}});form.elements.category.addEventListener('change',syncAssistant);
syncAssistant();syncPreview();
