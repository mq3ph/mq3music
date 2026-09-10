import test from 'node:test';
import assert from 'node:assert/strict';
import {storageReport} from '../src/storage-report.js';
import {createApp} from '../src/index.js';
import {passwordHash} from '../src/security.js';
import request from 'supertest';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
test('storage totals count unique files and separate missing, unlinked and shared files',()=>{
 const songs=[{id:'1',title:'Moses',category:'NAME SONGS',suno_url:'link',audio_path:'songs/a',preview_path:'songs/b',has_orders:true},{id:'2',title:'Other',category:'OPM',audio_path:'songs/a',preview_path:'songs/missing'},{id:'3',title:'New',category:'NAME SONGS',suno_url:'link'}];
 const r=storageReport(songs,[{pathname:'songs/a',size:100},{pathname:'songs/b',size:20},{pathname:'songs/orphan',size:30}]);
 assert.equal(r.totalBytes,150);assert.equal(r.totalFiles,3);assert.equal(r.sharedBytes,100);assert.equal(r.unlinkedBytes,30);assert.equal(r.missingFiles,1);assert.equal(r.reviewBytes,120);assert.equal(r.converted.length,1);assert.equal(r.converted[0].shared,true);assert.equal(r.converted[0].hasOrders,true);assert.equal(r.categories.find(c=>c.category==='NAME SONGS').bytes,20);
 assert.equal(JSON.stringify(r).includes('songs/a'),false);
});
test('storage scan is admin only and reuses metadata snapshot',async t=>{
 const {PGlite}=require(process.env.MQ3_PGLITE_MODULE);const db=new PGlite();t.after(()=>db.close());await db.exec(await readFile(new URL('../schema.sql',import.meta.url),'utf8'));let scans=0;
 const app=createApp({env:{APP_URL:'http://localhost:3000',SESSION_SECRET:'test-secret-more-than-thirty-two-characters',ADMIN_PASSWORD_HASH:passwordHash('test-password')},query:async(sql,p)=>(await db.query(sql,p)).rows,listAudioFiles:async()=>{scans++;return [{pathname:'songs/orphan',size:256}];}});
 assert.equal((await request(app).get('/api/admin/storage-report')).status,401);assert.equal(scans,0);
 const admin=request.agent(app);await admin.post('/api/login').set('Origin','http://localhost:3000').send({password:'test-password'});
 const result=await admin.get('/api/admin/storage-report');assert.equal(result.status,200);assert.equal(result.body.totalBytes,256);assert.equal(result.headers['cache-control'],'no-store');await admin.get('/api/admin/storage-report');assert.equal(scans,1);
});
