import express from 'express';
import { MODE, infoModel, jawabTiko, type Mode, type PermintaanChat } from './tiko';

/**
 * Aplikasi Express untuk /api. Dipakai oleh server lokal (server/index.ts, yang juga melayani game dari dist/) dan oleh
 * Vercel Function (scripts/build-vercel.mjs). Di Vercel, file game dilayani CDN, jadi di sini hanya ada /api.
 */
const app = express();

// Di belakang proxy hosting (Render, Vercel), IP asli pengguna ada di X-Forwarded-For.
app.set('trust proxy', 1);
app.use(express.json({ limit: '16kb' }));

// Batas laju sederhana per IP: maksimal 20 pesan per menit.
const jejak = new Map<string, number[]>();
function terlaluSering(ip: string): boolean {
  const kini = Date.now();
  const daftar = (jejak.get(ip) ?? []).filter((t) => kini - t < 60_000);
  daftar.push(kini);
  jejak.set(ip, daftar);
  // Bersihkan IP yang sudah lebih dari semenit diam, supaya Map tidak terus membesar.
  if (jejak.size > 500) for (const [k, v] of jejak) if (kini - v[v.length - 1] >= 60_000) jejak.delete(k);
  return daftar.length > 20;
}

app.get('/api/health', (_req, res) => {
  const { pakaiModel, penyedia, model } = infoModel();
  res.json({ ok: true, model: pakaiModel, ...(pakaiModel ? { penyedia, nama: model } : {}) });
});

app.post('/api/chat', async (req, res) => {
  if (terlaluSering(req.ip ?? 'lokal')) {
    res.status(429).json({ teks: 'Pelan-pelan, ya. Aku butuh waktu sebentar untuk berpikir.', sumber: 'template' });
    return;
  }
  const body = req.body as Partial<PermintaanChat>;
  if (typeof body?.pesan !== 'string' || !MODE.includes(body.mode as Mode)) {
    res.status(400).json({ error: 'Format permintaan tidak dikenal.' });
    return;
  }
  // Riwayat chat tidak disimpan di server; hanya dipakai untuk satu permintaan ini.
  try {
    res.json(await jawabTiko(body as PermintaanChat));
  } catch (e) {
    // Express 4 tidak menangkap error dari fungsi async; tanpa ini permintaan menggantung sampai browser menyerah.
    console.error('Tiko gagal menjawab:', e instanceof Error ? e.message : e);
    res.status(500).json({ error: 'Tiko sedang bermasalah.' });
  }
});

export default app;
