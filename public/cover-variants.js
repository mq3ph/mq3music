export const categoryArtwork={
  'Name Songs':['name-long','name-waves','name-curls','name-bob','name-short','name-curly'],
  Inspirational:['hope-sunrise','hope-path'],
  OPM:['opm-rain','opm-province'],
  'Love Songs':['love-together','love-longing']
};

const artwork={};
async function text(path){const r=await fetch(path,{cache:'force-cache'});if(!r.ok)throw Error('Artwork unavailable: '+path);return (await r.text()).trim();}
async function json(path){return JSON.parse(await text(path));}
try{
  const [nameLong,nameWaves,nameCurls,names,hope,opm,love]=await Promise.all([
    text('/assets/artworks/name-long.b64.txt'),
    text('/assets/artworks/name-waves.b64.txt'),
    text('/assets/artworks/name-curls.b64.txt'),
    json('/assets/artworks/names2.b64.json'),
    json('/assets/artworks/hope.b64.json'),
    json('/assets/artworks/opm.b64.json'),
    json('/assets/artworks/love.b64.json')
  ]);
  Object.assign(artwork,names,hope,opm,love,{
    'name-long':nameLong,
    'name-waves':nameWaves,
    'name-curls':nameCurls
  });
}catch(error){console.warn('MQ3 artwork bundle could not be fully loaded.',error);}

function hashText(value){let h=2166136261;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0;}
export function coverFor(song){
  if(String(song?.cover_url||'').trim())return song.cover_url;
  const choices=categoryArtwork[song?.category]||categoryArtwork['Name Songs'];
  const key=choices[hashText(song?.id||song?.title||'mq3')%choices.length];
  const data=artwork[key];
  return data?'data:image/webp;base64,'+data:'/assets/logo.png';
}
