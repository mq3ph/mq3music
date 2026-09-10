export function storageReport(songs, blobs, now=new Date()) {
  const files=new Map(blobs.map(b=>[b.pathname,{size:Number(b.size)||0}]));
  const owners=new Map();
  for(const song of songs) for(const path of new Set([song.audio_path,song.preview_path].filter(Boolean))) {
    if(!owners.has(path)) owners.set(path,[]);
    owners.get(path).push(song);
  }
  const categories=new Map();
  for(const song of songs) {
    if(!categories.has(song.category)) categories.set(song.category,{category:song.category,songs:0,files:0,bytes:0});
    categories.get(song.category).songs++;
  }
  let totalBytes=0,unlinkedBytes=0,unlinkedFiles=0,sharedBytes=0,sharedFiles=0;
  for(const [path,file] of files) {
    totalBytes+=file.size;
    const refs=owners.get(path)||[];
    const groups=new Set(refs.map(s=>s.category));
    if(!refs.length){unlinkedBytes+=file.size;unlinkedFiles++;}
    else if(groups.size>1){sharedBytes+=file.size;sharedFiles++;}
    else {const group=categories.get(refs[0].category);group.files++;group.bytes+=file.size;}
  }
  const converted=songs.filter(s=>s.suno_url&&(s.audio_path||s.preview_path)).map(s=>{
    const paths=[...new Set([s.audio_path,s.preview_path].filter(Boolean))];
    const found=paths.filter(p=>files.has(p));
    return {id:s.id,title:s.title,category:s.category,files:found.length,bytes:found.reduce((n,p)=>n+files.get(p).size,0),missing:paths.length-found.length,shared:found.some(p=>owners.get(p).length>1),hasOrders:!!s.has_orders};
  });
  const reviewPaths=new Set();
  for(const song of songs.filter(s=>s.suno_url)) for(const path of [song.audio_path,song.preview_path]) if(path&&files.has(path)) reviewPaths.add(path);
  return {checkedAt:now.toISOString(),totalFiles:files.size,totalBytes,categories:[...categories.values()],converted,
    reviewBytes:[...reviewPaths].reduce((n,p)=>n+files.get(p).size,0),reviewFiles:reviewPaths.size,
    unlinkedBytes,unlinkedFiles,sharedBytes,sharedFiles,missingFiles:[...owners.keys()].filter(p=>!files.has(p)).length};
}
