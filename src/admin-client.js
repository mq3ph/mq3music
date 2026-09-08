import {upload} from '@vercel/blob/client';

const $=id=>document.getElementById(id);

const cats=[
  'NAME SONGS',
  'INSPIRATIONAL SONGS',
  'OPM',
  'ORIGINAL SONGS'
];

let tab='Name Request';
let songs=[];
let requests=[];
let orders=[];
let creditLoads=[];

/*
  Keeps the currently edited song.
  Used to preserve existing metadata that is no longer
  displayed in the upload form, such as its old price.
*/
let editingSong=null;


const message=t=>{
  $('admin-message').textContent=t||'';
};


async function api(path,body,method){

  const resolvedMethod=
    method||
    (body?'POST':'GET');

  const r=await fetch(path,{
    method:resolvedMethod,
    headers:body
      ?{'Content-Type':'application/json'}
      :{},
    body:body
      ?JSON.stringify(body)
      :undefined
  });

  const data=await r.json();

  if(!r.ok){

    if(r.status===401){
      $('dashboard').classList.add('hidden');
      $('login-panel').classList.remove('hidden');
    }

    throw Error(
      data.error||
      'Request failed.'
    );
  }

  return data;
}


function node(tag,value,cls){

  const e=
    document.createElement(tag);

  if(value!==undefined){
    e.textContent=value;
  }

  if(cls){
    e.className=cls;
  }

  return e;
}


function button(label,action){

  const b=
    node(
      'button',
      label,
      'button'
    );

  b.type='button';

  b.onclick=async()=>{

    b.disabled=true;

    try{

      await action();

    }catch(e){

      message(e.message);

    }finally{

      b.disabled=false;
    }
  };

  return b;
}


function badge(value){

  return node(
    'span',
    value,
    'badge '+value
  );
}


function actions(...items){

  const e=node('div');

  e.style.display='flex';
  e.style.alignItems='center';
  e.style.gap='8px';
  e.style.flexWrap='wrap';

  e.append(...items);

  return e;
}


/* =========================================================
   MQ3 DELETE CONFIRMATION MODAL
========================================================= */

