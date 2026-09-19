import {mp3RequestRoutes} from './mp3-requests.js';
import {resolveSunoLink} from './suno.js';
import express from 'express';
import cookieParser from 'cookie-parser';
import {randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {fileURLToPath} from 'node:url';
import {services} from './services.js';
import {accountRoutes} from './account.js';
import {giftRoutes} from './gifts.js';
import {
  token,
  digest,
  verifyPassword,
  text,
  email,
  uuid,
  normalize,
  fail
} from './security.js';

export const categories=[
  'NAME SONGS',
  'INSPIRATIONAL SONGS',
  'OPM',
  'ORIGINAL SONGS'
];

const publicFields=
  'id,title,category,names,lyrics,price,duration_seconds,views,created_at,suno_url,(suno_url IS NULL OR (suno_gifts_enabled AND suno_download_confirmed_at IS NOT NULL)) AS gifts_enabled';

const wrap=fn=>
  (req,res,next)=>
    Promise.resolve(fn(req,res))
      .catch(next);


export function createApp(s=services()){

  const app=express();
  const {env,query:q}=s;

  const hash=value=>
    digest(
      value,
      env.SESSION_SECRET
    );

  const origin=()=>
    new URL(
      env.APP_URL||
      'http://localhost:3000'
    ).origin;

  const cookieOptions=()=>({
    httpOnly:true,
    sameSite:'lax',
    secure:origin().startsWith('https:'),
    path:'/'
  });


  /* =========================================================
     APP SECURITY
  ========================================================= */

  app.disable('x-powered-by');

  app.use(
    express.json({
      limit:'64kb'
    })
  );

  app.use(
    cookieParser()
  );


  app.use(
    '/api',
    (_req,res,next)=>{

      res.set(
        'Cache-Control',
        'no-store'
      );

      res.set(
        'X-Content-Type-Options',
        'nosniff'
      );

      next();
    }
  );


  const sameOrigin=req=>{

    if(
      req.get('Origin')!==origin()
    ){
      fail(
        403,
        'This action must come from the MQ3 app.'
      );
    }
  };


  /* =========================================================
     ADMIN SESSION
  ========================================================= */

  async function admin(req){

    const v=
      req.cookies.mq3_admin;

    if(
      !v||
      !/^[a-f0-9]{64}$/.test(v)
    ){
      fail(
        401,
        'Log in to your admin dashboard.'
      );
    }


    const rows=
      await q(
        'SELECT token_hash FROM sessions WHERE token_hash=$1 AND expires_at > $2',
        [
          hash(v),
          new Date()
        ]
      );


    if(!rows.length){

      fail(
        401,
        'Session expired. Log in again.'
      );
    }
  }


  /* =========================================================
     RATE LIMIT
  ========================================================= */

  async function limit(
    req,
    scope,
    max
  ){

    const ip=
      env.VERCEL
        ?(
            req.get(
              'x-vercel-forwarded-for'
            )||
            req.socket.remoteAddress
          )
        :req.socket.remoteAddress;


    const key=
      hash(
        `${scope}:${ip||'unknown'}:${Math.floor(
          Date.now()/600000
        )}`
      );


    const rows=
      await q(
        'INSERT INTO limits(key,hits,expires_at) VALUES($1,1,$2) ON CONFLICT(key) DO UPDATE SET hits=limits.hits+1 RETURNING hits',
        [
          key,
          new Date(
            Date.now()+1200000
          )
        ]
      );


    if(
      rows[0].hits>max
    ){
      fail(
        429,
        'Too many attempts. Please try again in 10 minutes.'
      );
    }
  }
  /* =========================================================
     LISTENER ACCOUNT
  ========================================================= */

  accountRoutes({
    app,
    env,
    query:q,
    mail:s.mail,
    sameOrigin,
    limit,
    cookieOptions
  });


  /* =========================================================
     SONG CREATOR REQUEST QUEUE
  ========================================================= */

  app.post('/api/song-creator/requests',wrap(async(req,res)=>{
    sameOrigin(req); await limit(req,'song-creator-request',12);
    const raw=req.cookies?.mq3_user;if(!raw)fail(401,'Sign in to your MQ3 account before creating a song.');
    const [user]=await q(`SELECT u.id,u.email,u.display_name FROM user_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()`,[hash(raw)]);
    if(!user)fail(401,'Your session expired. Sign in again before creating your song.');
    const songType=String(req.body.songType||'').trim().slice(0,40),allowed=new Set(['someone','wedding','celebration','faith','story','original','jingle']);
    if(!allowed.has(songType))fail(400,'Choose a valid song type.');
    const subjectName=String(req.body.name||'').trim().slice(0,120),relationship=String(req.body.relationship||'').trim().slice(0,80),occasion=String(req.body.occasion||'').trim().slice(0,80),story=String(req.body.story||'').trim().slice(0,4000),language=String(req.body.language||'English').trim().slice(0,40)||'English';
    if(!story)fail(400,'Tell us what the song should be about.');
    const id=randomUUID(),ledgerId=randomUUID();
    const [request]=await q(`WITH locked AS (SELECT * FROM wallets WHERE user_id=$1 FOR UPDATE),
    amounts AS (SELECT user_id,LEAST(promo_credits,50) promo_used,50-LEAST(promo_credits,50) purchased_used FROM locked WHERE promo_credits+purchased_credits>=50),
    created AS (INSERT INTO song_creator_requests(id,user_id,email,display_name,song_type,subject_name,relationship,occasion,story,language,credits) SELECT $2,a.user_id,$3,$4,$5,$6,$7,$8,$9,$10,50 FROM amounts a RETURNING *),
    debited AS (UPDATE wallets w SET promo_credits=w.promo_credits-a.promo_used,purchased_credits=w.purchased_credits-a.purchased_used,updated_at=now() FROM amounts a,created c WHERE w.user_id=a.user_id RETURNING w.promo_credits+w.purchased_credits balance),
    ledger AS (INSERT INTO credit_transactions(id,user_id,transaction_type,promo_change,purchased_change,description,reference_id) SELECT $11,a.user_id,'song_creator',-a.promo_used,-a.purchased_used,'Create My Song · 50 Credits',$2 FROM amounts a,created c RETURNING id)
    SELECT c.*,d.balance FROM created c CROSS JOIN debited d CROSS JOIN ledger l`,[user.id,id,user.email,user.display_name||null,songType,subjectName||null,relationship||null,occasion||null,story,language,ledgerId]);
    if(!request)fail(402,'You need 50 MQ3 Credits to create your song.');
    res.status(201).json({ok:true,request});
  }));

  app.get('/api/song-creator/my-requests',wrap(async(req,res)=>{
    const raw=req.cookies?.mq3_user;if(!raw)return res.json([]);
    const [user]=await q(`SELECT u.id FROM user_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()`,[hash(raw)]);
    if(!user)return res.json([]);
    res.json(await q('SELECT * FROM song_creator_requests WHERE user_id=$1 ORDER BY created_at DESC',[user.id]));
  }));

  app.get('/api/admin/song-creator-requests',wrap(async(_req,res)=>res.json(await q('SELECT * FROM song_creator_requests ORDER BY created_at DESC'))));

  app.patch('/api/admin/song-creator-requests/:id',wrap(async(req,res)=>{
    sameOrigin(req);
    const id=uuid(req.params.id);
    const status=String(req.body?.status||'').trim();
    const allowed=new Set(['queued','creating','ready','revision']);
    if(!allowed.has(status))fail(400,'Choose a valid song request status.');
    const version1=String(req.body?.version1Url||'').trim().slice(0,2000);
    const version2=String(req.body?.version2Url||'').trim().slice(0,2000);
    if(status==='ready'&&(!version1||!version2))fail(400,'Add both song version links before marking Ready.');
    const [updated]=await q(`UPDATE song_creator_requests SET status=$2,version_1_url=NULLIF($3,''),version_2_url=NULLIF($4,''),updated_at=now() WHERE id=$1 RETURNING *`,[id,status,version1,version2]);
    if(!updated)fail(404,'Song request not found.');
    if(status==='ready'){
      try{
        await s.mail(updated.email,'Your MQ3 Song Is Ready! 🎵',
          'Hi '+(updated.display_name||'there')+',\n\nYour personalized song is now ready. We created two versions for you to enjoy and choose from.\n\nVisit My Songs on MQ3 Music to listen to your songs.\n\nYour request includes one reasonable revision if needed.',
          'song-ready-'+updated.id+'-'+String(updated.updated_at||Date.now()));
      }catch(error){console.error('[mq3/song-ready-email]',error);}
    }
    res.json({ok:true,request:updated});
  }));

  app.post('/api/song-creator/requests/:id/revision',wrap(async(req,res)=>{
    sameOrigin(req); await limit(req,'song-revision',8);
    const raw=req.cookies?.mq3_user;if(!raw)fail(401,'Sign in to request a revision.');
    const [user]=await q(`SELECT u.id FROM user_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()`,[hash(raw)]);
    if(!user)fail(401,'Your session expired. Sign in again.');
    const id=uuid(req.params.id),notes=String(req.body?.notes||'').trim().slice(0,2000);
    if(!notes)fail(400,'Tell us what you would like changed.');
    const [updated]=await q(`UPDATE song_creator_requests SET status='revision',revision_notes=$3,revision_used=true,updated_at=now() WHERE id=$1 AND user_id=$2 AND status='ready' AND revision_used=false RETURNING *`,[id,user.id,notes]);
    if(!updated)fail(400,'This request is not eligible for another included revision.');
    res.json({ok:true,request:updated});
  }));

  /* =========================================================
     AI SONG LYRICS
  ========================================================= */

  app.post(
    '/api/song-creator/lyrics',
    wrap(async(req,res)=>{
      sameOrigin(req);
      await limit(req,'song-creator-lyrics',20);

      const apiKey=String(env.OPENAI_API_KEY||'').trim();
      if(!apiKey) fail(503,'AI lyrics are not configured yet.');

      const mode=String(req.body?.mode||'create').trim().toLowerCase();
      const allowedModes=new Set(['create','rewrite','emotional','simple','chorus','shorter','longer']);
      if(!allowedModes.has(mode)) fail(400,'Invalid lyrics request.');

      const songType=String(req.body?.songType||'original').slice(0,40);
      const name=String(req.body?.name||'').trim().slice(0,120);
      const story=String(req.body?.story||'').trim().slice(0,4000);
      const title=String(req.body?.title||'').trim().slice(0,160);
      const lyrics=String(req.body?.lyrics||'').trim().slice(0,12000);
      const language=String(req.body?.language||'English').trim().slice(0,40);
      const relationship=String(req.body?.relationship||'').trim().slice(0,80);
      const occasion=String(req.body?.occasion||'').trim().slice(0,80);

      if(mode==='create'&&!story) fail(400,'Tell us what the song should be about.');
      if(mode!=='create'&&!lyrics) fail(400,'There are no lyrics to rewrite.');

      const structureInstruction=songType==='jingle'
        ?'JINGLE STRUCTURE: Keep it deliberately short: [Hook] 2-4 lines, [Verse] 2-4 lines, [Hook] repeated or lightly varied, and an optional 1-2 line [Tag]. Aim for a concise, catchy advertising-style lyric; do not use the full-song structure.'
        :'FULL SONG STRUCTURE: Use [Verse 1] 4 lines, [Pre-Chorus] 4 lines, [Chorus] 4-6 lines, [Verse 2] 4 lines, [Pre-Chorus] repeated or lightly varied, [Chorus] repeated, [Bridge] 4 lines, [Final Chorus] 4-6 lines, and [Outro] 2-4 lines. Keep every line meaningful and singable; do not pad merely to hit a line count.';

      const modeInstruction={
        create:'Write a complete original song from the supplied story.',
        rewrite:'Rewrite the complete lyrics while preserving the important facts and intended message.',
        emotional:'Rewrite the lyrics with warmer, deeper emotion while keeping them natural and singable.',
        simple:'Rewrite using simpler, clearer language without making the song childish.',
        chorus:'Keep the song generally intact but replace the chorus with a stronger, memorable new chorus.',
        shorter:'Make the complete song shorter and tighter while preserving its core story.',
        longer:'Expand the song naturally with useful lyrical detail, not filler.'
      }[mode];

      const prompt=[
        'You are the lyric writer for MQ3 Song Creator.',
        modeInstruction,
        'Write polished, emotionally natural, singable lyrics. Avoid generic AI-sounding filler, forced rhymes, clichés, and invented personal facts.',
        structureInstruction,
        'Return only JSON with exactly two string fields: title and lyrics.',
        'Song type: '+songType,
        'Language: '+language,
        relationship?'Relationship: '+relationship:'',
        occasion?'Occasion: '+occasion:'',
        name?'Person/recipient: '+name:'',
        story?'Story/details from customer:\n'+story:'',
        title?'Current title: '+title:'',
        lyrics?'Current lyrics:\n'+lyrics:''
      ].filter(Boolean).join('\n\n');

      let response;
      try{
        response=await fetch('https://api.openai.com/v1/responses',{
          method:'POST',
          headers:{
            Authorization:'Bearer '+apiKey,
            'Content-Type':'application/json'
          },
          body:JSON.stringify({
            model:String(env.OPENAI_LYRICS_MODEL||'gpt-5.6-luna'),
            input:prompt,
            text:{format:{type:'json_schema',name:'mq3_song',strict:true,schema:{type:'object',properties:{title:{type:'string'},lyrics:{type:'string'}},required:['title','lyrics'],additionalProperties:false}}},
            max_output_tokens:3000
          })
        });
      }catch(error){
        console.error('[mq3/lyrics/network]',error);
        fail(502,'AI lyrics service could not be reached. Please try again.');
      }

      let data={};
      try{data=await response.json();}catch{}
      if(!response.ok){
        console.error('[mq3/lyrics/openai]',response.status,data?.error?.message||data);
        {
          const code=String(data?.error?.code||data?.error?.type||'').trim();
          const safe429=code==='credit_balance_exhausted'
            ?'OpenAI API credit balance is exhausted. Please add API credits.'
            :code==='organization_usage_limit_exceeded'
              ?'OpenAI organization usage limit has been reached.'
              :code==='organization_spend_limit_exceeded'
                ?'OpenAI organization spend limit has been reached.'
                :code==='project_spend_limit_exceeded'
                  ?'OpenAI project spend limit has been reached.'
                  :code==='insufficient_quota'
                    ?'OpenAI API quota is unavailable. Please check billing and API credits.'
                    :('OpenAI API returned 429'+(code?' ('+code+')':' rate limit')+'. Please try again shortly.');
          fail(response.status===429?429:502,response.status===429?safe429:'AI lyrics could not be created. Please try again.');
        }
      }

      const outputText=
        data.output_text||
        data.output?.flatMap(item=>item.content||[]).find(item=>item.type==='output_text')?.text;

      if(!outputText) fail(502,'AI returned an empty lyrics response.');

      let result;
      try{result=JSON.parse(outputText);}catch{fail(502,'AI returned lyrics in an unexpected format.');}
      const nextTitle=String(result.title||title||'Your MQ3 Song').trim().slice(0,160);
      const nextLyrics=String(result.lyrics||'').trim();
      if(!nextLyrics) fail(502,'AI returned empty lyrics.');

      res.json({ok:true,title:nextTitle,lyrics:nextLyrics});
    })
  );


  /* =========================================================
     VIRTUAL GIFTS
  ========================================================= */

  giftRoutes({
    app,
    env,
    query:q,
    sameOrigin,
    limit
  });

  /* =========================================================
     CUSTOMER COOKIE
  ========================================================= */

  function customer(req,res){

    let value=
      req.cookies.mq3_customer;


    if(
      !/^[a-f0-9]{64}$/.test(
        value||''
      )
    ){

      value=token();


      res.cookie(
        'mq3_customer',
        value,
        {
          ...cookieOptions(),
          maxAge:
            365*86400000
        }
      );
    }


    return hash(value);
  }


  /* =========================================================
     OWNED ORDER
  ========================================================= */

  async function owned(req,id){

    const [o]=
      await q(
        'SELECT * FROM orders WHERE id=$1 AND customer_hash=$2',
        [
          uuid(id),

          hash(
            req.cookies
              .mq3_customer||
            'none'
          )
        ]
      );


    if(!o){

      fail(
        404,
        'Order not found in this browser.'
      );
    }


    return o;
  }


  /* =========================================================
     LOGIN
  ========================================================= */

  app.post(
    '/api/login',
    wrap(
      async(req,res)=>{

        sameOrigin(req);


        if(
          !env.ADMIN_PASSWORD_HASH
        ){
          fail(
            503,
            'Set up your admin password first.'
          );
        }


        await limit(
          req,
          'login',
          8
        );


        if(
          !verifyPassword(
            req.body.password,
            env.ADMIN_PASSWORD_HASH
          )
        ){
          fail(
            401,
            'Incorrect password.'
          );
        }


        const v=token();


        await q(
          'INSERT INTO sessions(token_hash,expires_at) VALUES($1,$2)',
          [
            hash(v),

            new Date(
              Date.now()+
              8*3600000
            )
          ]
        );


        res.cookie(
          'mq3_admin',
          v,
          {
            ...cookieOptions(),

            maxAge:
              8*3600000
          }
        );


        res.json({
          ok:true
        });
      }
    )
  );


  /* =========================================================
     LOGOUT
  ========================================================= */

  app.post(
    '/api/logout',
    wrap(
      async(req,res)=>{

        sameOrigin(req);


        if(
          req.cookies.mq3_admin
        ){

          await q(
            'DELETE FROM sessions WHERE token_hash=$1',
            [
              hash(
                req.cookies
                  .mq3_admin
              )
            ]
          );
        }


        res.clearCookie(
          'mq3_admin',
          cookieOptions()
        );


        res.json({
          ok:true
        });
      }
    )
  );


  /* =========================================================
     ADMIN API SECURITY
  ========================================================= */

  app.use(
    '/api/admin',
    (req,res,next)=>{

      Promise.resolve()

        .then(
          async()=>{

            await admin(req);


            if(
              req.method!=='GET'
            ){
              sameOrigin(req);
            }


            next();
          }
        )

        .catch(next);
    }
  );


  mp3RequestRoutes({app,env,query:q,sameOrigin,limit});

  /* =========================================================
     PUBLIC CATALOG
  ========================================================= */

  app.get(
    '/api/catalog',
    wrap(
      async(req,res)=>{

        const songs=
          await q(
            `SELECT ${publicFields} FROM songs WHERE published=true AND (audio_path IS NOT NULL OR suno_url IS NOT NULL) ORDER BY lower(title) ASC, created_at DESC`
          );


        res.json({

          songs:
            songs.map(
              t=>({
                ...t,

                addedAt:
                  new Date(
                    t.created_at
                  ).getTime()
              })
            ),


          payments:{

            gcash:
              !!env.GCASH_NUMBER,

            paypal:
              !!env.PAYPAL_PAYMENT_URL
          },


          membership:{

            price:
              Math.round(
                Number(
                  env.MEMBERSHIP_PRICE_PHP||
                  199
                )*100
              ),

            days:
              Number(
                env.MEMBERSHIP_DAYS||
                30
              )
          },


          contact:
            env.OWNER_EMAIL||
            ''
        });
      }
    )
  );


  /* =========================================================
     NAME REQUEST
  ========================================================= */

  app.post(
    '/api/requests',
    wrap(
      async(req,res)=>{

        sameOrigin(req);

        await limit(
          req,
          'request',
          6
        );


        if(
          req.body.website
        ){
          fail(
            400,
            'Invalid request.'
          );
        }


        if(
          req.body.consent!==true
        ){
          fail(
            400,
            'Consent is required to send a song availability email.'
          );
        }


        const name=
          text(
            req.body.name,
            80
          );


        const address=
          email(
            req.body.email
          );


        const inserted=await q(
          'INSERT INTO requests(id,name,normalized_name,email) VALUES($1,$2,$3,$4) ON CONFLICT(normalized_name,email) DO NOTHING RETURNING id',
          [
            randomUUID(),

            name,

            normalize(name),

            address
          ]
        );


        res.status(201)
          .json({
            ok:true,

            message:
              inserted.length ? 'Your request is recorded. MQ3 can email you when the song is available.' : 'This name and email are already on our request list. No duplicate request was created.'
          });
      }
    )
  );


  /* =========================================================
     NAME SONG REQUEST · 50 CREDITS, OR PRIORITY REQUEST · 100 CREDITS
  ========================================================= */

  app.post(
    '/api/account/name-priority',
    wrap(
      async(req,res)=>{

        sameOrigin(req);
        await limit(req,'priority-name-request',12);

        const raw=req.cookies?.mq3_user;
        if(!raw){
          fail(401,'Sign in to your MQ3 account before placing this request.');
        }

        const [user]=await q(
          `SELECT u.id,u.email,u.display_name
           FROM user_sessions s
           JOIN users u ON u.id=s.user_id
           WHERE s.token_hash=$1 AND s.expires_at>now()`,
          [hash(raw)]
        );

        if(!user){
          fail(401,'Your session expired. Sign in again before placing this request.');
        }

        const name=text(req.body.name,80);
        const normalized=normalize(name);
        const requesterName=text(req.body.requesterName,80);
        const ideas=typeof req.body.ideas==='string' ? req.body.ideas.trim().slice(0,800) : '';
        const credits=Number(req.body.credits)===100 ? 100 : 50;
        const description=credits===100 ? 'Priority Request · MP3 + Lyrics included' : 'Name Song Request · MP3 + Lyrics included';

        const [existing]=await q(
          `SELECT * FROM requests
           WHERE normalized_name=$1 AND email=$2`,
          [normalized,user.email]
        );

        if(existing?.priority){
          return res.json({ok:true,alreadyPriority:true,request:existing});
        }

        const requestId=existing?.id||randomUUID();
        const ledgerId=randomUUID();

        const [result]=await q(
          `WITH locked AS (
             SELECT * FROM wallets WHERE user_id=$1 FOR UPDATE
           ), amounts AS (
             SELECT user_id,
                    LEAST(promo_credits,$7) AS promo_used,
                    $7-LEAST(promo_credits,$7) AS purchased_used
             FROM locked
             WHERE promo_credits+purchased_credits>=$7
           ), paid_request AS (
             INSERT INTO requests(
               id,name,normalized_name,email,user_id,priority,credits,
               promo_used,purchased_used,paid_at,requester_name,lyric_ideas
             )
             SELECT $2,$3,$4,$5,a.user_id,true,$7,
                    a.promo_used,a.purchased_used,now(),$8,$9
             FROM amounts a
             ON CONFLICT(normalized_name,email) DO UPDATE SET
               name=EXCLUDED.name,
               user_id=EXCLUDED.user_id,
               priority=true,
               credits=$7,
               promo_used=EXCLUDED.promo_used,
               purchased_used=EXCLUDED.purchased_used,
               paid_at=now(),
               requester_name=EXCLUDED.requester_name,
               lyric_ideas=EXCLUDED.lyric_ideas
             WHERE requests.priority=false
             RETURNING *
           ), debited AS (
             UPDATE wallets w
             SET promo_credits=w.promo_credits-r.promo_used,
                 purchased_credits=w.purchased_credits-r.purchased_used,
                 updated_at=now()
             FROM paid_request r
             WHERE w.user_id=r.user_id
             RETURNING w.promo_credits+w.purchased_credits AS balance
           ), ledger AS (
             INSERT INTO credit_transactions(
               id,user_id,transaction_type,promo_change,purchased_change,description,reference_id
             )
             SELECT $6,r.user_id,'name_priority',-r.promo_used,-r.purchased_used,
                    $10,r.id
             FROM paid_request r
             RETURNING id
           )
           SELECT r.*,d.balance
           FROM paid_request r
           CROSS JOIN debited d
           CROSS JOIN ledger l`,
          [user.id,requestId,name,normalized,user.email,ledgerId,credits,requesterName,ideas||null,description]
        );

        if(!result){
          const [duplicate]=await q(
            `SELECT * FROM requests
             WHERE normalized_name=$1 AND email=$2`,
            [normalized,user.email]
          );
          if(duplicate?.priority){
            return res.json({ok:true,alreadyPriority:true,request:duplicate});
          }
          fail(400,'Not enough Credits for this request. Load Credits, then try again.');
        }

        res.json({
          ok:true,
          request:result,
          balance:Number(result.balance)
        });
      }
    )
  );


  /* =========================================================
     ADMIN: MARK PRIORITY MP3 + LYRICS DELIVERED
  ========================================================= */

  app.post(
    '/api/admin/requests/:id/priority-sent',
    wrap(
      async(req,res)=>{
        const [updated]=await q(
          `UPDATE requests
           SET priority_delivered_at=COALESCE(priority_delivered_at,now())
           WHERE id=$1 AND priority=true AND credits=50
           RETURNING id`,
          [uuid(req.params.id)]
        );
        if(!updated){
          fail(409,'This is not a paid Priority Name Request.');
        }
        res.json({ok:true});
      }
    )
  );


  /* =========================================================
     ADMIN SESSION INFO
  ========================================================= */

  app.get(
    '/api/admin/session',
    wrap(
      async(_req,res)=>{

        res.json({

          ok:true,

          setup:{

            blob:
              !!env.BLOB_STORE_ID,

            email:
              !!env.RESEND_API_KEY&&
              !!env.EMAIL_FROM,

            gcash:
              !!env.GCASH_NUMBER,

            paypal:
              !!env.PAYPAL_PAYMENT_URL
          }
        });
      }
    )
  );


  /* =========================================================
     ADMIN SONG LIST
  ========================================================= */

  app.get(
    '/api/admin/songs',
    wrap(
      async(_req,res)=>{

        /*
          The plays_today / plays_last_7_days columns read from
          song_plays, a table added alongside this feature. If it
          has not been created yet in this database, fall back to
          the plain song list (with those two fields at 0) instead
          of breaking the whole admin Songs tab.
        */

        try{

          res.json(
            await q(
              `SELECT songs.*,
                 (SELECT count(*)::int FROM song_plays sp
                   WHERE sp.song_id=songs.id
                     AND (sp.played_at AT TIME ZONE 'Asia/Manila')::date=
                         (now() AT TIME ZONE 'Asia/Manila')::date
                 ) AS plays_today,
                 (SELECT count(*)::int FROM song_plays sp
                   WHERE sp.song_id=songs.id
                     AND sp.played_at>now()-interval '7 days'
                 ) AS plays_last_7_days,
                 (SELECT count(*)::int FROM song_plays sp
                   WHERE sp.song_id=songs.id
                     AND sp.played_at>now()-interval '30 days'
                 ) AS plays_last_30_days
               FROM songs
               ORDER BY created_at DESC`
            )
          );

        }catch(error){

          const songs=
            await q(
              'SELECT * FROM songs ORDER BY created_at DESC'
            );

          res.json(
            songs.map(
              s=>({
                ...s,
                plays_today:0,
                plays_last_7_days:0,
                plays_last_30_days:0
              })
            )
          );
        }
      }
    )
  );


  /* =========================================================
     CREATE / UPDATE SONG
  ========================================================= */

  app.post(
    '/api/admin/songs',
    wrap(
      async(req,res)=>{

        const title=
          text(
            req.body.title
          );


        const category=
          text(
            req.body.category
          );


        const price=
          Number(
            req.body.price
          );


        if(
          !categories.includes(
            category
          )||
          !Number.isInteger(
            price
          )||
          price<0||
          price>10000000
        ){
          fail(
            400,
            'Check category and price.'
          );
        }


        const names=
          String(
            req.body.names||
            ''
          ).slice(
            0,
            500
          );


        const lyrics=
          String(
            req.body.lyrics||
            ''
          ).slice(
            0,
            30000
          );


        let sunoUrl;
        if (Object.hasOwn(req.body,'suno_url')) {
          try { sunoUrl=await resolveSunoLink(req.body.suno_url); }
          catch(error) { fail(400,error.message); }
        }
        const durationRaw=
          req.body.duration_seconds;


        const durationSeconds=
          durationRaw===undefined||
          durationRaw===null||
          durationRaw===''
            ?null
            :Math.round(
                Number(
                  durationRaw
                )
              );


        if(
          durationSeconds!==null&&
          (
            !Number.isInteger(
              durationSeconds
            )||
            durationSeconds<0||
            durationSeconds>86400
          )
        ){
          fail(
            400,
            'Invalid song duration.'
          );
        }


        const id=
          req.body.id
            ?uuid(
                req.body.id
              )
            :randomUUID();


        if(
          req.body.id
        ){

          const [existing]=
            await q(
              'SELECT * FROM songs WHERE id=$1',
              [
                id
              ]
            );


          if(
            !existing
          ){
            fail(
              404,
              'Song not found.'
            );
          }


          if(sunoUrl===undefined) sunoUrl=existing.suno_url||null;
            if(sunoUrl && existing.audio_path && sunoUrl!==existing.suno_url) fail(400,'Use Convert to Suno to change the source of this uploaded song.');
          if(
            req.body.published&&
            !existing.audio_path && !sunoUrl
          ){
            fail(
              400,
              'Upload full audio or add a Suno link before publishing.'
            );
          }


          await q(
            'UPDATE songs SET title=$2,category=$3,names=$4,lyrics=$5,price=$6,published=$7,duration_seconds=COALESCE($8,duration_seconds),suno_gifts_enabled=CASE WHEN suno_url IS NOT DISTINCT FROM $9::text THEN suno_gifts_enabled ELSE false END,suno_download_confirmed_at=CASE WHEN suno_url IS NOT DISTINCT FROM $9::text THEN suno_download_confirmed_at ELSE NULL END,suno_url=$9 WHERE id=$1',
            [
              id,

              title,

              category,

              names,

              lyrics,

              price,

              req.body
                .published===true,

              durationSeconds,
              sunoUrl || null
            ]
          );


        }else{

          await q(
            'INSERT INTO songs(id,title,category,names,lyrics,price,duration_seconds,suno_url) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
            [
              id,

              title,

              category,

              names,

              lyrics,

              price,

              durationSeconds,
              sunoUrl || null
            ]
          );
        }


        res.json({
          id
        });
      }
    )
  );


  /* =========================================================
     DELETE SONG
  ========================================================= */

  app.post('/api/admin/songs/:id/suno-gifts',wrap(async(req,res)=>{
    const id=uuid(req.params.id);
    const {downloadConfirmed,enabled,expectedSunoUrl}=req.body;
    if(typeof downloadConfirmed!=='boolean'||typeof enabled!=='boolean'||typeof expectedSunoUrl!=='string')fail(400,'Check the download confirmation and gift setting.');
    if(enabled&&!downloadConfirmed)fail(400,'Confirm that you downloaded this song through Suno before enabling gifts.');
    const result=await q(`UPDATE songs SET
      suno_download_confirmed_at=CASE WHEN $2::boolean THEN COALESCE(suno_download_confirmed_at,now()) ELSE NULL END,
      suno_gifts_enabled=$3
      WHERE id=$1 AND suno_url IS NOT NULL AND suno_url=$4
      RETURNING id,suno_download_confirmed_at,suno_gifts_enabled`,[id,downloadConfirmed,enabled,expectedSunoUrl]);
    if(!result.length)fail(409,'The Suno song link changed or is no longer available. Reload the dashboard and check the song again.');
    res.json(result[0]);
  }));

  app.post('/api/admin/suno-preview',wrap(async(req,res)=>{
    let link;
    try {link=await resolveSunoLink(req.body.url);} catch(error){fail(400,error.message);}
    if(!link) fail(400,'Enter a Suno song link.');
    res.json({url:link,embed:link.replace('/song/','/embed/')});
  }));

  app.post('/api/admin/songs/:id/convert-suno',wrap(async(req,res)=>{
    const id=uuid(req.params.id);
    if(req.body.tested!==true) fail(400,'Test the Suno player and confirm the correct song first.');
    let link;
    try {link=await resolveSunoLink(req.body.url);} catch(error){fail(400,error.message);}
    if(!link) fail(400,'Enter a Suno song link.');
    const updated=await q(`UPDATE songs SET suno_gifts_enabled=CASE WHEN suno_url IS NOT DISTINCT FROM $2::text THEN suno_gifts_enabled ELSE false END,suno_download_confirmed_at=CASE WHEN suno_url IS NOT DISTINCT FROM $2::text THEN suno_download_confirmed_at ELSE NULL END,suno_url=$2
      WHERE id=$1 AND audio_path IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM orders WHERE song_id=$1)
      AND NOT EXISTS (SELECT 1 FROM orders WHERE kind='membership' AND status='paid' AND expires_at>now())
      RETURNING id`,[id,link]);
    if(!updated.length) fail(409,'Conversion is unavailable: choose an uploaded song without order history or active paid membership access.');
    res.json({ok:true,message:'Now using Suno. The old audio is retained until a separate storage cleanup.'});
  }));

  app.delete(
    '/api/admin/songs/:id',
    wrap(
      async(req,res)=>{

        const id=
          uuid(
            req.params.id
          );


        const [song]=
          await q(
            'SELECT * FROM songs WHERE id=$1',
            [
              id
            ]
          );


        if(!song){

          fail(
            404,
            'Song not found.'
          );
        }


        const orderRows=
          await q(
            'SELECT id FROM orders WHERE song_id=$1 LIMIT 1',
            [
              id
            ]
          );


        if(orderRows.length){

          fail(
            409,
            'This song has payment/order history and cannot be deleted.'
          );
        }


        await q(
          "UPDATE requests SET song_id=NULL,status='pending',notified_at=NULL WHERE song_id=$1",
          [
            id
          ]
        );


        await q(
          'DELETE FROM upload_tickets WHERE song_id=$1',
          [
            id
          ]
        );


        await q(
          'DELETE FROM songs WHERE id=$1',
          [
            id
          ]
        );


        const cleanupErrors=[];


        for(
          const path of [
            song.audio_path,
            song.preview_path
          ].filter(Boolean)
        ){

          try{

            await s.deleteBlob(
              path
            );

          }catch(e){

            cleanupErrors.push(
              e.message||
              'Blob cleanup failed.'
            );
          }
        }


        res.json({
          ok:true,

          warning:
            cleanupErrors.length
              ?'Song deleted, but one or more stored audio files could not be cleaned up automatically.'
              :null
        });
      }
    )
  );


  /* =========================================================
     UPLOAD TICKET
  ========================================================= */

  app.post(
    '/api/admin/upload-ticket',
    wrap(
      async(req,res)=>{

        if(
          !env.BLOB_STORE_ID
        ){
          fail(
            503,
            'Connect your private Vercel Blob store first.'
          );
        }


        const songId=
          uuid(
            req.body.songId
          );


        const kind=
          req.body.kind;


        if(
          ![
            'audio',
            'preview'
          ].includes(kind)
        ){
          fail(
            400,
            'Invalid upload type.'
          );
        }


        if(
          !(
            await q(
              'SELECT id FROM songs WHERE id=$1 AND suno_url IS NULL',
              [
                songId
              ]
            )
          ).length
        ){
          fail(
            404,
            'Save the song first.'
          );
        }


        const id=
          randomUUID();


        const pathname=
          `songs/${songId}/${kind}-${id}.mp3`;


        await q(
          'INSERT INTO upload_tickets(id,song_id,kind,pathname) VALUES($1,$2,$3,$4)',
          [
            id,

            songId,

            kind,

            pathname
          ]
        );


        res.json({
          id,
          pathname
        });
      }
    )
  );


  /* =========================================================
     FINISH UPLOAD
  ========================================================= */

  async function finishUpload(
    ticket,
    blob
  ){

    const [t]=
      await q(
        'SELECT * FROM upload_tickets WHERE id=$1',
        [
          uuid(ticket)
        ]
      );


    if(
      !t
    ){
      fail(
        400,
        'Upload ticket not found.'
      );
    }


    if(
      blob.pathname!==
      t.pathname
    ){
      fail(
        400,
        'Upload path does not match ticket.'
      );
    }


    await q(
      `UPDATE songs SET ${
        t.kind==='preview'
          ?'preview_path'
          :'audio_path'
      }=$2 WHERE id=$1`,
      [
        t.song_id,
        t.pathname
      ]
    );
  }


  /* =========================================================
     VERCEL BLOB UPLOAD
  ========================================================= */

  app.post(
    '/api/blob/upload',
    wrap(
      async(req,res)=>{

        const result=
          await s.upload({

            body:
              req.body,

            request:
              req,

            token:
              env.BLOB_READ_WRITE_TOKEN,


            onBeforeGenerateToken:
              async(
                pathname,
                clientPayload
              )=>{

                sameOrigin(req);

                await admin(req);


                const [t]=
                  await q(
                    'SELECT * FROM upload_tickets WHERE id=$1 AND created_at > $2',
                    [
                      uuid(
                        clientPayload
                      ),

                      new Date(
                        Date.now()-
                        3600000
                      )
                    ]
                  );


                if(
                  !t||
                  pathname!==
                  t.pathname
                ){
                  fail(
                    400,
                    'Upload ticket expired or invalid.'
                  );
                }


                return {

                  allowedContentTypes:[
                    'audio/mpeg'
                  ],

                  maximumSizeInBytes:
                    100*
                    1024*
                    1024,

                  addRandomSuffix:
                    false,

                  allowOverwrite:
                    false,

                  tokenPayload:
                    t.id
                };
              },


            onUploadCompleted:
              async({
                blob,
                tokenPayload
              })=>
                finishUpload(
                  tokenPayload,
                  blob
                )
          });


        res.json(result);
      }
    )
  );


  /* =========================================================
     CONFIRM UPLOAD
  ========================================================= */

  app.post(
    '/api/admin/upload-finish',
    wrap(
      async(req,res)=>{

        const [t]=
          await q(
            'SELECT * FROM upload_tickets WHERE id=$1',
            [
              uuid(
                req.body.ticket
              )
            ]
          );


        if(
          !t
        ){
          fail(
            404,
            'Upload ticket not found.'
          );
        }


        const response=
          await s.audio(
            t.pathname,
            'bytes=0-2'
          );


        if(
          !response.ok
        ){
          fail(
            409,
            'Upload is not available yet. Retry after it finishes.'
          );
        }


        await response.body
          ?.cancel();


        await finishUpload(
          t.id,
          {
            pathname:
              t.pathname
          }
        );


        res.json({
          ok:true
        });
      }
    )
  );


  /* =========================================================
     ADMIN REQUEST LIST
  ========================================================= */

  app.get('/api/admin/listeners',wrap(async(_req,res)=>{
    const [summary]=await q(`SELECT count(*)::int AS total,
      count(*) FILTER (WHERE EXISTS(SELECT 1 FROM credit_transactions ct WHERE ct.user_id=u.id AND ct.transaction_type='welcome_bonus' AND ct.promo_change=25))::int AS welcomed,
      count(*) FILTER (WHERE u.last_login_at >= now()-interval '7 days')::int AS active_seven_days
      FROM users u`);
    const listeners=await q(`SELECT u.id,u.email,u.display_name,u.created_at,u.last_login_at,
      EXISTS(SELECT 1 FROM credit_transactions ct WHERE ct.user_id=u.id AND ct.transaction_type='welcome_bonus' AND ct.promo_change=25) AS welcome_received,
      (SELECT min(ct.created_at) FROM credit_transactions ct WHERE ct.user_id=u.id AND ct.transaction_type='welcome_bonus' AND ct.promo_change=25) AS welcome_at
      FROM users u ORDER BY u.created_at DESC LIMIT 500`);
    res.json({summary,listeners});
  }));

  app.get('/api/admin/site-visits',wrap(async(_req,res)=>{
    const result={
      today_total:0,today_tiktok:0,today_installed_app:0,
      week_total:0,week_tiktok:0,week_installed_app:0,
      month_total:0,month_tiktok:0,month_installed_app:0,
      total_total:0,total_tiktok:0,total_installed_app:0,
      today_installs:0,week_installs:0,month_installs:0,total_installs:0
    };
    try{
      const [row]=await q(`SELECT
        count(*) FILTER (WHERE (created_at AT TIME ZONE 'Asia/Manila')::date=(now() AT TIME ZONE 'Asia/Manila')::date)::int AS today_total,
        count(*) FILTER (WHERE (created_at AT TIME ZONE 'Asia/Manila')::date=(now() AT TIME ZONE 'Asia/Manila')::date AND source='tiktok')::int AS today_tiktok,
        count(*) FILTER (WHERE (created_at AT TIME ZONE 'Asia/Manila')::date=(now() AT TIME ZONE 'Asia/Manila')::date AND source='installed_app')::int AS today_installed_app,
        count(*) FILTER (WHERE created_at>now()-interval '7 days')::int AS week_total,
        count(*) FILTER (WHERE created_at>now()-interval '7 days' AND source='tiktok')::int AS week_tiktok,
        count(*) FILTER (WHERE created_at>now()-interval '7 days' AND source='installed_app')::int AS week_installed_app,
        count(*) FILTER (WHERE created_at>now()-interval '30 days')::int AS month_total,
        count(*) FILTER (WHERE created_at>now()-interval '30 days' AND source='tiktok')::int AS month_tiktok,
        count(*) FILTER (WHERE created_at>now()-interval '30 days' AND source='installed_app')::int AS month_installed_app,
        count(*)::int AS total_total,
        count(*) FILTER (WHERE source='tiktok')::int AS total_tiktok,
        count(*) FILTER (WHERE source='installed_app')::int AS total_installed_app
        FROM site_visits`);
      Object.assign(result,row);
    }catch(error){}
    try{
      const [row]=await q(`SELECT
        count(*) FILTER (WHERE (created_at AT TIME ZONE 'Asia/Manila')::date=(now() AT TIME ZONE 'Asia/Manila')::date)::int AS today_installs,
        count(*) FILTER (WHERE created_at>now()-interval '7 days')::int AS week_installs,
        count(*) FILTER (WHERE created_at>now()-interval '30 days')::int AS month_installs,
        count(*)::int AS total_installs
        FROM app_installs`);
      Object.assign(result,row);
    }catch(error){}
    res.json(result);
  }));

  app.get(
    '/api/admin/requests',
    wrap(
      async(_req,res)=>{

        res.json(
          await q(
            'SELECT * FROM requests ORDER BY created_at DESC'
          )
        );
      }
    )
  );


  /* =========================================================
     DELETE REQUEST
  ========================================================= */

  app.delete(
    '/api/admin/requests/:id',
    wrap(
      async(req,res)=>{

        const id=
          uuid(
            req.params.id
          );


        const rows=
          await q(
            'DELETE FROM requests WHERE id=$1 RETURNING id',
            [
              id
            ]
          );


        if(
          !rows.length
        ){
          fail(
            404,
            'Request not found.'
          );
        }


        res.json({
          ok:true
        });
      }
    )
  );


  /* =========================================================
     BULK DELETE REQUESTS
  ========================================================= */

  app.post(
    '/api/admin/requests/bulk-delete',
    wrap(
      async(req,res)=>{

        const ids=
          Array.isArray(req.body.ids)
            ?req.body.ids
            :[];

        if(!ids.length){
          fail(400,'Select at least one request to delete.');
        }

        if(ids.length>500){
          fail(400,'Select 500 or fewer requests at a time.');
        }

        const validIds=ids.map(id=>uuid(id));

        const rows=await q(
          'DELETE FROM requests WHERE id=ANY($1::uuid[]) RETURNING id',
          [validIds]
        );

        res.json({
          ok:true,
          deleted:rows.length
        });
      }
    )
  );


  /* =========================================================
     UPDATE REQUEST
  ========================================================= */

  app.post(
    '/api/admin/requests/:id',
    wrap(
      async(req,res)=>{

        const id=
          uuid(
            req.params.id
          );


        const status=
          req.body.status;


        if(
          ![
            'pending',
            'working',
            'available'
          ].includes(status)
        ){
          fail(
            400,
            'Invalid request status.'
          );
        }


        const songId=
          req.body.songId
            ?uuid(
                req.body.songId
              )
            :null;


        if(
          status==='available'&&
          !songId
        ){
          fail(
            400,
            'Select the matching published Name Song.'
          );
        }


        if(
          songId&&
          !(
            await q(
              "SELECT id FROM songs WHERE id=$1 AND published=true AND category='NAME SONGS' AND (audio_path IS NOT NULL OR suno_url IS NOT NULL)",
              [
                songId
              ]
            )
          ).length
        ){
          fail(
            400,
            'Choose a published Name Song with audio.'
          );
        }


        const updated=await q(
          "UPDATE requests SET status=$2,song_id=$3 WHERE id=$1 AND status<>'notified' RETURNING id",
          [
            id,
            status,
            songId
          ]
        );


        if(!updated.length) fail(409,'Request was already emailed or no longer exists. Refresh the list.');

        res.json({
          ok:true
        });
      }
    )
  );


  /* =========================================================
     SEND NAME SONG MESSAGE
  ========================================================= */

  app.post(
    '/api/admin/requests/:id/notify',
    wrap(
      async(req,res)=>{

        const [r]=
          await q(
            'SELECT * FROM requests WHERE id=$1',
            [
              uuid(
                req.params.id
              )
            ]
          );


        if(
          !r||
          !r.song_id
        ){
          fail(
            400,
            'Link a published song before sending email.'
          );
        }


        if(r.status==='notified') return res.json({ok:true,alreadyNotified:true});
        if(r.status!=='available') fail(409,'Mark this request Available before sending the notification.');

        const [song]=
          await q(
            "SELECT id,title FROM songs WHERE id=$1 AND published=true AND category='NAME SONGS' AND (audio_path IS NOT NULL OR suno_url IS NOT NULL)",
            [
              r.song_id
            ]
          );


        if(
          !song
        ){
          fail(
            400,
            'The linked song is not published.'
          );
        }


        const subject=
          text(
            req.body.subject,
            160
          );

        const messageBody=
          text(
            req.body.message,
            5000
          );

        await s.mail(
          r.email,

          subject,

          messageBody,

          `name-request-${r.id}-${song.id}`
        );


        await q(
          "UPDATE requests SET status='notified',notified_at=$2 WHERE id=$1",
          [
            r.id,

            new Date()
          ]
        );


        res.json({
          ok:true
        });
      }
    )
  );


  /* =========================================================
     CREATE ORDER
  ========================================================= */

  app.post(
    '/api/orders',
    wrap(
      async(req,res)=>{

        sameOrigin(req);

        await limit(
          req,
          'order',
          10
        );


        const provider=
          req.body.provider;

        const kind=
          req.body.kind;

        const address=
          email(
            req.body.email
          );


        if(
          ![
            'gcash',
            'paypal'
          ].includes(provider)||
          ![
            'song',
            'membership'
          ].includes(kind)
        ){
          fail(
            400,
            'Invalid payment selection.'
          );
        }


        if(
          provider==='gcash'&&
          !env.GCASH_NUMBER||
          provider==='paypal'&&
          !env.PAYPAL_PAYMENT_URL
        ){
          fail(
            503,
            'This payment method is not set up yet.'
          );
        }


        let amount;
        let songId=null;


        if(
          kind==='song'
        ){

          songId=
            uuid(
              req.body.songId
            );


          const [song]=
            await q(
              'SELECT price FROM songs WHERE id=$1 AND published=true AND audio_path IS NOT NULL AND suno_url IS NULL',
              [
                songId
              ]
            );


          if(
            !song||
            song.price<=0
          ){
            fail(
              400,
              'This song is not available for purchase.'
            );
          }


          amount=
            song.price;


        }else{

          amount=
            Math.round(
              Number(
                env.MEMBERSHIP_PRICE_PHP||
                199
              )*100
            );
        }


        if(
          !Number.isInteger(
            amount
          )||
          amount<=0
        ){
          fail(
            503,
            'Membership price is not configured.'
          );
        }


        const id=
          randomUUID();


        await q(
          'INSERT INTO orders(id,customer_hash,email,provider,kind,song_id,amount) VALUES($1,$2,$3,$4,$5,$6,$7)',
          [
            id,

            customer(
              req,
              res
            ),

            address,

            provider,

            kind,

            songId,

            amount
          ]
        );


        res.status(201)
          .json({

            id,

            amount,

            currency:
              'PHP',

            instructions:
              provider==='gcash'
                ?{
                    number:
                      env.GCASH_NUMBER,

                    account:
                      env.GCASH_ACCOUNT_NAME||
                      ''
                  }
                :{
                    url:
                      env.PAYPAL_PAYMENT_URL
                  },

            message:
              'After paying, submit your transaction reference. Access starts only after MQ3 verifies the payment.'
          });
      }
    )
  );


  /* =========================================================
     PAYMENT REFERENCE
  ========================================================= */

  app.post(
    '/api/orders/:id/reference',
    wrap(
      async(req,res)=>{

        sameOrigin(req);

        await limit(
          req,
          'reference',
          12
        );


        const o=
          await owned(
            req,
            req.params.id
          );


        if(
          o.status!=='pending'&&
          o.status!=='submitted'
        ){
          fail(
            409,
            'This order is already reviewed.'
          );
        }


        await q(
          "UPDATE orders SET reference=$2,status='submitted' WHERE id=$1",
          [
            o.id,

            text(
              req.body.reference,
              100
            )
          ]
        );


        res.json({
          ok:true
        });
      }
    )
  );


  /* =========================================================
     MY ORDERS
  ========================================================= */

  app.get(
    '/api/my-orders',
    wrap(
      async(req,res)=>{

        if(
          !req.cookies
            .mq3_customer
        ){
          return res.json([]);
        }


        res.json(
          await q(
            'SELECT id,kind,song_id,provider,amount,status,expires_at,created_at FROM orders WHERE customer_hash=$1 ORDER BY created_at DESC',
            [
              hash(
                req.cookies
                  .mq3_customer
              )
            ]
          )
        );
      }
    )
  );


  /* =========================================================
     ORDER DETAILS
  ========================================================= */

  app.get(
    '/api/orders/:id',
    wrap(
      async(req,res)=>{

        const o=
          await owned(
            req,
            req.params.id
          );


        res.json({

          id:
            o.id,

          amount:
            o.amount,

          instructions:
            o.provider==='gcash'
              ?{
                  number:
                    env.GCASH_NUMBER,

                  account:
                    env.GCASH_ACCOUNT_NAME||
                    ''
                }
              :{
                  url:
                    env.PAYPAL_PAYMENT_URL
                }
        });
      }
    )
  );


  /* =========================================================
     ADMIN ORDERS
  ========================================================= */

  app.get(
    '/api/admin/orders',
    wrap(
      async(_req,res)=>{

        res.json(
          await q(
            'SELECT * FROM orders ORDER BY created_at DESC'
          )
        );
      }
    )
  );


  /* =========================================================
     REVIEW PAYMENT
  ========================================================= */

  app.post(
    '/api/admin/orders/:id/review',
    wrap(
      async(req,res)=>{

        const status=
          req.body.status;


        if(
          ![
            'paid',
            'rejected'
          ].includes(status)
        ){
          fail(
            400,
            'Invalid review.'
          );
        }


        if(
          status==='paid'&&
          req.body.verified!==true
        ){
          fail(
            400,
            'Verify the amount and reference in your payment account first.'
          );
        }


        const [o]=
          await q(
            'SELECT * FROM orders WHERE id=$1',
            [
              uuid(
                req.params.id
              )
            ]
          );


        if(
          !o||
          ![
            'submitted',
            'paid'
          ].includes(
            o.status
          )
        ){
          fail(
            409,
            'Only submitted payments can be reviewed.'
          );
        }


        if(
          o.status==='paid'
        ){
          return res.json({
            ok:true
          });
        }


        const days=
          Number(
            env.MEMBERSHIP_DAYS||
            30
          );


        if(
          !Number.isInteger(
            days
          )||
          days<1||
          days>366
        ){
          fail(
            503,
            'Invalid membership duration.'
          );
        }


        await q(
          'UPDATE orders SET status=$2,paid_at=$3,expires_at=$4 WHERE id=$1 AND status=$5',
          [
            o.id,

            status,

            status==='paid'
              ?new Date()
              :null,

            status==='paid'&&
            o.kind==='membership'
              ?new Date(
                  Date.now()+
                  days*86400000
                )
              :null,

            'submitted'
          ]
        );


        res.json({
          ok:true
        });
      }
    )
  );


  /* =========================================================
     ADMIN CREDIT LOADS
  ========================================================= */

  app.get(
    '/api/admin/credit-loads',
    wrap(
      async(_req,res)=>{

        const rows=
          await q(
            `SELECT
               clo.id,
               clo.user_id,
               u.email,
               u.display_name,
               clo.amount_pesos,
               clo.credits,
               clo.payment_provider,
               clo.payment_reference,
               clo.status,
               clo.created_at,
               clo.reviewed_at,
               to_jsonb(clo)->>'admin_deleted_at' AS admin_deleted_at,
               (SELECT pc.environment FROM paypal_checkouts pc WHERE pc.load_order_id=clo.id) AS payment_environment
             FROM credit_load_orders clo
             JOIN users u
               ON u.id=clo.user_id
             ORDER BY
               CASE
                 WHEN clo.status='pending' THEN 0
                 ELSE 1
               END,
               clo.created_at DESC`
          );


        res.json(
          rows.map(
            row=>({
              id:
                row.id,

              userId:
                row.user_id,

              email:
                row.email,

              displayName:
                row.display_name||
                '',

              amountPesos:
                Number(
                  row.amount_pesos||
                  0
                ),

              credits:
                Number(
                  row.credits||
                  0
                ),

              paymentProvider:
                row.payment_provider,
              paymentEnvironment:row.payment_environment||null,
              deletedAt:row.admin_deleted_at||null,

              paymentReference:
                row.payment_reference||
                '',

              status:
                row.status,

              createdAt:
                row.created_at,

              reviewedAt:
                row.reviewed_at
            })
          )
        );
      }
    )
  );


  /* =========================================================
     REVIEW CREDIT LOAD
  ========================================================= */

  app.delete('/api/admin/credit-loads/:id',wrap(async(req,res)=>{
    const rows=await q('UPDATE credit_load_orders SET admin_deleted_at=COALESCE(admin_deleted_at,now()) WHERE id=$1 RETURNING id',[uuid(req.params.id)]).catch(error=>{if(error.code==='42703')fail(503,'Run the Credit Load history SQL update in your MQ3 database, then retry.');throw error;});
    if(!rows.length)fail(404,'Credit Load order not found.');
    res.json({ok:true});
  }));
  app.post('/api/admin/credit-loads/:id/restore',wrap(async(req,res)=>{
    const rows=await q('UPDATE credit_load_orders SET admin_deleted_at=NULL WHERE id=$1 RETURNING id',[uuid(req.params.id)]).catch(error=>{if(error.code==='42703')fail(503,'Run the Credit Load history SQL update in your MQ3 database, then retry.');throw error;});
    if(!rows.length)fail(404,'Credit Load order not found.');
    res.json({ok:true});
  }));

  app.post(
    '/api/admin/credit-loads/:id/review',
    wrap(
      async(req,res)=>{

        const id=
          uuid(
            req.params.id
          );


        const [automatic]=await q('SELECT load_order_id FROM paypal_checkouts WHERE load_order_id=$1',[id]);
        if(automatic) fail(409,'Automatic PayPal payments are verified by PayPal and cannot be manually approved or rejected.');

        const status=
          String(
            req.body.status||
            ''
          ).trim().toLowerCase();


        if(
          ![
            'approved',
            'rejected'
          ].includes(status)
        ){
          fail(
            400,
            'Invalid Credit Load review.'
          );
        }


        if(
          status==='approved'&&
          req.body.verified!==true
        ){
          fail(
            400,
            'Verify the amount and payment reference in GCash or PayPal first.'
          );
        }


        if(
          status==='rejected'
        ){

          const rows=
            await q(
              `UPDATE credit_load_orders
               SET
                 status='rejected',
                 reviewed_at=$2
               WHERE id=$1
                 AND status='pending'
               RETURNING id`,
              [
                id,
                new Date()
              ]
            );


          if(!rows.length){

            const [existing]=
              await q(
                `SELECT status
                 FROM credit_load_orders
                 WHERE id=$1`,
                [
                  id
                ]
              );


            if(!existing){
              fail(
                404,
                'Credit Load order not found.'
              );
            }


            if(existing.status==='rejected'){
              return res.json({
                ok:true,
                status:'rejected'
              });
            }


            fail(
              409,
              'This Credit Load order has already been reviewed.'
            );
          }


          return res.json({
            ok:true,
            status:'rejected'
          });
        }


        const now=
          new Date();

        const transactionId=
          randomUUID();


        /*
          One SQL statement performs the approval.

          The order can move from pending to approved only when
          its listener wallet exists.

          The credit_purchase ledger row uses the Credit Load
          order ID as reference_id. The database unique index
          one_credit_purchase_per_load_order prevents the same
          load order from creating two purchase transactions.

          The wallet is credited only from the newly inserted
          ledger row, so repeated approval requests cannot add
          the Credits twice.
        */

        const rows=
          await q(
            `WITH reviewed AS (
               UPDATE credit_load_orders clo
               SET
                 status='approved',
                 reviewed_at=$2
               WHERE clo.id=$1
                 AND clo.status='pending'
                 AND EXISTS(
                   SELECT 1
                   FROM wallets w
                   WHERE w.user_id=clo.user_id
                 )
               RETURNING
                 clo.id,
                 clo.user_id,
                 clo.credits
             ),
             purchase AS (
               INSERT INTO credit_transactions(
                 id,
                 user_id,
                 transaction_type,
                 promo_change,
                 purchased_change,
                 description,
                 reference_id
               )
               SELECT
                 $3,
                 r.user_id,
                 'credit_purchase',
                 0,
                 r.credits,
                 'MQ3 Credit Load',
                 r.id
               FROM reviewed r
               ON CONFLICT DO NOTHING
               RETURNING
                 user_id,
                 purchased_change
             ),
             credited AS (
               UPDATE wallets w
               SET
                 purchased_credits=
                   w.purchased_credits+
                   p.purchased_change,
                 updated_at=$2
               FROM purchase p
               WHERE w.user_id=p.user_id
               RETURNING
                 w.user_id,
                 w.purchased_credits
             )
             SELECT
               r.id,
               r.user_id,
               r.credits,
               c.purchased_credits
             FROM reviewed r
             JOIN credited c
               ON c.user_id=r.user_id`,
            [
              id,
              now,
              transactionId
            ]
          );


        if(rows.length){

          return res.json({
            ok:true,
            status:'approved',
            creditsAdded:
              Number(
                rows[0].credits||
                0
              ),
            purchasedCredits:
              Number(
                rows[0].purchased_credits||
                0
              )
          });
        }


        const [existing]=
          await q(
            `SELECT
               clo.status,
               clo.user_id,
               COALESCE(w.purchased_credits,0) AS purchased_credits,
               EXISTS(
                 SELECT 1
                 FROM credit_transactions ct
                 WHERE ct.reference_id=clo.id
                   AND ct.transaction_type='credit_purchase'
               ) AS credited
             FROM credit_load_orders clo
             LEFT JOIN wallets w
               ON w.user_id=clo.user_id
             WHERE clo.id=$1`,
            [
              id
            ]
          );


        if(!existing){
          fail(
            404,
            'Credit Load order not found.'
          );
        }


        if(
          existing.status==='approved'&&
          existing.credited===true
        ){
          return res.json({
            ok:true,
            status:'approved',
            purchasedCredits:
              Number(
                existing.purchased_credits||
                0
              )
          });
        }


        if(existing.status==='rejected'){
          fail(
            409,
            'This Credit Load order was already rejected.'
          );
        }


        fail(
          409,
          'Credit Load approval could not be completed safely. Check the listener wallet and order status.'
        );
      }
    )
  );


  /* =========================================================
     EMAIL ACCESS LINK
  ========================================================= */

  app.post(
    '/api/admin/orders/:id/email',
    wrap(
      async(req,res)=>{

        const [o]=
          await q(
            "SELECT * FROM orders WHERE id=$1 AND status='paid'",
            [
              uuid(
                req.params.id
              )
            ]
          );


        if(
          !o
        ){
          fail(
            400,
            'Verify payment first.'
          );
        }


        const access=
          token();


        await q(
          'UPDATE orders SET access_hash=$2 WHERE id=$1',
          [
            o.id,

            hash(
              access
            )
          ]
        );


        await s.mail(
          o.email,

          'Your MQ3 access is ready',

          `Your payment is verified. Open this private link to access your purchase on this browser:
${origin()}/access.html#${access}

Keep this link private. Memberships expire on the stated access date.`,

          `order-${o.id}-${access}`
        );


        res.json({
          ok:true
        });
      }
    )
  );


  /* =========================================================
     REDEEM ACCESS
  ========================================================= */

  app.post(
    '/api/redeem',
    wrap(
      async(req,res)=>{

        sameOrigin(req);

        await limit(
          req,
          'redeem',
          10
        );


        const [o]=
          await q(
            "SELECT * FROM orders WHERE access_hash=$1 AND status='paid'",
            [
              hash(
                text(
                  req.body.token,
                  64
                )
              )
            ]
          );


        if(
          !o
        ){
          fail(
            400,
            'Access link is invalid or already used.'
          );
        }


        const owner=
          customer(
            req,
            res
          );


        const rows=
          await q(
            'UPDATE orders SET customer_hash=$2,access_hash=NULL WHERE id=$1 AND access_hash=$3 RETURNING id',
            [
              o.id,

              owner,

              o.access_hash
            ]
          );


        if(
          !rows.length
        ){
          fail(
            409,
            'Link already redeemed.'
          );
        }


        res.json({
          ok:true
        });
      }
    )
  );


  /* =========================================================
     SONG VIEW COUNTER
  ========================================================= */

  app.post(
    '/api/songs/:id/view',
    wrap(
      async(req,res)=>{

        sameOrigin(req);


        const id=
          uuid(
            req.params.id
          );


        /*
          Owner IP exclusion.

          EXCLUDED_VIEW_IPS is an optional, comma-separated env
          var (set in Vercel, never pasted into this file) of
          IPs whose visits should not count as real plays, e.g.
          Sally's own connection while she is testing. Same IP
          extraction as the rate limiter above, for consistency.
        */

        const requestIp=
          env.VERCEL
            ?(
                req.get(
                  'x-vercel-forwarded-for'
                )||
                req.socket.remoteAddress
              )
            :req.socket.remoteAddress;

        const excludedIps=
          String(
            env.EXCLUDED_VIEW_IPS||
            ''
          )
            .split(',')
            .map(v=>v.trim())
            .filter(Boolean);

        const isExcluded=
          requestIp&&
          excludedIps.includes(
            requestIp
          );


        if(isExcluded){

          const [current]=
            await q(
              'SELECT views FROM songs WHERE id=$1',
              [
                id
              ]
            );

          if(!current){
            fail(
              404,
              'Song is unavailable.'
            );
          }

          return res.json({
            ok:true,
            views:current.views,
            excluded:true
          });
        }


        const rows=
          await q(
            'UPDATE songs SET views=views+1 WHERE id=$1 AND published=true AND (audio_path IS NOT NULL OR suno_url IS NOT NULL) RETURNING views',
            [
              id
            ]
          );


        if(
          !rows.length
        ){
          fail(
            404,
            'Song is unavailable.'
          );
        }


        /*
          Daily play log, used for the admin "plays today /
          last 7 days" figures. Kept separate from the try/catch
          above: if song_plays does not exist yet in this
          database, the lifetime views counter above should
          still work normally.
        */

        try{

          await q(
            'INSERT INTO song_plays(song_id) VALUES($1)',
            [
              id
            ]
          );

        }catch(error){

          console.error(
            'song_plays insert failed:',
            error
          );
        }


        res.json({
          ok:true,
          views:rows[0].views
        });
      }
    )
  );


  /* =========================================================
     SITE VISIT LOG

     Fired once by the public site on page load, so we can see
     how much of the daily TikTok traffic actually reaches
     mq3music.com. Best-effort only: never blocks or breaks the
     page for the visitor, and silently no-ops if site_visits
     does not exist yet in this database.
  ========================================================= */

  app.post(
    '/api/site-visit',
    wrap(
      async(req,res)=>{

        sameOrigin(req);


        /*
          Same owner IP exclusion as the song view counter above,
          so Sally's own testing/browsing does not count as real
          site traffic.
        */

        const requestIp=
          env.VERCEL
            ?(
                req.get(
                  'x-vercel-forwarded-for'
                )||
                req.socket.remoteAddress
              )
            :req.socket.remoteAddress;

        const excludedIps=
          String(
            env.EXCLUDED_VIEW_IPS||
            ''
          )
            .split(',')
            .map(v=>v.trim())
            .filter(Boolean);

        const isExcluded=
          requestIp&&
          excludedIps.includes(
            requestIp
          );

        if(isExcluded){
          return res.json({
            ok:true,
            excluded:true
          });
        }


        const path=
          String(
            req.body?.path||
            '/'
          )
            .slice(0,200);

        const source=
          req.body?.source
            ?String(req.body.source)
              .toLowerCase()
              .replace(/[^a-z0-9_-]/g,'')
              .slice(0,40)||null
            :null;


        try{

          await q(
            'INSERT INTO site_visits(path,source) VALUES($1,$2)',
            [
              path,
              source
            ]
          );

        }catch(error){

          console.error(
            'site_visits insert failed:',
            error
          );
        }


        res.json({
          ok:true
        });
      }
    )
  );


  /* =========================================================
     APP INSTALL LOG

     Fired once by pwa.js when the native "appinstalled" event
     fires (Android/Chrome only — iOS Add to Home Screen does
     not report back). Best-effort only, same IP exclusion as
     the site-visit counter above.
  ========================================================= */

  app.post(
    '/api/app-install',
    wrap(
      async(req,res)=>{

        sameOrigin(req);

        const requestIp=
          env.VERCEL
            ?(
                req.get(
                  'x-vercel-forwarded-for'
                )||
                req.socket.remoteAddress
              )
            :req.socket.remoteAddress;

        const excludedIps=
          String(
            env.EXCLUDED_VIEW_IPS||
            ''
          )
            .split(',')
            .map(v=>v.trim())
            .filter(Boolean);

        const isExcluded=
          requestIp&&
          excludedIps.includes(
            requestIp
          );

        if(isExcluded){
          return res.json({
            ok:true,
            excluded:true
          });
        }

        try{

          await q(
            'INSERT INTO app_installs DEFAULT VALUES'
          );

        }catch(error){

          console.error(
            'app_installs insert failed:',
            error
          );
        }

        res.json({
          ok:true
        });
      }
    )
  );


  /* =========================================================
     AUDIO STREAM
  ========================================================= */

  app.get(
    '/api/songs/:id/audio',
    wrap(
      async(req,res)=>{

        const [song]=
          await q(
            'SELECT * FROM songs WHERE id=$1',
            [
              uuid(
                req.params.id
              )
            ]
          );


        if(
          !song||
          !song.published
        ){
          fail(
            404,
            'Song is unavailable.'
          );
        }


        let entitled=
          song.price===0;


        if(
          !entitled&&
          req.cookies
            .mq3_customer
        ){

          const rows=
            await q(
              "SELECT id FROM orders WHERE customer_hash=$1 AND status='paid' AND ((kind='song' AND song_id=$2) OR (kind='membership' AND expires_at>$3))",
              [
                hash(
                  req.cookies
                    .mq3_customer
                ),

                song.id,

                new Date()
              ]
            );


          entitled=
            rows.length>0;
        }


        const path=
          entitled
            ?song.audio_path
            :song.preview_path;


        if(
          !path
        ){
          fail(
            402,
            'Purchase this song or membership to listen.'
          );
        }


        if(
          req.get('Range')&&
          !/^bytes=\d*-\d*$/.test(
            req.get('Range')
          )
        ){
          fail(
            416,
            'Invalid byte range.'
          );
        }


        const response=
          await s.audio(
            path,
            req.get('Range')
          );


        if(
          ![
            200,
            206,
            416
          ].includes(
            response.status
          )
        ){
          fail(
            502,
            'Audio could not be loaded. Try again later.'
          );
        }


        res.status(
          response.status
        );


        res.set(
          'Cache-Control',
          'private, no-store'
        );


        res.set(
          'Content-Type',
          'audio/mpeg'
        );


        for(
          const h of [
            'content-length',
            'content-range',
            'accept-ranges'
          ]
        ){

          if(
            response.headers
              .get(h)
          ){

            res.set(
              h,
              response.headers
                .get(h)
            );
          }
        }


        if(
          !response.body
        ){
          return res.end();
        }


        const stream=
          Readable.fromWeb(
            response.body
          );


        stream.on(
          'error',
          ()=>res.destroy()
        );


        res.on(
          'close',
          ()=>stream.destroy()
        );


        stream.pipe(res);
      }
    )
  );


  /* =========================================================
     ADMIN REDIRECT
  ========================================================= */

  app.get(
    '/admin',
    (_req,res)=>
      res.redirect(
        '/admin.html'
      )
  );


  /* =========================================================
     PUBLIC FILES
  ========================================================= */

  app.use(
    express.static(
      fileURLToPath(
        new URL(
          '../public',
          import.meta.url
        )
      )
    )
  );


  /* =========================================================
     API 404
  ========================================================= */

  app.use(
    '/api',
    (_req,res)=>
      res.status(404)
        .json({
          error:
            'Endpoint not found.'
        })
  );


  /* =========================================================
     ERROR HANDLER
  ========================================================= */

  app.use(
    (
      err,
      _req,
      res,
      _next
    )=>{

      if(
        res.headersSent
      ){
        return res.end();
      }


      const duplicate=
        err.code==='23505';


      const status=
        err.status||
        (
          duplicate
            ?409
            :500
        );


      if(status>=500){

        console.error(
          'MQ3 API ERROR:',
          err
        );
      }


      res.status(status)
        .json({

          error:
            duplicate
              ?'This reference is already recorded. Check the existing order.'
              :status>=500&&
                !err.status
                ?'Service unavailable. Check your server configuration.'
                :err.message
        });
    }
  );


  return app;
}


export default createApp();
