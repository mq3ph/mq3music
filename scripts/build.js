import {build} from 'esbuild';
await build({entryPoints:['src/admin-client.js'],bundle:true,minify:true,format:'esm',outfile:'public/admin.bundle.js',platform:'browser'});
console.log('Admin upload client built.');
