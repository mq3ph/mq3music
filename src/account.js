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


    return {

      id:
        row.id,

      email:
        row.email,

      displayName:
        row.display_name||
        '',

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
          CLAIM THE WELCOME BONUS

          credit_transactions has a unique partial index for
          transaction_type='welcome_bonus'.

          The INSERT is therefore the authoritative one-time
          claim.

          This statement also updates the wallet only when
          the transaction was actually inserted.

          Both actions happen inside one SQL statement.
        */

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
            user.id,
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
            user.id,
            now
          ]
        );


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


        await q(
          `UPDATE users
           SET display_name=$2
           WHERE id=$1`,
          [
            userId,
            displayName
          ]
        );


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
