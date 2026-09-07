const {chromium}=require(process.env.MQ3_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
  const {fixture}=await import('./fixture.js');const {app}=await fixture();
  const server=await new Promise(resolve=>{const s=app.listen(3000,'127.0.0.1',()=>resolve(s));});
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1366,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://localhost:3000');
    assert.equal(await page.locator('#add').count(),0);
    await page.locator('#search').fill('Manny');await page.locator('#search').press('Enter');
    await page.locator('#name-request').waitFor({state:'visible'});
    assert.equal(await page.locator('#requested-name').inputValue(),'Manny');
    await page.locator('#requested-email').fill('listener@example.test');await page.locator('#request-consent').check();
    await page.locator('#name-request-form button[type="submit"], #name-request-form button:not([type])').click();
    await page.getByText('Your request is recorded.',{exact:false}).waitFor();
    await page.locator('#cancel-name-request').click();
    await page.goto('http://localhost:3000/admin');await page.locator('#password').fill('test-password');await page.locator('#login button').click();
    await page.locator('#dashboard').waitFor({state:'visible'});await page.getByText('listener@example.test',{exact:true}).waitFor();
    assert.equal(await page.locator('#tabs button').count(),7);
    await page.locator('#tabs').getByRole('button',{name:'NAME SONGS',exact:true}).click();await page.locator('#new-song').click();
    await page.locator('#song-title').fill('Manny');await page.locator('#song-names').fill('Manuel, Manny');await page.locator('#song-price').fill('200');await page.locator('#save-song').click();
    await page.locator('#editor').waitFor({state:'hidden'});await page.locator('td').getByText('draft',{exact:true}).waitFor();
    await page.locator('#tabs').getByRole('button',{name:'GCash',exact:true}).click();await page.getByText('Manual verification:',{exact:false}).waitFor();
    await page.locator('#tabs').getByRole('button',{name:'Name Request',exact:true}).click();
    fs.mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/admin-dashboard.png'});
    await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:'test-results/admin-mobile.png'});
    await page.goto('http://localhost:3000');await page.locator('#search').fill('Anne');await page.locator('#search').press('Enter');await page.locator('#name-request').waitFor({state:'visible'});await page.screenshot({path:'test-results/name-request-mobile.png'});
    assert.deepEqual(errors,[]);console.log('PASS: public has no uploads, name request submission appears in private dashboard, seven admin tabs, draft song save, manual payment notice, mobile layout; no browser errors.');
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