function showDeleteConfirm(title){

  if(
    !document.getElementById(
      'mq3-delete-modal-style'
    )
  ){

    const style=
      document.createElement(
        'style'
      );

    style.id=
      'mq3-delete-modal-style';

    style.textContent=`
      .mq3-delete-modal{
        width:min(92vw,460px);
        border:1px solid rgba(232,184,91,.55);
        border-radius:22px;
        padding:0;
        color:#f8e7bd;
        background:
          radial-gradient(circle at top right,rgba(130,56,30,.24),transparent 42%),
          linear-gradient(180deg,#240706 0%,#120504 100%);
        box-shadow:
          0 28px 80px rgba(0,0,0,.62),
          inset 0 1px 0 rgba(255,255,255,.04);
      }

      .mq3-delete-modal::backdrop{
        background:rgba(0,0,0,.74);
        backdrop-filter:blur(3px);
      }

      .mq3-delete-wrap{
        padding:28px;
      }

      .mq3-delete-kicker{
        margin:0 0 10px;
        color:#e8b85b;
        font-size:12px;
        font-weight:800;
        letter-spacing:.18em;
        text-transform:uppercase;
      }

      .mq3-delete-title{
        margin:0;
        color:#ffe6a6;
        font-family:Georgia,serif;
        font-size:26px;
        line-height:1.2;
      }

      .mq3-delete-copy{
        margin:14px 0 0;
        color:#d9c8b0;
        font-size:14px;
        line-height:1.65;
      }

      .mq3-delete-song{
        color:#fff0c5;
        font-weight:800;
      }

      .mq3-delete-actions{
        display:flex;
        justify-content:flex-end;
        gap:12px;
        margin-top:26px;
        flex-wrap:wrap;
      }

      .mq3-delete-cancel,
      .mq3-delete-danger{
        min-width:120px;
        border-radius:999px;
        padding:12px 18px;
        font:inherit;
        font-weight:800;
        cursor:pointer;
      }

      .mq3-delete-cancel{
        border:1px solid rgba(232,184,91,.5);
        color:#f8e7bd;
        background:transparent;
      }

      .mq3-delete-danger{
        border:1px solid #d9634c;
        color:#fff8ef;
        background:linear-gradient(180deg,#a62f26,#751d18);
        box-shadow:0 8px 20px rgba(129,28,22,.28);
      }

      .mq3-delete-cancel:hover{
        background:rgba(232,184,91,.08);
      }

      .mq3-delete-danger:hover{
        filter:brightness(1.08);
      }

      .mq3-delete-cancel:focus-visible,
      .mq3-delete-danger:focus-visible{
        outline:2px solid #f2c86d;
        outline-offset:3px;
      }

      @media(max-width:520px){
        .mq3-delete-wrap{
          padding:24px 20px 20px;
        }

        .mq3-delete-actions{
          display:grid;
          grid-template-columns:1fr 1fr;
        }

        .mq3-delete-cancel,
        .mq3-delete-danger{
          min-width:0;
          width:100%;
        }
      }
    `;

    document.head.append(style);
  }


  return new Promise(
    resolve=>{

      const dialog=
        document.createElement(
          'dialog'
        );

      dialog.className=
        'mq3-delete-modal';


      const wrap=
        node(
          'div',
          undefined,
          'mq3-delete-wrap'
        );


      const kicker=
        node(
          'p',
          'MQ3 MUSIC',
          'mq3-delete-kicker'
        );


      const heading=
        node(
          'h2',
          'Delete this song?',
          'mq3-delete-title'
        );


      const copy=
        node(
          'p',
          undefined,
          'mq3-delete-copy'
        );


      const songName=
        node(
          'span',
          `"${title}"`,
          'mq3-delete-song'
        );


      copy.append(
        'You are about to permanently delete ',
        songName,
        '. This will remove the song record and its stored audio. This action cannot be undone.'
      );


      const buttons=
        node(
          'div',
          undefined,
          'mq3-delete-actions'
        );


      const cancel=
        node(
          'button',
          'Cancel',
          'mq3-delete-cancel'
        );

      cancel.type='button';


      const remove=
        node(
          'button',
          'Delete Song',
          'mq3-delete-danger'
        );

      remove.type='button';


      buttons.append(
        cancel,
        remove
      );


      wrap.append(
        kicker,
        heading,
        copy,
        buttons
      );


      dialog.append(
        wrap
      );


      document.body.append(
        dialog
      );


      let settled=false;


      const finish=value=>{

        if(settled){
          return;
        }

        settled=true;

        if(dialog.open){
          dialog.close();
        }

        dialog.remove();

        resolve(value);
      };


      cancel.onclick=
        ()=>finish(false);


      remove.onclick=
        ()=>finish(true);


      dialog.addEventListener(
        'cancel',
        e=>{

          e.preventDefault();

          finish(false);
        }
      );


      dialog.addEventListener(
        'click',
        e=>{

          if(e.target===dialog){

            finish(false);
          }
        }
      );


      dialog.showModal();

      cancel.focus();
    }
  );
}


const money=n=>
  '₱'+
  (
    Number(n||0)/100
  ).toFixed(2);


const date=v=>
  v
    ?new Date(v).toLocaleString()
    :'—';


/* =========================================================
   AUDIO DURATION
========================================================= */

function formatDuration(seconds){

  const n=
    Number(seconds);

  if(
    !Number.isFinite(n)||
    n<=0
  ){
    return '—';
  }

  const total=
    Math.round(n);

  return (
    Math.floor(total/60)+
    ':'+
    String(total%60)
      .padStart(2,'0')
  );
}


function readAudioDuration(file){

  return new Promise(
    (resolve,reject)=>{

      const audio=
        document.createElement(
          'audio'
        );

      const objectUrl=
        URL.createObjectURL(
          file
        );

      const done=()=>{

        URL.revokeObjectURL(
          objectUrl
        );
      };

      audio.preload='metadata';

      audio.onloadedmetadata=()=>{

        const value=
          audio.duration;

        done();

        if(
          Number.isFinite(value)&&
          value>0
        ){

          resolve(
            Math.round(value)
          );

        }else{

          reject(
            Error(
              'Could not read MP3 duration.'
            )
          );
        }
      };

      audio.onerror=()=>{

        done();

        reject(
          Error(
            'Could not read MP3 duration.'
          )
        );
      };

      audio.src=
        objectUrl;
    }
  );
}


/* =========================================================
   EMBEDDED MP3 LYRICS
========================================================= */

function syncSafeInt(
  bytes,
  offset
){

  return (
    (bytes[offset]&0x7f)*2097152+
    (bytes[offset+1]&0x7f)*16384+
    (bytes[offset+2]&0x7f)*128+
    (bytes[offset+3]&0x7f)
  );
}


function uint32be(
  bytes,
  offset
){

  return (
    bytes[offset]*16777216+
    bytes[offset+1]*65536+
    bytes[offset+2]*256+
    bytes[offset+3]
  );
}


