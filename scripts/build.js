import {build} from 'esbuild';
import {copyFile} from 'node:fs/promises';

await build({entryPoints:['src/admin-client.js'],bundle:true,minify:true,format:'esm',outfile:'public/admin.bundle.js',platform:'browser'});

// Vercel production serves the root index for the Song Creator. Keep the
// Featured Songs markup in that production entry too, and emit a dedicated
// static page for /featuredsongs.
// Dedicated Featured Songs page is maintained separately; do not overwrite it from index.html.

console.log('Admin upload client built. Featured Songs page synced.');
