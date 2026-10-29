import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
mkdirSync('desktop-dist',{recursive:true});
await build({entryPoints:['desktop/main.ts'],outfile:'desktop-dist/main.mjs',bundle:true,platform:'node',target:'node24',format:'esm',packages:'external',sourcemap:false});
await build({entryPoints:['desktop/preload.ts'],outfile:'desktop-dist/preload.cjs',bundle:true,platform:'node',target:'node24',format:'cjs',external:['electron'],sourcemap:false});
console.log('Desktop main / preload built.');
