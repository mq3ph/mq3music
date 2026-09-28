import {readFile} from 'node:fs/promises';
import {services} from '../src/services.js';
const q=services().query;
const statements=(await readFile(new URL('../listening-migration.sql',import.meta.url),'utf8')).split(';').map(s=>s.trim()).filter(Boolean);
for(const statement of statements)await q(statement);
const existing=await q("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='songs'");
if(existing.length){await q(`INSERT INTO hub_songs(id,title,category,legacy_views,created_at)
 SELECT id,title,CASE WHEN category='NAME SONGS' THEN 'Name Songs' WHEN category='INSPIRATIONAL SONGS' THEN 'Inspirational' WHEN category='LOVE SONGS' THEN 'Love Songs' ELSE 'OPM' END,COALESCE(views,0),created_at FROM songs ON CONFLICT(id) DO NOTHING`);}
console.log('Listening tables ready. Original data retained. Imported songs are drafts; add platform links and review categories before publishing.');
