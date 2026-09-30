import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
for(const file of ['src/index.js','src/listening-model.js','src/social-page.js','public/library-state.js','public/listening.js','public/listening-admin.js','public/artwork-generator.js','public/artwork-command.js','public/player-controls.js'])execFileSync(process.execPath,['--check',file]);
for(const file of ['public/index.html','public/admin.html']){const html=await readFile(file,'utf8');if(!html.includes('/listening.css'))throw Error('Missing listening stylesheet.');}
console.log('MQ3 listening edition checked. No legacy commerce assets are served.');