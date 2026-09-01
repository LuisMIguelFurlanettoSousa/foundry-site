import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const raiz = new URL('../src/', import.meta.url);

test('a página de produtos organiza todas as frentes sem preços', async () => {
  // Cenário
  const pagina = await readFile(new URL('pages/produtos.astro', raiz), 'utf8');

  // Ação
  const frentes = ['Site essencial', 'Site com domínio próprio', 'Software sob medida', 'Agente de atendimento', 'Agente avançado', 'Fidelidade de marca'];

  // Validação
  for (const frente of frentes) assert.match(pagina, new RegExp(frente, 'i'));
  assert.doesNotMatch(pagina, /R\$|49[,.]90|700|800|1000|1500/);
  assert.match(pagina, /href=["']\/#contato["']/);
});

test('a página de clientes apresenta todos os trabalhos verificáveis', async () => {
  // Cenário
  const pagina = await readFile(new URL('pages/clientes.astro', raiz), 'utf8');

  // Ação
  const projetos = ['Supremus', 'Análise — IBRACIV', 'TokenBitz', 'Destiny DAO', 'Portfólio experimental', 'Bot de IA para Telegram'];
  const linksPublicos = ['supremus.ibraciv.com', 'analise.ibraciv.com', 'tokenbitz.info', 'doc.destinydao.org'];

  // Validação
  for (const projeto of projetos) assert.match(pagina, new RegExp(projeto, 'i'));
  for (const link of linksPublicos) assert.match(pagina, new RegExp(link.replaceAll('.', '\\.'), 'i'));
  assert.doesNotMatch(pagina, /\d+%|aumentou|conversão de|faturamento/i);
  assert.match(pagina, /href=["']\/#contato["']/);
});

test('o cabeçalho navega entre home, produtos, clientes e contato', async () => {
  // Cenário
  const cabecalho = await readFile(new URL('components/Header.astro', raiz), 'utf8');

  // Ação
  const destinos = ['/', '/produtos', '/clientes', '/#contato'];

  // Validação
  for (const destino of destinos) assert.match(cabecalho, new RegExp(`href=["']${destino.replace('/', '\\/')}["']`));
});

test('os grids das subpáginas podem encolher no mobile', async () => {
  // Cenário
  const estilos = await readFile(new URL('styles/global.css', raiz), 'utf8');

  // Ação
  const regraConteudo = estilos.match(/\.page-hero__content\s*\{[^}]+\}/)?.[0] ?? '';
  const usaColunaSegura = /grid-template-columns:\s*minmax\(0,\s*1fr\)/.test(estilos);

  // Validação
  assert.match(regraConteudo, /min-width:\s*0/);
  assert.equal(usaColunaSegura, true);
});

test('os textos das subpáginas mantêm contraste sobre papel e lava', async () => {
  // Cenário
  const estilos = await readFile(new URL('styles/global.css', raiz), 'utf8');

  // Ação
  const rotuloCatalogo = estilos.match(/\.catalog \.section-label span\s*\{[^}]+\}/)?.[0] ?? '';
  const textoCta = estilos.match(/\.page-cta > p\s*\{[^}]+\}/)?.[0] ?? '';

  // Validação
  assert.match(rotuloCatalogo, /#8f2309/);
  assert.match(textoCta, /var\(--cor-tinta\)/);
});
