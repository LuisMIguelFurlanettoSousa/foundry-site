import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const INF = 1e20;

function edt1d(f, n) {
  const d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
  return d;
}

/** distância euclidiana de cada pixel até o pixel "true" mais próximo em mask */
function distanceTransform(mask, w, h) {
  const g = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = mask[i] ? 0 : INF;
  const col = new Float64Array(h), row = new Float64Array(w);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) col[y] = g[y * w + x];
    const d = edt1d(col, h);
    for (let y = 0; y < h; y++) g[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) row[x] = g[y * w + x];
    const d = edt1d(row, w);
    for (let x = 0; x < w; x++) g[y * w + x] = Math.sqrt(d[x]);
  }
  return g;
}

export async function processar(entrada, saida, { raio = 30, padding = 8, limiteFundo = 200, margem = 60, lado = 720 } = {}) {
  // Margem branca extra: sem ela a dilatação do contorno sai cortada nos elementos
  // que encostam na borda do arquivo original (o martelo do sticker 04).
  const { data, info } = await sharp(entrada)
    .extend({ top: margem, bottom: margem, left: margem, right: margem, background: '#ffffff' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, c = info.channels;
  const total = w * h;

  // 1. Flood fill a partir das bordas sobre o branco/sombra: define o lado de fora.
  const fora = new Uint8Array(total);
  const pilha = [];
  const claro = (i) => {
    const p = i * c;
    return Math.min(data[p], data[p + 1], data[p + 2]) > limiteFundo;
  };
  for (let x = 0; x < w; x++) { pilha.push(x); pilha.push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { pilha.push(y * w); pilha.push(y * w + w - 1); }
  while (pilha.length) {
    const i = pilha.pop();
    if (fora[i] || !claro(i)) continue;
    fora[i] = 1;
    const x = i % w, y = (i / w) | 0;
    if (x > 0) pilha.push(i - 1);
    if (x < w - 1) pilha.push(i + 1);
    if (y > 0) pilha.push(i - w);
    if (y < h - 1) pilha.push(i + w);
  }

  // 2. Silhueta = tudo que o flood não alcançou (buracos internos já ficam preenchidos).
  const silhueta = new Uint8Array(total);
  for (let i = 0; i < total; i++) silhueta[i] = fora[i] ? 0 : 1;

  // 3. Contorno branco sintetizado por dilatação com anti-aliasing.
  const dist = distanceTransform(silhueta, w, h);
  const saidaBuf = Buffer.alloc(total * 4);
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let i = 0; i < total; i++) {
    const d = dist[i];
    let alpha = 0;
    if (d === 0) alpha = 255;
    else if (d <= raio) alpha = 255;
    else if (d < raio + 1) alpha = Math.round((raio + 1 - d) * 255);
    if (alpha === 0) continue;
    const p = i * c, q = i * 4;
    if (silhueta[i]) { saidaBuf[q] = data[p]; saidaBuf[q + 1] = data[p + 1]; saidaBuf[q + 2] = data[p + 2]; }
    else { saidaBuf[q] = 255; saidaBuf[q + 1] = 255; saidaBuf[q + 2] = 255; }
    saidaBuf[q + 3] = alpha;
    const x = i % w, y = (i / w) | 0;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }

  const left = Math.max(0, minX - padding), top = Math.max(0, minY - padding);
  const width = Math.min(w - left, maxX - minX + 1 + padding * 2);
  const height = Math.min(h - top, maxY - minY + 1 + padding * 2);

  const img = sharp(saidaBuf, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left, top, width, height })
    .resize({ width: lado, height: lado, fit: 'inside', withoutEnlargement: true });
  if (saida) await img.png({ compressionLevel: 9, palette: true, colors: 128 }).toFile(saida);
  const escala = Math.min(1, lado / Math.max(width, height));
  return { width: Math.round(width * escala), height: Math.round(height * escala) };
}

/**
 * Recorta os stickers oficiais do Foguinho a partir dos arquivos de marca 1000x1000
 * (fundo branco chapado) e grava PNGs com alpha limpo em src/assets/stickers.
 *
 *   node scripts/stickers.mjs "C:/Users/Vzze/foundry/Sitckers"
 */
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const origem = process.argv[2] ?? 'C:/Users/Vzze/foundry/Sitckers';
  for (let i = 1; i <= 6; i++) {
    const destino = fileURLToPath(new URL(`../src/assets/stickers/sticker-0${i}.png`, import.meta.url));
    const { width, height } = await processar(`${origem}/${i}.png`, destino);
    console.log(`sticker-0${i}.png ${width}x${height}`);
  }
}
