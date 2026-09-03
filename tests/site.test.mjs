import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pagina = new URL('../src/pages/index.astro', import.meta.url);
const estilos = new URL('../src/styles/global.css', import.meta.url);

test('a página mantém a promessa e uma única ação principal', async () => {
  // Cenário
  const html = await readFile(pagina, 'utf8');

  // Ação
  const titulosPrincipais = html.match(/<h1\b/g) ?? [];

  // Validação
  assert.equal(titulosPrincipais.length, 1);
  assert.match(html, /doze dias/i);
  assert.match(html, /href=["']#contato["']/);
});

test('a página entrega navegação e acessibilidade estrutural', async () => {
  // Cenário
  const html = await readFile(pagina, 'utf8');
  const cabecalho = await readFile(new URL('../src/components/Header.astro', import.meta.url), 'utf8');

  // Ação
  const secoesEsperadas = ['processo', 'trabalho', 'diagnostico', 'perguntas', 'contato'];

  // Validação
  for (const secao of secoesEsperadas) assert.match(html, new RegExp(`id=["']${secao}["']`));
  assert.match(html, /prefers-reduced-motion/);
  assert.match(`${html}\n${cabecalho}`, /aria-label=/);
});

test('o diagnóstico recomenda um caminho sem exigir formulário', async () => {
  // Cenário
  const html = await readFile(pagina, 'utf8');

  // Ação
  const escolhas = html.match(/<button[^>]+data-diagnostico-opcao/g) ?? [];

  // Validação
  assert.equal(escolhas.length, 3);
  assert.match(html, /data-diagnostico-resultado/);
  assert.match(html, /id=["']diagnostico["']/);
  assert.match(html, /sem pedir o seu e-mail/i);
});

test('imagens responsivas preservam a proporção original', async () => {
  // Cenário
  const css = await readFile(estilos, 'utf8');

  // Ação
  const regraImagem = css.match(/img\s*\{[^}]+\}/)?.[0] ?? '';

  // Validação
  assert.match(regraImagem, /height:\s*auto/);
});

test('o mascote final fica limpo e centralizado opticamente', async () => {
  // Cenário
  const css = await readFile(estilos, 'utf8');

  // Ação
  const regraMascote = css.match(/\.contact__mascot\s*\{[^}]+\}/)?.[0] ?? '';
  const regraImagemMascote = css.match(/\.contact__mascot img\s*\{[^}]+\}/)?.[0] ?? '';

  // Validação
  assert.doesNotMatch(regraImagemMascote, /drop-shadow/);
  assert.match(regraMascote, /left:\s*75%/);
  assert.match(regraMascote, /translateX\(-50%\)/);
});

test('o contato usa formulário preparado para envio por endpoint', async () => {
  // Cenário
  const html = await readFile(pagina, 'utf8');
  const cabecalho = await readFile(new URL('../src/components/Header.astro', import.meta.url), 'utf8');

  // Ação
  const camposObrigatorios = html.match(/<(?:input|textarea)[^>]+required/g) ?? [];

  // Validação
  assert.match(html, /<form[^>]+data-contact-form/);
  assert.match(html, /PUBLIC_FORM_ENDPOINT/);
  assert.match(html, /aria-live=["']polite["']/);
  assert.equal(camposObrigatorios.length, 3);
  assert.doesNotMatch(`${html}\n${cabecalho}`, /href=["']https:\/\/www\.instagram\.com\/foundry\.inc/);
});

test('o hero carrega a paisagem com prioridade e aceita arte própria no celular', async () => {
  // Cenário
  const html = await readFile(pagina, 'utf8');

  // Ação
  const imagemHero = html.match(/<picture>[\s\S]*?<\/picture>/)?.[0] ?? '';

  // Validação
  assert.match(html, /hero-fundicao-mobile/);
  assert.match(imagemHero, /<source media=["']\(max-width: 900px\)["']/);
  assert.match(imagemHero, /fetchpriority=["']high["']/);
  assert.match(imagemHero, /loading=["']eager["']/);
});

test('os fundos das seções só entram quando a seção se aproxima da tela', async () => {
  // Cenário
  const css = await readFile(estilos, 'utf8');
  const layout = await readFile(new URL('../src/layouts/BaseLayout.astro', import.meta.url), 'utf8');

  // Ação
  const camadaImagem = css.match(/\.section-shell::before\s*\{[^}]+\}/)?.[0] ?? '';
  const fundosJpg = css.match(/url\('\/fundos\/[^']+\.jpg'\)/g) ?? [];
  const nomes = (padrao) => [...new Set([...css.matchAll(padrao)].map(([, nome]) => nome))].sort();
  const desktop = nomes(/url\('\/fundos\/([a-z0-9-]+)\.webp'\)/g);
  const mobile = nomes(/url\('\/fundos\/mobile\/([a-z0-9-]+)\.webp'\)/g);

  // Validação
  assert.match(camadaImagem, /var\(--fundo-ativo/);
  assert.match(css, /\.section-shell\.fundo-pronto\s*\{\s*--fundo-ativo:\s*var\(--fundo\)/);
  assert.match(layout, /IntersectionObserver/);
  assert.match(layout, /<noscript><style>\.section-shell \{ --fundo-ativo: var\(--fundo\); \}<\/style><\/noscript>/);
  assert.equal(fundosJpg.length, 0);
  // Toda seção com foto no desktop precisa da versão retrato no celular.
  assert.deepEqual(mobile, desktop);
  assert.ok(desktop.length > 0);
});

test('a emenda entre seções é preto absoluto, menos nas seções claras', async () => {
  // Cenário
  const css = await readFile(estilos, 'utf8');

  // Ação
  // Duas regras casam com o seletor; a que interessa é a que pinta o degradê.
  const camadaEmenda = [...css.matchAll(/\.section-shell::after\s*\{[^}]+\}/g)]
    .map(([bloco]) => bloco)
    .find((bloco) => bloco.includes('--fade')) ?? '';
  const regraDe = (seletor) => css.match(new RegExp(`\\${seletor}\\s*\\{[^}]+\\}`))?.[0] ?? '';
  // Claras com foto: o degradê vira a própria cor, senão a faixa preta cai
  // sobre o texto escuro. Sem degradê: as seções de cor chapada (não há imagem
  // a dissolver), o hero, que abre a página, e o bloco de lava do CTA.
  const clarasComFoto = ['.work-section', '.catalog-section'];
  const semDegrade = ['.hero', '.manifesto-section', '.process-section', '.faq-section', '.cases-section', '.page-cta'];

  // Validação
  assert.match(camadaEmenda, /var\(--fade,\s*#000\)/, 'a emenda não cai em preto absoluto');
  assert.doesNotMatch(camadaEmenda, /var\(--fade,\s*var\(--cor-base/, 'a emenda ainda segue a cor da seção');
  for (const seletor of clarasComFoto) {
    assert.match(regraDe(seletor), /--fade:\s*var\(--cor-base\)/, `${seletor} ficaria com faixa preta sobre o texto escuro`);
  }
  for (const seletor of semDegrade) {
    assert.match(regraDe(seletor), /--fade:\s*transparent/, `${seletor} não deveria ter degradê de separação`);
  }
});

test('as seções de cor chapada não carregam foto nem véu', async () => {
  // Cenário
  const css = await readFile(estilos, 'utf8');

  // Ação
  const chapadas = [
    { seletor: '.manifesto-section', base: 'var(--cor-nether)' },
    { seletor: '.process-section', base: 'var(--cor-papel)' },
    { seletor: '.faq-section', base: 'var(--cor-papel)' },
    { seletor: '.cases-section', base: 'var(--cor-papel)' },
  ];
  const regraDe = (seletor) => css.match(new RegExp(`\\${seletor}\\s*\\{[^}]+\\}`))?.[0] ?? '';
  const textoClaro = /color:\s*rgba\(242,\s*237,\s*228/;

  // Validação
  for (const { seletor, base } of chapadas) {
    const regra = regraDe(seletor);
    assert.match(regra, new RegExp(`--cor-base:\\s*${base.replace(/[()-]/g, '\\$&')}`), `${seletor} sem a cor de base esperada`);
    assert.match(regra, /--fundo:\s*none/, `${seletor} ainda pede imagem`);
    assert.match(regra, /--veu:\s*transparent/, `${seletor} ainda tem véu por cima da cor`);
  }
  // As duas claras precisam virar o texto para escuro; o manifesto continua claro.
  for (const seletor of ['.process-section', '.faq-section', '.cases-section']) {
    assert.match(regraDe(seletor), /color:\s*var\(--cor-tinta\)/, `${seletor} sem texto escuro`);
  }
  assert.doesNotMatch(css.match(/\.process__item p\s*\{[^}]+\}/)?.[0] ?? '', textoClaro);
  assert.doesNotMatch(css.match(/\.faq__item p\s*\{[^}]+\}/)?.[0] ?? '', textoClaro);
});

test('no celular os mascotes decorativos saem do caminho do conteúdo', async () => {
  // Cenário
  const css = await readFile(estilos, 'utf8');

  // Ação
  const blocoMobile = css.match(/@media \(max-width: 900px\)\s*\{[\s\S]+?\n\}/)?.[0] ?? '';
  const mascoteContato = blocoMobile.match(/\.contact__mascot\s*\{[^}]+\}/)?.[0] ?? '';
  const stickerPerguntas = blocoMobile.match(/\.faq__heading-sticker\s*\{[^}]+\}/)?.[0] ?? '';

  // Validação
  assert.match(mascoteContato, /display:\s*none/);
  assert.match(stickerPerguntas, /display:\s*none/);
});
