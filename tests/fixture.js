import {readFile} from 'node:fs/promises';
import {newDb} from 'pg-mem';
import {createApp} from '../src/index.js';
import {passwordHash} from '../src/security.js';
const origin='http://localhost:3000';
export async function fixture(){
  const db=newDb();db.public.none(await readFile(new URL('../schema.sql',import.meta.url),'utf8'));
  const {Pool}=db.adapters.createPg();const pool=new Pool();const sent=[];
  const env={APP_URL:origin,SESSION_SECRET:'test-secret-only-not-valid-for-production-12345',ADMIN_PASSWORD_HASH:passwordHash('test-password'),GCASH_NUMBER:'TEST ONLY',GCASH_ACCOUNT_NAME:'Test Account',PAYPAL_PAYMENT_URL:'https://www.paypal.com/',MEMBERSHIP_PRICE_PHP:'199',MEMBERSHIP_DAYS:'30',BLOB_HOST:'test.private.blob.vercel-storage.com',BLOB_READ_WRITE_TOKEN:'test-only'};
  const s={env,query:async(sql,p)=>(await pool.query(sql,p)).rows,mail:async(...args)=>sent.push(args),audio:async(path,range)=>new Response('mp3-test',{status:range?206:200,headers:{'content-type':'audio/mpeg','accept-ranges':'bytes',...(range?{'content-range':'bytes 0-7/8'}:{})}}),upload:async options=>{await options.onBeforeGenerateToken(options.body.pathname,options.body.clientPayload,false);return {ok:true};}};
  return {app:createApp(s),q:s.query,sent};
}
