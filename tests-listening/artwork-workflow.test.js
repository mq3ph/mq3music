import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createApp} from '../src/index.js';
import {testStore} from '../scripts/test-store.js';
import {buildArtworkCommand} from '../public/artwork-command.js';
test('command includes complete song data and asks for prompts before images',()=>{
 const lyrics='Line one\nLine two <script>alert(1)</script>';
 const text=buildArtworkCommand({title:'Dora',category:'Name Songs',lyrics,subject:'Woman',mood:'Warm',scene:'Sunset'});
 assert.ok(text.includes('THREE distinct'));assert.ok(text.includes('Do not generate an image in your first reply'));assert.ok(text.includes(JSON.stringify(lyrics)));assert.ok(text.includes('bottom quarter'));assert.ok(text.includes('No text'));
});
test('authenticated image upload persists as song cover without image-generation API',async()=>{
 const store=await testStore();store.env.BLOB_READ_WRITE_TOKEN='test-placeholder';let stored;
 store.putCover=async(name,data,options)=>{stored={name,data,options};};
 const app=createApp(store),admin=request.agent(app),origin='http://localhost:3478';
 await admin.post('/api/login').set('Origin',origin).send({password:'preview-only'}).expect(200);
 const result=await admin.post('/api/admin/cover-upload').set('Origin',origin).set('Content-Type','image/png').send(Buffer.from('fixture-image-bytes')).expect(200);
 assert.match(result.body.url,/^\/api\/covers\/.*\.png$/);assert.equal(stored.options.contentType,'image/png');
 await admin.post('/api/admin/songs').set('Origin',origin).send({title:'Dora',category:'Name Songs',artist:'MQ3',youtube_url:'https://youtu.be/abcdefghijk',cover_url:result.body.url,duration:'3:51',published:true}).expect(200);
 const catalog=await request(app).get('/api/catalog').expect(200);assert.equal(catalog.body.songs[0].cover_url,result.body.url);assert.equal(catalog.body.songs[0].duration_seconds,231);
 await admin.post('/api/admin/artwork-generate').set('Origin',origin).send({title:'Dora',lyrics:'Example'}).expect(404);
});
