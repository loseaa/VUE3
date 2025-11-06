import { fileURLToPath } from 'url';
import { dirname ,resolve} from 'path';
import minimist from 'minimist';
import esbuild from 'esbuild';

// ESM 下模拟 __filename 和 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const args = minimist(process.argv.slice(2));
let target = args._[0] || 'reactive';
let format = args.f || 'iife';

let entry=resolve(__dirname,`../packages/${target}/index.js`);
console.log(format);


const ctx = await esbuild.context({
  entryPoints: [entry],
  bundle: true,
  outfile: resolve(__dirname,`../dist/${target}.js`),
  sourcemap: true,
  platform: 'browser',
  globalName:"VVVV",
  format

});
await ctx.watch();
console.log(`watching... dist/${target}.js`);

