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
  assert.match(html, /Teste de peso/i);
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