function decodeId3Text(
  bytes,
  encoding
){

  if(
    !bytes||
    !bytes.length
  ){
    return '';
  }

  try{

    if(encoding===0){

      return new TextDecoder(
        'windows-1252'
      )
        .decode(bytes)
        .replace(/\0/g,'')
        .trim();
    }

    if(encoding===3){

      return new TextDecoder(
        'utf-8'
      )
        .decode(bytes)
        .replace(/\0/g,'')
        .trim();
    }

    if(
      encoding===1||
      encoding===2
    ){

      let littleEndian=false;
      let start=0;

      if(
        encoding===1&&
        bytes.length>=2
      ){

        if(
          bytes[0]===0xff&&
          bytes[1]===0xfe
        ){

          littleEndian=true;
          start=2;

        }else if(
          bytes[0]===0xfe&&
          bytes[1]===0xff
        ){

          start=2;
        }
      }

      let view=
        bytes.slice(start);

      if(view.length%2){

        view=
          view.slice(
            0,
            -1
          );
      }

      let text='';

      for(
        let i=0;
        i<view.length;
        i+=2
      ){

        const code=
          littleEndian
            ?view[i]|
              (view[i+1]<<8)
            :(view[i]<<8)|
              view[i+1];

        if(code){

          text+=
            String.fromCharCode(
              code
            );
        }
      }

      return text.trim();
    }

  }catch{}

  return '';
}


function termLen(encoding){

  return (
    encoding===1||
    encoding===2
  )
    ?2
    :1;
}


function findTerm(
  bytes,
  start,
  encoding
){

  if(
    termLen(encoding)===1
  ){

    for(
      let i=start;
      i<bytes.length;
      i++
    ){

      if(bytes[i]===0){
        return i;
      }
    }

    return bytes.length;
  }

  for(
    let i=start;
    i+1<bytes.length;
    i+=2
  ){

    if(
      bytes[i]===0&&
      bytes[i+1]===0
    ){

      return i;
    }
  }

  return bytes.length;
}


function lyricsFromFrame(
  id,
  data
){

  if(
    !data||
    !data.length
  ){
    return '';
  }


  if(id==='USLT'){

    const encoding=
      data[0];

    const end=
      findTerm(
        data,
        4,
        encoding
      );

    const pos=
      Math.min(
        data.length,
        end+
          termLen(encoding)
      );

    return decodeId3Text(
      data.slice(pos),
      encoding
    );
  }


  if(id==='TXXX'){

    const encoding=
      data[0];

    const end=
      findTerm(
        data,
        1,
        encoding
      );

    const description=
      decodeId3Text(
        data.slice(
          1,
          end
        ),
        encoding
      ).toLowerCase();

    const pos=
      Math.min(
        data.length,
        end+
          termLen(encoding)
      );

    if(
      description.includes(
        'lyric'
      )
    ){

      return decodeId3Text(
        data.slice(pos),
        encoding
      );
    }
  }

  return '';
}


async function readEmbeddedLyrics(file){

  try{

    const header=
      new Uint8Array(
        await file
          .slice(0,10)
          .arrayBuffer()
      );

    if(
      header.length<10||
      String.fromCharCode(
        ...header.slice(0,3)
      )!=='ID3'
    ){
      return '';
    }

    const version=
      header[3];

    if(
      version!==3&&
      version!==4
    ){
      return '';
    }

    const tagSize=
      syncSafeInt(
        header,
        6
      );

    const bytes=
      new Uint8Array(
        await file
          .slice(
            0,
            Math.min(
              file.size,
              10+tagSize
            )
          )
          .arrayBuffer()
      );

    let pos=10;

    while(
      pos+10<=bytes.length
    ){

      const id=
        String.fromCharCode(
          ...bytes.slice(
            pos,
            pos+4
          )
        );

      if(
        !/^[A-Z0-9]{4}$/
          .test(id)
      ){
        break;
      }

      const size=
        version===4
          ?syncSafeInt(
              bytes,
              pos+4
            )
          :uint32be(
              bytes,
              pos+4
            );

      if(
        !size||
        pos+10+size>
          bytes.length
      ){
        break;
      }

      if(
        id==='USLT'||
        id==='TXXX'
      ){

        const found=
          lyricsFromFrame(
            id,
            bytes.slice(
              pos+10,
              pos+10+size
            )
          );

        if(found){

          return found.slice(
            0,
            30000
          );
        }
      }

      pos+=10+size;
    }

  }catch{}

  return '';
}


/* =========================================================
   NAME REQUEST MATCHING
========================================================= */

function normalizeName(value){

  return String(
    value||''
  )
    .trim()
    .toLowerCase()
    .replace(
      /\s+/g,
      ' '
    );
}


