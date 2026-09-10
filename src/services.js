import {neon} from '@neondatabase/serverless';
import {handleUpload} from '@vercel/blob/client';
import {
  get,
  list,
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
      _range
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
    },


    /* =========================================================
       DELETE PRIVATE BLOB
    ========================================================= */

    async listAudioFiles(){
      const blobs=[];let cursor;
      for(let page=0;page<50;page++) {
        const result=await list({prefix:'songs/',limit:1000,cursor,token:env.BLOB_READ_WRITE_TOKEN||undefined,storeId:env.BLOB_STORE_ID||undefined});
        blobs.push(...result.blobs.map(({pathname,size})=>({pathname,size})));
        if(!result.hasMore)return blobs;
        if(!result.cursor || result.cursor===cursor)throw Error('Storage scan could not complete. Try again later.');
        cursor=result.cursor;
      }
      throw Error('Storage scan is too large for this dashboard. Check Vercel Storage.');
    },

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
