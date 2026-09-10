import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {createApp,categories} from '../src/index.js';
import {passwordHash} from '../src/security.js';
import {storageReport} from '../src/storage-report.js';
const require=createRequire(import.meta.url);const {PGlite}=require(process.env.MQ3_PGLITE_MODULE);
const link='https://suno.com/song/657e28fc-df67-4dd1-be2d-24bfaa952503';
test('each category supports new Suno songs, conversion, gift confirmation and storage review',async t=>{
 const db=new PGlite();t.after(()=>db.close());await db.exec(await readFile(new URL('../schema.sql',import.meta.url),'utf8'));
 const q=async(sql,p)=>(await db.query(sql,p)).rows;
 const app=createApp({env:{APP_URL:'http://localhost:3000',SESSION_SECRET:'test-secret-more-than-thirty-two-characters',ADMIN_PASSWORD_HASH:passwordHash('test-password')},query:q});
 const admin=request.agent(app);const post=(path,body)=>admin.post(path).set('Origin','http://localhost:3000').send(body);await post('/api/login',{password:'test-password'});
 const uploaded=[];
 for(const category of categories){
   const data={title:category+' new',category,names:'matching name',lyrics:'Saved lyrics',price:0,suno_url:link};
   const created=await post('/api/admin/songs',data);assert.equal(created.status,200,category);assert.equal((await post('/api/admin/songs',{...data,id:created.body.id,published:true})).status,200);
   const id=randomUUID();uploaded.push(id);await q('INSERT INTO songs(id,title,category,names,lyrics,published,audio_path,preview_path,views) VALUES($1,$2,$3,$4,$5,true,$6,$7,8)',[id,category+' uploaded',category,'old names','old lyrics','songs/'+id+'.mp3','songs/'+id+'-preview.mp3']);
   const before=(await q('SELECT * FROM songs WHERE id=$1',[id]))[0];
   assert.equal((await post('/api/admin/songs/'+id+'/convert-suno',{url:link,tested:true})).status,200);
   const after=(await q('SELECT * FROM songs WHERE id=$1',[id]))[0];assert.deepEqual({...after,suno_url:null},before);
   assert.equal((await post('/api/admin/songs/'+id+'/suno-gifts',{downloadConfirmed:true,enabled:true,expectedSunoUrl:link})).status,200);
 }
 const catalog=(await request(app).get('/api/catalog')).body.songs;assert.equal(catalog.length,8);assert.equal(catalog.filter(s=>s.gifts_enabled).length,4);assert.equal(new Set(catalog.map(s=>s.category)).size,4);
 const songs=await q('SELECT * FROM songs');const blobs=songs.filter(s=>s.audio_path).flatMap(s=>[{pathname:s.audio_path,size:100},{pathname:s.preview_path,size:20}]);const report=storageReport(songs,blobs);assert.equal(report.converted.length,4);assert.equal(report.reviewBytes,480);assert.equal(new Set(report.converted.map(s=>s.category)).size,4);
 await q("INSERT INTO orders(id,customer_hash,email,provider,kind,song_id,amount) VALUES($1,'test','test@example.com','gcash','song',$2,50)",[randomUUID(),uploaded[3]]);
 assert.equal((await post('/api/admin/songs/'+uploaded[3]+'/convert-suno',{url:link,tested:true})).status,409);
 await q("INSERT INTO orders(id,customer_hash,email,provider,kind,amount,status,expires_at) VALUES($1,'test','test@example.com','gcash','membership',50,'paid',now()+interval '1 day')",[randomUUID()]);
 assert.equal((await post('/api/admin/songs/'+uploaded[1]+'/convert-suno',{url:link,tested:true})).status,409);
});
