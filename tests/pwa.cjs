const {chromium}=require(process.env.MQ3_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const {fixture}=await import('./fixture.js');const {app}=await fixture();
 const server=await new Promise(resolve=>{const s=app.listen(3000,'127.0.0.1',()=>resolve(s));});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:3000');
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  const manifest=await (await context.request.get('http://localhost:3000/manifest.webmanifest')).json();
  assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'/');
  for(const icon of manifest.icons){const dimensions=await page.evaluate(async src=>{const img=new Image();img.src=src;await img.decode();return `${img.naturalWidth}x${img.naturalHeight}`;},icon.src);assert.equal(dimensions,icon.sizes);}
  for(const width of [320,390,430]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  await page.locator('#install-app').click();await page.locator('#install-help').waitFor({state:'visible'});await page.locator('#close-install-help').click();
  await context.setOffline(true);await page.reload();await page.getByText('Your music will be here.',{exact:true}).waitFor();
  const cached=await page.evaluate(async()=>{const result=[];for(const key of await caches.keys()){for(const r of await (await caches.open(key)).keys())result.push(new URL(r.url).pathname);}return result;});
  assert.deepEqual(cached,['/offline.html']);assert.deepEqual(errors,[]);
  console.log('PASS: manifest, correct icon dimensions, mobile layouts 320/390/430, install help, service worker, offline fallback; no private/API/audio caching. Actual phone installation still requires device verification.');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
