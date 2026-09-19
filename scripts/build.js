import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';

await build({entryPoints:['src/admin-client.js'],bundle:true,minify:true,format:'esm',outfile:'public/admin.bundle.js',platform:'browser'});

// Add small production-only polish without rewriting the established creator markup.
// Apply it to both entry pages because Featured Songs is intentionally maintained separately.
const polish='<link rel="stylesheet" href="/creator-polish.css?v=20260920-1">';
for(const file of ['public/index.html','public/featuredsongs.html']){
  const html=await readFile(file,'utf8');
  if(!html.includes('/creator-polish.css')){
    await writeFile(file,html.replace('</head>',`${polish}</head>`));
  }
}

console.log('Admin upload client built. Song Creator polish applied.');
