const {chromium}=require(process.env.MQ3_PLAYWRIGHT_MODULE);const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.playCalls=0;HTMLMediaElement.prototype.play=async function(){window.playCalls++;this.dispatchEvent(new Event('play'));};});
 const songs=[{id:'suno1',title:'Moses',category:'NAME SONGS',lyrics:'Line one\n<script>unsafe</script>',suno_url:'https://suno.com/song/657e28fc-df67-4dd1-be2d-24bfaa952503'},{id:'mp3',title:'Existing MP3',category:'NAME SONGS'}];
 await page.route('https://suno.com/**',r=>r.fulfill({contentType:'text/html',body:'<button>Play Suno test player</button>'}));
 await page.route('https://mq3.test/**',async r=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/api/'))return r.fulfill({contentType:'application/json',body:JSON.stringify(u.pathname==='/api/catalog'?{songs}:{songs:{},supporters:[]})});let file=path.join('public',u.pathname==='/'?'index.html':u.pathname.slice(1));if(u.pathname==='/')return r.fulfill({contentType:'text/html',body:fs.readFileSync(file,'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')+'<script src="/app.js"></script>'});return fs.existsSync(file)?r.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'image/png'}):r.fulfill({status:404,body:''});});
 await page.goto('https://mq3.test/');await page.waitForFunction(()=>tracks.length===2);
 await page.evaluate(()=>start(tracks[1]));assert.equal(await page.evaluate(()=>playCalls),1);
 await page.evaluate(()=>start(tracks[0]));await page.locator('#mq3-suno-dialog[open]').waitFor();assert.equal(await page.evaluate(()=>audio.paused),true);
 assert.equal(await page.locator('#mq3-suno-dialog iframe').getAttribute('src'),'https://suno.com/embed/657e28fc-df67-4dd1-be2d-24bfaa952503');
 await page.locator('#mq3-suno-dialog summary').click();assert.match(await page.locator('#mq3-suno-dialog details').innerText(),/<script>unsafe<\/script>/);assert.equal(await page.locator('#mq3-suno-dialog script').count(),0);
 for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});assert.ok(await page.locator('#mq3-suno-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1));}
 await page.screenshot({path:'suno-panel-test.png'});
 await page.getByRole('button',{name:'Close player',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#mq3-suno-dialog iframe'));
 await page.evaluate(()=>start(tracks[1]));assert.equal(await page.evaluate(()=>playCalls),2);assert.deepEqual(errors,[]);
 console.log('PASS Suno panel, literal lyrics, responsive widths, iframe cleanup and MP3 controls');
 // Real provider check: separate from mocked UI tests, no payment or account actions.
 const real=await browser.newPage();await real.setContent('<iframe width="600" height="300" src="https://suno.com/embed/657e28fc-df67-4dd1-be2d-24bfaa952503"></iframe>');
 try{const frame=real.frameLocator('iframe');await frame.getByRole('heading',{name:'Moses'}).waitFor({timeout:20000});console.log('LIVE EMBED: Moses rendered inside iframe');await frame.getByRole('button').first().click();await real.waitForTimeout(4000);console.log('LIVE EMBED TEXT:',await frame.locator('body').innerText());}catch(e){console.log('LIVE EMBED UNVERIFIED:',e.message.slice(0,200));}
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});

