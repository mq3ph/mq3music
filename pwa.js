let installPrompt=null;
const installButton=document.getElementById('install-app');
function installed(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;}
function updateInstallButton(){installButton.hidden=installed();}
updateInstallButton();
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;updateInstallButton();});
window.addEventListener('appinstalled',()=>{installPrompt=null;installButton.hidden=true;});
installButton.addEventListener('click',async()=>{
  if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();await prompt.userChoice;return;}
  const apple=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  document.getElementById('install-instructions').textContent=apple
    ?'Open MQ3 in Safari. Tap Share → Add to Home Screen. Keep Open as Web App enabled if shown, then tap Add.'
    :'Open MQ3 in Chrome or your phone’s browser. In the browser menu, choose Install app or Add to Home screen if available. The option depends on your browser and device.';
  document.getElementById('install-help').showModal();
});
document.getElementById('close-install-help').onclick=()=>document.getElementById('install-help').close();
if('serviceWorker' in navigator&&window.isSecureContext){
  navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>{
    // Normal online music remains usable if installation support is unavailable.
  });
}
