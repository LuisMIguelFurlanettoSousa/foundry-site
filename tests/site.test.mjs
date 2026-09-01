import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pagina = new URL('../src/pages/index.astro', import.meta.url);

test('a página mantém a promessa e uma única ação principal', async () => {
  // Cenário
  const html = await readFile(pagina, 'utf8');

  // Ação
  const titulosPrincipais = html.match(/<h1\b/g) ?? [];

  // Validação
  assert.equal(titulosPrincipais.length, 1);
  assert.match(html, /doze dias/i);
  assert.match(html, /instagram\.com\/foundry\.inc/);
});

test('a página entrega navegação e acessibilidade estrutural', async () => {
  // Cenário
  const html = await readFile(pagina, 'utf8');
  const cabecalho = await readFile(new URL('../src/components/Header.astro', import.meta.url), 'utf8');

  // Ação
  const secoesEsperadas = ['processo', 'trabalho', 'perguntas', 'contato'];

  // Validação
  for (const secao of secoesEsperadas) assert.match(html, new RegExp(`id=["']${secao}["']`));
  assert.match(html, /prefers-reduced-motion/);
  assert.match(`${html}\n${cabecalho}`, /aria-label=/);
});
