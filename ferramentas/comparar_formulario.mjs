// Compara as 3 etapas do formulário com as páginas originais salvas (utils/pagina-1.html e pagina-2.html), renderizadas
// offline sem os scripts (o estado já está gravado no DOM), pixel a pixel (exige 0 pixels diferentes).
// Uso: npm run build && node ferramentas/comparar_formulario.mjs [pasta_saida]   (padrão: pasta temporária do sistema)
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.dirname(AQUI);
const UTILS = path.dirname(PROJ);
const saida = process.argv[2] || mkdtempSync(path.join(os.tmpdir(), 'pf-formulario-'));
mkdirSync(saida, { recursive: true });
const url = (p) => pathToFileURL(p).href;

function original(nome, arquivo, ajustar) {
  let h = readFileSync(path.join(UTILS, arquivo), 'utf-8').replace(/<script[\s\S]*?<\/script>/gi, '');
  h = ajustar(h).replace(/\.\/(pagina-[12]_files)\//g, (m, d) => url(path.join(UTILS, d)) + '/');
  const f = path.join(saida, `orig_${nome}.html`);
  writeFileSync(f, h);
  return f;
}
const mostrar = (id, h) => h.replace(new RegExp(`(id="${id}"[^>]*?)style="[^"]*"`), '$1style=""').replace(new RegExp(`(id="${id}")(?![^>]*style=)`), '$1 style=""');
const esconder = (id, h) => h.replace(new RegExp(`(id="${id}"[^>]*?)style="[^"]*"`), '$1style="display: none;"').replace(new RegExp(`(id="${id}")(?![^>]*style=)`), '$1 style="display: none;"');
const so = (ids) => (h) => ['dados-pessoais', 'questionario_1', 'questionario_2'].reduce((acc, id) => (ids.includes(id) ? mostrar(id, acc) : esconder(id, acc)), h);

const alvos = {
  dados: original('dados', 'pagina-1.html', so(['dados-pessoais'])),
  p1: original('p1', 'pagina-1.html', so(['questionario_1'])),
  p2: original('p2', 'pagina-2.html', so(['questionario_2'])),
};

const nav = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true });
const largura = Number(process.env.LARGURA || 1280);
const pagina = await (await nav.newContext({ viewport: { width: largura, height: 900 }, deviceScaleFactor: 1 })).newPage();
const shot = async (nome) => { await pagina.mouse.move(0, 0); await pagina.waitForTimeout(900); await pagina.screenshot({ path: path.join(saida, `${nome}.png`), fullPage: true }); };

for (const [nome, f] of Object.entries(alvos)) { await pagina.goto(url(f)); await shot(`form_${nome}_orig`); }

await pagina.goto(url(path.join(PROJ, 'dist', 'index.html')));
await pagina.waitForSelector('#iniciar-teste');
await shot('form_dados_meu');
await pagina.fill('input[name=NOMERESP]', 'x'); await pagina.fill('input[name=EMAIL]', 'x@y.com'); await pagina.click('input[name=ACEITE]');
await pagina.click('#iniciar-teste'); await pagina.waitForSelector('#questionario_1'); await shot('form_p1_meu');
for (const c of ['leal', 'dedicado', 'pratico', 'calmo', 'sincero']) await pagina.click(`label[for=${c}1]`);
await pagina.click('#parte-2'); await pagina.waitForSelector('#questionario_2'); await pagina.waitForTimeout(700);
await pagina.evaluate(() => document.querySelectorAll('#questionario_2 input').forEach((i) => { i.checked = false; }));
await shot('form_p2_meu');
// comparação exata (mesmo tamanho e mesma cor em todos os pixels)
let falhas = 0;
for (const etapa of ['dados', 'p1', 'p2']) {
  const [a, b] = ['orig', 'meu'].map((q) => readFileSync(path.join(saida, `form_${etapa}_${q}.png`)).toString('base64'));
  const r = await pagina.evaluate(async ([pa, pb]) => {
    const ler = async (b64) => {
      const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
      const c = new OffscreenCanvas(bmp.width, bmp.height); const x = c.getContext('2d'); x.drawImage(bmp, 0, 0);
      return x.getImageData(0, 0, bmp.width, bmp.height);
    };
    const A = await ler(pa), B = await ler(pb);
    if (A.width !== B.width || A.height !== B.height) return { tamanho: `${A.width}x${A.height} x ${B.width}x${B.height}`, dif: -1 };
    let dif = 0;
    for (let i = 0; i < A.data.length; i += 4) if (A.data[i] !== B.data[i] || A.data[i + 1] !== B.data[i + 1] || A.data[i + 2] !== B.data[i + 2]) dif++;
    return { tamanho: `${A.width}x${A.height}`, dif };
  }, [a, b]);
  if (r.dif !== 0) falhas++;
  console.log(`${etapa.padEnd(6)} ${r.tamanho}  ${r.dif === -1 ? 'TAMANHOS DIFERENTES' : r.dif + ' pixels diferentes'}`);
}
await nav.close();
console.log(falhas ? `${falhas} etapa(s) diferente(s); capturas em ${saida}` : 'Formulário idêntico ao original nas 3 etapas.');
process.exit(falhas ? 1 : 0);
