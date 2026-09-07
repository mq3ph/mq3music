import {neon} from '@neondatabase/serverless';
import {handleUpload} from '@vercel/blob/client';
export function services(env=process.env){
  return {
    env,
    query:async(sql,params=[])=>{if(!env.DATABASE_URL)throw Object.assign(new Error('Database is not connected yet. Follow SETUP.md.'),{status:503});return neon(env.DATABASE_URL).query(sql,params);},
    upload:handleUpload,
    async mail(to,subject,body,key){
      if(!env.RESEND_API_KEY||!env.EMAIL_FROM)throw Object.assign(new Error('Connect Resend and EMAIL_FROM before sending email.'),{status:503});
      const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({from:env.EMAIL_FROM,to:[to],subject,text:body})});
      if(!r.ok)throw Object.assign(new Error('Email was not accepted. Check Resend settings, then retry.'),{status:502});
    },
    async audio(path,range){
      if(!env.BLOB_HOST||!env.BLOB_READ_WRITE_TOKEN)throw Object.assign(new Error('Audio storage is not configured.'),{status:503});
      if(!/^[a-z0-9-]+\.private\.blob\.vercel-storage\.com$/.test(env.BLOB_HOST))throw new Error('Invalid private BLOB_HOST');
      const url=new URL(path,`https://${env.BLOB_HOST}/`);
      if(url.hostname!==env.BLOB_HOST||url.protocol!=='https:')throw new Error('Invalid audio path');
      return fetch(url,{headers:{Authorization:`Bearer ${env.BLOB_READ_WRITE_TOKEN}`,...(range?{Range:range}:{})},redirect:'error'});
    }
  };
}
