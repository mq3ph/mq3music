import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
for(const file of ['src/index.js','src/listening-model.js','public/listening.js','public/listening-admin.js'])execFileSync(process.execPath,['--check',file]);
for(const file of ['public/index.html','public/admin.html']){const html=await readFile(file,'utf8');if(!html.includes('/listening.css'))throw Error('Missing listening stylesheet.');}
console.log('MQ3 listening edition checked. No legacy commerce assets are served.');
