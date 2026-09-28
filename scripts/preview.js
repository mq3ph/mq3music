import {createApp} from '../src/index.js';import {testStore} from './test-store.js';import {readFile} from 'node:fs/promises';
const store=await testStore();store.env.MQ3_DEMO='1';
const demoSongs=JSON.parse(await readFile(new URL('../verified-preview-songs.json',import.meta.url),'utf8'));
for(const [i,s] of demoSongs.entries())await store.query('INSERT INTO hub_songs(id,title,category,youtube_url,spotify_url,cover_url,published,featured) VALUES($1,$2,$3,$4,$5,$6,true,$7)',[`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,s.title,s.category,s.youtube_url,s.spotify_url,s.cover_url,i===0]);
const app=createApp(store);app.listen(3478,'127.0.0.1',()=>console.log('Local preview http://localhost:3478 | admin password: preview-only | in-memory data only'));
