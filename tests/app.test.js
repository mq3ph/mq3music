import {fixture} from './fixture.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newDb} from 'pg-mem';
import request from 'supertest';
import {createApp} from '../src/index.js';
import {passwordHash,verifyPassword} from '../src/security.js';

const origin='http://localhost:3000';
test('password hashes verify only the right password',()=>{const hash=passwordHash('a strong password');assert.ok(verifyPassword('a strong password',hash));assert.equal(verifyPassword('wrong',hash),false);assert.equal(verifyPassword('a strong password','plaintext'),false);});
test('public/admin boundaries, requests, private audio, and payment verification',async t=>{
  const {app,q,sent}=await fixture();const admin=request.agent(app),buyer=request.agent(app),stranger=request.agent(app);
  const post=(agent,path,body)=>agent.post(path).set('Origin',origin).send(body);
  await t.test('admin access requires login and matching origin',async()=>{
    assert.equal((await buyer.get('/api/admin/songs')).status,401);
    assert.equal((await post(buyer,'/api/admin/songs',{title:'Attack'})).status,401);
    assert.equal((await admin.post('/api/login').set('Origin','https://other.example').send({password:'test-password'})).status,403);
    assert.equal((await post(admin,'/api/login',{password:'wrong'})).status,401);
    const r=await post(admin,'/api/login',{password:'test-password'});assert.equal(r.status,200);assert.match(r.headers['set-cookie'][0],/HttpOnly/);
  });
  let songId;
  await t.test('draft uploads are private; public cannot obtain upload tokens',async()=>{
    const r=await post(admin,'/api/admin/songs',{title:'Manny',category:'NAME SONGS',names:'Manny, Manuel',lyrics:'Written test lyrics',price:20000});assert.equal(r.status,200);songId=r.body.id;
    assert.equal((await buyer.get('/api/catalog')).body.songs.length,0);
    assert.equal((await post(admin,'/api/admin/songs',{id:songId,title:'Manny',category:'NAME SONGS',price:20000,published:true})).status,400);
    const ticket=(await post(admin,'/api/admin/upload-ticket',{songId,kind:'audio'})).body;
    assert.equal((await post(buyer,'/api/blob/upload',{pathname:ticket.pathname,clientPayload:ticket.id})).status,401);
    assert.equal((await post(admin,'/api/blob/upload',{pathname:'wrong.mp3',clientPayload:ticket.id})).status,400);
    assert.equal((await post(admin,'/api/blob/upload',{pathname:ticket.pathname,clientPayload:ticket.id})).status,200);
    assert.equal((await post(admin,'/api/admin/upload-finish',{ticket:ticket.id})).status,200);
    assert.equal((await post(admin,'/api/admin/songs',{id:songId,title:'Manny',category:'NAME SONGS',names:'Manuel',price:20000,published:true})).status,200);
    const catalog=(await buyer.get('/api/catalog')).body;assert.equal(catalog.songs.length,1);assert.equal(catalog.songs[0].audio_path,undefined);
    assert.equal((await buyer.get(`/api/songs/${songId}/audio`)).status,402);
  });
  await t.test('requests validate, deduplicate and notify only with a linked published song',async()=>{
    assert.equal((await post(buyer,'/api/requests',{name:'Manny',email:'bad',consent:true})).status,400);
    for(let i=0;i<2;i++)assert.equal((await post(buyer,'/api/requests',{name:'Manny',email:'listener@example.test',consent:true})).status,201);
    const rows=await q('SELECT * FROM requests');assert.equal(rows.length,1);
    assert.equal((await buyer.get('/api/admin/requests')).status,401);
    assert.equal((await post(admin,`/api/admin/requests/${rows[0].id}/notify`,{})).status,400);
    await post(admin,`/api/admin/requests/${rows[0].id}`,{status:'available',songId});
    assert.equal((await post(admin,`/api/admin/requests/${rows[0].id}/notify`,{})).status,200);
    assert.equal(sent.length,1);assert.equal((await q('SELECT status FROM requests'))[0].status,'notified');
  });
  let order;
  await t.test('server sets prices and isolates payment records',async()=>{
    const r=await post(buyer,'/api/orders',{provider:'gcash',kind:'song',songId,email:'buyer@example.test',amount:1});assert.equal(r.status,201);order=r.body.id;assert.equal(r.body.amount,20000);
    assert.equal((await stranger.get(`/api/orders/${order}`)).status,404);
    assert.equal((await post(stranger,`/api/orders/${order}/reference`,{reference:'stolen'})).status,404);
    assert.equal((await post(buyer,`/api/orders/${order}/reference`,{reference:'TEST-REFERENCE'})).status,200);
    assert.equal((await post(buyer,`/api/admin/orders/${order}/review`,{status:'paid',verified:true})).status,401);
    assert.equal((await buyer.get(`/api/songs/${songId}/audio`)).status,402);
  });
  await t.test('only verified payments grant full access; email redemption is single use',async()=>{
    assert.equal((await post(admin,`/api/admin/orders/${order}/review`,{status:'paid'})).status,400);
    assert.equal((await post(admin,`/api/admin/orders/${order}/review`,{status:'paid',verified:true})).status,200);
    assert.equal((await buyer.get(`/api/songs/${songId}/audio`).set('Range','bytes=0-7')).status,206);
    assert.equal((await stranger.get(`/api/songs/${songId}/audio`)).status,402);
    assert.equal((await post(admin,`/api/admin/orders/${order}/email`,{})).status,200);
    const access=sent.at(-1)[2].match(/#([a-f0-9]{64})/)[1];
    assert.equal((await post(stranger,'/api/redeem',{token:access})).status,200);
    assert.equal((await post(buyer,'/api/redeem',{token:access})).status,400);
    assert.equal((await stranger.get(`/api/songs/${songId}/audio`)).status,200);
  });
  await t.test('membership expires and logout revokes the server session',async()=>{
    const r=await post(buyer,'/api/orders',{provider:'paypal',kind:'membership',email:'member@example.test'});assert.equal(r.status,201);assert.equal(r.body.amount,19900);
    await post(buyer,`/api/orders/${r.body.id}/reference`,{reference:'PAYPAL-TEST'});await post(admin,`/api/admin/orders/${r.body.id}/review`,{status:'paid',verified:true});
    assert.equal((await buyer.get(`/api/songs/${songId}/audio`)).status,200);
    await q('UPDATE orders SET expires_at=$2 WHERE id=$1',[r.body.id,new Date(Date.now()-1000)]);
    assert.equal((await buyer.get(`/api/songs/${songId}/audio`)).status,402);
    const before=await admin.get('/api/admin/session');assert.equal(before.status,200);await post(admin,'/api/logout',{});assert.equal((await admin.get('/api/admin/session')).status,401);
  });
});
