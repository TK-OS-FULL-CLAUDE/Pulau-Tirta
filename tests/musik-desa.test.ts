import { describe, expect, it } from 'vitest';
import { AKOR, LANGKAH_PER_BIRAMA, MELODI, SUARA_AKOR, hz } from '../src/ui/musik-desa';

describe('musik latar "Pagi di Desa Tirta"', () => {
  it('tiap birama tepat 8 seperdelapan dan akornya sejajar', () => {
    expect(MELODI).toHaveLength(32);
    expect(AKOR).toHaveLength(MELODI.length);
    MELODI.forEach((birama) => expect(birama.reduce((n, [, p]) => n + p, 0)).toBe(LANGKAH_PER_BIRAMA));
  });

  it('setiap akor punya bass dan petikan', () => {
    for (const a of AKOR) expect(SUARA_AKOR[a]).toBeDefined();
  });

  it('nama nada diubah ke frekuensi yang benar', () => {
    expect(hz('A4')).toBeCloseTo(440, 5);
    expect(hz('C4')).toBeCloseTo(261.63, 1);
    expect(hz('F#5')).toBeCloseTo(739.99, 1);
    expect(() => hz('H4')).toThrow();
  });

  it('melodi tetap di rentang yang nyaman (E4 sampai A5)', () => {
    for (const birama of MELODI)
      for (const [nada] of birama) if (nada !== 'r') expect(hz(nada)).toBeGreaterThanOrEqual(hz('E4') - 0.01), expect(hz(nada)).toBeLessThanOrEqual(hz('A5') + 0.01);
  });
});