function findMatchingNameSong(request){

  const wanted=
    normalizeName(
      request.name
    );

  if(!wanted){
    return null;
  }

  return songs.find(
    song=>{

      if(
        song.category!==
          'NAME SONGS'||
        !song.published||
        !song.audio_path
      ){
        return false;
      }

      const names=
        String(
          song.names||''
        )
          .split(
            /[,;\n]/
          )
          .map(
            normalizeName
          )
          .filter(Boolean);

      return names.includes(
        wanted
      );
    }
  )||null;
}


/* =========================================================
   LOAD
========================================================= */

async function load(){

  [
    songs,
    requests,
    orders,
    creditLoads
  ]=await Promise.all([

    api(
      '/api/admin/songs'
    ),

    api(
      '/api/admin/requests'
    ),

    api(
      '/api/admin/orders'
    ),

    api(
      '/api/admin/credit-loads'
    )
  ]);

  render();
}


/* =========================================================
   LOGIN
========================================================= */

async function enter(){

  const session=
    await api(
      '/api/admin/session'
    );

  $('login-panel')
    .classList
    .add('hidden');

  $('dashboard')
    .classList
    .remove('hidden');

  $('setup').textContent=
    Object.entries(
      session.setup
    )
      .map(
        ([k,v])=>
          `${k}: ${
            v
              ?'configured'
              :'needs setup'
          }`
      )
      .join(' · ');

  await load();
}


$('login').onsubmit=
  async e=>{

    e.preventDefault();

    const b=
      e.submitter;

    b.disabled=true;

    try{

      await api(
        '/api/login',
        {
          password:
            $('password').value
        }
      );

      $('password').value='';

      message('');

      await enter();

    }catch(e){

      message(
        e.message
      );

    }finally{

      b.disabled=false;
    }
  };


$('logout').onclick=
  async()=>{

    try{

      await api(
        '/api/logout',
        {}
      );

      location.reload();

    }catch(e){

      message(
        e.message
      );
    }
  };


/* =========================================================
   TABS
========================================================= */

for(
  const name of [
    'Name Request',
    ...cats,
    'GCash',
    'PayPal',
    '🪙 Credit Loads'
  ]
){

  const b=
    button(
      name,
      ()=>{

        tab=name;

        $('admin-search')
          .value='';

        render();
      }
    );

  $('tabs').append(b);
}


for(const c of cats){

  const o=
    node(
      'option',
      c
    );

  o.value=c;

  $('song-category')
    .append(o);
}


$('admin-search')
  .oninput=
  render;


/* =========================================================
   TABLE HELPERS
========================================================= */

function table(headers){

  const t=
    node('table');

  const head=
    node('thead');

  const hr=
    node('tr');

  headers.forEach(
    h=>
      hr.append(
        node(
          'th',
          h
        )
      )
  );

  head.append(hr);

  t.append(head);

  const body=
    node('tbody');

  t.append(body);

  $('records')
    .replaceChildren(t);

  return body;
}


function row(
  body,
  values
){

  const tr=
    node('tr');

  values.forEach(
    v=>{

      const td=
        node('td');

      if(
        v instanceof Node
      ){

        td.append(v);

      }else{

        td.textContent=
          v??'—';
      }

      tr.append(td);
    }
  );

  body.append(tr);
}


/* =========================================================
   NAME REQUEST EMAIL
========================================================= */

async function sendRequestMessage(
  request,
  song
){

  if(
    !confirm(
      `Send song availability message to ${request.email}?\n\nSong: ${song.title}`
    )
  ){
    return;
  }

  if(
    request.song_id!==song.id||
    request.status!=='available'
  ){

    await api(
      `/api/admin/requests/${request.id}`,
      {
        status:'available',
        songId:song.id
      }
    );
  }

  await api(
    `/api/admin/requests/${request.id}/notify`,
    {}
  );

  message(
    `Message sent to ${request.email}.`
  );

  await load();
}


/* =========================================================
   RECORD TITLE
========================================================= */

function categoryLabel(category){

  if(category==='NAME SONGS'){
    return 'Name Songs';
  }

  if(
    category===
      'INSPIRATIONAL SONGS'
  ){
    return 'Inspirational Songs';
  }

  if(
    category===
      'ORIGINAL SONGS'
  ){
    return 'Original Songs';
  }

  return 'OPM';
}


