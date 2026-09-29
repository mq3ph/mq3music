export const categories=['Name Songs','Inspirational','OPM','Love Songs'];
const bad=message=>{throw Object.assign(new Error(message),{status:400});};
export function platformLink(raw,platform,artist=false){
  if(raw===undefined||raw===null||raw==='')return '';
  if(typeof raw!=='string'||raw.length>4000)bad('Use a valid platform link.');
  if(!raw.trim())return '';
  let input=raw.trim();
  if(input.startsWith('<'))input=input.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1]||'';
  let u;try{u=new URL(input);}catch{bad('Paste a full HTTPS song or embed link.');}
  if(u.protocol!=='https:'||u.username||u.password||u.port)bad('Use an HTTPS platform link.');
  if(platform==='youtube'){
    if(!['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtube-nocookie.com'].includes(u.hostname))bad('Use a YouTube link.');
    if(artist){if(!/^\/(?:@[\w.-]+|channel\/UC[\w-]+)\/?$/.test(u.pathname))bad('Use your YouTube channel or @handle link.');return 'https://www.youtube.com'+u.pathname.replace(/\/$/,'');}
    const id=u.hostname==='youtu.be'?u.pathname.slice(1):u.pathname==='/watch'?u.searchParams.get('v'):u.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)\/?$/)?.[1];
    if(!/^[\w-]{11}$/.test(id||''))bad('Use a single YouTube video / Art Track link.');
    return 'https://www.youtube.com/watch?v='+id;
  }
  if(u.hostname!=='open.spotify.com')bad('Use an open.spotify.com link.');
  const m=u.pathname.match(/^\/(?:intl-[a-z-]+\/)?(?:embed\/)?(track|artist)\/([A-Za-z0-9]{22})\/?$/);
  if(!m||m[1]!== (artist?'artist':'track'))bad(artist?'Use a Spotify artist link.':'Use a Spotify song / track link, not an album.');
  return 'https://open.spotify.com/'+m[1]+'/'+m[2];
}
export function songInput(body){
  const title=String(body.title||'').trim(),artist=String(body.artist||'manny III').trim();
  if(!title||title.length>160||!artist||artist.length>100)bad('Enter a song title and artist.');
  if(!categories.includes(body.category))bad('Choose one of the four categories.');
  const youtube_url=platformLink(body.youtube_url,'youtube'),spotify_url=platformLink(body.spotify_url,'spotify');
  const published=body.published===true;
  if(published&&!youtube_url&&!spotify_url)bad('Add at least one platform song link before publishing.');
  let cover_url=String(body.cover_url||'').trim();
  if(cover_url){
    const localCover=/^\/api\/covers\/[a-f0-9-]+\.(?:jpg|png|webp)$/.test(cover_url);
    if(!localCover){let u;try{u=new URL(cover_url);}catch{bad('Use an uploaded MQ3 cover or HTTPS cover image URL.');}if(u.protocol!=='https:'||u.username||u.password||cover_url.length>2000)bad('Use an uploaded MQ3 cover or HTTPS cover image URL.');}
  }
  const description=String(body.description||'').trim();if(description.length>1200)bad('Description is too long.');
  const lyrics=String(body.lyrics||'').trim();if(lyrics.length>30000)bad('Lyrics are too long.');
  return {title,artist,category:body.category,youtube_url,spotify_url,cover_url,description,lyrics,published,featured:body.featured===true};
}
// Calendar periods in Philippine time; these are website analytics, not platform royalties.
export function periodStart(period,now=new Date()){
  const local=new Date(now.getTime()+8*3600000);local.setUTCHours(0,0,0,0);
  if(period==='weekly')local.setUTCDate(local.getUTCDate()-((local.getUTCDay()+6)%7));
  else if(period==='monthly')local.setUTCDate(1);
  else if(period==='all')return new Date(0);
  else if(period!=='daily')bad('Choose a valid reporting period.');
  return new Date(local.getTime()-8*3600000);
}
