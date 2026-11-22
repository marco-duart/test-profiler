// Página de resultado ORIGINAL (utils/testes/tNN.html) pronta para abrir offline: tira os scripts e troca os recursos remotos
// por cópias locais (CSS, logo, barras, ícones e as imagens dos 5 gráficos que o servidor desenhou para aquele teste).
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.dirname(AQUI);
const UTILS = path.dirname(PROJ);
const url = (p) => pathToFileURL(p).href;
const GRAFICO = { 7: 'pisolado', 6: 'lideranca', 4: 'lidersint', 5: 'pprof', 9: 'teia' };
const LOCAIS = ['25_logosys_ibc.png', 'figura01.gif', 'figura02b.jpg', 'mailp.jpg', 'iconpdf.png'];

/** Imagem original do gráfico g do teste n (T70-T77: página salva completa; T01-T69: extraída do PDF do relatório). */
export function imagemOriginal(n, g) {
  const nn = String(n).padStart(2, '0');
  return n >= 70 ? path.join(UTILS, 'referencia-visual', `t${nn}_${g}.png`) : path.join(UTILS, 'referencia-visual', 'pdfs', `t${nn}_${g}.png`);
}

export function htmlOriginalOffline(id) {
  const n = Number(id.slice(1));
  let html = readFileSync(path.join(UTILS, 'testes', `t${String(n).padStart(2, '0')}.html`), 'utf-8');
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<noscript>[\s\S]*?<\/noscript>/gi, '');
  html = html.replace(/<link[^>]*stylesheet[^>]*>/gi, (l) => (l.includes('publicpages.css') ? `<link rel="stylesheet" href="${url(path.join(PROJ, 'public', 'css', 'publicpages.css'))}"/>` : ''));
  html = html.replace(/https:\/\/plugins\.solides\.adm\.br\/grafico\.php\?([^"']*)/g, (m, q) => {
    const g = GRAFICO[Number((q.match(/graph=(\d+)/) || [])[1])];
    return g ? url(imagemOriginal(n, g)) : m;
  });
  // cópias ocultas (display:none, class="tempimg") dos mesmos gráficos, que o navegador baixaria mesmo sem mostrar
  html = html.replace(/https:\/\/plugins\.solides\.adm\.br\/tmp\/ibc\/[^"']*_(pisolado|lideranca|lidersint|pprof|teia)\.jpeg/g,
    (m, g) => url(imagemOriginal(n, g)));
  for (const arq of LOCAIS) html = html.replace(new RegExp(`https://[^"']*/${arq.replace('.', '\\.')}`, 'g'), url(path.join(PROJ, 'public', 'img', arq)));
  return html;
}