function setRecordsTitle(){

  const title=
    $('records-title');

  if(!title){
    return;
  }

  if(
    tab==='Name Request'
  ){

    title.textContent=
      'Name Requests';

  }else if(
    cats.includes(tab)
  ){

    const total=
      songs.filter(
        s=>
          s.category===tab
      ).length;

    title.textContent=
      `${categoryLabel(tab)} · ${total} song${total===1?'':'s'}`;

  }else if(
    tab==='🪙 Credit Loads'
  ){

    const pending=
      creditLoads.filter(
        creditLoad=>
          creditLoad.status==='pending'
      ).length;

    title.textContent=
      `Credit Loads · ${pending} pending`;

  }else{

    title.textContent=
      tab+' Payments';
  }
}


/* =========================================================
   RENDER
========================================================= */

function render(){

  [...$('tabs').children]
    .forEach(
      b=>{

        const active=
          b.textContent===tab;

        b.classList.toggle(
          'active',
          active
        );

        b.setAttribute(
          'aria-pressed',
          String(active)
        );
      }
    );


  $('new-song')
    .classList.toggle(
      'hidden',
      !cats.includes(tab)
    );


  const paid=
    orders.filter(
      o=>
        o.status==='paid'
    );


  $('summary').textContent=

    `${songs.length} songs · `+

    `${requests.filter(
      r=>
        r.status!=='notified'
    ).length} pending name requests · `+

    `${paid.length} verified payments · `+

    `${money(
      paid.reduce(
        (n,o)=>
          n+o.amount,
        0
      )
    )} verified revenue`;


  const search=
    $('admin-search')
      .value
      .toLowerCase();


  const match=
    o=>
      JSON.stringify(o)
        .toLowerCase()
        .includes(search);


  setRecordsTitle();

  $('tab-note')
    .textContent='';


  if(
    cats.includes(tab)
  ){

    $('tab-note').textContent=

      tab==='ORIGINAL SONGS'
        ?'Lyrics & melodies: MQ3. Music & voice: assisted by Suno.'
        :'Lyrics: AI-generated. Music: generated with Suno. Curated by MQ3.';


    const body=
      table([
        '#',
        tab==='NAME SONGS'
          ?'Name'
          :'Title',
        'Lyrics',
        'Full Length',
        'Views',
        'Audio',
        'Actions'
      ]);


    const list=
      songs

        .filter(
          s=>
            s.category===tab&&
            match(s)
        )

        .sort(
          (a,b)=>
            String(
              a.title||''
            )
              .localeCompare(
                String(
                  b.title||''
                ),
                undefined,
                {
                  sensitivity:'base',
                  numeric:true
                }
              )
        );


    list.forEach(
      (s,index)=>{

        row(
          body,
          [
            index+1,

            s.title,

            button(
              'Edit Lyrics',
              ()=>editSong(s)
            ),

            formatDuration(
              s.duration_seconds
            ),

            Number(
              s.views||0
            ).toLocaleString(),

            button(
              'Replace',
              ()=>replaceAudio(s)
            ),

            button(
              'Delete',
              ()=>deleteSong(s)
            )
          ]
        );
      }
    );


  }else if(
    tab==='Name Request'
  ){

    const body=
      table([
        'Date',
        'Name',
        'Email',
        'Status'
      ]);


    requests
      .filter(match)
      .forEach(
        r=>{

          let song=
            findMatchingNameSong(r);


          if(
            !song&&
            r.song_id
          ){

            song=
              songs.find(
                s=>

                  s.id===r.song_id&&
                  s.category==='NAME SONGS'&&
                  s.published&&
                  s.audio_path
              )||null;
          }


          const visibleStatus=
            r.status==='notified'
              ?'notified'
              :'pending';


          const items=[
            badge(
              visibleStatus
            )
          ];


          if(song){

            items.push(
              button(
                'Message',
                ()=>
                  sendRequestMessage(
                    r,
                    song
                  )
              )
            );
          }


          row(
            body,
            [
              date(
                r.created_at
              ),

              r.name,

              r.email,

              actions(
                ...items
              )
            ]
          );
        }
      );


  }else if(
    tab==='🪙 Credit Loads'
  ){

    $('tab-note').textContent=
      'Manual verification: confirm the exact payment and reference in your actual GCash/PayPal account before approving. Approving adds purchased Credits to the listener wallet.';

    const body=
      table([
        'Date',
        'Listener',
        'Email',
        'Amount',
        'Credits',
        'Payment',
        'Reference',
        'Status',
        'Actions'
      ]);


    creditLoads

      .filter(match)

      .forEach(
        creditLoad=>{

          const buttons=[];


          if(
            creditLoad.status==='pending'
          ){

            buttons.push(

              button(
                'Approve',
                async()=>{

                  if(
                    !confirm(
                      `Have you independently verified ₱${Number(creditLoad.amountPesos||0).toLocaleString()} and reference ${creditLoad.paymentReference||'—'} in your ${String(creditLoad.paymentProvider||'payment').toUpperCase()} account?\n\nApprove ${Number(creditLoad.credits||0).toLocaleString()} Credits for ${creditLoad.displayName||creditLoad.email}?`
                    )
                  ){
                    return;
                  }


                  const result=
                    await api(
                      `/api/admin/credit-loads/${creditLoad.id}/review`,
                      {
                        status:'approved',
                        verified:true
                      }
                    );


                  message(
                    `${Number(result.creditsAdded||creditLoad.credits||0).toLocaleString()} Credits approved for ${creditLoad.displayName||creditLoad.email}.`
                  );


                  await load();
                }
              ),


              button(
                'Reject',
                async()=>{

                  if(
                    !confirm(
                      `Reject this Credit Load?\n\n${creditLoad.displayName||creditLoad.email} · ₱${Number(creditLoad.amountPesos||0).toLocaleString()} · ${creditLoad.paymentReference||'No reference'}`
                    )
                  ){
                    return;
                  }


                  await api(
                    `/api/admin/credit-loads/${creditLoad.id}/review`,
                    {
                      status:'rejected'
                    }
                  );


                  message(
                    `Credit Load rejected for ${creditLoad.displayName||creditLoad.email}.`
                  );


                  await load();
                }
              )
            );
          }


          row(
            body,
            [
              date(
                creditLoad.createdAt
              ),

              creditLoad.displayName||
                '—',

              creditLoad.email,

              '₱'+
                Number(
                  creditLoad.amountPesos||
                  0
                ).toLocaleString(),

              Number(
                creditLoad.credits||
                0
              ).toLocaleString(),

              String(
                creditLoad.paymentProvider||
                ''
              ).toUpperCase()||
                '—',

              creditLoad.paymentReference||
                '—',

              badge(
                creditLoad.status
              ),

              actions(
                ...buttons
              )
            ]
          );
        }
      );


  }else{

    $('tab-note').textContent=
      'Manual verification: check the actual amount and transaction reference in your GCash/PayPal account before approving. Membership access is fixed-term and does not auto-renew.';


    const body=
      table([
        'Date',
        'Email',
        'Package',
        'Amount',
        'Reference',
        'Status',
        'Access until',
        'Actions'
      ]);


    orders

      .filter(
        o=>
          o.provider===
            tab.toLowerCase()&&
          match(o)
      )

      .forEach(
        o=>{

          const buttons=[];


          if(
            o.status==='submitted'
          ){

            buttons.push(

              button(
                'Verify paid',
                async()=>{

                  if(
                    !confirm(
                      `Have you independently verified ${money(o.amount)} and reference ${o.reference} in your ${tab} account?`
                    )
                  ){
                    return;
                  }

                  await api(
                    `/api/admin/orders/${o.id}/review`,
                    {
                      status:'paid',
                      verified:true
                    }
                  );

                  await load();
                }
              ),


              button(
                'Reject',
                async()=>{

                  await api(
                    `/api/admin/orders/${o.id}/review`,
                    {
                      status:'rejected'
                    }
                  );

                  await load();
                }
              )
            );
          }


          if(
            o.status==='paid'
          ){

            buttons.push(

              button(
                'Email access link',
                async()=>{

                  if(
                    !confirm(
                      `Send a private access link to ${o.email}?`
                    )
                  ){
                    return;
                  }

                  await api(
                    `/api/admin/orders/${o.id}/email`,
                    {}
                  );

                  message(
                    'Access email accepted for delivery.'
                  );
                }
              )
            );
          }


          row(
            body,
            [

              date(
                o.created_at
              ),

              o.email,

              o.kind==='membership'
                ?'Membership'
                :songs.find(
                    s=>
                      s.id===o.song_id
                  )?.title||
                  'Song',

              money(
                o.amount
              ),

              o.reference,

              badge(
                o.status
              ),

              date(
                o.expires_at
              ),

              actions(
                ...buttons
              )
            ]
          );
        }
      );
  }


  const tbody=
    $('records')
      .querySelector(
        'tbody'
      );


  if(
    tbody&&
    !tbody.children.length
  ){

    const tr=
      node('tr');

    const td=
      node(
        'td',
        'No records in this tab yet.'
      );

    td.colSpan=12;

    tr.append(td);

    tbody.append(tr);
  }
}


