// Gera as imagens de fundo das seções em WebP, em duas versões:
//
//   fundos-src/desktop/<nome>.jpg  ->  public/fundos/<nome>.webp         (1600px de largura)
//   fundos-src/mobile/<nome>.*     ->  public/fundos/mobile/<nome>.webp  (720 x 1280, retrato)
//
// Quando não existe arte própria para o mobile, a versão retrato sai de um
// recorte automático da arte desktop (sharp escolhe a região com mais
// detalhe). É um quebra-galho: o resultado bom vem das artes em 9:16 geradas
// a partir de docs/prompts-fundos-mobile.md.
//
// Uso: npm run fundos

import sharp from 'sharp';
import { mkdir, readdir, stat } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const origem = { desktop: join(raiz, 'fundos-src/desktop'), mobile: join(raiz, 'fundos-src/mobile') };
const destino = { desktop: join(raiz, 'public/fundos'), mobile: join(raiz, 'public/fundos/mobile') };
const espec = {
  desktop: { width: 1600, quality: 70 },
  mobile: { width: 720, height: 1280, quality: 70 },
};

const extensoes = new Set(['.jpg', '.jpeg', '.png', '.webp']);

async function listar(pasta) {
  try {
    return (await readdir(pasta)).filter((arquivo) => extensoes.has(extname(arquivo).toLowerCase()));
  } catch {
    return [];
  }
}

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;

async function gerar(entrada, saida, { width, height, quality }, posicao) {
  await sharp(entrada)
    .rotate()
    .resize({ width, height, fit: 'cover', position: posicao, withoutEnlargement: true })
    .webp({ quality, effort: 5 })
    .toFile(saida);
  return (await stat(saida)).size;
}

await mkdir(destino.mobile, { recursive: true });

const mobileProprios = new Map((await listar(origem.mobile)).map((arquivo) => [basename(arquivo, extname(arquivo)), arquivo]));
let total = 0;

for (const arquivo of await listar(origem.desktop)) {
  const nome = basename(arquivo, extname(arquivo));
  const mestre = join(origem.desktop, arquivo);

  const pesoDesktop = await gerar(mestre, join(destino.desktop, `${nome}.webp`), espec.desktop, 'centre');

  const proprio = mobileProprios.get(nome);
  const pesoMobile = proprio
    ? await gerar(join(origem.mobile, proprio), join(destino.mobile, `${nome}.webp`), espec.mobile, 'centre')
    : await gerar(mestre, join(destino.mobile, `${nome}.webp`), espec.mobile, sharp.strategy.attention);

  total += pesoDesktop + pesoMobile;
  console.log(`${nome.padEnd(16)} desktop ${kb(pesoDesktop).padStart(7)}   mobile ${kb(pesoMobile).padStart(7)}${proprio ? '' : '   (recorte automático)'}`);
}

for (const nome of mobileProprios.keys()) {
  if (!(await listar(origem.desktop)).some((arquivo) => basename(arquivo, extname(arquivo)) === nome)) {
    console.warn(`aviso: fundos-src/mobile/${nome} não tem par em fundos-src/desktop e foi ignorado`);
  }
}

console.log(`\ntotal gerado: ${kb(total)}`);
