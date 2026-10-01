import {readFile} from 'node:fs/promises';
import {socialPage} from './social-page.js';
import express from 'express';
import cookieParser from 'cookie-parser';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {get,put,del} from '@vercel/blob';
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
 app.disable('x-powered-by');app.use(express.json({limit:'64kb'}));app.use(cookieParser());
 app.use((_req,res,next)=>{res.set({'Referrer-Policy':'strict-origin-when-cross-origin','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'});next();});
 app.use('/api',(_req,res,next)=>{res.set('Cache-Control','no-store');next();});
 const statements=[
  `CREATE TABLE IF NOT EXISTS hub_visitors (visitor text NOT NULL,day date NOT NULL,views integer NOT NULL DEFAULT 1,PRIMARY KEY(visitor,day))`,
  `CREATE TABLE IF NOT EXISTS hub_name_requests (id uuid PRIMARY KEY,name text NOT NULL,dedication text NOT NULL DEFAULT '',contact text NOT NULL DEFAULT '',status text NOT NULL DEFAULT 'New' CHECK(status IN ('New','In progress','Completed','Archived')),created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS hub_songs (id uuid PRIMARY KEY,title text NOT NULL,artist text NOT NULL DEFAULT 'manny III',category text NOT NULL CHECK(category IN ('Name Songs','Inspirational','OPM','Love Songs')),youtube_url text NOT NULL DEFAULT '',spotify_url text NOT NULL DEFAULT '',cover_url text NOT NULL DEFAULT '',description text NOT NULL DEFAULT '',lyrics text NOT NULL DEFAULT '',duration_seconds integer NOT NULL DEFAULT 0,published boolean NOT NULL DEFAULT false,featured boolean NOT NULL DEFAULT false,legacy_views integer NOT NULL DEFAULT 0,created_at timestamptz NOT NULL DEFAULT now())`,
  `ALTER TABLE hub_songs ADD COLUMN IF NOT EXISTS lyrics text NOT NULL DEFAULT ''`,
  `ALTER TABLE hub_songs ADD COLUMN IF NOT EXISTS duration_seconds integer NOT NULL DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS hub_events (event_key text PRIMARY KEY,song_id uuid NOT NULL REFERENCES hub_songs(id),created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS hub_events_date ON hub_events(created_at,song_id)`,
  `CREATE INDEX IF NOT EXISTS hub_events_song_date ON hub_events(song_id,created_at)`,
  `CREATE TABLE IF NOT EXISTS hub_settings (id integer PRIMARY KEY,youtube_channel text NOT NULL,spotify_artist text NOT NULL DEFAULT '')`,
  `CREATE TABLE IF NOT EXISTS hub_audience (id uuid PRIMARY KEY,recorded_on date NOT NULL UNIQUE,youtube_subscribers integer NOT NULL CHECK(youtube_subscribers>=0),spotify_followers integer NOT NULL CHECK(spotify_followers>=0),note text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS hub_meta (key text PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS sessions(token_hash text PRIMARY KEY,expires_at timestamptz NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at)`,
  `CREATE TABLE IF NOT EXISTS limits(key text PRIMARY KEY,hits integer NOT NULL DEFAULT 1,expires_at timestamptz NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS limits_expiry ON limits(expires_at)`
 ];
 let bootstrapPromise=null;
 async function bootstrap(){if(bootstrapPromise)return bootstrapPromise;bootstrapPromise=(async()=>{for(const sql of statements)await q(sql);await q("INSERT INTO hub_settings(id,youtube_channel,spotify_artist) VALUES(1,'https://www.youtube.com/@manny-III','https://open.spotify.com/artist/3ELxNlNqw2zgLqNFbGDaiK') ON CONFLICT(id) DO NOTHING");const existing=await q("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='songs'");if(existing.length)await q(`INSERT INTO hub_songs(id,title,category,legacy_views,created_at) SELECT id,title,CASE WHEN category='NAME SONGS' THEN 'Name Songs' WHEN category='INSPIRATIONAL SONGS' THEN 'Inspirational' WHEN category='LOVE SONGS' THEN 'Love Songs' ELSE 'OPM' END,COALESCE(views,0),created_at FROM songs ON CONFLICT(id) DO NOTHING`);await q("INSERT INTO hub_meta(key) VALUES('song_views_fresh_start_20260929') ON CONFLICT(key) DO NOTHING");})().catch(err=>{bootstrapPromise=null;throw err;});return bootstrapPromise;}
 const pub=fileURLToPath(new URL('../public/',import.meta.url));
 app.get('/admin',(_req,res)=>res.sendFile(pub+'admin.html'));
 app.use(express.static(pub,{maxAge:0,index:false}));
 app.use('/api',wrap(async(_req,_res,next)=>{await bootstrap();next();}));
 app.post('/api/login',wrap(async(req,res)=>{sameOrigin(req);await limit(req,'login',8);if(!env.ADMIN_PASSWORD_HASH)fail(503,'Admin password has not been configured.');if(!verifyPassword(req.body.password,env.ADMIN_PASSWORD_HASH))fail(401,'Incorrect password.');const now=new Date();await q('DELETE FROM sessions WHERE expires_at<$1',[now]);await q('DELETE FROM limits WHERE expires_at<$1',[now]);const v=token();await q('INSERT INTO sessions(token_hash,expires_at) VALUES($1,$2)',[hash(v),new Date(Date.now()+8*3600000)]);res.cookie('mq3_admin',v,{...cookie(),maxAge:8*3600000}).json({ok:true});}));
 app.post('/api/logout',wrap(async(req,res)=>{sameOrigin(req);if(req.cookies.mq3_admin)await q('DELETE FROM sessions WHERE token_hash=$1',[hash(req.cookies.mq3_admin)]);res.clearCookie('mq3_admin',cookie()).json({ok:true});}));
 app.get('/api/covers/:name',wrap(async(req,res)=>{if(!env.BLOB_READ_WRITE_TOKEN)fail(503,'Cover image storage is not configured.');const name=String(req.params.name||'');if(!/^[a-f0-9-]+\.(?:jpg|png|webp)$/.test(name))fail(404,'Cover image not found.');const result=await get(`covers/${name}`,{access:'private',token:env.BLOB_READ_WRITE_TOKEN});if(!result)fail(404,'Cover image not found.');const type=result.blob?.contentType||result.headers?.get?.('content-type')||'application/octet-stream';res.set({'Content-Type':type,'Cache-Control':'public, max-age=31536000, immutable'});if(result.blob?.size!=null)res.set('Content-Length',String(result.blob.size));const reader=result.stream.getReader();res.on('close',()=>reader.cancel().catch(()=>{}));while(true){const {done,value}=await reader.read();if(done)break;res.write(Buffer.from(value));}res.end();}));
 app.use('/api/admin',wrap(async(req,res,next)=>{const v=req.cookies.mq3_admin;if(!/^[a-f0-9]{64}$/.test(v||''))fail(401,'Please sign in.');const rows=await q('SELECT token_hash FROM sessions WHERE token_hash=$1 AND expires_at>$2',[hash(v),new Date()]);if(!rows.length)fail(401,'Session expired. Please sign in.');if(req.method!=='GET')sameOrigin(req);res.locals.admin=true;next();}));

 app.post('/api/visit',wrap(async(req,res)=>{sameOrigin(req);await limit(req,'visits',120);let v=req.cookies.mq3_visitor;if(!/^[a-f0-9]{64}$/.test(v||''))v=token();res.cookie('mq3_visitor',v,{...cookie(),maxAge:90*86400000});const day=new Date(Date.now()+8*3600000).toISOString().slice(0,10);await q('INSERT INTO hub_visitors(visitor,day) VALUES($1,$2) ON CONFLICT(visitor,day) DO UPDATE SET views=hub_visitors.views+1',[hash(v),day]);res.json({ok:true});}));
 app.get('/api/admin/visitors',wrap(async(req,res)=>{const period=String(req.query.period||'daily'),start=new Date(periodStart(period).getTime()+8*3600000).toISOString().slice(0,10);const [counts]=await q('SELECT count(DISTINCT visitor)::integer AS visitors,COALESCE(sum(views),0)::integer AS views FROM hub_visitors WHERE day >= $1',[start]);res.json({period,...counts});}));
 app.get('/api/admin/name-requests-count',wrap(async(_req,res)=>{const [r]=await q("SELECT count(*)::integer AS total FROM hub_name_requests WHERE status='New'");res.json(r);}));
 app.post('/api/name-requests',wrap(async(req,res)=>{
  sameOrigin(req);await limit(req,'name-requests',5);
  const field=(key,max,required=false)=>{const v=req.body?.[key];if(typeof v!=='string'||v.trim().length>max||(required&&!v.trim()))fail(400,'Please check the '+key+' field.');return v.trim();};
  const name=field('name',100,true),dedication=field('dedication',1200),contact=field('contact',200);
  if(req.body.website)fail(400,'Unable to submit this request.');
  const id=uuid(req.body.id);await q("INSERT INTO hub_name_requests(id,name,dedication,contact) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING",[id,name,dedication,contact]);res.status(201).json({ok:true,id});
 }));
 app.get('/api/admin/name-requests',wrap(async(req,res)=>{const offset=Number(req.query.offset||0);if(!Number.isSafeInteger(offset)||offset<0)fail(400,'Invalid page.');res.json(await q('SELECT * FROM hub_name_requests ORDER BY created_at DESC,id DESC LIMIT 50 OFFSET $1',[offset]));}));
 app.post('/api/admin/name-requests',wrap(async(req,res)=>{const id=uuid(req.body.id),status=req.body.status;if(!['New','In progress','Completed','Archived'].includes(status))fail(400,'Choose a valid request status.');const rows=await q('UPDATE hub_name_requests SET status=$1 WHERE id=$2 RETURNING id',[status,id]);if(!rows.length)fail(404,'Request not found.');res.json({ok:true});}));
 app.get('/api/catalog',wrap(async(_req,res)=>{const songs=await q("SELECT id,title,artist,category,youtube_url,spotify_url,cover_url,description,lyrics,duration_seconds,featured,created_at FROM hub_songs WHERE published=true AND (youtube_url<>'' OR spotify_url<>'') ORDER BY featured DESC,created_at DESC");const [settings]=await q('SELECT youtube_channel,spotify_artist FROM hub_settings WHERE id=1');res.json({songs,settings:settings||{},demo:env.MQ3_DEMO==='1'});}));
 app.post('/api/song-views',wrap(async(req,res)=>{sameOrigin(req);await limit(req,'views',120);const id=uuid(req.body.song_id);const [song]=await q('SELECT id FROM hub_songs WHERE id=$1 AND published=true',[id]);if(!song)fail(404,'Song is unavailable.');let visitor=req.cookies.mq3_visit;if(!/^[a-f0-9]{64}$/.test(visitor||'')){visitor=token();const now=new Date();await q('DELETE FROM limits WHERE expires_at<$1',[now]);res.cookie('mq3_visit',visitor,{...cookie(),maxAge:24*3600000});}const key=hash(visitor+':'+id+':'+Math.floor(Date.now()/1800000));await q('INSERT INTO hub_events(event_key,song_id) VALUES($1,$2) ON CONFLICT(event_key) DO NOTHING',[key,id]);res.json({ok:true});}));
 app.post('/api/admin/cover-upload',express.raw({type:['image/jpeg','image/png','image/webp'],limit:'5mb'}),wrap(async(req,res)=>{if(!env.BLOB_READ_WRITE_TOKEN)fail(503,'Cover image storage is not configured.');const type=req.get('content-type')||'';const ext=type==='image/png'?'png':type==='image/webp'?'webp':type==='image/jpeg'?'jpg':'';if(!ext)fail(400,'Use a JPG, PNG or WebP image.');if(!Buffer.isBuffer(req.body)||!req.body.length)fail(400,'Choose an image to upload.');const name=`${randomUUID()}.${ext}`;await (s.putCover||put)(`covers/${name}`,req.body,{access:'private',contentType:type,addRandomSuffix:false,token:env.BLOB_READ_WRITE_TOKEN});res.json({url:`/api/covers/${name}`});}));
 app.post('/api/admin/cover-delete',wrap(async(req,res)=>{if(!env.BLOB_READ_WRITE_TOKEN)fail(503,'Cover image storage is not configured.');const url=String(req.body.url||''),m=url.match(/^\/api\/covers\/([a-f0-9-]+\.(?:jpg|png|webp))$/);if(!m)fail(400,'Invalid MQ3 cover path.');const references=await q('SELECT id FROM hub_songs WHERE cover_url=$1 LIMIT 1',[url]);if(references.length)return res.json({ok:true,deleted:false,reason:'in-use'});await (s.deleteCover||del)(`covers/${m[1]}`,{token:env.BLOB_READ_WRITE_TOKEN});res.json({ok:true});}));
 app.get('/api/admin/songs',wrap(async(_req,res)=>res.json(await q('SELECT * FROM hub_songs ORDER BY created_at DESC'))));
 app.post('/api/admin/songs',wrap(async(req,res)=>{const value=songInput(req.body),id=req.body.id?uuid(req.body.id):req.body.client_id?uuid(req.body.client_id):randomUUID();if(req.body.id){const rows=await q('SELECT id FROM hub_songs WHERE id=$1',[id]);if(!rows.length)fail(404,'Song not found.');}const values=[id,...Object.values(value)];await q(`INSERT INTO hub_songs(id,title,artist,category,youtube_url,spotify_url,cover_url,description,lyrics,duration_seconds,published,featured) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,artist=EXCLUDED.artist,category=EXCLUDED.category,youtube_url=EXCLUDED.youtube_url,spotify_url=EXCLUDED.spotify_url,cover_url=EXCLUDED.cover_url,description=EXCLUDED.description,lyrics=EXCLUDED.lyrics,duration_seconds=EXCLUDED.duration_seconds,published=EXCLUDED.published,featured=EXCLUDED.featured`,values);res.json({ok:true,id});}));
 app.get('/api/admin/settings',wrap(async(_req,res)=>{const [settings]=await q('SELECT * FROM hub_settings WHERE id=1');res.json(settings||{});}));
 app.post('/api/admin/settings',wrap(async(req,res)=>{const youtube=platformLink(req.body.youtube_channel,'youtube',true),spotify=platformLink(req.body.spotify_artist,'spotify',true);await q('UPDATE hub_settings SET youtube_channel=$1,spotify_artist=$2 WHERE id=1',[youtube,spotify]);res.json({ok:true});}));
 app.get('/api/admin/analytics',wrap(async(req,res)=>{const period=String(req.query.period||'daily'),periodFloor=periodStart(period);const [reset]=await q("SELECT created_at FROM hub_meta WHERE key='song_views_fresh_start_20260929'");const start=reset&&new Date(reset.created_at)>periodFloor?new Date(reset.created_at):periodFloor;const rows=await q('SELECT s.id,s.title,s.category,s.legacy_views,count(e.event_key)::integer AS views FROM hub_songs s LEFT JOIN hub_events e ON e.song_id=s.id AND e.created_at >= $1 GROUP BY s.id,s.title,s.category,s.legacy_views HAVING count(e.event_key)>0 OR s.legacy_views>0 ORDER BY views DESC,s.title',[start]);res.json({period,start:start.toISOString(),timezone:'Asia/Manila',songs:rows,total:rows.reduce((n,r)=>n+Number(r.views),0),legacy_total:rows.reduce((n,r)=>n+Number(r.legacy_views),0)});}));
 app.get('/api/admin/audience',wrap(async(_req,res)=>res.json(await q('SELECT * FROM hub_audience ORDER BY recorded_on DESC LIMIT 100'))));
 app.post('/api/admin/audience',wrap(async(req,res)=>{const {recorded_on,youtube_subscribers,spotify_followers}=req.body;const d=new Date(recorded_on+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(recorded_on||'')||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==recorded_on)fail(400,'Enter a valid date.');for(const v of[youtube_subscribers,spotify_followers])if(!Number.isSafeInteger(v)||v<0)fail(400,'Enter whole non-negative audience totals.');await q('INSERT INTO hub_audience(id,recorded_on,youtube_subscribers,spotify_followers,note) VALUES($1,$2,$3,$4,$5) ON CONFLICT(recorded_on) DO UPDATE SET youtube_subscribers=EXCLUDED.youtube_subscribers,spotify_followers=EXCLUDED.spotify_followers,note=EXCLUDED.note',[randomUUID(),recorded_on,youtube_subscribers,spotify_followers,String(req.body.note||'').slice(0,400)]);res.json({ok:true});}));
 app.use('/api',(_req,res)=>res.status(404).json({error:'This feature is not available in the listening edition.'}));
 app.get('/',wrap(async(req,res)=>{
  let song=null;
  if(req.query.song){
   const id=String(req.query.song);uuid(id);await bootstrap();
   [song]=await q("SELECT id,title,artist,description,cover_url FROM hub_songs WHERE id=$1 AND published=true AND (youtube_url<>'' OR spotify_url<>'')",[id]);
   if(!song)res.status(404);
  }
  const html=await readFile(pub+'index.html','utf8');
  res.set('Cache-Control','no-store').type('html').send(socialPage(html,song,origin()));
 }));
 for(const old of ['/create','/details','/lyrics','/music','/results','/own','/mysongs','/featuredsongs','/creator.html','/featuredsongs.html'])app.get(old,(_req,res)=>res.redirect(302,'/'));
 app.use((_req,res)=>res.status(404).send('Page not found.'));
 app.use((err,_req,res,_next)=>{if(res.headersSent)return res.end();res.status(err.status||500).json({error:err.status?err.message:'Service unavailable. Check the database connection.'});});
 return app;
}
export default createApp();
