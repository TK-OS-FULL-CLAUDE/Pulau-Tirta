import 'dotenv/config';
import express from 'express';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import app from './app';

const PORT = Number(process.env.PORT ?? 3000);
const akar = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(akar, 'dist');

if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(resolve(dist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Petualangan Pulau Tirta jalan di http://localhost:${PORT}`);
  if (!existsSync(dist)) console.log('Folder dist belum ada. Untuk pengembangan pakai `npm run dev`.');
});
