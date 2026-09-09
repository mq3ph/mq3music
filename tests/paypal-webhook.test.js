import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {accountRoutes} from '../src/account.js';
import {digest} from '../src/security.js';
const require=createRequire(import.meta.url);
let PGlite;
try { ({PGlite}=require(process.env.MQ3_PGLITE_MODULE || '@electric-sql/pglite')); } catch {}

test('webhook recovery, replay, wallet transaction and environment isolation',{skip:!PGlite && 'Install @electric-sql/pglite or set MQ3_PGLITE_MODULE to run PostgreSQL checks'},async t=>{
 const db=new PGlite();const userId=randomUUID();const session='a'.repeat(64);
 const env={PAYPAL_ENV:'live',PAYPAL_CLIENT_ID:'fake',PAYPAL_SECRET:'fake',PAYPAL_WEBHOOK_ID:'WH-TEST',APP_URL:'https://mq3.test',SESSION_SECRET:'test-secret-with-more-than-thirty-two-characters'};
 await db.exec(`CREATE TABLE users(id uuid primary key,email text,display_name text,display_name_changed_at timestamptz,created_at timestamptz default now(),last_login_at timestamptz);
 CREATE TABLE wallets(user_id uuid primary key,promo_credits integer default 0,purchased_credits integer default 0,lifetime_gifted integer default 0,welcome_bonus_claimed boolean default true,updated_at timestamptz);
 CREATE TABLE user_sessions(token_hash text,user_id uuid,expires_at timestamptz);
 CREATE TABLE songs(id uuid primary key,title text);
 CREATE TABLE gifts(id uuid,user_id uuid,song_id uuid,gift_type text,credits integer,message text,created_at timestamptz);
 CREATE TABLE credit_load_orders(id uuid primary key,user_id uuid,amount_pesos integer,credits integer,payment_provider text,payment_reference text,status text,created_at timestamptz default now(),reviewed_at timestamptz);
 CREATE TABLE credit_transactions(id uuid primary key,user_id uuid,transaction_type text,promo_change integer,purchased_change integer,description text,reference_id uuid);
 CREATE UNIQUE INDEX one_credit_purchase_per_load_order ON credit_transactions(reference_id) WHERE transaction_type='credit_purchase';`);
 await db.exec(await readFile(new URL('../paypal-webhook-migration.sql',import.meta.url),'utf8'));
 await db.query('INSERT INTO users(id,email) VALUES($1,$2)',[userId,'test@example.com']);
 await db.query('INSERT INTO wallets(user_id) VALUES($1)',[userId]);
 await db.query("INSERT INTO user_sessions VALUES($1,$2,now()+interval '1 day')",[digest(session,env.SESSION_SECRET),userId]);
 const routes=new Map();let dbFailure=false;let invalidSignature=false;let paypalFailure=false;let nextId=0;let posts=0;let pendingCapture=false;
 const orders=new Map();
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async(url,opts={})=>{
  const json=(x,status=200)=>new Response(JSON.stringify(x),{status});
  if(url.endsWith('/token'))return json({access_token:'mock'});
  if(url.endsWith('/verify-webhook-signature'))return json({verification_status:invalidSignature?'FAILURE':'SUCCESS'});
  if(url.endsWith('/v2/checkout/orders')){
   const sent=JSON.parse(opts.body);assert.ok(opts.headers['PayPal-Request-Id']);
   const id=`ORDER000${++nextId}`;
   orders.set(id,{id,status:'APPROVED',purchase_units:sent.purchase_units});
   return json({id,links:[{rel:'payer-action',href:`https://www.paypal.com/checkoutnow?token=${id}`}]});
  }
  const id=url.split('/').filter(Boolean).at(url.endsWith('/capture')?-2:-1);const order=orders.get(id);
  if(paypalFailure)return json({},503);
  assert.ok(order,`Unexpected PayPal order ${id}`);
  if(url.endsWith('/capture')){
   posts++;order.status='COMPLETED';order.purchase_units[0].payments={captures:[{id:`CAP${id}`,status:pendingCapture?'PENDING':'COMPLETED',amount:{currency_code:'PHP',value:'50.00'}}]};
  }
  return json(order);
 };
 accountRoutes({app:{get(){},post(path,fn){routes.set(path,fn);}},env,sameOrigin(){},limit:async()=>{},query:async(sql,params)=>{
  if(dbFailure && sql.includes('WITH reviewed')){dbFailure=false;throw new Error('simulated database interruption');}
  return (await db.query(sql,params)).rows;
 }});
 const invoke=async(path,body,headers={})=>{
  let result,error;await routes.get(path)({body,headers,cookies:{mq3_user:session}},{status(){return this;},json(v){result=v;}},e=>{error=e;});
  if(error)throw error;return result;
 };
 const signature={'paypal-auth-algo':'SHA256withRSA','paypal-cert-url':'https://api.paypal.com/cert','paypal-transmission-id':'TX-TEST','paypal-transmission-sig':'fake','paypal-transmission-time':new Date().toISOString()};
 const create=()=>invoke('/api/account/paypal/create-order',{amountPesos:50});
 const event=(id,type='CHECKOUT.ORDER.APPROVED')=>({id:'EVENT-'+id,event_type:type,resource:type==='CHECKOUT.ORDER.APPROVED'?{id}:{supplementary_data:{related_ids:{order_id:id}}}});
 const webhook=(id,type)=>invoke('/api/paypal/webhook',event(id,type),signature);
 const balance=async()=>Number((await db.query('SELECT purchased_credits FROM wallets')).rows[0].purchased_credits);
 try{
  await t.test('approval webhook captures and credits without a browser return',async()=>{
   const order=await create();await webhook(order.orderId);assert.equal(await balance(),50);assert.equal(posts,1);
   await webhook(order.orderId);await webhook(order.orderId,'PAYMENT.CAPTURE.COMPLETED');
   const result=await invoke('/api/account/paypal/capture-order',{orderId:order.orderId});
   assert.equal(result.alreadyCredited,true);assert.equal(await balance(),50);assert.equal(posts,1);
   assert.equal((await db.query('SELECT count(*) FROM credit_transactions')).rows[0].count,1);
  });
  await t.test('forged event and missing signature cannot alter wallet',async()=>{
   const order=await create();invalidSignature=true;
   await assert.rejects(webhook(order.orderId),{status:400});invalidSignature=false;
   await assert.rejects(invoke('/api/paypal/webhook',event(order.orderId)),{status:400});assert.equal(await balance(),50);
  });
  await t.test('database interruption after capture recovers once on redelivery',async()=>{
   const order=await create();dbFailure=true;await assert.rejects(webhook(order.orderId),/database interruption/);assert.equal(await balance(),50);
   await webhook(order.orderId);assert.equal(await balance(),100);
  });
  await t.test('browser return and duplicate events racing only add once',async()=>{
   const order=await create();await Promise.all([webhook(order.orderId),webhook(order.orderId),invoke('/api/account/paypal/capture-order',{orderId:order.orderId})]);assert.equal(await balance(),150);
  });
  await t.test('PayPal outage does not acknowledge fulfillment',async()=>{
   const order=await create();paypalFailure=true;await assert.rejects(webhook(order.orderId),{status:502});paypalFailure=false;assert.equal(await balance(),150);
  });
  await t.test('unrelated event never credits a wallet',async()=>{await webhook('UNRELATED123');assert.equal(await balance(),150);});
  await t.test('pending capture is not credited, later completion recovers',async()=>{
   const order=await create();pendingCapture=true;await assert.rejects(webhook(order.orderId),{status:400});pendingCapture=false;
   assert.equal(await balance(),150);orders.get(order.orderId).purchase_units[0].payments.captures[0].status='COMPLETED';
   await webhook(order.orderId,'PAYMENT.CAPTURE.COMPLETED');assert.equal(await balance(),200);
  });
  await t.test('sandbox cannot affect spendable balance or live reconciliation',async()=>{
   env.PAYPAL_ENV='sandbox';const order=await create();env.PAYPAL_ENV='live';
   await webhook(order.orderId);await assert.rejects(invoke('/api/account/paypal/capture-order',{orderId:order.orderId}),{status:409});
   env.PAYPAL_ENV='sandbox';await webhook(order.orderId);
   const result=await invoke('/api/account/paypal/capture-order',{orderId:order.orderId});assert.equal(result.sandbox,true);assert.equal(await balance(),200);
   assert.equal(result.account.creditLoadOrders.find(o=>o.paymentReference===order.orderId).paymentEnvironment,'sandbox');
  });
 }finally{globalThis.fetch=originalFetch;await db.close();}
});
