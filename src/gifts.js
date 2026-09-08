import {randomUUID} from 'node:crypto';
import {digest,uuid,fail} from './security.js';


const GIFT_VALUES={
  heart:1,
  rose:5,
  star:10,
  music_note:25,
  crown:50,
  shoutout:100
};


export function giftRoutes({
  app,
  env,
  query:q,
  sameOrigin,
  limit
}){

  async function listener(req){

    const raw=
      req.cookies?.mq3_user;


    if(!raw){

      fail(
        401,
        'Sign in to send a gift.'
      );
    }


    const hash=
      digest(
        raw,
        env.SESSION_SECRET
      );


    const rows=
      await q(
        `
        SELECT
          u.id,
          u.email,
          u.display_name

        FROM user_sessions s

        JOIN users u
          ON u.id=s.user_id

        WHERE
          s.token_hash=$1
          AND s.expires_at>now()

        LIMIT 1
        `,
        [
          hash
        ]
      );


    if(!rows.length){

      fail(
        401,
        'Your session has expired. Sign in again.'
      );
    }


    return rows[0];
  }


  /* =========================================================
     AVAILABLE GIFTS
  ========================================================= */

  app.get(
    '/api/gifts',
    (_req,res)=>{

      res.json({

        gifts:[
          {
            type:'heart',
            name:'Heart',
            emoji:'❤️',
            credits:1
          },

          {
            type:'rose',
            name:'Rose',
            emoji:'🌹',
            credits:5
          },

          {
            type:'star',
            name:'Star',
            emoji:'⭐',
            credits:10
          },

          {
            type:'music_note',
            name:'Music Note',
            emoji:'🎵',
            credits:25
          },

          {
            type:'crown',
            name:'Crown',
            emoji:'👑',
            credits:50
          },

          {
            type:'shoutout',
            name:'Shout-out',
            emoji:'📣',
            credits:100
          }
        ]
      });
    }
  );


  /* =========================================================
     SEND GIFT
  ========================================================= */

  app.post(
    '/api/gifts/send',
    async(req,res)=>{

      sameOrigin(req);


      await limit(
        req,
        'gift-send',
        30
      );


      const user=
        await listener(req);


      const songId=
        uuid(
          req.body?.songId
        );


      const giftType=
        String(
          req.body?.giftType||
          ''
        )
          .trim()
          .toLowerCase();


      const credits=
        GIFT_VALUES[
          giftType
        ];


      if(!credits){

        fail(
          400,
          'Choose a valid gift.'
        );
      }


      const message=
        String(
          req.body?.message||
          ''
        )
          .trim()
          .slice(
            0,
            200
          );


      const giftId=
        randomUUID();


      const transactionId=
        randomUUID();


      const result=
        await q(
          `
          WITH locked_wallet AS (

            SELECT
              user_id,
              promo_credits,
              purchased_credits

            FROM wallets

            WHERE
              user_id=$1

            FOR UPDATE
          ),


          amounts AS (

            SELECT
              user_id,
              promo_credits,
              purchased_credits,

              LEAST(
                promo_credits,
                $2::integer
              ) AS promo_used,

              $2::integer-
              LEAST(
                promo_credits,
                $2::integer
              ) AS purchased_used

            FROM locked_wallet

            WHERE
              promo_credits+
              purchased_credits
              >=$2::integer
          ),


          updated_wallet AS (

            UPDATE wallets w

            SET
              promo_credits=
                w.promo_credits-
                a.promo_used,

              purchased_credits=
                w.purchased_credits-
                a.purchased_used,

              lifetime_gifted=
                w.lifetime_gifted+
                $2::integer,

              updated_at=
                now()

            FROM amounts a

            WHERE
              w.user_id=
              a.user_id

            RETURNING
              w.user_id,
              w.promo_credits,
              w.purchased_credits,
              w.lifetime_gifted,
              a.promo_used,
              a.purchased_used
          ),


          inserted_gift AS (

            INSERT INTO gifts(
              id,
              user_id,
              song_id,
              gift_type,
              credits,
              message
            )

            SELECT
              $3,
              user_id,
              $4,
              $2::integer,
              $5

            FROM updated_wallet

            RETURNING
              id
          ),


          inserted_transaction AS (

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
              $6,
              user_id,
              'gift_sent',
              -promo_used,
              -purchased_used,
              $7,
              $3

            FROM updated_wallet

            RETURNING
              id
          )


          SELECT
            uw.promo_credits,
            uw.purchased_credits,
            uw.lifetime_gifted,
            ig.id AS gift_id

          FROM updated_wallet uw

          JOIN inserted_gift ig
            ON true

          JOIN inserted_transaction it
            ON true
          `,
          [
            user.id,
            credits,
            giftId,
            giftType,
            message,
            transactionId,
            `Sent ${giftType} gift`
          ]
        );


      if(!result.length){

        fail(
          400,
          'Not enough MQ3 Credits.'
        );
      }


      const wallet=
        result[0];


      res.json({

        ok:true,


        gift:{
          id:
            wallet.gift_id,

          type:
            giftType,

          credits
        },


        wallet:{
          promoCredits:
            Number(
              wallet.promo_credits
            ),

          purchasedCredits:
            Number(
              wallet.purchased_credits
            ),

          balance:
            Number(
              wallet.promo_credits
            )+
            Number(
              wallet.purchased_credits
            ),

          lifetimeGifted:
            Number(
              wallet.lifetime_gifted
            )
        }
      });
    }
  );
}
