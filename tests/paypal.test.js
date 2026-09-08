import test from 'node:test';
import assert from 'node:assert/strict';
import {capturePaypalOrder} from '../src/paypal.js';
const completed={id:'ORDER123',status:'COMPLETED',purchase_units:[{payments:{captures:[{id:'CAPTURE123',status:'COMPLETED',amount:{currency_code:'PHP',value:'50.00'}}]}}]};
const response=(body,status=200)=>new Response(JSON.stringify(body),{status});
const options={baseUrl:'https://api-m.sandbox.paypal.com',accessToken:'fake-token',orderId:'ORDER123'};
test('already captured order is read without another charge',async()=>{
  const calls=[];
  assert.deepEqual(await capturePaypalOrder({...options,fetchImpl:async(url,opts)=>{calls.push(opts);return response(completed);}}),completed);
  assert.equal(calls.length,1);assert.equal(calls[0].method,undefined);
});
test('approved order captures with stable idempotency key and representation',async()=>{
 const keys=[];
 for(let i=0;i<2;i++){
  await capturePaypalOrder({...options,fetchImpl:async(url,opts)=>{
   if(!url.endsWith('/capture')) return response({status:'APPROVED'});
   keys.push(opts.headers['PayPal-Request-Id']);assert.equal(opts.headers.Prefer,'return=representation');assert.equal(opts.body,'{}');return response(completed);
  }});
 }
 assert.equal(keys[0],keys[1]);assert.ok(keys[0].length<=38);
});
for(const failure of ['network','already-captured']) test(`recovers ${failure} using authoritative order details`,async()=>{
 let reads=0;
 const actual=await capturePaypalOrder({...options,fetchImpl:async(url)=>{
  if(url.endsWith('/capture')){if(failure==='network') throw new Error('timeout');return response({name:'ORDER_ALREADY_CAPTURED'},422);}
  return response(++reads===1?{status:'APPROVED'}:completed);
 }});
 assert.deepEqual(actual,completed);assert.equal(reads,2);
});
test('unapproved order cannot be captured',async()=>{
 await assert.rejects(capturePaypalOrder({...options,fetchImpl:async()=>response({status:'CREATED'})}),{status:409});
});
test('failed capture without completed order remains retryable',async()=>{
 await assert.rejects(capturePaypalOrder({...options,fetchImpl:async(url)=>url.endsWith('/capture')?response({},500):response({status:'APPROVED'})}),{status:502});
});
import {accountRoutes} from '../src/account.js';
for(const scenario of ['wrong amount','wrong currency','wrong order','pending capture','other user']) test(`wallet is not credited for ${scenario}`,async()=>{
 const routes=new Map();let writes=0;
 accountRoutes({app:{get(){},post(path,fn){routes.set(path,fn);}},env:{SESSION_SECRET:'test-secret-with-at-least-thirty-two-characters',PAYPAL_CLIENT_ID:'fake',PAYPAL_SECRET:'fake'},sameOrigin(){},limit:async()=>{},query:async(sql)=>{
  if(sql.includes('FROM user_sessions'))return [{user_id:'user-one'}];
  if(sql.includes('FROM credit_load_orders'))return scenario==='other user'?[]:[{id:'local-order',amount_pesos:50,credits:50,status:'pending'}];
  writes++;throw new Error('Unexpected database write');
 }});
 const data=structuredClone(completed);
 if(scenario==='wrong amount')data.purchase_units[0].payments.captures[0].amount.value='1.00';
 if(scenario==='wrong currency')data.purchase_units[0].payments.captures[0].amount.currency_code='USD';
 if(scenario==='wrong order')data.id='OTHERORDER';
 if(scenario==='pending capture')data.purchase_units[0].payments.captures[0].status='PENDING';
 const original=globalThis.fetch;globalThis.fetch=async(url)=>response(url.endsWith('/token')?{access_token:'fake'}:data);
 let error;
 try {await routes.get('/api/account/paypal/capture-order')({cookies:{mq3_user:'a'.repeat(64)},body:{orderId:'ORDER123'}},{json(){throw new Error('Must not succeed');}},e=>{error=e;});}
 finally{globalThis.fetch=original;}
 assert.equal(error.status,scenario==='other user'?404:400);assert.equal(writes,0);
});

