import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const raiz = new URL('../src/', import.meta.url);

test('a página de produtos organiza todas as frentes sem preços', async () => {
  // Cenário
  const pagina = await readFile(new URL('pages/produtos.astro', raiz), 'utf8');

  // Ação
  const frentes = ['Site essencial', 'Site com domínio próprio', 'Software sob medida', 'Atendente automático', 'Atendente avançado', 'Conteúdo mensal'];

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
  const rotuloCatalogo = estilos.match(/\.product-card__meta\s*\{[^}]+\}/)?.[0] ?? '';
  const textoCta = estilos.match(/\.page-cta > p\s*\{[^}]+\}/)?.[0] ?? '';

  // Validação
  assert.match(rotuloCatalogo, /#8f2309/);
  assert.match(textoCta, /var\(--cor-tinta\)/);
});

test('cada cliente vira uma pasta que abre um modal com telas e endereço', async () => {
  // Cenário
  const pagina = await readFile(new URL('pages/clientes.astro', raiz), 'utf8');
  const estilos = await readFile(new URL('styles/global.css', raiz), 'utf8');

  // Ação
  const botoes = pagina.match(/<button[^>]+data-abrir=/g) ?? [];
  const dialogos = pagina.match(/<dialog[^>]+class="modal"/g) ?? [];

  // Validação
  assert.equal(botoes.length, 1, 'as pastas saem de um só laço sobre os clientes');
  assert.equal(dialogos.length, 1, 'os modais saem de um só laço sobre os clientes');
  assert.match(pagina, /aria-haspopup=["']dialog["']/);
  assert.match(pagina, /aria-labelledby=\{`modal-titulo-\$\{pasta\.id\}`\}/);
  assert.match(pagina, /showModal\(\)/);
  // Fechar precisa funcionar pelo botão e pelo clique no fundo.
  assert.match(pagina, /data-fechar/);
  assert.match(pagina, /evento\.target === dialogo/);
  // O <dialog> trata o Esc sozinho; o evento close é que devolve a rolagem.
  assert.match(pagina, /removeAttribute\('data-modal-aberto'\)/);
  assert.match(estilos, /body\[data-modal-aberto\] \{ overflow: hidden; \}/);
});

test('a pasta mostra quantos projetos guarda e cada projeto leva o seu link', async () => {
  // Cenário
  const pagina = await readFile(new URL('pages/clientes.astro', raiz), 'utf8');

  // Ação
  const clientes = pagina.match(/^\s{4}cliente: '/gm) ?? [];
  const semEndereco = pagina.match(/url: null/g) ?? [];

  // Validação
  assert.equal(clientes.length, 4, 'a página agrupa os seis projetos em quatro pastas');
  assert.match(pagina, /contagem\(pasta\.projetos\.length\)/);
  assert.equal(semEndereco.length, 1, 'só o bot de Telegram fica sem endereço público');
  assert.match(pagina, /Projeto sem endereço público/);
  // O endereço aparece legível, sem o https na frente.
  assert.match(pagina, /enderecoVisivel\(projeto\.url\)/);
});
