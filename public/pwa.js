'use strict';

let installPrompt=null;

const installButton=
  document.getElementById('install-app');

const installHelp=
  document.getElementById('install-help');

const installInstructions=
  document.getElementById('install-instructions');

const closeInstallHelp=
  document.getElementById('close-install-help');


function isInstalled(){

  return (
    window.matchMedia(
      '(display-mode: standalone)'
    ).matches ||

    window.matchMedia(
      '(display-mode: fullscreen)'
    ).matches ||

    navigator.standalone===true
  );

}


function isAppleDevice(){

  return (
    /iPhone|iPad|iPod/i.test(
      navigator.userAgent
    ) ||

    (
      navigator.platform==='MacIntel' &&
      navigator.maxTouchPoints>1
    )
  );

}


function updateInstallButton(){

  if(!installButton){
    return;
  }

  /*
   * If MQ3 is already running as an installed app,
   * there is no reason to show Install MQ3.
   */
  if(isInstalled()){

    installButton.hidden=true;
    installButton.disabled=true;

    return;
  }


  installButton.disabled=false;

  /*
   * Apple does not provide beforeinstallprompt,
   * so keep the button available and show the
   * Add to Home Screen instructions when tapped.
   *
   * On other browsers we also keep the button
   * available. If the browser supplies a native
   * install prompt, the same button becomes
   * one-tap installation automatically.
   */
  installButton.hidden=false;

}


function showInstallHelp(){

  if(
    !installHelp ||
    !installInstructions
  ){
    return;
  }


  if(isAppleDevice()){

    installInstructions.textContent=
      'Open MQ3 in Safari. Tap Share, then choose Add to Home Screen. Keep Open as Web App enabled if shown, then tap Add.';

  }else{

    installInstructions.textContent=
      'Your browser is not offering one-tap installation right now. Open the browser menu and choose Install app or Add to Home screen if available.';

  }


  if(
    typeof installHelp.showModal===
    'function'
  ){

    installHelp.showModal();

  }

}


window.addEventListener(
  'beforeinstallprompt',
  event=>{

    /*
     * Save the browser install event so our own
     * MQ3 button can trigger the native installer.
     */
    event.preventDefault();

    installPrompt=event;

    updateInstallButton();

  }
);


window.addEventListener(
  'appinstalled',
  ()=>{

    installPrompt=null;

    updateInstallButton();

  }
);


if(installButton){

  installButton.addEventListener(
    'click',
    async()=>{

      if(isInstalled()){

        updateInstallButton();

        return;

      }


      /*
       * Chromium / Android:
       * use the browser's native PWA installer
       * whenever it is available.
       */
      if(installPrompt){

        const prompt=
          installPrompt;

        installPrompt=null;


        try{

          await prompt.prompt();

          await prompt.userChoice;

        }catch(error){

          console.warn(
            'MQ3 installation prompt could not be shown.',
            error
          );

        }


        /*
         * A beforeinstallprompt event can only
         * be used once. If installation was
         * cancelled, the browser decides when
         * it may offer another one.
         */
        updateInstallButton();

        return;

      }


      /*
       * No native prompt available.
       * Give device-appropriate instructions.
       */
      showInstallHelp();

    }
  );

}


if(closeInstallHelp){

  closeInstallHelp.addEventListener(
    'click',
    ()=>{

      if(
        installHelp &&
        typeof installHelp.close===
        'function'
      ){

        installHelp.close();

      }

    }
  );

}


/*
 * If display mode changes while the page is open,
 * refresh the Install button state.
 */
const standaloneQuery=
  window.matchMedia(
    '(display-mode: standalone)'
  );


if(
  typeof standaloneQuery
    .addEventListener===
  'function'
){

  standaloneQuery.addEventListener(
    'change',
    updateInstallButton
  );

}


/*
 * Returning to the page can happen after the user
 * has installed or removed MQ3, so re-check the
 * current display mode.
 */
window.addEventListener(
  'pageshow',
  updateInstallButton
);

window.addEventListener(
  'focus',
  updateInstallButton
);


updateInstallButton();


/*
 * Register the MQ3 service worker.
 *
 * The current service worker only provides the
 * generic offline fallback. Music files and
 * private user data are NOT cached here.
 */
if(
  'serviceWorker' in navigator &&
  window.isSecureContext
){

  window.addEventListener(
    'load',
    ()=>{

      navigator
        .serviceWorker
        .register(
          '/sw.js',
          {
            scope:'/'
          }
        )
        .catch(
          error=>{

            console.warn(
              'MQ3 service worker registration failed.',
              error
            );

          }
        );

    }
  );

}
