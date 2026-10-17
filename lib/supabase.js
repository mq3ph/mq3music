import {createClient} from '@supabase/supabase-js';
export const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export const referral='masalomequimson';
export function buyLink(p){if(p.buy_url)return p.buy_url;const path=p.usana_path||'/ux/cart/en-PH/category/-1';return `https://${referral}.usana.com${path}${path.includes('?')?'&':'?'}ref=${referral}`}