/* =========================================================
   DELETE SONG
========================================================= */

async function deleteSong(s){

  const approved=
    await showDeleteConfirm(
      s.title
    );


  if(!approved){
    return;
  }


  const result=
    await api(
      `/api/admin/songs/${s.id}`,
      undefined,
      'DELETE'
    );


  message(
    result.warning||
    `${s.title} deleted.`
  );


  await load();
}


/* =========================================================
   REPLACE FULL AUDIO
========================================================= */

async function replaceAudio(s){

  const input=
    document.createElement(
      'input'
    );

  input.type='file';

  input.accept=
    '.mp3,audio/mpeg';


  input.onchange=
    async()=>{

      const file=
        input.files?.[0];

      if(!file){
        return;
      }


      if(
        !file.name
          .toLowerCase()
          .endsWith('.mp3')||
        !file.size||
        file.size>
          100*1024*1024
      ){

        message(
          'Choose a non-empty MP3 smaller than 100 MB.'
        );

        return;
      }


      if(
        !confirm(
          `Replace the full audio for ${s.title}?`
        )
      ){
        return;
      }


      try{

        const durationSeconds=
          await readAudioDuration(
            file
          );


        const embeddedLyrics=
          !String(
            s.lyrics||''
          ).trim()

            ?await readEmbeddedLyrics(
                file
              )

            :'';


        const ticket=
          await api(
            '/api/admin/upload-ticket',
            {
              songId:s.id,
              kind:'audio'
            }
          );


        await upload(
          ticket.pathname,
          file,
          {
            access:'private',
            contentType:'audio/mpeg',
            handleUploadUrl:
              '/api/blob/upload',
            clientPayload:
              ticket.id,
            multipart:true,

            onUploadProgress:
              p=>
                message(
                  `Replacing ${s.title}: ${Math.round(p.percentage)}%`
                )
          }
        );


        await api(
          '/api/admin/upload-finish',
          {
            ticket:
              ticket.id
          }
        );


        await api(
          '/api/admin/songs',
          {
            id:s.id,
            title:s.title,
            category:s.category,
            names:s.names||'',
            lyrics:
              embeddedLyrics||
              s.lyrics||
              '',
            price:
              Number(
                s.price||0
              ),
            published:
              !!s.published,
            duration_seconds:
              durationSeconds
          }
        );


        message(
          'Audio replaced successfully.'
        );


        await load();


      }catch(e){

        message(
          e.message
        );
      }
    };


  input.click();
}


