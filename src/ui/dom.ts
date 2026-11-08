/** Pembantu kecil untuk membuat elemen HTML dan SVG tanpa framework. */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  teks?: string,
  attrs: Record<string, string> = {},
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (teks) e.textContent = teks;
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

const NS = 'http://www.w3.org/2000/svg';

export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
  teks?: string,
): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (teks) e.textContent = teks;
  return e;
}

export const tunggu = (ms: number) => new Promise<void>((selesai) => setTimeout(selesai, ms));
