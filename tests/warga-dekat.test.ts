import { describe, expect, it } from 'vitest';
import { RADIUS_BICARA, RADIUS_LEPAS, wargaTerdekat } from '../src/game/warga-dekat';

describe('wargaTerdekat', () => {
  const warga = [
    { id: 'a', x: 100, y: 100 },
    { id: 'b', x: 112, y: 100 },
  ];

  it('memilih warga terdekat dalam jangkauan bicara', () => {
    expect(wargaTerdekat(warga, { x: 108, y: 100 })).toBe('b');
    expect(wargaTerdekat(warga, { x: 96, y: 100 })).toBe('a');
  });

  it('tidak menawarkan siapa pun kalau semua warga di luar jangkauan', () => {
    expect(wargaTerdekat(warga, { x: 100, y: 100 + RADIUS_BICARA + 1 })).toBeUndefined();
    expect(wargaTerdekat([], { x: 0, y: 0 })).toBeUndefined();
  });

  it('label menempel pada warga yang sama sampai pemain cukup jauh', () => {
    const kaki = { x: 100, y: 100 + RADIUS_BICARA + 4 };
    expect(wargaTerdekat(warga, kaki)).toBeUndefined();
    expect(wargaTerdekat(warga, kaki, 'a')).toBe('a');
    expect(wargaTerdekat(warga, { x: 100, y: 100 + RADIUS_LEPAS + 1 }, 'a')).toBeUndefined();
  });
});
