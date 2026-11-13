import { describe, expect, it } from 'vitest';
import { ukuranDasar } from '../src/ui/ukuran-game';

describe('ukuran dasar canvas', () => {
  it('layar 16:9 tetap 1280x720', () => {
    expect(ukuranDasar(1600, 900, 1280, 720)).toEqual({ width: 1280, height: 720 });
  });

  it('layar lebih lebar: tinggi tetap 720, lebar mengikuti bentuk area game', () => {
    const u = ukuranDasar(1895, 849, 1280, 720);
    expect(u.height).toBe(720);
    expect(u.width / u.height).toBeCloseTo(1895 / 849, 2);
  });

  it('layar lebih tegak: lebar tetap 1280, tinggi mengikuti bentuk area game', () => {
    const u = ukuranDasar(1000, 744, 1280, 720);
    expect(u.width).toBe(1280);
    expect(u.width / u.height).toBeCloseTo(1000 / 744, 2);
  });

  it('bentuk ekstrem dibatasi supaya peta tidak terlalu sempit', () => {
    expect(ukuranDasar(4000, 800, 1280, 720)).toEqual({ width: 1728, height: 720 });
    expect(ukuranDasar(375, 812, 1280, 720)).toEqual({ width: 1280, height: 960 });
  });
});
