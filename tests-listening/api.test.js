import test from 'node:test';import assert from 'node:assert/strict';import request from 'supertest';import {createApp} from '../src/index.js';import {testStore} from '../scripts/test-store.js';
const origin='http://localhost:3478';
test('Admin auth, input checks, publishing, deduped views, audience and retired commerce',async()=>{
 const store=await testStore(),app=createApp(store),admin=request.agent(app),visitor=request.agent(app);
 await admin.get('/api/admin/songs').expect(401);
 await admin.post('/api/login').send({password:'preview-only'}).expect(403);
 await admin.post('/api/login').set('Origin',origin).send({password:'preview-only'}).expect(200);
 await admin.post('/api/admin/songs').set('Origin','https://evil.test').send({}).expect(403);
 const draft=await admin.post('/api/admin/songs').set('Origin',origin).send({title:'Song',artist:'manny III',category:'Love Songs'}).expect(200);
 assert.equal((await visitor.get('/api/catalog')).body.songs.length,0);
 await admin.post('/api/admin/songs').set('Origin',origin).send({id:draft.body.id,title:'Song',artist:'manny III',category:'Love Songs',youtube_url:'https://youtu.be/abcdefghijk',published:true}).expect(200);
 assert.equal((await visitor.get('/api/catalog')).body.songs.length,1);
 for(let i=0;i<2;i++)await visitor.post('/api/song-views').set('Origin',origin).send({song_id:draft.body.id}).expect(200);
 assert.equal((await store.query('SELECT * FROM hub_events')).length,1);
 for(const period of ['daily','weekly','monthly','all']){const report=await admin.get('/api/admin/analytics?period='+period).expect(200);assert.equal(report.body.total,1);}
 await admin.get('/api/admin/analytics?period=bad').expect(400);
 await admin.post('/api/admin/settings').set('Origin',origin).send({youtube_channel:'https://evil.test',spotify_artist:''}).expect(400);
 await admin.post('/api/admin/audience').set('Origin',origin).send({recorded_on:'2026-02-30',youtube_subscribers:10,spotify_followers:20}).expect(400);
 await admin.post('/api/admin/audience').set('Origin',origin).send({recorded_on:'2026-09-28',youtube_subscribers:10,spotify_followers:20}).expect(200);
 assert.equal((await admin.get('/api/admin/audience')).body.length,1);
 await visitor.post('/api/account/paypal/create-order').send({}).expect(404);
 await visitor.post('/api/song-creator/requests').send({}).expect(404);
 await visitor.get('/creator.js').expect(404);
 await admin.post('/api/logout').set('Origin',origin).send({}).expect(200);await admin.get('/api/admin/songs').expect(401);
});
