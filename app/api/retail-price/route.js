import {NextResponse} from 'next/server';

const HOST='https://masalomequimson.usana.com';

function money(v){const n=Number(String(v).replace(/[^0-9.]/g,''));return Number.isFinite(n)&&n>=100&&n<=100000?n:null}
function findRetail(html){
  const patterns=[
    /"(?:retailPrice|retail_price|suggestedRetailPrice|listPrice|customerPrice)"\s*:\s*(?:"?₱?\s*)?([0-9][0-9,.]*)/i,
    /"(?:formattedRetailPrice|formattedPrice)"\s*:\s*"(?:₱|PHP|P)\s*([0-9][0-9,.]*)/i,
    /(?:Suggested Retail Price|Retail Price)[^0-9]{0,80}(?:₱|PHP|P)\s*([0-9][0-9,.]*)/i
  ];
  for(const re of patterns){const m=html.match(re);if(m){const n=money(m[1]);if(n)return n}}
  return null;
}

export async function POST(req){
  try{
    const {path}=await req.json();
    if(!path||!/^\/ux\/cart\/en-PH\/product\/[A-Za-z0-9-]+\/[A-Za-z0-9-]+$/.test(path))return NextResponse.json({ok:false,error:'Invalid product path'},{status:400});
    const url=`${HOST}${path}?ref=masalomequimson`;
    const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; LivingWellPriceCheck/1.0)','accept-language':'en-PH,en;q=0.9'},cache:'no-store',redirect:'follow'});
    if(!r.ok)return NextResponse.json({ok:false,error:`USANA returned ${r.status}`});
    const html=await r.text();
    const price=findRetail(html);
    if(!price)return NextResponse.json({ok:false,error:'Retail price not available in page data'});
    return NextResponse.json({ok:true,price,source:url});
  }catch(e){return NextResponse.json({ok:false,error:e?.message||'Price check failed'})}
}
