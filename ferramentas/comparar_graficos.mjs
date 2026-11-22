// Compara os 5 gráficos desenhados em canvas com as imagens originais dos 77 testes (pixel a pixel).
// Uso: node ferramentas/comparar_graficos.mjs [pasta_para_salvar_piores] [--so=pisolado,teia]
// Precisa do Google Chrome (CHROME_PATH, padrão /usr/bin/google-chrome).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.dirname(AQUI);
const REF = path.join(path.dirname(PROJ), 'referencia-visual');
const TODOS = path.join(path.dirname(path.dirname(PROJ)), 'assesment-recipe', 'testes', 'todos.json');
const args = process.argv.slice(2);
const so = (args.find((a) => a.startsWith('--so=')) || '').slice(5).split(',').filter(Boolean);
const pastaPiores = args.find((a) => !a.startsWith('--'));
const graficos = ['pisolado', 'lideranca', 'lidersint', 'pprof', 'teia'].filter((g) => !so.length || so.includes(g));

const todos = JSON.parse(readFileSync(TODOS, 'utf-8'));
const casos = todos.map((r) => {
  const n = Number(r.arquivo.match(/t(\d+)\.html/)[1]);
  return { id: 'T' + String(n).padStart(2, '0'), n, r };
});
const arquivoRef = (c, g) => {
  const nome = `t${String(c.n).padStart(2, '0')}_${g}.png`;
  const a = path.join(REF, nome), b = path.join(REF, 'pdfs', nome);
  return existsSync(a) ? a : existsSync(b) ? b : null;
};

const servidor = await createServer({ root: PROJ, server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
await servidor.listen();
const url = `http://127.0.0.1:${servidor.httpServer.address().port}/ferramentas/graficos_teste.html`;
const navegador = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true });
const pagina = await navegador.newPage({ deviceScaleFactor: 1 });
pagina.on('pageerror', (e) => console.log('ERRO NA PÁGINA:', e.message));
await pagina.goto(url);
await pagina.waitForFunction('window.pronto === true');

let pior = {};
for (const g of graficos) {
  const linhas = [];
  for (const c of casos) {
    const ref = arquivoRef(c, g);
    if (!ref) continue;
    const res = await pagina.evaluate(([gr, r, b64]) => window.testar(gr, r, b64, true), [g, c.r, readFileSync(ref).toString('base64')]);
    linhas.push({ id: c.id, ...res, ref });
  }
  const tot = linhas.length;
  const perfeitos = linhas.filter((l) => l.difs === 0).length;
  const ordem = [...linhas].sort((a, b) => b.graves - a.graves);
  const media = linhas.reduce((s, l) => s + l.media, 0) / tot;
  console.log(`${g.padEnd(10)} ${tot} casos | idênticos: ${perfeitos} | pixels muito diferentes (média por imagem): ${(linhas.reduce((s, l) => s + l.graves, 0) / tot).toFixed(1)} | pior: ${ordem[0].id} (${ordem[0].graves}) | diferença média ${media.toFixed(3)}`);
  if (pastaPiores) {
    mkdirSync(pastaPiores, { recursive: true });
    for (const l of ordem.slice(0, 2)) {
      writeFileSync(path.join(pastaPiores, `${g}_${l.id}_meu.png`), Buffer.from(l.png.split(',')[1], 'base64'));
      writeFileSync(path.join(pastaPiores, `${g}_${l.id}_ref.png`), readFileSync(l.ref));
    }
  }
  pior[g] = ordem.slice(0, 3).map((l) => `${l.id}:${l.graves}@${JSON.stringify(l.onde.slice(0, 4))}`);
}
console.log('piores casos:', JSON.stringify(pior));
await navegador.close();
await servidor.close();
