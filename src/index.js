import express from 'express';
import cookieParser from 'cookie-parser';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {services} from './services.js';
import {token,digest,verifyPassword,uuid,fail} from './security.js';
import {songInput,platformLink,periodStart} from './listening-model.js';
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
export function createApp(s=services()){
 const app=express(),q=s.query,env=s.env;
 const origin=()=>new URL(env.APP_URL||'http://localhost:3000').origin;
 const cookie=()=>({httpOnly:true,sameSite:'lax',secure:origin().startsWith('https:'),path:'/'});
 const hash=x=>digest(x,env.SESSION_SECRET);
 const sameOrigin=req=>{if(req.get('origin')!==origin())fail(403,'Use the MQ3 website for this action.');};
 async function limit(req,scope,max){const ip=env.VERCEL?(req.get('x-vercel-forwarded-for')||req.socket.remoteAddress):req.socket.remoteAddress;
  const [r]=await q('INSERT INTO limits(key,hits,expires_at) VALUES($1,1,$2) ON CONFLICT(key) DO UPDATE SET hits=limits.hits+1 RETURNING hits',[hash(scope+':'+ip+':'+Math.floor(Date.now()/600000)),new Date(Date.now()+1200000)]);if(r.hits>max)fail(429,'Please try again in a few minutes.');}
 app.disable('x-powered-by');app.use(express.json({limit:'24kb'}));app.use(cookieParser());
 app.use((_req,res,next)=>{res.set({'Referrer-Policy':'strict-origin-when-cross-origin','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'});next();});
 app.use('/api',(_req,res,next)=>{res.set('Cache-Control','no-store');next();});
 app.post('/api/login',wrap(async(req,res)=>{sameOrigin(req);await limit(req,'login',8);if(!env.ADMIN_PASSWORD_HASH)fail(503,'Admin password has not been configured.');if(!verifyPassword(req.body.password,env.ADMIN_PASSWORD_HASH))fail(401,'Incorrect password.');const v=token();await q('INSERT INTO sessions(token_hash,expires_at) VALUES($1,$2)',[hash(v),new Date(Date.now()+8*3600000)]);res.cookie('mq3_admin',v,{...cookie(),maxAge:8*3600000}).json({ok:true});}));
 app.post('/api/logout',wrap(async(req,res)=>{sameOrigin(req);if(req.cookies.mq3_admin)await q('DELETE FROM sessions WHERE token_hash=$1',[hash(req.cookies.mq3_admin)]);res.clearCookie('mq3_admin',cookie()).json({ok:true});}));
 app.use('/api/admin',wrap(async(req,res,next)=>{const v=req.cookies.mq3_admin;if(!/^[a-f0-9]{64}$/.test(v||''))fail(401,'Please sign in.');const rows=await q('SELECT token_hash FROM sessions WHERE token_hash=$1 AND expires_at>$2',[hash(v),new Date()]);if(!rows.length)fail(401,'Session expired. Please sign in.');if(req.method!=='GET')sameOrigin(req);res.locals.admin=true;next();}));
 // Authentication middleware above must explicitly advance the Express chain.
 app.get('/api/catalog',wrap(async(_req,res)=>{const songs=await q("SELECT id,title,artist,category,youtube_url,spotify_url,cover_url,description,featured,created_at FROM hub_songs WHERE published=true AND (youtube_url<>'' OR spotify_url<>'') ORDER BY featured DESC,created_at DESC");const [settings]=await q('SELECT youtube_channel,spotify_artist FROM hub_settings WHERE id=1');res.json({songs,settings:settings||{},demo:env.MQ3_DEMO==='1'});}));
 app.post('/api/song-views',wrap(async(req,res)=>{sameOrigin(req);await limit(req,'views',120);const id=uuid(req.body.song_id);const [song]=await q('SELECT id FROM hub_songs WHERE id=$1 AND published=true',[id]);if(!song)fail(404,'Song is unavailable.');let visitor=req.cookies.mq3_visit;if(!/^[a-f0-9]{64}$/.test(visitor||'')){visitor=token();res.cookie('mq3_visit',visitor,{...cookie(),maxAge:24*3600000});}const key=hash(visitor+':'+id+':'+Math.floor(Date.now()/1800000));await q('INSERT INTO hub_events(event_key,song_id) VALUES($1,$2) ON CONFLICT(event_key) DO NOTHING',[key,id]);res.json({ok:true});}));
 app.get('/api/admin/songs',wrap(async(_req,res)=>res.json(await q('SELECT * FROM hub_songs ORDER BY created_at DESC'))));
 app.post('/api/admin/songs',wrap(async(req,res)=>{const value=songInput(req.body),id=req.body.id?uuid(req.body.id):randomUUID();if(req.body.id){const rows=await q('SELECT id FROM hub_songs WHERE id=$1',[id]);if(!rows.length)fail(404,'Song not found.');}const values=[id,...Object.values(value)];await q(`INSERT INTO hub_songs(id,title,artist,category,youtube_url,spotify_url,cover_url,description,published,featured) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,artist=EXCLUDED.artist,category=EXCLUDED.category,youtube_url=EXCLUDED.youtube_url,spotify_url=EXCLUDED.spotify_url,cover_url=EXCLUDED.cover_url,description=EXCLUDED.description,published=EXCLUDED.published,featured=EXCLUDED.featured`,values);res.json({ok:true,id});}));
 app.get('/api/admin/settings',wrap(async(_req,res)=>{const [settings]=await q('SELECT * FROM hub_settings WHERE id=1');res.json(settings||{});}));
 app.post('/api/admin/settings',wrap(async(req,res)=>{const youtube=platformLink(req.body.youtube_channel,'youtube',true),spotify=platformLink(req.body.spotify_artist,'spotify',true);await q('UPDATE hub_settings SET youtube_channel=$1,spotify_artist=$2 WHERE id=1',[youtube,spotify]);res.json({ok:true});}));
 app.get('/api/admin/analytics',wrap(async(req,res)=>{const period=String(req.query.period||'daily'),start=periodStart(period);const rows=await q('SELECT s.id,s.title,s.category,s.legacy_views,count(e.event_key)::integer AS views FROM hub_songs s LEFT JOIN hub_events e ON e.song_id=s.id AND e.created_at >= $1 GROUP BY s.id,s.title,s.category,s.legacy_views ORDER BY views DESC,s.title',[start]);res.json({period,start:start.toISOString(),timezone:'Asia/Manila',songs:rows,total:rows.reduce((n,r)=>n+Number(r.views),0),legacy_total:rows.reduce((n,r)=>n+Number(r.legacy_views),0)});}));
 app.get('/api/admin/audience',wrap(async(_req,res)=>res.json(await q('SELECT * FROM hub_audience ORDER BY recorded_on DESC LIMIT 100'))));
 app.post('/api/admin/audience',wrap(async(req,res)=>{const {recorded_on,youtube_subscribers,spotify_followers}=req.body;const d=new Date(recorded_on+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(recorded_on||'')||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==recorded_on)fail(400,'Enter a valid date.');for(const v of [youtube_subscribers,spotify_followers])if(!Number.isSafeInteger(v)||v<0)fail(400,'Enter whole non-negative audience totals.');await q('INSERT INTO hub_audience(id,recorded_on,youtube_subscribers,spotify_followers,note) VALUES($1,$2,$3,$4,$5) ON CONFLICT(recorded_on) DO UPDATE SET youtube_subscribers=EXCLUDED.youtube_subscribers,spotify_followers=EXCLUDED.spotify_followers,note=EXCLUDED.note',[randomUUID(),recorded_on,youtube_subscribers,spotify_followers,String(req.body.note||'').slice(0,400)]);res.json({ok:true});}));
 app.use('/api',(_req,res)=>res.status(404).json({error:'This feature is not available in the listening edition.'}));
 const pub=fileURLToPath(new URL('../public/',import.meta.url));
 app.get('/admin',(_req,res)=>res.sendFile(pub+'admin.html'));
 for(const old of ['/create','/details','/lyrics','/music','/results','/own','/mysongs','/featuredsongs','/creator.html','/featuredsongs.html'])app.get(old,(_req,res)=>res.redirect(302,'/'));
 app.use(express.static(pub,{maxAge:0}));
 app.use((_req,res)=>res.status(404).send('Page not found.'));
 app.use((err,_req,res,_next)=>{if(res.headersSent)return res.end();res.status(err.status||500).json({error:err.status?err.message:'Service unavailable. Check the database connection and listening migration.'});});
 return app;
}
export default createApp();
