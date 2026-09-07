import express from 'express';
import cookieParser from 'cookie-parser';
import {randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {fileURLToPath} from 'node:url';
import {services} from './services.js';
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
  'id,title,category,names,lyrics,price,duration_seconds,views,created_at';

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


  /* =========================================================
     PUBLIC CATALOG
  ========================================================= */

  app.get(
    '/api/catalog',
    wrap(
      async(req,res)=>{

        const songs=
          await q(
            `SELECT ${publicFields} FROM songs WHERE published=true AND audio_path IS NOT NULL ORDER BY created_at DESC`
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


        await q(
          'INSERT INTO requests(id,name,normalized_name,email) VALUES($1,$2,$3,$4) ON CONFLICT(normalized_name,email) DO NOTHING',
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
              'Your request is recorded. MQ3 can email you when the song is available.'
          });
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

        res.json(
          await q(
            'SELECT * FROM songs ORDER BY created_at DESC'
          )
        );
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


          if(
            req.body.published&&
            !existing.audio_path
          ){
            fail(
              400,
              'Upload full audio before publishing.'
            );
          }


          await q(
            'UPDATE songs SET title=$2,category=$3,names=$4,lyrics=$5,price=$6,published=$7,duration_seconds=COALESCE($8,duration_seconds) WHERE id=$1',
            [
              id,

              title,

              category,

              names,

              lyrics,

              price,

              req.body
                .published===true,

              durationSeconds
            ]
          );


        }else{

          await q(
            'INSERT INTO songs(id,title,category,names,lyrics,price,duration_seconds) VALUES($1,$2,$3,$4,$5,$6,$7)',
            [
              id,

              title,

              category,

              names,

              lyrics,

              price,

              durationSeconds
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
              'SELECT id FROM songs WHERE id=$1',
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
              "SELECT id FROM songs WHERE id=$1 AND published=true AND category='NAME SONGS' AND audio_path IS NOT NULL",
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


        await q(
          'UPDATE requests SET status=$2,song_id=$3 WHERE id=$1',
          [
            id,
            status,
            songId
          ]
        );


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


        const [song]=
          await q(
            "SELECT id,title FROM songs WHERE id=$1 AND published=true AND category='NAME SONGS' AND audio_path IS NOT NULL",
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


        await s.mail(
          r.email,

          'Your MQ3 name song is available',

          `Hello ${r.name},

Your requested song, ${song.title}, is available at ${origin()}/?song=${song.id}

Music. Quality. 3rd Gen.`,

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
              'SELECT price FROM songs WHERE id=$1 AND published=true AND audio_path IS NOT NULL',
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


        const rows=
          await q(
            'UPDATE songs SET views=views+1 WHERE id=$1 AND published=true AND audio_path IS NOT NULL RETURNING views',
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


        res.json({
          ok:true,
          views:rows[0].views
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
