'use strict';


let installPrompt=null;


const installButton=
  document.getElementById(
    'install-app'
  );

const installHelp=
  document.getElementById(
    'install-help'
  );

const installInstructions=
  document.getElementById(
    'install-instructions'
  );

const closeInstallHelp=
  document.getElementById(
    'close-install-help'
  );


/* =========================================================
   MQ3 INSTALL BUTTON STYLE
========================================================= */

function addInstallStyles(){

  if(
    document.getElementById(
      'mq3-install-style'
    )
  ){
    return;
  }


  const style=
    document.createElement(
      'style'
    );


  style.id=
    'mq3-install-style';


  style.textContent=`

    #install-app.mq3-install-fab{

      position:fixed;

      right:
        max(
          18px,
          env(safe-area-inset-right)
        );

      bottom:
        calc(
          var(--player-height,104px)
          + 22px
        );

      z-index:50;

      display:flex;
      align-items:center;
      justify-content:center;

      min-height:46px;

      padding:
        10px
        18px;

      border:
        1px solid
        #d3a653;

      border-radius:
        999px;

      background:
        linear-gradient(
          135deg,
          #f0d28d,
          #c9953f
        );

      color:#241708;

      font-size:12px;
      font-weight:700;

      letter-spacing:.35px;

      white-space:nowrap;

      box-shadow:
        0 12px 32px #0009,
        0 0 0 1px #fff1 inset;

      backdrop-filter:
        blur(10px);

      -webkit-backdrop-filter:
        blur(10px);

      transform:
        translateY(0);

      opacity:1;

      transition:
        transform .22s ease,
        opacity .22s ease,
        box-shadow .22s ease;

    }


    #install-app.mq3-install-fab::before{

      content:'↓';

      display:grid;
      place-items:center;

      width:23px;
      height:23px;

      margin-right:8px;

      border:
        1px solid
        #3e2912aa;

      border-radius:50%;

      font-size:13px;
      line-height:1;

    }


    #install-app.mq3-install-fab:hover{

      box-shadow:
        0 15px 36px #000b,
        0 0 0 1px #fff3 inset;

      transform:
        translateY(-2px);

    }


    #install-app.mq3-install-fab:active{

      transform:
        translateY(1px)
        scale(.98);

    }


    #install-app.mq3-install-fab[hidden]{

      display:none !important;

    }


    @media(max-width:600px){

      #install-app.mq3-install-fab{

        right:
          max(
            12px,
            env(safe-area-inset-right)
          );

        bottom:
          calc(
            var(--player-height,92px)
            + 78px
            + env(safe-area-inset-bottom)
          );

        min-height:44px;

        padding:
          9px
          15px;

        font-size:11px;

      }

    }


    @media(max-width:360px){

      #install-app.mq3-install-fab{

        right:10px;

        padding:
          8px
          12px;

      }

    }


    @media(prefers-reduced-motion:reduce){

      #install-app.mq3-install-fab{

        transition:none;

      }

    }

  `;


  document.head.append(
    style
  );

}


/* =========================================================
   DEVICE / DISPLAY DETECTION
========================================================= */

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

    /iPhone|iPad|iPod/i
      .test(
        navigator.userAgent
      ) ||

    (
      navigator.platform==='MacIntel' &&
      navigator.maxTouchPoints>1
    )

  );

}


function isTikTokBrowser(){

  return /TikTok/i.test(
    navigator.userAgent
  );

}


function isFacebookBrowser(){

  return /FBAN|FBAV|Facebook/i
    .test(
      navigator.userAgent
    );

}


function isInstagramBrowser(){

  return /Instagram/i.test(
    navigator.userAgent
  );

}


function isInAppBrowser(){

  return (

    isTikTokBrowser() ||
    isFacebookBrowser() ||
    isInstagramBrowser()

  );

}


/* =========================================================
   INSTALL BUTTON STATE
========================================================= */

function updateInstallButton(){

  if(!installButton){
    return;
  }


  installButton
    .classList
    .add(
      'mq3-install-fab'
    );


  /*
   * Installed MQ3:
   * hide the install button completely.
   */
  if(isInstalled()){

    installButton.hidden=true;
    installButton.disabled=true;

    return;

  }


  /*
   * Website / browser:
   * keep the install button visible.
   */
  installButton.hidden=false;
  installButton.disabled=false;

}


/* =========================================================
   INSTALL HELP
========================================================= */

function showInstallHelp(){

  if(
    !installHelp ||
    !installInstructions
  ){
    return;
  }


  if(isTikTokBrowser()){

    installInstructions.textContent=
      'You are viewing MQ3 inside TikTok. Open the browser menu, choose Open in browser or Open in Chrome, then tap Install MQ3 again.';

  }else if(isFacebookBrowser()){

    installInstructions.textContent=
      'You are viewing MQ3 inside Facebook. Open the browser menu and choose Open in external browser or Open in Chrome, then tap Install MQ3 again.';

  }else if(isInstagramBrowser()){

    installInstructions.textContent=
      'You are viewing MQ3 inside Instagram. Open the browser menu and choose Open in external browser, then tap Install MQ3 again.';

  }else if(isAppleDevice()){

    installInstructions.textContent=
      'Open MQ3 in Safari. Tap Share, choose Add to Home Screen, keep Open as Web App enabled if shown, then tap Add.';

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


/* =========================================================
   NATIVE INSTALL EVENT
========================================================= */

window.addEventListener(
  'beforeinstallprompt',
  event=>{

    event.preventDefault();

    installPrompt=
      event;

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


/* =========================================================
   INSTALL BUTTON CLICK
========================================================= */

if(installButton){

  installButton.addEventListener(
    'click',
    async()=>{

      /*
       * Already running as installed MQ3.
       */
      if(isInstalled()){

        updateInstallButton();

        return;

      }


      /*
       * TikTok / Facebook / Instagram
       * often block the native PWA prompt.
       */
      if(isInAppBrowser()){

        showInstallHelp();

        return;

      }


      /*
       * Chrome / supported Chromium browser:
       * show the real native installer.
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


        updateInstallButton();

        return;

      }


      /*
       * Safari or browser where native
       * beforeinstallprompt is unavailable.
       */
      showInstallHelp();

    }
  );

}


/* =========================================================
   INSTALL HELP CLOSE BUTTON
========================================================= */

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


/* =========================================================
   DISPLAY MODE CHANGES
========================================================= */

const standaloneQuery=
  window.matchMedia(
    '(display-mode: standalone)'
  );


if(
  typeof standaloneQuery
    .addEventListener===
  'function'
){

  standaloneQuery
    .addEventListener(
      'change',
      updateInstallButton
    );

}


window.addEventListener(
  'pageshow',
  updateInstallButton
);


window.addEventListener(
  'focus',
  updateInstallButton
);


/* =========================================================
   INITIALIZE
========================================================= */

addInstallStyles();

updateInstallButton();


/* =========================================================
   SERVICE WORKER
========================================================= */

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