/* =========================================================
   SONG EDITOR
========================================================= */

function editSong(s={}){

  editingSong=
    s&&s.id
      ?s
      :null;


  $('song-form')
    .reset();


  $('song-id').value=
    s.id||'';


  $('song-title').value=
    s.title||'';


  $('song-category').value=
    s.category||tab;


  $('song-names').value=
    s.names||'';


  $('song-lyrics').value=
    s.lyrics||'';


  $('song-published').checked=
    !!s.published;


  $('upload-progress').textContent=

    s.audio_path
      ?'Existing full audio retained unless you choose a replacement.'
      :'';


  $('editor')
    .showModal();
}


$('new-song').onclick=
  ()=>editSong();


$('cancel-editor').onclick=
  ()=>{

    editingSong=null;

    $('editor')
      .close();
  };


/* =========================================================
   AUTO DURATION + EMBEDDED LYRICS
========================================================= */

$('full-file').onchange=
  async()=>{

    const file=
      $('full-file')
        .files[0];


    if(!file){
      return;
    }


    try{

      const seconds=
        await readAudioDuration(
          file
        );


      $('upload-progress').textContent=
        `Detected full length: ${formatDuration(seconds)}`;


      if(
        !$('song-lyrics')
          .value
          .trim()
      ){

        const embeddedLyrics=
          await readEmbeddedLyrics(
            file
          );


        if(
          embeddedLyrics
        ){

          $('song-lyrics').value=
            embeddedLyrics;


          $('upload-progress').textContent+=
            ' · Embedded lyrics found and filled automatically. You can still edit them.';
        }
      }


    }catch(e){

      $('upload-progress').textContent=
        e.message;
    }
  };


/* =========================================================
   SAVE SONG
========================================================= */

