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

  return /TikTok|musical_ly|Bytedance|BytedanceWebview|Aweme|trill/i.test(
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
    isInstagramBrowser() || /;\s*wv\)/i.test(navigator.userAgent)

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


  const embedded=isInAppBrowser();
  const apple=isAppleDevice();
  const android=/Android/i.test(navigator.userAgent);
  const browserName=apple ? 'Safari' : android ? 'Chrome' : 'your regular browser';
  if(embedded){
    installInstructions.textContent=`To install MQ3, open it in ${browserName} first. Tap the ••• menu at the top of this app and choose Open in browser (if offered). If you cannot find it, copy the link below and paste it into ${browserName}. Then choose ${apple ? 'Share → Add to Home Screen' : 'Install app or Add to Home screen from the browser menu'}.`;
  }else if(apple){
    installInstructions.textContent='Open MQ3 in Safari. Tap Share → Add to Home Screen, then Add. If this page is inside TikTok, Facebook or Instagram, use its ••• menu to open in your browser, or copy the link below into Safari.';
  }else{
    installInstructions.textContent='In Chrome or another supported browser, open the menu and choose Install app or Add to Home screen if offered. Inside TikTok, Facebook or Instagram? Use the ••• menu → Open in browser, or copy the link below and paste it into Chrome first.';
  }

  let tools=document.getElementById('mq3-install-tools');
  if(!tools){
    tools=document.createElement('div');
    tools.id='mq3-install-tools';
    tools.style.cssText='display:grid;gap:12px;margin:18px 0;';
    const label=document.createElement('label');
    label.textContent='MQ3 website link';
    label.htmlFor='mq3-install-link';
    const link=document.createElement('input');
    link.id='mq3-install-link';link.readOnly=true;link.type='text';
    link.style.cssText='width:100%;box-sizing:border-box;font-size:16px;';
    // Share only the home page; never forward payment tokens or private access links.
    const home=new URL('/',location.href);
    if(['mq3music.com','www.mq3music.com','mq3music-sable.vercel.app'].includes(home.hostname)) home.href='https://www.mq3music.com/';
    link.value=home.href;
    link.addEventListener('click',()=>link.select());
    const copy=document.createElement('button');
    copy.type='button';copy.className='button primary';copy.textContent='Copy MQ3 link';
    copy.style.cssText='min-height:48px;background:linear-gradient(120deg,#fae1a8,#d7a24c);color:#241708;font-weight:700;';
    const status=document.createElement('p');status.id='mq3-install-copy-status';status.setAttribute('role','status');status.style.cssText='font-size:14px;line-height:1.5;margin:0;';
    copy.onclick=async()=>{
      try { await navigator.clipboard.writeText(link.value);status.textContent=`Link copied. Open ${browserName} and paste it in the address bar.`; }
      catch { link.focus();link.select();link.setSelectionRange(0,link.value.length);status.textContent='Press and hold the selected link, choose Copy, then paste it into your browser.'; }
    };
    tools.append(label,link,copy);
    if(android){
      const open=document.createElement('a');
      open.className='button';open.textContent='Try opening Chrome';
      open.href=`intent://${home.host}/#Intent;scheme=${home.protocol.slice(0,-1)};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(home.href)};end`;
      open.onclick=()=>{status.textContent='If Chrome does not open, use the ••• menu above or copy the MQ3 link into Chrome.';};
      tools.append(open);
    }
    tools.append(status);
    installInstructions.insertAdjacentElement('afterend',tools);
  }

  if(
    typeof installHelp.showModal===
    'function'
  ){

    if(!installHelp.open) installHelp.showModal();

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
