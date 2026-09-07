import {neon} from '@neondatabase/serverless';
import {handleUpload} from '@vercel/blob/client';
import {get} from '@vercel/blob';


export function services(env=process.env){

  return {

    env,


    /* =========================================================
       DATABASE
    ========================================================= */

    query:async(
      sql,
      params=[]
    )=>{

      if(
        !env.DATABASE_URL
      ){

        throw Object.assign(
          new Error(
            'Database is not connected yet. Follow SETUP.md.'
          ),
          {
            status:503
          }
        );
      }


      return neon(
        env.DATABASE_URL
      ).query(
        sql,
        params
      );
    },


    /* =========================================================
       VERCEL BLOB CLIENT UPLOAD
    ========================================================= */

    upload:
      handleUpload,


    /* =========================================================
       EMAIL
    ========================================================= */

    async mail(
      to,
      subject,
      body,
      key
    ){

      if(
        !env.RESEND_API_KEY||
        !env.EMAIL_FROM
      ){

        throw Object.assign(
          new Error(
            'Connect Resend and EMAIL_FROM before sending email.'
          ),
          {
            status:503
          }
        );
      }


      const r=
        await fetch(
          'https://api.resend.com/emails',
          {
            method:'POST',

            headers:{
              Authorization:
                `Bearer ${env.RESEND_API_KEY}`,

              'Content-Type':
                'application/json',

              'Idempotency-Key':
                key
            },

            body:
              JSON.stringify({
                from:
                  env.EMAIL_FROM,

                to:[
                  to
                ],

                subject,

                text:
                  body
              })
          }
        );


      if(
        !r.ok
      ){

        throw Object.assign(
          new Error(
            'Email was not accepted. Check Resend settings, then retry.'
          ),
          {
            status:502
          }
        );
      }
    },


    /* =========================================================
       PRIVATE VERCEL BLOB AUDIO
    ========================================================= */

    async audio(
      path,
      _range
    ){

      /*
        New private Vercel Blob connections use
        BLOB_STORE_ID / OIDC.

        A BLOB_READ_WRITE_TOKEN may also exist
        for the current connected project.

        BLOB_HOST is NOT required.
      */

      if(
        !env.BLOB_STORE_ID&&
        !env.BLOB_READ_WRITE_TOKEN
      ){

        throw Object.assign(
          new Error(
            'Audio storage is not configured.'
          ),
          {
            status:503
          }
        );
      }


      if(
        !path||
        typeof path!=='string'||
        !path.startsWith('songs/')
      ){

        throw Object.assign(
          new Error(
            'Invalid audio path.'
          ),
          {
            status:400
          }
        );
      }


      /*
        get() is the supported way to retrieve
        files from a PRIVATE Vercel Blob store.

        The SDK automatically uses the connected
        Vercel project credentials.

        We still pass the existing token when
        available so this works with the current
        project configuration as well.
      */

      const result=
        await get(
          path,
          {
            access:'private',

            token:
              env.BLOB_READ_WRITE_TOKEN||
              undefined
          }
        );


      if(
        !result
      ){

        return new Response(
          null,
          {
            status:404
          }
        );
      }


      const headers=
        new Headers(
          result.headers||
          {}
        );


      if(
        result.blob?.contentType
      ){

        headers.set(
          'Content-Type',
          result.blob.contentType
        );
      }


      if(
        result.blob?.size!=null
      ){

        headers.set(
          'Content-Length',
          String(
            result.blob.size
          )
        );
      }


      if(
        result.blob?.etag
      ){

        headers.set(
          'ETag',
          result.blob.etag
        );
      }


      headers.set(
        'Accept-Ranges',
        'bytes'
      );


      return new Response(
        result.stream,
        {
          status:
            result.statusCode||
            200,

          headers
        }
      );
    }
  };
}
