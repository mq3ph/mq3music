export const categoryArtwork={
 'Name Songs':['name-long','name-waves','name-curls','name-bob','name-short','name-curly'],
 Inspirational:['hope-sunrise','hope-path'],
 OPM:['opm-rain','opm-province'],
 'Love Songs':['love-together','love-longing']
};
function hashText(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0;}
export function coverFor(song){
 const choices=categoryArtwork[song?.category]||categoryArtwork['Name Songs'];
 const h=hashText(String(song?.id||song?.title||'mq3'));
 return '/assets/artworks/'+choices[(h>>>0)%choices.length]+'.webp';
}
