/**
 * Menyusun .vercel/output (Build Output API v3) dari hasil `npm run build`:
 * - static/: isi dist/ (game dan PWA), dilayani CDN Vercel;
 * - functions/api/chat.func dan functions/api/health.func: server/app.ts dibundel jadi satu file, tanpa node_modules.
 * Dipanggil lewat `npm run build:vercel` (lihat vercel.json). API key dibaca dari Environment Variables di Vercel.
 */
import { build } from 'esbuild';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';

const KELUAR = '.vercel/output';
if (!existsSync('dist/index.html')) throw new Error('dist/ belum ada. Jalankan `npm run build` dulu.');

rmSync(KELUAR, { recursive: true, force: true });
cpSync('dist', `${KELUAR}/static`, { recursive: true });

const bundel = `${KELUAR}/functions/api/chat.func`;
mkdirSync(bundel, { recursive: true });
await build({
  entryPoints: ['server/app.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  outfile: `${bundel}/index.mjs`,
  // Express dan SDK model masih memakai require() untuk modul bawaan Node.
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  logLevel: 'warning',
});
const config = { runtime: 'nodejs22.x', handler: 'index.mjs', launcherType: 'Nodejs', shouldAddHelpers: false, maxDuration: 15 };
writeFileSync(`${bundel}/.vc-config.json`, JSON.stringify(config, null, 2));
// /api/health memakai bundel yang sama.
cpSync(bundel, `${KELUAR}/functions/api/health.func`, { recursive: true });

writeFileSync(`${KELUAR}/config.json`, JSON.stringify({ version: 3, routes: [{ handle: 'filesystem' }] }, null, 2));
console.log('Build Output Vercel siap di .vercel/output');
