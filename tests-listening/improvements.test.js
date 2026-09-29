import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createApp} from '../src/index.js';
import {testStore} from '../scripts/test-store.js';
import {filterSongs, readIds, recentIds, writeIds} from '../public/library-state.js';
import {socialPage} from '../src/social-page.js';

test('Favorites, recent order, search and restricted storage', () => {
  const songs=[{id:'1',title:'Alpha',artist:'MQ3',category:'OPM'},{id:'2',title:'Beta',artist:'MQ3',category:'Love Songs'}];
  assert.deepEqual(filterSongs(songs,{collection:'favorites',favorites:['2']}).map(s=>s.id),['2']);
  assert.deepEqual(filterSongs(songs,{collection:'recent',recent:['2','1']}).map(s=>s.id),['2','1']);
  assert.equal(filterSongs(songs,{term:'  ALPHA  '}).length,1);
  assert.deepEqual(recentIds(['2','1'],'1'),['1','2']);
  assert.deepEqual(readIds({getItem:()=>'{broken'},'x'),[]);
  assert.deepEqual(readIds({getItem:()=>'["1",null,"1",5]'},'x'),['1']);
  assert.equal(writeIds(null,'x',[]),false);
});

test('Social metadata escapes song content and uses absolute cover URLs', () => {
  const html=socialPage('<html><head><title>Old</title></head></html>',{id:'abc',title:'<script>alert(1)</script>',artist:'A & B',description:'"quoted"',cover_url:'/api/covers/abc.webp'},'https://music.example');
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('https://music.example/api/covers/abc.webp'));
  assert.ok(html.includes('&quot;quoted&quot;'));
});

test('Drafts remain editable, unpublished songs can be restored, and historical analytics survive', async () => {
  const store=await testStore(),app=createApp(store),admin=request.agent(app),origin=store.env.APP_URL;
  await admin.post('/api/login').set('Origin',origin).send({password:'preview-only'}).expect(200);
  const body={title:'Restore Me',artist:'MQ3',category:'OPM',youtube_url:'https://youtu.be/abcdefghijk',published:false};
  const created=await admin.post('/api/admin/songs').set('Origin',origin).send(body).expect(200);
  const id=created.body.id;
  assert.equal((await admin.get('/api/admin/songs')).body[0].published,false);
  await request(app).get('/?song='+id).expect(404);
  for(const published of [true,false,true]) {
    await admin.post('/api/admin/songs').set('Origin',origin).send({...body,id,published}).expect(200);
    assert.equal((await request(app).get('/api/catalog')).body.songs.length,published?1:0);
  }
  await store.query('UPDATE hub_songs SET legacy_views=$1 WHERE id=$2',[73,id]);
  const report=await admin.get('/api/admin/analytics?period=all').expect(200);
  assert.equal(report.body.legacy_total,73);assert.equal(report.body.total,0);
  const page=await request(app).get('/?song='+id).expect(200);
  assert.match(page.text,/<meta property="og:title" content="Restore Me/);
  assert.match(page.text,new RegExp('song='+id));
});

test('Cover deletion protects shared covers and only deletes unused uploads', async () => {
  const store=await testStore();store.env.BLOB_READ_WRITE_TOKEN='test-only';
  const deleted=[];store.deleteCover=async path=>deleted.push(path);
  const app=createApp(store),admin=request.agent(app),origin=store.env.APP_URL;
  await admin.post('/api/login').set('Origin',origin).send({password:'preview-only'}).expect(200);
  const url='/api/covers/abcdef.webp';
  await admin.post('/api/admin/songs').set('Origin',origin).send({title:'Shared cover',category:'OPM',cover_url:url}).expect(200);
  const protectedResult=await admin.post('/api/admin/cover-delete').set('Origin',origin).send({url}).expect(200);
  assert.equal(protectedResult.body.deleted,false);assert.equal(deleted.length,0);
  await admin.post('/api/admin/cover-delete').set('Origin',origin).send({url:'/api/covers/123456.webp'}).expect(200);
  assert.deepEqual(deleted,['covers/123456.webp']);
});
