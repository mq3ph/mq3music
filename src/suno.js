export async function resolveSunoLink(value, fetcher=fetch) {
 if (!value || !String(value).trim()) return null;
 let url; try {url=new URL(String(value).trim());} catch {throw Error('Enter a valid Suno song link.');}
 for(let i=0;i<5;i++) {
  if(url.protocol!=='https:' || !['suno.com','www.suno.com'].includes(url.hostname) || url.port || url.username || url.password) throw Error('Use an https://suno.com song link.');
  const match=url.pathname.match(/^\/(?:song|embed)\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\/?$/i);
  if(match) return 'https://suno.com/song/'+match[1].toLowerCase();
  if(!/^\/s\/[a-zA-Z0-9]+\/?$/.test(url.pathname)) throw Error('Use a Suno song link, not a profile or playlist.');
  let response; try {response=await fetcher(url.href,{redirect:'manual',signal:AbortSignal.timeout(6000)});} catch {throw Error('Open the short link and paste the full /song/ address from your browser.');}
  const location=response.headers.get('location'); await response.body?.cancel();
  if(response.status<300 || response.status>=400 || !location) throw Error('Open the short link and paste the full /song/ address from your browser.');
  url=new URL(location,url);
 }
 throw Error('Open the Suno song and paste its full /song/ link.');
}
