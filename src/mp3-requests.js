import {randomUUID} from 'node:crypto';
import {digest,uuid,fail} from './security.js';
export function mp3RequestRoutes({app,env,query:q,sameOrigin,limit}){
 const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
 async function listener(req){
   const raw=req.cookies?.mq3_user;if(!raw)fail(401,'Sign in to request an MP3 copy.');
   const [user]=await q(`SELECT u.id,u.email,u.display_name FROM user_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()`,[digest(raw,env.SESSION_SECRET)]);
   if(!user)fail(401,'Your session expired. Sign in again.');return user;
 }
 app.get('/api/account/mp3-requests',wrap(async(req,res)=>{const user=await listener(req);res.json({email:user.email,requests:await q('SELECT id,song_id,song_title,email,status,credits,created_at FROM mp3_requests WHERE user_id=$1 ORDER BY created_at DESC',[user.id])});}));
 app.post('/api/account/mp3-requests',wrap(async(req,res)=>{
   sameOrigin(req);limit(req,'mp3-request',20);const user=await listener(req);const songId=uuid(req.body.songId);
   const [existing]=await q('SELECT * FROM mp3_requests WHERE user_id=$1 AND song_id=$2',[user.id,songId]);
   if(existing)return res.json({ok:true,alreadyRequested:true,request:existing});
   const [result]=await q(`WITH song AS (
     SELECT id,title,lyrics FROM songs WHERE id=$2 AND published=true AND (audio_path IS NOT NULL OR suno_url IS NOT NULL)
     FOR SHARE
   ), locked AS (
     SELECT * FROM wallets WHERE user_id=$1 AND EXISTS(SELECT 1 FROM song) FOR UPDATE
   ), amounts AS (
     SELECT user_id,LEAST(promo_credits,50) AS promo_used,50-LEAST(promo_credits,50) AS purchased_used FROM locked
     WHERE promo_credits+purchased_credits>=50
   ), inserted AS (
     INSERT INTO mp3_requests(id,user_id,song_id,song_title,lyrics,email,display_name,promo_used,purchased_used)
     SELECT $3,a.user_id,s.id,s.title,COALESCE(s.lyrics,''),$4,$5,a.promo_used,a.purchased_used FROM amounts a CROSS JOIN song s
     ON CONFLICT(user_id,song_id) DO NOTHING RETURNING *
   ), debited AS (
     UPDATE wallets w SET promo_credits=w.promo_credits-i.promo_used,purchased_credits=w.purchased_credits-i.purchased_used,updated_at=now()
     FROM inserted i WHERE w.user_id=i.user_id RETURNING w.promo_credits+w.purchased_credits AS balance
   ), ledger AS (
     INSERT INTO credit_transactions(id,user_id,transaction_type,promo_change,purchased_change,description,reference_id)
     SELECT $6,user_id,'mp3_purchase',-promo_used,-purchased_used,'MP3 + lyrics email delivery',id FROM inserted RETURNING id
   ) SELECT i.*,d.balance FROM inserted i CROSS JOIN debited d CROSS JOIN ledger l`,[user.id,songId,randomUUID(),user.email,user.display_name,randomUUID()]);
   if(!result){const [duplicate]=await q('SELECT * FROM mp3_requests WHERE user_id=$1 AND song_id=$2',[user.id,songId]);if(duplicate)return res.json({ok:true,alreadyRequested:true,request:duplicate});fail(400,'You need 50 Credits to request this song.');}
   res.json({ok:true,request:result,balance:Number(result.balance)});
 }));
 // Registered after the shared /api/admin authentication and origin middleware.
 app.get('/api/admin/mp3-requests',wrap(async(req,res)=>res.json(await q('SELECT * FROM mp3_requests ORDER BY created_at DESC'))));
 app.post('/api/admin/mp3-requests/:id/sent',wrap(async(req,res)=>{
   const [r]=await q("UPDATE mp3_requests SET status='sent',sent_at=COALESCE(sent_at,now()) WHERE id=$1 AND status IN ('paid','sent') RETURNING id",[uuid(req.params.id)]);
   if(!r)fail(409,'Request is missing or refunded.');res.json({ok:true});
 }));
 app.post('/api/admin/mp3-requests/:id/refund',wrap(async(req,res)=>{
   const [r]=await q(`WITH refunded AS (
     UPDATE mp3_requests SET status='refunded',refunded_at=now() WHERE id=$1 AND status='paid' AND EXISTS(SELECT 1 FROM wallets WHERE user_id=mp3_requests.user_id) RETURNING *
   ), wallet AS (
     UPDATE wallets w SET promo_credits=w.promo_credits+r.promo_used,purchased_credits=w.purchased_credits+r.purchased_used,updated_at=now()
     FROM refunded r WHERE w.user_id=r.user_id RETURNING w.user_id
   ), ledger AS (
     INSERT INTO credit_transactions(id,user_id,transaction_type,promo_change,purchased_change,description,reference_id)
     SELECT $2,r.user_id,'mp3_refund',r.promo_used,r.purchased_used,'MP3 request refunded',r.id FROM refunded r JOIN wallet w ON w.user_id=r.user_id RETURNING id
   ) SELECT id FROM ledger`,[uuid(req.params.id),randomUUID()]);
   if(!r)fail(409,'Only an unfulfilled paid request can be refunded.');res.json({ok:true});
 }));
}
