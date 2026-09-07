import {readFile} from 'node:fs/promises';
import {services} from '../src/services.js';
const statements=(await readFile(new URL('../schema.sql',import.meta.url),'utf8')).split(';').map(s=>s.trim()).filter(Boolean);
for(const statement of statements)await services().query(statement);
console.log('MQ3 database tables ready. Existing records retained.');
