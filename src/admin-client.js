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


/* =========================================================
   GENERAL HELPERS
========================================================= */

const message=t=>{
  $('admin-message').textContent=t;
};

async function api(path,body){
  const r=await fetch(path,{
    method:body?'POST':'GET',
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

    throw Error(data.error||'Request failed.');
  }

  return data;
}

function node(tag,value,cls){
  const e=document.createElement(tag);

  if(value!==undefined){
    e.textContent=value;
  }

  if(cls){
    e.className=cls;
  }

  return e;
}

function button(label,action){
  const b=node('button',label,'button');

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

const money=n=>
  '₱'+(n/100).toFixed(2);

const date=v=>
  v
    ?new Date(v).toLocaleString()
    :'—';


/* =========================================================
   NORMALIZE NAME
   Used for matching requested names with NAME SONGS.
========================================================= */

function normalizeName(value){
  return String(value||'')
    .trim()
    .toLowerCase()
    .replace(/\s+/g,' ');
}


/* =========================================================
   FIND MATCHING NAME SONG

   Message will only appear when:
   1. Category = NAME SONGS
   2. Song is Published
   3. Full audio exists
   4. Requester's name exists in song.names
========================================================= */

function findMatchingNameSong(request){

  const requestedName=
    normalizeName(request.name);

  if(!requestedName){
    return null;
  }

  return songs.find(song=>{

    if(
      song.category!=='NAME SONGS' ||
      !song.published ||
      !song.audio_path
    ){
      return false;
    }

    /*
      Allows names to be separated by:
      comma
      semicolon
      new line
    */

    const songNames=
      String(song.names||'')
        .split(/[,;\n]/)
        .map(normalizeName)
        .filter(Boolean);

    return songNames.includes(
      requestedName
    );
  })||null;
}


/* =========================================================
   LOAD DASHBOARD DATA
========================================================= */

async function load(){

  [
    songs,
    requests,
    orders
  ]=await Promise.all([
    api('/api/admin/songs'),
    api('/api/admin/requests'),
    api('/api/admin/orders')
  ]);

  render();
}


/* =========================================================
   ADMIN LOGIN / SESSION
========================================================= */

async function enter(){

  const session=
    await api('/api/admin/session');

  $('login-panel')
    .classList.add('hidden');

  $('dashboard')
    .classList.remove('hidden');

  $('setup').textContent=
    'Connections: '+
    Object.entries(session.setup)
      .map(
        ([k,v])=>
          `${k}: ${v
            ?'configured'
            :'needs setup'}`
      )
      .join(' · ');

  await load();
}


$('login').onsubmit=async e=>{

  e.preventDefault();

  const b=e.submitter;

  b.disabled=true;

  try{

    await api('/api/login',{
      password:$('password').value
    });

    $('password').value='';

    message('');

    await enter();

  }catch(e){

    message(e.message);

  }finally{

    b.disabled=false;

  }
};


$('logout').onclick=async()=>{

  try{

    await api(
      '/api/logout',
      {}
    );

    location.reload();

  }catch(e){

    message(e.message);

  }
};


/* =========================================================
   DASHBOARD TABS
========================================================= */

for(
  const name of [
    'Name Request',
    ...cats,
    'GCash',
    'PayPal'
  ]
){

  const b=button(
    name,
    ()=>{

      tab=name;

      $('admin-search').value='';

      render();
    }
  );

  $('tabs').append(b);
}


for(const c of cats){

  const o=node(
    'option',
    c
  );

  $('song-category').append(o);
}


$('admin-search').oninput=render;


/* =========================================================
   TABLE HELPERS
========================================================= */

function table(headers){

  const t=node('table');

  const head=node('thead');

  const tr=node('tr');

  headers.forEach(
    h=>tr.append(
      node('th',h)
    )
  );

  head.append(tr);

  t.append(head);

  const body=node('tbody');

  t.append(body);

  $('records').replaceChildren(t);

  return body;
}


function row(body,values){

  const tr=node('tr');

  values.forEach(v=>{

    const td=node('td');

    if(v instanceof Node){

      td.append(v);

    }else{

      td.textContent=
        v??'—';

    }

    tr.append(td);
  });

  body.append(tr);
}


/*
  Used to keep STATUS badge
  and Message button beside each other.
*/

function actions(...buttons){

  const e=node('div');

  e.style.display='flex';
  e.style.alignItems='center';
  e.style.gap='8px';
  e.style.flexWrap='wrap';

  e.append(...buttons);

  return e;
}


/* =========================================================
   SEND NAME REQUEST NOTIFICATION

   Flow:

   PENDING
      ↓
   Link matching uploaded song
      ↓
   Send availability email
      ↓
   NOTIFIED
========================================================= */

async function sendRequestMessage(
  request,
  song
){

  const ok=confirm(
    `Send song availability message to ${request.email}?\n\nSong: ${song.title}`
  );

  if(!ok){
    return;
  }


  /*
    If it isn't already linked to this song,
    link it first.

    "available" is only an internal backend
    state. The dashboard still displays it
    as PENDING.
  */

  if(
    request.song_id!==song.id ||
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


  /*
    Existing backend notification route.
    After successful email delivery request,
    backend changes status to NOTIFIED.
  */

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
   RENDER DASHBOARD
========================================================= */

function render(){

  /*
    Active tab
  */

  [...$('tabs').children]
    .forEach(b=>{

      b.classList.toggle(
        'active',
        b.textContent===tab
      );

      b.setAttribute(
        'aria-pressed',
        String(
          b.textContent===tab
        )
      );
    });


  /*
    Show New Song button only
    in song categories.
  */

  $('new-song')
    .classList.toggle(
      'hidden',
      !cats.includes(tab)
    );


  /*
    Dashboard summary
  */

  const paid=
    orders.filter(
      o=>o.status==='paid'
    );

  $('summary').textContent=
    `${songs.length} songs · `+
    `${requests.filter(
      r=>r.status!=='notified'
    ).length} pending name requests · `+
    `${paid.length} verified payments · `+
    `${money(
      paid.reduce(
        (n,o)=>n+o.amount,
        0
      )
    )} verified revenue`;


  /*
    Search
  */

  const search=
    $('admin-search')
      .value
      .toLowerCase();

  const match=o=>
    JSON.stringify(o)
      .toLowerCase()
      .includes(search);


  $('tab-note').textContent='';


  /* =======================================================
     SONG CATEGORY TABS
  ======================================================= */

  if(cats.includes(tab)){

    $('tab-note').textContent=
      tab==='ORIGINAL SONGS'
        ?'Lyrics & melodies: MQ3. Music & voice: assisted by Suno.'
        :'Lyrics: AI-generated. Music: generated with Suno. Curated by MQ3.';


    const body=table([
      'Title',
      'Names',
      'Price',
      'Lyrics',
      'Full audio',
      'Preview',
      'Status',
      'Manage'
    ]);


    songs
      .filter(
        s=>
          s.category===tab &&
          match(s)
      )
      .forEach(s=>

        row(
          body,
          [
            s.title,
            s.names,
            money(s.price),
            s.lyrics
              ?'Yes'
              :'No',
            s.audio_path
              ?'Uploaded'
              :'Missing',
            s.preview_path
              ?'Uploaded'
              :'None',
            badge(
              s.published
                ?'published'
                :'draft'
            ),
            button(
              'Edit / Upload',
              ()=>editSong(s)
            )
          ]
        )

      );


  /* =======================================================
     NAME REQUEST TAB
  ======================================================= */

  }else if(tab==='Name Request'){

    /*
      IMPORTANT:

      There are ONLY FOUR columns:

      DATE
      NAME
      EMAIL
      STATUS

      Message is NOT its own column.

      It appears beside PENDING / NOTIFIED
      inside the STATUS cell.
    */

    const body=table([
      'Date',
      'Name',
      'Email',
      'Status'
    ]);


    requests
      .filter(match)
      .forEach(r=>{

        /*
          Find a ready matching song.
        */

        let song=
          findMatchingNameSong(r);


        /*
          For requests already notified,
          use the song that was previously
          linked even if the name matching
          rules later change.
        */

        if(
          !song &&
          r.song_id
        ){

          const linkedSong=
            songs.find(
              s=>
                s.id===r.song_id &&
                s.category==='NAME SONGS' &&
                s.published &&
                s.audio_path
            );

          if(linkedSong){
            song=linkedSong;
          }
        }


        /*
          Only show two statuses
          in the dashboard:

          Pending
          Notified

          Backend "working" and "available"
          remain internal.
        */

        const visibleStatus=
          r.status==='notified'
            ?'notified'
            :'pending';


        /*
          STATUS CELL
        */

        const statusItems=[
          badge(visibleStatus)
        ];


        /*
          MESSAGE BUTTON

          It ONLY appears if a matching
          ready song exists.

          Ready =
          Published + Full Audio uploaded.
        */

        if(song){

          statusItems.push(
            button(
              'Message',
              ()=>sendRequestMessage(
                r,
                song
              )
            )
          );

        }


        const statusCell=
          actions(...statusItems);


        row(
          body,
          [
            date(r.created_at),
            r.name,
            r.email,
            statusCell
          ]
        );

      });


  /* =======================================================
     GCASH / PAYPAL
  ======================================================= */

  }else{

    $('tab-note').textContent=
      'Manual verification: check the actual amount and transaction reference in your GCash/PayPal account before approving. Membership access is fixed-term and does not auto-renew.';


    const body=table([
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
            tab.toLowerCase() &&
          match(o)
      )
      .forEach(o=>

        row(
          body,
          [
            date(o.created_at),

            o.email,

            o.kind==='membership'
              ?'Membership'
              :songs.find(
                  s=>s.id===o.song_id
                )?.title||'Song',

            money(o.amount),

            o.reference,

            badge(o.status),

            date(o.expires_at),

            actions(

              ...(
                o.status==='submitted'
                  ?[
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
                    ]
                  :[]
              ),

              ...(
                o.status==='paid'
                  ?[
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
                    ]
                  :[]
              )
            )
          ]
        )

      );
  }


  /*
    Empty table message
  */

  if(
    !$('records')
      .querySelector('tbody')
      .children
      .length
  ){

    const tr=node('tr');

    const td=node(
      'td',
      'No records in this tab yet.'
    );

    td.colSpan=9;

    tr.append(td);

    $('records')
      .querySelector('tbody')
      .append(tr);
  }
}


/* =========================================================
   SONG EDITOR
========================================================= */

function editSong(s={}){

  $('song-form').reset();

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

  $('song-price').value=
    (s.price||0)/100;

  $('song-published').checked=
    !!s.published;

  $('upload-progress').textContent=
    s.audio_path
      ?'Existing full audio retained unless you choose a replacement.'
      :'';

  $('editor').showModal();
}


$('new-song').onclick=
  ()=>editSong();


$('cancel-editor').onclick=
  ()=>$('editor').close();


$('song-form').onsubmit=async e=>{

  e.preventDefault();

  const b=$('save-song');

  b.disabled=true;

  $('cancel-editor').disabled=true;


  try{

    const files=[
      [
        'audio',
        $('full-file').files[0]
      ],
      [
        'preview',
        $('preview-file').files[0]
      ]
    ];


    for(const [,f] of files){

      if(
        f &&
        (
          !f.name
            .toLowerCase()
            .endsWith('.mp3') ||
          f.size>
            100*1024*1024 ||
          !f.size
        )
      ){

        throw Error(
          'Choose a non-empty MP3 smaller than 100 MB.'
        );
      }
    }


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
        Math.round(
          Number(
            $('song-price').value
          )*100
        ),

      published:false
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


    for(
      const [kind,file]
      of files
    ){

      if(!file){
        continue;
      }


      const ticket=
        await api(
          '/api/admin/upload-ticket',
          {
            songId:saved.id,
            kind
          }
        );


      await upload(
        ticket.pathname,
        file,
        {
          access:'private',

          contentType:
            'audio/mpeg',

          handleUploadUrl:
            '/api/blob/upload',

          clientPayload:
            ticket.id,

          multipart:true,

          onUploadProgress:p=>
            $('upload-progress')
              .textContent=
                `Uploading ${kind}: ${Math.round(p.percentage)}%`
        }
      );


      await api(
        '/api/admin/upload-finish',
        {
          ticket:ticket.id
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


    $('editor').close();

    message(
      'Song saved.'
    );

    await load();


  }catch(e){

    $('upload-progress')
      .textContent=
        e.message+
        ' Saved metadata remains as a draft. Retry or edit it from its category.';

    message(e.message);


  }finally{

    b.disabled=false;

    $('cancel-editor').disabled=false;
  }
};


/* =========================================================
   OLD REQUEST EDITOR

   Kept here so existing HTML does not break.
   It is no longer shown from the Name Request table.
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
        s.category==='NAME SONGS' &&
        s.published &&
        s.audio_path
    )
    .forEach(s=>{

      const o=
        node(
          'option',
          s.title
        );

      o.value=s.id;

      $('request-song')
        .append(o);
    });


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

      message(e.message);
    }
  };


/* =========================================================
   METADATA BACKUP
========================================================= */

$('backup').onclick=()=>{

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
              orders
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


  const a=node('a');

  a.href=url;

  a.download=
    'mq3-private-metadata-backup.json';

  a.click();


  setTimeout(
    ()=>URL.revokeObjectURL(url),
    1000
  );


  message(
    'Metadata backup downloaded. Keep it private; MP3 files must be backed up separately.'
  );
};


/* =========================================================
   START
========================================================= */

enter().catch(e=>{

  if(
    !/Log in|Session expired/
      .test(e.message)
  ){
    message(e.message);
  }

});