$('song-form').onsubmit=
  async e=>{

    e.preventDefault();


    const save=
      $('save-song');


    save.disabled=true;


    $('cancel-editor')
      .disabled=true;


    try{

      const fullFile=
        $('full-file')
          .files[0];


      if(
        fullFile&&
        (
          !fullFile.name
            .toLowerCase()
            .endsWith('.mp3')||
          !fullFile.size||
          fullFile.size>
            100*1024*1024
        )
      ){

        throw Error(
          'Choose a non-empty MP3 smaller than 100 MB.'
        );
      }


      const durationSeconds=
        fullFile
          ?await readAudioDuration(
              fullFile
            )
          :null;


      if(
        fullFile&&
        !$('song-lyrics')
          .value
          .trim()
      ){

        const embeddedLyrics=
          await readEmbeddedLyrics(
            fullFile
          );


        if(
          embeddedLyrics
        ){

          $('song-lyrics').value=
            embeddedLyrics;
        }
      }


      const preservedPrice=
        editingSong
          ?Number(
              editingSong.price||0
            )
          :0;


      const data={

        id:
          $('song-id').value||
          undefined,

        title:
          $('song-title').value,

        category:
          $('song-category').value,

        names:
          $('song-names').value,

        lyrics:
          $('song-lyrics').value,

        price:
          preservedPrice,

        published:false,

        duration_seconds:
          durationSeconds
      };


      const saved=
        await api(
          '/api/admin/songs',
          data
        );


      $('song-id').value=
        saved.id;


      data.id=
        saved.id;


      if(fullFile){

        const ticket=
          await api(
            '/api/admin/upload-ticket',
            {
              songId:
                saved.id,

              kind:'audio'
            }
          );


        await upload(
          ticket.pathname,
          fullFile,
          {
            access:'private',

            contentType:
              'audio/mpeg',

            handleUploadUrl:
              '/api/blob/upload',

            clientPayload:
              ticket.id,

            multipart:true,

            onUploadProgress:
              p=>{

                $('upload-progress').textContent=
                  `Uploading audio: ${Math.round(p.percentage)}%`;
              }
          }
        );


        await api(
          '/api/admin/upload-finish',
          {
            ticket:
              ticket.id
          }
        );
      }


      await api(
        '/api/admin/songs',
        {
          ...data,

          published:
            $('song-published')
              .checked
        }
      );


      editingSong=null;


      $('editor')
        .close();


      message(
        'Song saved.'
      );


      await load();


    }catch(e){

      $('upload-progress').textContent=

        e.message+
        ' Saved metadata remains as a draft. Retry or edit it from its category.';


      message(
        e.message
      );


    }finally{

      save.disabled=false;


      $('cancel-editor')
        .disabled=false;
    }
  };


/* =========================================================
   OLD REQUEST EDITOR
========================================================= */

function editRequest(r){

  $('request-id').value=
    r.id;


  $('request-status').value=

    r.status==='notified'
      ?'available'
      :r.status;


  $('request-song')
    .replaceChildren();


  const blank=
    node(
      'option',
      'Choose a song'
    );


  blank.value='';


  $('request-song')
    .append(blank);


  songs

    .filter(
      s=>
        s.category==='NAME SONGS'&&
        s.published&&
        s.audio_path
    )

    .sort(
      (a,b)=>

        String(
          a.title
        )
          .localeCompare(
            String(
              b.title
            ),
            undefined,
            {
              sensitivity:'base'
            }
          )
    )

    .forEach(
      s=>{

        const o=
          node(
            'option',
            s.title
          );


        o.value=
          s.id;


        $('request-song')
          .append(o);
      }
    );


  $('request-song').value=
    r.song_id||'';


  $('request-editor')
    .showModal();
}


$('cancel-request').onclick=
  ()=>
    $('request-editor')
      .close();


$('request-form').onsubmit=
  async e=>{

    e.preventDefault();


    try{

      await api(
        '/api/admin/requests/'+
        $('request-id').value,
        {
          status:
            $('request-status').value,

          songId:
            $('request-song').value
        }
      );


      $('request-editor')
        .close();


      await load();


    }catch(e){

      message(
        e.message
      );
    }
  };


/* =========================================================
   METADATA BACKUP
========================================================= */

$('backup').onclick=
  ()=>{

    const url=
      URL.createObjectURL(
        new Blob(
          [
            JSON.stringify(
              {
                exportedAt:
                  new Date()
                    .toISOString(),

                songs,

                requests,

                orders,

                creditLoads
              },
              null,
              2
            )
          ],

          {
            type:
              'application/json'
          }
        )
      );


    const a=
      node('a');


    a.href=url;


    a.download=
      'mq3-private-metadata-backup.json';


    a.click();


    setTimeout(
      ()=>
        URL.revokeObjectURL(
          url
        ),
      1000
    );


    message(
      'Metadata backup downloaded. Keep it private; MP3 files must be backed up separately.'
    );
  };


/* =========================================================
   START
========================================================= */

enter()
  .catch(
    e=>{

      if(
        !/Log in|Session expired/
          .test(
            e.message
          )
      ){

        message(
          e.message
        );
      }
    }
  );
