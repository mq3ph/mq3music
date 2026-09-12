import {capturePaypalOrder, verifyPaypalWebhook} from './paypal.js';
import {randomInt,randomUUID} from 'node:crypto';
import {
  token,
  digest,
  email,
  fail
} from './security.js';


const OTP_LIFETIME_MS=
  10*60*1000;

const SESSION_LIFETIME_MS=
  30*24*60*60*1000;

const WELCOME_CREDITS=
  25;

const DISPLAY_NAME_CHANGE_MS=
  30*24*60*60*1000;


const CREDIT_LOAD_PACKAGES={
  50:50,
  100:105,
  250:275,
  500:575,
  1000:1200
};


/* =========================================================
   MQ3 LISTENER ACCOUNT ROUTES
========================================================= */

export function accountRoutes({
  app,
  env,
  query:q,
  mail,
  sameOrigin,
  limit,
  cookieOptions
}){

  const hash=value=>
    digest(
      value,
      env.SESSION_SECRET
    );


  const paypalEnvironment=()=>{
    const mode=String(env.PAYPAL_ENV||'sandbox').trim().toLowerCase();
    if(!['live','sandbox'].includes(mode)) fail(503,'PAYPAL_ENV must be live or sandbox.');
    return mode;
  };

  const paypalBaseUrl=()=>
    paypalEnvironment()==='live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';


  async function paypalAccessToken(){

    const clientId=
      String(env.PAYPAL_CLIENT_ID||'').trim();

    const secret=
      String(env.PAYPAL_SECRET||env.PAYPAL_CLIENT_SECRET||'').trim();


    if(!clientId||!secret){

      fail(
        503,
        'PayPal automatic payments are not configured yet.'
      );
    }


    const basicAuth=
      Buffer.from(
        `${clientId}:${secret}`
      ).toString('base64');


    const response=
      await fetch(
        `${paypalBaseUrl()}/v1/oauth2/token`,
        {
          method:'POST',
          headers:{
            Authorization:
              `Basic ${basicAuth}`,
            'Content-Type':
              'application/x-www-form-urlencoded'
          },
          body:
            'grant_type=client_credentials'
        }
      );


    if(!response.ok){

      const detail=
        await response.text();

      console.error(
        '[mq3/paypal/auth]',
        response.status,
        detail
      );

      fail(
        502,
        'PayPal authentication failed.'
      );
    }


    const data=
      await response.json();

    return data.access_token;
  }


  const paypalReturnBaseUrl=()=>{
    const configured=
      String(
        env.APP_URL||
        ''
      ).trim();

    let url;
    try { url=new URL(configured); } catch { fail(503,'Set APP_URL to your MQ3 website address before using PayPal.'); }
    if(url.protocol!=='https:' && !(url.protocol==='http:' && url.hostname==='localhost')) fail(503,'APP_URL must use HTTPS.');
    return url.origin;
  };


  async function createPaypalCreditOrder(
    amountPesos,
    credits,
    localId
  ){

    const accessToken=
      await paypalAccessToken();

    const appUrl=
      paypalReturnBaseUrl();


    const response=
      await fetch(
        `${paypalBaseUrl()}/v2/checkout/orders`,
        {
          method:'POST',
          headers:{
            Authorization:
              `Bearer ${accessToken}`,
            'PayPal-Request-Id':randomUUID(),
            Prefer:'return=representation',
            'Content-Type':
              'application/json'
          },
          body:
            JSON.stringify({
              intent:'CAPTURE',

              payment_source:{
                paypal:{
                  experience_context:{
                    brand_name:
                      'MQ3 Music',

                    shipping_preference:
                      'NO_SHIPPING',

                    user_action:
                      'PAY_NOW',

                    return_url:
                      `${appUrl}/?mq3_paypal=return`,

                    cancel_url:
                      `${appUrl}/?mq3_paypal=cancel`
                  }
                }
              },

              purchase_units:[
                {
                  custom_id:localId,
                  description:
                    `MQ3 ${credits} Credits`,
                  amount:{
                    currency_code:'PHP',
                    value:
                      Number(
                        amountPesos
                      ).toFixed(2)
                  }
                }
              ]
            })
        }
      );


    const data=
      await response.json();


    if(!response.ok){

      console.error(
        '[mq3/paypal/create-order]',
        response.status,
        data
      );

      fail(
        502,
        'PayPal could not create the payment.'
      );
    }


    return data;
  }


  async function capturePaypalCreditOrder(orderId,localId,expectedAmount){
    return capturePaypalOrder({
      baseUrl:paypalBaseUrl(), accessToken:await paypalAccessToken(), orderId, localId, expectedAmount
    });
  }

  /* =========================================================
     CLAIM WELCOME BONUS

     Credits are granted the first time a listener saves a
     real display name, never before. credit_transactions has
     a unique partial index for transaction_type='welcome_bonus',
     so the INSERT below is the authoritative one-time claim
     and this function is always safe to call more than once
     for the same user.
  ========================================================= */

  async function claimWelcomeBonus(userId,now){

    await q(
      `WITH bonus AS (
         INSERT INTO credit_transactions(
           id,
           user_id,
           transaction_type,
           promo_change,
           purchased_change,
           description
         )
         VALUES(
           $1,
           $2,
           'welcome_bonus',
           $3,
           0,
           'MQ3 Welcome Credits'
         )
         ON CONFLICT DO NOTHING
         RETURNING user_id
       )
       UPDATE wallets
       SET
         promo_credits=
           promo_credits+$3,
         welcome_bonus_claimed=true,
         updated_at=$4
       WHERE user_id IN(
         SELECT user_id
         FROM bonus
       )`,
      [
        randomUUID(),
        userId,
        WELCOME_CREDITS,
        now
      ]
    );


    /*
      Defensive repair:

      If the bonus transaction already exists, the account
      must also be marked as having claimed the bonus.

      This does NOT add credits.
    */

    await q(
      `UPDATE wallets
       SET
         welcome_bonus_claimed=true,
         updated_at=$2
       WHERE user_id=$1
         AND welcome_bonus_claimed=false
         AND EXISTS(
           SELECT 1
           FROM credit_transactions
           WHERE user_id=$1
             AND transaction_type='welcome_bonus'
         )`,
      [
        userId,
        now
      ]
    );
  }


  /* =========================================================
     ACCOUNT RESPONSE
  ========================================================= */

  async function accountData(userId){

    const [row]=
      await q(
        `SELECT
           u.id,
           u.email,
           u.display_name,
           u.display_name_changed_at,
           u.created_at,
           u.last_login_at,
           COALESCE(w.promo_credits,0) AS promo_credits,
           COALESCE(w.purchased_credits,0) AS purchased_credits,
           COALESCE(w.lifetime_gifted,0) AS lifetime_gifted,
           COALESCE(w.welcome_bonus_claimed,false) AS welcome_bonus_claimed
         FROM users u
         LEFT JOIN wallets w
           ON w.user_id=u.id
         WHERE u.id=$1`,
        [
          userId
        ]
      );


    if(!row){
      fail(
        404,
        'MQ3 account not found.'
      );
    }


    const promo=
      Number(
        row.promo_credits||
        0
      );

    const purchased=
      Number(
        row.purchased_credits||
        0
      );


    const giftHistory=
      await q(
        `SELECT
           g.id,
           g.gift_type,
           g.credits,
           g.message,
           g.created_at,
           s.id AS song_id,
           s.title AS song_title
         FROM gifts g
         JOIN songs s
           ON s.id=g.song_id
         WHERE g.user_id=$1
         ORDER BY g.created_at DESC
         LIMIT 50`,
        [
          userId
        ]
      );


    const creditLoadOrders=
      await q(
        `SELECT
           id,
           amount_pesos,
           credits,
           payment_provider,
           payment_reference,
           status,
           created_at,
           reviewed_at,
           (SELECT pc.environment FROM paypal_checkouts pc WHERE pc.load_order_id=credit_load_orders.id) AS payment_environment
         FROM credit_load_orders
         WHERE user_id=$1
         ORDER BY created_at DESC
         LIMIT 25`,
        [
          userId
        ]
      );


    return {

      id:
        row.id,

      email:
        row.email,

      displayName:
        row.display_name||
        '',

      displayNameChangedAt:
        row.display_name_changed_at,

      displayNameCanChangeAt:
        row.display_name_changed_at
          ?new Date(
              new Date(
                row.display_name_changed_at
              ).getTime()+
              DISPLAY_NAME_CHANGE_MS
            )
          :null,

      credits:{
        promo,
        purchased,
        total:
          promo+
          purchased
      },

      lifetimeGifted:
        Number(
          row.lifetime_gifted||
          0
        ),

      giftHistory:
        giftHistory.map(
          gift=>({
            id:
              gift.id,

            type:
              gift.gift_type,

            credits:
              Number(
                gift.credits||
                0
              ),

            message:
              gift.message||
              '',

            songId:
              gift.song_id,

            songTitle:
              gift.song_title,

            createdAt:
              gift.created_at
          })
        ),

      creditLoadOrders:
        creditLoadOrders.map(
          order=>({
            id:
              order.id,

            amountPesos:
              Number(
                order.amount_pesos||
                0
              ),

            credits:
              Number(
                order.credits||
                0
              ),

            paymentProvider:
              order.payment_provider,
            paymentEnvironment:order.payment_environment||null,

            paymentReference:
              order.payment_reference||
              '',

            status:
              order.status,

            createdAt:
              order.created_at,

            reviewedAt:
              order.reviewed_at
          })
        ),

      welcomeBonusClaimed:
        row.welcome_bonus_claimed===true,

      createdAt:
        row.created_at,

      lastLoginAt:
        row.last_login_at
    };
  }


  /* =========================================================
     CURRENT LISTENER SESSION
  ========================================================= */

  async function currentUser(req){

    const value=
      req.cookies.mq3_user;


    if(
      !value||
      !/^[a-f0-9]{64}$/.test(value)
    ){
      return null;
    }


    const [session]=
      await q(
        `SELECT
           us.user_id
         FROM user_sessions us
         JOIN users u
           ON u.id=us.user_id
         WHERE us.token_hash=$1
           AND us.expires_at>$2`,
        [
          hash(value),
          new Date()
        ]
      );


    return session
      ?session.user_id
      :null;
  }


  /* =========================================================
     REQUIRE LISTENER LOGIN
  ========================================================= */

  async function requireUser(req){

    const userId=
      await currentUser(req);


    if(!userId){
      fail(
        401,
        'Sign in to your MQ3 account.'
      );
    }


    return userId;
  }


  /* =========================================================
     REQUEST 6-DIGIT LOGIN CODE
  ========================================================= */

  app.post(
    '/api/account/request-code',
    async(req,res,next)=>{

      try{

        sameOrigin(req);


        await limit(
          req,
          'account-code',
          5
        );


        const address=
          email(
            req.body.email
          );


        /*
          A second limiter tied to the email address.

          We do not put the raw email in the limiter key.
        */

        await limit(
          req,
          `account-email-${hash(address)}`,
          5
        );


        const code=
          String(
            randomInt(
              0,
              1000000
            )
          ).padStart(
            6,
            '0'
          );


        const id=
          randomUUID();


        const now=
          new Date();

        const expiresAt=
          new Date(
            now.getTime()+
            OTP_LIFETIME_MS
          );


        /*
          Invalidate any previous unused code.

          Only the newest code should work.
        */

        await q(
          `UPDATE user_login_codes
           SET used_at=$2
           WHERE email=$1
             AND used_at IS NULL`,
          [
            address,
            now
          ]
        );


        /*
          Store only the HMAC digest.
          The six-digit code itself is never stored.
        */

        await q(
          `INSERT INTO user_login_codes(
             id,
             email,
             code_hash,
             expires_at
           )
           VALUES($1,$2,$3,$4)`,
          [
            id,
            address,
            hash(
              `${address}:${code}`
            ),
            expiresAt
          ]
        );


        try{

          await mail(
            address,

            'Your MQ3 sign-in code',

            `Your MQ3 sign-in code is:

${code}

This code expires in 10 minutes.

If you did not request this code, you can ignore this email.

MQ3 Music
Music. Quality. 3rd Gen.`,

            `mq3-login-${id}`
          );


        }catch(error){

          /*
            If email sending fails, invalidate the code.
          */

          await q(
            `UPDATE user_login_codes
             SET used_at=$2
             WHERE id=$1
               AND used_at IS NULL`,
            [
              id,
              new Date()
            ]
          );


          throw error;
        }


        res.json({
          ok:true,

          message:
            'Check your email for your 6-digit MQ3 sign-in code.'
        });


      }catch(error){
        next(error);
      }
    }
  );


  /* =========================================================
     VERIFY LOGIN CODE
  ========================================================= */

  app.post(
    '/api/account/verify-code',
    async(req,res,next)=>{

      try{

        sameOrigin(req);


        await limit(
          req,
          'account-verify',
          10
        );


        const address=
          email(
            req.body.email
          );


        const code=
          String(
            req.body.code||
            ''
          ).trim();


        if(
          !/^\d{6}$/.test(code)
        ){
          fail(
            400,
            'Enter the 6-digit code from your email.'
          );
        }


        const now=
          new Date();


        /*
          Atomically consume the newest valid code.

          The UPDATE condition means the same OTP cannot
          successfully be used twice.
        */

        const usedCodes=
          await q(
            `UPDATE user_login_codes
             SET used_at=$4
             WHERE id=(
               SELECT id
               FROM user_login_codes
               WHERE email=$1
                 AND code_hash=$2
                 AND used_at IS NULL
                 AND expires_at>$3
               ORDER BY created_at DESC
               LIMIT 1
             )
             AND used_at IS NULL
             RETURNING id`,
            [
              address,

              hash(
                `${address}:${code}`
              ),

              now,

              now
            ]
          );


        if(!usedCodes.length){

          fail(
            401,
            'That code is incorrect or expired. Request a new code.'
          );
        }


        /*
          Create the listener account if this email has never
          signed in before.

          Existing accounts simply get last_login_at updated.
        */

        const [user]=
          await q(
            `INSERT INTO users(
               id,
               email,
               display_name,
               last_login_at
             )
             VALUES($1,$2,$3,$4)
             ON CONFLICT(email)
             DO UPDATE SET
               last_login_at=EXCLUDED.last_login_at
             RETURNING
               id,
               email,
               display_name`,
            [
              randomUUID(),
              address,
              '',
              now
            ]
          );


        /*
          Every listener gets one wallet.

          Wallet starts at zero. Welcome Credits are granted
          separately below.
        */

        await q(
          `INSERT INTO wallets(
             user_id,
             promo_credits,
             purchased_credits,
             lifetime_gifted,
             welcome_bonus_claimed
           )
           VALUES($1,0,0,0,false)
           ON CONFLICT(user_id)
           DO NOTHING`,
          [
            user.id
          ]
        );


        /*
          Welcome Credits are intentionally NOT granted here.

          They are granted once, in POST /api/account/profile,
          the first time this listener saves a real display
          name. This closes the loophole where an account could
          sign in and collect the bonus without ever being
          identified by name.
        */


        /*
          Create listener session.

          Listener sessions are intentionally separate from
          admin sessions.
        */

        const sessionToken=
          token();


        await q(
          `INSERT INTO user_sessions(
             token_hash,
             user_id,
             expires_at
           )
           VALUES($1,$2,$3)`,
          [
            hash(sessionToken),
            user.id,

            new Date(
              now.getTime()+
              SESSION_LIFETIME_MS
            )
          ]
        );


        res.cookie(
          'mq3_user',
          sessionToken,
          {
            ...cookieOptions(),

            maxAge:
              SESSION_LIFETIME_MS
          }
        );


        /*
          Opportunistic cleanup.
          No user data is removed here.
        */

        await q(
          `DELETE FROM user_login_codes
           WHERE expires_at<$1
              OR (
                used_at IS NOT NULL
                AND used_at<$2
              )`,
          [
            now,

            new Date(
              now.getTime()-
              24*60*60*1000
            )
          ]
        );


        await q(
          `DELETE FROM user_sessions
           WHERE expires_at<$1`,
          [
            now
          ]
        );


        res.json({
          ok:true,

          account:
            await accountData(
              user.id
            )
        });


      }catch(error){
        next(error);
      }
    }
  );


  /* =========================================================
     CURRENT ACCOUNT
  ========================================================= */

  app.get(
    '/api/account',
    async(req,res,next)=>{

      try{

        const userId=
          await currentUser(req);


        if(!userId){

          return res.json({
            signedIn:false
          });
        }


        res.json({
          signedIn:true,

          account:
            await accountData(
              userId
            )
        });


      }catch(error){
        next(error);
      }
    }
  );


  /* =========================================================
     CREDIT LOAD PACKAGES
  ========================================================= */

  app.get(
    '/api/account/credit-packages',
    (_req,res)=>{

      res.json({
        packages:
          Object.entries(
            CREDIT_LOAD_PACKAGES
          ).map(
            ([amountPesos,credits])=>({
              amountPesos:
                Number(
                  amountPesos
                ),

              credits
            })
          )
      });
    }
  );


  /* =========================================================
     AUTOMATIC PAYPAL CREDIT LOAD
  ========================================================= */

  async function settlePaypalCreditOrder(loadOrder,orderId,userId){
        if(loadOrder.paypal_environment!==paypalEnvironment()) fail(409,'Payment environment does not match this checkout.');
        if(loadOrder.status==='approved'){
          if(loadOrder.paypal_environment==='live'){
            const [ledger]=await q("SELECT id FROM credit_transactions WHERE reference_id=$1 AND user_id=$2 AND transaction_type='credit_purchase'",[loadOrder.id,userId]);
            if(!ledger) fail(409,'Payment needs support review: wallet transaction is missing.');
          }
          return ({
            ok:true,
            status:'approved',
            alreadyCredited:true,
            sandbox:loadOrder.paypal_environment==='sandbox',
            account:
              await accountData(
                userId
              )
          });
        }


        if(loadOrder.status!=='pending'){

          fail(
            409,
            'This PayPal Credit Load is no longer pending.'
          );
        }


        const capture=
          await capturePaypalCreditOrder(
            orderId, loadOrder.id, Number(loadOrder.amount_pesos)
          );


        const purchaseUnit=
          capture?.purchase_units?.[0];

        const captured=
          purchaseUnit?.payments?.captures?.[0];

        const paidAmount=
          Number(
            captured?.amount?.value
          );

        const paidCurrency=
          String(
            captured?.amount?.currency_code||
            ''
          ).toUpperCase();


        const completed=
          capture?.status==='COMPLETED'&&
          captured?.status==='COMPLETED';


        const expectedAmount=
          Number(
            loadOrder.amount_pesos
          );


        if(
          purchaseUnit?.custom_id!==loadOrder.id||
          capture?.id!==orderId||
          capture?.purchase_units?.length!==1||
          purchaseUnit?.payments?.captures?.length!==1||
          !captured?.id||
          !completed||
          paidCurrency!=='PHP'||
          !Number.isFinite(paidAmount)||
          paidAmount!==expectedAmount
        ){

          console.error(
            '[mq3/paypal/verification-failed]',
            {
              orderId,
              orderStatus:
                capture?.status,
              captureStatus:
                captured?.status,
              paidAmount,
              paidCurrency,
              expectedAmount
            }
          );

          fail(
            400,
            'PayPal payment could not be verified.'
          );
        }


        const capturedRows=await q(`UPDATE paypal_checkouts SET capture_id=$2 WHERE load_order_id=$1 AND (capture_id IS NULL OR capture_id=$2) RETURNING load_order_id`,[loadOrder.id,captured.id]);
        if(!capturedRows.length) fail(409,'Capture does not match the stored payment.');
        if(loadOrder.paypal_environment==='sandbox'){
          await q(`UPDATE credit_load_orders SET status='approved',reviewed_at=$2 WHERE id=$1 AND status='pending'`,[loadOrder.id,new Date()]);
          return {ok:true,status:'approved',sandbox:true,creditsAdded:0,testCredits:Number(loadOrder.credits),account:await accountData(userId)};
        }

        const transactionId=
          randomUUID();

        const now=
          new Date();


        const rows=
          await q(
            `WITH reviewed AS (
               UPDATE credit_load_orders clo
               SET
                 status='approved',
                 reviewed_at=$2
               WHERE clo.id=$1
                 AND clo.user_id=$4
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
                 'MQ3 PayPal Credit Load',
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
               r.credits,
               c.purchased_credits
             FROM reviewed r
             JOIN credited c
               ON c.user_id=r.user_id`,
            [
              loadOrder.id,
              now,
              transactionId,
              userId
            ]
          );


        if(!rows.length){

          const [existing]=
            await q(
              `SELECT
                 clo.status,
                 EXISTS(
                   SELECT 1
                   FROM credit_transactions ct
                   WHERE ct.reference_id=clo.id
                     AND ct.transaction_type='credit_purchase'
                 ) AS credited
               FROM credit_load_orders clo
               WHERE clo.id=$1
                 AND clo.user_id=$2`,
              [
                loadOrder.id,
                userId
              ]
            );


          if(
            existing?.status==='approved'&&
            existing?.credited===true
          ){

            return ({
              ok:true,
              status:'approved',
              alreadyCredited:true,
            sandbox:loadOrder.paypal_environment==='sandbox',
              account:
                await accountData(
                  userId
                )
            });
          }


          fail(
            409,
            'PayPal payment was captured, but MQ3 could not safely add the Credits. Please contact MQ3 support.'
          );
        }


        return ({
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
            ),
          account:
            await accountData(
              userId
            )
        });
  }

  app.post('/api/paypal/webhook',async(req,res,next)=>{
    try {
      await verifyPaypalWebhook({baseUrl:paypalBaseUrl(),accessToken:await paypalAccessToken(),webhookId:env.PAYPAL_WEBHOOK_ID,headers:req.headers,event:req.body});
      const event=req.body;
      if(!['CHECKOUT.ORDER.APPROVED','PAYMENT.CAPTURE.COMPLETED'].includes(event.event_type)) return res.json({ok:true,ignored:true});
      const orderId=event.event_type==='CHECKOUT.ORDER.APPROVED' ? event.resource?.id : event.resource?.supplementary_data?.related_ids?.order_id;
      if(typeof orderId!=='string' || !/^[a-zA-Z0-9]{6,100}$/.test(orderId)) fail(400,'Missing PayPal order ID.');
      const [loadOrder]=await q(`SELECT clo.id,clo.user_id,clo.amount_pesos,clo.credits,clo.status,pc.environment AS paypal_environment
        FROM paypal_checkouts pc JOIN credit_load_orders clo ON clo.id=pc.load_order_id
        WHERE pc.paypal_order_id=$1 AND pc.environment=$2`,[orderId,paypalEnvironment()]);
      // Events for other products/apps never grant MQ3 credits.
      if(!loadOrder) return res.json({ok:true,ignored:true});
      await settlePaypalCreditOrder(loadOrder,orderId,loadOrder.user_id);
      // Acknowledge only after durable completion; failures stay retryable by PayPal.
      res.json({ok:true});
    } catch(error){next(error);}
  });

  app.post(
    '/api/account/paypal/create-order',
    async(req,res,next)=>{

      try{

        sameOrigin(req);


        await limit(
          req,
          'paypal-create-order',
          8
        );


        const userId=
          await requireUser(req);


        const amountPesos=
          Number(
            req.body.amountPesos
          );


        const expectedCredits=
          CREDIT_LOAD_PACKAGES[
            amountPesos
          ];


        if(
          !Number.isInteger(amountPesos)||
          !expectedCredits
        ){

          fail(
            400,
            'Choose a valid MQ3 Credit package.'
          );
        }


        const id=randomUUID();
        const paymentEnvironment=paypalEnvironment();
        const paypalOrder=
          await createPaypalCreditOrder(
            amountPesos,
            expectedCredits,
            id
          );


        const orderId=
          String(
            paypalOrder?.id||
            ''
          ).trim();


        if(!orderId){

          fail(
            502,
            'PayPal did not return an order ID.'
          );
        }


        await q(
          `WITH inserted AS (INSERT INTO credit_load_orders(
             id,
             user_id,
             amount_pesos,
             credits,
             payment_provider,
             payment_reference,
             status
           )
           VALUES(
             $1,
             $2,
             $3,
             $4,
             'paypal',
             $5,
             'pending'
           ) RETURNING id)
           INSERT INTO paypal_checkouts(load_order_id,paypal_order_id,environment) SELECT id,$5,$6 FROM inserted`,
          [
            id,
            userId,
            amountPesos,
            expectedCredits,
            orderId,
            paymentEnvironment
          ]
        );


        const approvalUrl=
          String(
            paypalOrder?.links?.find(
              link=>
                link?.rel==='payer-action'||
                link?.rel==='approve'
            )?.href||
            ''
          ).trim();


        if(!approvalUrl){

          fail(
            502,
            'PayPal did not return an approval link.'
          );
        }


        res.status(
          201
        ).json({
          ok:true,
          orderId,
          approvalUrl,
          creditLoadOrderId:
            id,
          amountPesos,
          credits:
            expectedCredits
        });


      }catch(error){
        next(error);
      }
    }
  );


  app.post(
    '/api/account/paypal/capture-order',
    async(req,res,next)=>{

      try{

        sameOrigin(req);


        await limit(
          req,
          'paypal-capture-order',
          12
        );


        const userId=
          await requireUser(req);


        const orderId=
          String(
            req.body.orderId||
            ''
          ).normalize(
            'NFKC'
          ).trim();


        if(
          orderId.length<6||
          orderId.length>100
        ){

          fail(
            400,
            'Invalid PayPal order.'
          );
        }


        const [loadOrder]=
          await q(
            `SELECT
               clo.id,
               clo.amount_pesos,
               clo.credits,
               clo.status,
               pc.environment AS paypal_environment
             FROM credit_load_orders clo
             JOIN paypal_checkouts pc ON pc.load_order_id=clo.id
             WHERE clo.user_id=$1
               AND clo.payment_provider='paypal'
               AND pc.paypal_order_id=$2
             LIMIT 1`,
            [
              userId,
              orderId
            ]
          );


        if(!loadOrder){

          fail(
            404,
            'MQ3 PayPal Credit Load order not found.'
          );
        }


        res.json(await settlePaypalCreditOrder(loadOrder,orderId,userId));


      }catch(error){
        next(error);
      }
    }
  );


  /* =========================================================
     CREATE CREDIT LOAD ORDER
  ========================================================= */

  app.post(
    '/api/account/credit-load',
    async(req,res,next)=>{

      try{

        sameOrigin(req);


        await limit(
          req,
          'credit-load',
          8
        );


        const userId=
          await requireUser(req);


        const amountPesos=
          Number(
            req.body.amountPesos
          );


        const expectedCredits=
          CREDIT_LOAD_PACKAGES[
            amountPesos
          ];


        if(
          !Number.isInteger(amountPesos)||
          !expectedCredits
        ){

          fail(
            400,
            'Choose a valid MQ3 Credit package.'
          );
        }


        const paymentProvider=
          String(
            req.body.paymentProvider||
            ''
          ).trim().toLowerCase();


        if(
          ![
            'gcash',
            'paypal'
          ].includes(
            paymentProvider
          )
        ){

          fail(
            400,
            'Choose GCash or PayPal.'
          );
        }


        const paymentReference=
          String(
            req.body.paymentReference||
            ''
          ).normalize(
            'NFKC'
          ).trim();


        if(
          paymentReference.length<4||
          paymentReference.length>100
        ){

          fail(
            400,
            'Enter a valid payment reference.'
          );
        }


        /*
          GCash-specific format check.

          A real GCash transaction reference is a 13-digit
          numeric code (the app displays it in groups such as
          "1001 543 610110", but the number itself is 13
          digits). This rejects obviously fake/placeholder
          text such as "test123" before it is ever recorded as
          a pending order, without requiring any external
          verification call.

          PayPal references keep only the generic length check
          above, since PayPal's own transaction ID format is
          different.
        */

        if(paymentProvider==='gcash'){

          const digitsOnly=
            paymentReference.replace(
              /\s+/g,
              ''
            );

          if(
            !/^\d{13}$/.test(
              digitsOnly
            )
          ){

            fail(
              400,
              'Enter a valid 13-digit GCash reference number.'
            );
          }
        }


        const duplicate=
          await q(
            `SELECT id
             FROM credit_load_orders
             WHERE payment_provider=$1
               AND LOWER(payment_reference)=LOWER($2)
             LIMIT 1`,
            [
              paymentProvider,
              paymentReference
            ]
          );


        if(duplicate.length){

          fail(
            409,
            'This payment reference has already been submitted.'
          );
        }


        const id=
          randomUUID();


        const [order]=
          await q(
            `INSERT INTO credit_load_orders(
               id,
               user_id,
               amount_pesos,
               credits,
               payment_provider,
               payment_reference,
               status
             )
             VALUES(
               $1,
               $2,
               $3,
               $4,
               $5,
               $6,
               'pending'
             )
             RETURNING
               id,
               amount_pesos,
               credits,
               payment_provider,
               payment_reference,
               status,
               created_at`,
            [
              id,
              userId,
              amountPesos,
              expectedCredits,
              paymentProvider,
              paymentReference
            ]
          );


        res.status(
          201
        ).json({
          ok:true,

          message:
            'Payment submitted for MQ3 verification.',

          order:{
            id:
              order.id,

            amountPesos:
              Number(
                order.amount_pesos
              ),

            credits:
              Number(
                order.credits
              ),

            paymentProvider:
              order.payment_provider,
            paymentEnvironment:order.payment_environment||null,

            paymentReference:
              order.payment_reference,

            status:
              order.status,

            createdAt:
              order.created_at
          },

          account:
            await accountData(
              userId
            )
        });


      }catch(error){
        next(error);
      }
    }
  );


  /* =========================================================
     UPDATE DISPLAY NAME
  ========================================================= */

  app.post(
    '/api/account/profile',
    async(req,res,next)=>{

      try{

        sameOrigin(req);


        const userId=
          await requireUser(req);


        const displayName=
          String(
            req.body.displayName||
            ''
          ).normalize(
            'NFKC'
          ).trim();


        if(
          !displayName||
          displayName.length>50
        ){

          fail(
            400,
            'Enter a display name up to 50 characters.'
          );
        }


        const now=
          new Date();


        const [current]=
          await q(
            `SELECT
               display_name,
               display_name_changed_at
             FROM users
             WHERE id=$1`,
            [
              userId
            ]
          );


        if(!current){

          fail(
            404,
            'MQ3 account not found.'
          );
        }


        const currentName=
          String(
            current.display_name||
            ''
          ).trim();


        if(
          currentName===
          displayName
        ){

          return res.json({
            ok:true,

            account:
              await accountData(
                userId
              )
          });
        }


        if(
          currentName&&
          current.display_name_changed_at
        ){

          const canChangeAt=
            new Date(
              new Date(
                current.display_name_changed_at
              ).getTime()+
              DISPLAY_NAME_CHANGE_MS
            );


          if(
            canChangeAt>
            now
          ){

            const daysLeft=
              Math.ceil(
                (
                  canChangeAt.getTime()-
                  now.getTime()
                )/
                (
                  24*
                  60*
                  60*
                  1000
                )
              );


            fail(
              429,
              `You can change your display name again in ${daysLeft} ${
                daysLeft===1
                  ?'day'
                  :'days'
              }.`
            );
          }
        }


        const changed=
          await q(
            `UPDATE users
             SET
               display_name=$2,
               display_name_changed_at=$3
             WHERE id=$1
               AND (
                 display_name=''
                 OR display_name_changed_at IS NULL
                 OR display_name_changed_at<=$4
               )
             RETURNING id`,
            [
              userId,
              displayName,
              now,
              new Date(
                now.getTime()-
                DISPLAY_NAME_CHANGE_MS
              )
            ]
          );


        if(!changed.length){

          fail(
            429,
            'Your display name was changed recently. Please wait 30 days before changing it again.'
          );
        }


        /*
          First time this listener has ever set a real display
          name (currentName was blank going in): this is the
          moment the 25 Welcome Credits are earned.

          claimWelcomeBonus() is itself exactly-once (unique
          partial index on credit_transactions), so this is
          safe even if called again.
        */

        if(!currentName){

          await claimWelcomeBonus(
            userId,
            now
          );
        }


        res.json({
          ok:true,

          account:
            await accountData(
              userId
            )
        });


      }catch(error){
        next(error);
      }
    }
  );


  /* =========================================================
     LISTENER LOGOUT
  ========================================================= */

  app.post(
    '/api/account/logout',
    async(req,res,next)=>{

      try{

        sameOrigin(req);


        const value=
          req.cookies.mq3_user;


        if(
          value&&
          /^[a-f0-9]{64}$/.test(value)
        ){

          await q(
            `DELETE FROM user_sessions
             WHERE token_hash=$1`,
            [
              hash(value)
            ]
          );
        }


        res.clearCookie(
          'mq3_user',
          cookieOptions()
        );


        res.json({
          ok:true
        });


      }catch(error){
        next(error);
      }
    }
  );


  /* =========================================================
     EXPORT AUTH HELPER FOR FUTURE WALLET / GIFTS
  ========================================================= */

  return {
    currentUser,
    requireUser,
    accountData
  };
}
