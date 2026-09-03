import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  build: {
    // CSS inline: o arquivo externo bloqueava a primeira pintura por uma ida a mais
    // ao servidor. São ~37 KB, dentro do que cabe no HTML sem pesar.
    inlineStylesheets: 'always',
  },
});
