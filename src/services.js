import {neon} from '@neondatabase/serverless';
import {handleUpload} from '@vercel/blob/client';
import {
  get,
  del
} from '@vercel/blob';
import nodemailer from 'nodemailer';


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
       EMAIL — GMAIL
    ========================================================= */

    async mail(
      to,
      subject,
      body,
      key
    ){

      if(
        !env.GMAIL_USER||
        !env.GMAIL_APP_PASSWORD
      ){

        throw Object.assign(
          new Error(
            'Connect Gmail before sending email.'
          ),
          {
            status:503
          }
        );
      }


      const transporter=
        nodemailer.createTransport({
          service:'gmail',

          auth:{
            user:
              env.GMAIL_USER,

            pass:
              env.GMAIL_APP_PASSWORD
          }
        });


      try{

        await transporter.sendMail({
          from:
            `MQ3 Music <${env.GMAIL_USER}>`,

          to,

          subject,

          text:
            body,

          headers:{
            'X-MQ3-Message-Key':
              key
          }
        });

      }catch(error){

        console.error(
          'Gmail send failed:',
          error
        );


        throw Object.assign(
          new Error(
            'Email was not accepted. Check Gmail settings, then retry.'
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
      range
    ){

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


      const blob=
        result.blob;


      const size=
        Number(
          blob?.size||
          0
        );


      if(
        range&&
        size>0
      ){

        const match=
          /^bytes=(\d*)-(\d*)$/
            .exec(
              range
            );


        if(
          !match
        ){

          return new Response(
            null,
            {
              status:416,
              headers:{
                'Content-Range':
                  `bytes */${size}`,
                'Accept-Ranges':
                  'bytes'
              }
            }
          );
        }


        let start=
          match[1]
            ?Number(
                match[1]
              )
            :null;


        let end=
          match[2]
            ?Number(
                match[2]
              )
            :null;


        if(
          start===null
        ){

          const suffixLength=
            end;


          if(
            !Number.isInteger(
              suffixLength
            )||
            suffixLength<=0
          ){

            return new Response(
              null,
              {
                status:416,
                headers:{
                  'Content-Range':
                    `bytes */${size}`,
                  'Accept-Ranges':
                    'bytes'
                }
              }
            );
          }


          start=
            Math.max(
              size-
              suffixLength,
              0
            );


          end=
            size-
            1;

        }else{

          if(
            !Number.isInteger(
              start
            )||
            start<0||
            start>=size
          ){

            return new Response(
              null,
              {
                status:416,
                headers:{
                  'Content-Range':
                    `bytes */${size}`,
                  'Accept-Ranges':
                    'bytes'
                }
              }
            );
          }


          if(
            end===null||
            end>=size
          ){

            end=
              size-
              1;
          }


          if(
            !Number.isInteger(
              end
            )||
            end<start
          ){

            return new Response(
              null,
              {
                status:416,
                headers:{
                  'Content-Range':
                    `bytes */${size}`,
                  'Accept-Ranges':
                    'bytes'
                }
              }
            );
          }
        }


        const length=
          end-
          start+
          1;


        const chunk=
          blob.slice(
            start,
            end+
            1,
            blob.contentType||
            'audio/mpeg'
          );


        const headers=
          new Headers();


        headers.set(
          'Content-Type',
          blob.contentType||
          'audio/mpeg'
        );


        headers.set(
          'Content-Length',
          String(
            length
          )
        );


        headers.set(
          'Content-Range',
          `bytes ${start}-${end}/${size}`
        );


        headers.set(
          'Accept-Ranges',
          'bytes'
        );


        if(
          blob.etag
        ){

          headers.set(
            'ETag',
            blob.etag
          );
        }


        return new Response(
          chunk.stream(),
          {
            status:206,
            headers
          }
        );
      }


      const headers=
        new Headers(
          result.headers||
          {}
        );


      if(
        blob?.contentType
      ){

        headers.set(
          'Content-Type',
          blob.contentType
        );
      }


      if(
        size>0
      ){

        headers.set(
          'Content-Length',
          String(
            size
          )
        );
      }


      if(
        blob?.etag
      ){

        headers.set(
          'ETag',
          blob.etag
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
    },


    /* =========================================================
       DELETE PRIVATE BLOB
    ========================================================= */

    async deleteBlob(path){

      if(!path){
        return;
      }


      if(
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


      await del(
        path,
        {
          token:
            env.BLOB_READ_WRITE_TOKEN||
            undefined
        }
      );
    }
  };
}
