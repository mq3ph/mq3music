const {chromium}=require(process.env.MQ3_PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.MQ3_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const account={email:'test@example.com',displayName:'Tester',credits:{total:50,purchased:50,promo:0},giftHistory:[],creditLoadOrders:[]};
 for(const mode of ['success','failure-retry','signed-out','cancel','already-credited']){
  const page=await browser.newPage({viewport:{width:390,height:844}});let captures=0,signedIn=mode!=='signed-out';const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
  await page.route('https://mq3.test/**',async route=>{
   const url=new URL(route.request().url());let body={};let status=200;
   if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:fs.readFileSync('public/index.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')+'<script src="/mq3-account.js"></script>'});
   if(url.pathname==='/mq3-account.js')return route.fulfill({contentType:'application/javascript',body:fs.readFileSync('public/mq3-account.js','utf8')});
   if(url.pathname==='/api/account')body={signedIn,account:signedIn?account:undefined};
   if(url.pathname==='/api/account/paypal/capture-order'){
    captures++;assert.equal(route.request().postDataJSON().orderId,'ORDER123');
    if(mode==='failure-retry'&&captures===1){status=502;body={error:'Temporary failure'};}else body={account,creditsAdded:50,alreadyCredited:mode==='already-credited'};
   }
   return route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto(`https://mq3.test/?mq3_paypal=${mode==='cancel'?'cancel':'return'}&token=ORDER123&keep=yes`);
  if(mode==='signed-out'){
   await page.waitForFunction(()=>document.getElementById('account-dialog').open);assert.equal(captures,0);assert.ok(page.url().includes('token='));signedIn=true;await page.reload();
  }
  if(mode==='failure-retry'){
   await page.waitForFunction(()=>document.getElementById('account-button').textContent.includes('50'));await page.waitForTimeout(150);assert.ok(page.url().includes('token='));await page.reload();
  }
  await page.waitForURL(u=>!u.searchParams.has('mq3_paypal'));
  assert.equal(captures,mode==='cancel'?0:mode==='failure-retry'?2:1);assert.ok(page.url().includes('keep=yes'));assert.deepEqual(errors,[]);console.log('PASS mobile PayPal '+mode);await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
