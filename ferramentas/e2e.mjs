// Teste de ponta a ponta no navegador: abre dist/index.html por file://, refaz testes reais clicando como um usuário
// (mesmos dados, mesmas respostas, mesmo horário) e compara o relatório com a página ORIGINAL salva, renderizada offline:
//   - texto visível idêntico (innerText, espaços normalizados, vírgulas mantidas);
//   - página inteira pixel a pixel: FORA dos 5 gráficos, nenhum pixel pode ter cor diferente; DENTRO deles ficam as
//     aproximações conhecidas do desenho (conta só o que sobrevive a um leve desfoque; detalhe em comparar_graficos.mjs);
//   - nenhuma requisição externa, nenhum erro, nada guardado no navegador.
// O sorteio das competências abaixo de 14 recebe os MESMOS valores que o sistema real sorteou (para o radar ser comparável).
// Uso:  npm run build && node ferramentas/e2e.mjs [T70 T71 … | todos] [--pasta=DIR]   (DIR: salva as imagens das diferenças)
import { readFileSync, writeFileSync, mkdirSync, existsSync, mkdtempSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { calcularCompleto, GRUPOS_COMPETENCIA } from '../src/lib/profiler.js';
import { htmlOriginalOffline } from './original_offline.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.dirname(AQUI);
const UTILS = path.dirname(PROJ);
const RECEITA = path.join(path.dirname(UTILS), 'assesment-recipe');
const args = process.argv.slice(2);
const pasta = (args.find((a) => a.startsWith('--pasta=')) || '').slice(8) || null;
const LIMIAR_GRAFICOS = 200; // pixels tolerados DENTRO dos 5 gráficos, somados (bordas de polígono, frações de pixel)

// Casos-limite conhecidos do sistema original (DESCOBERTAS seções 20 e 21): não reproduzíveis.
const CASOS_LIMITE = {
  T71: 'dois fatores com 25,00 exatos: o sistema tirou as letras (perfil E x EPA, por isso o texto descritivo também muda); IA "-0, 00"',
  T72: 'o sistema imprime "IA: -0, 00" (zero com sinal); fora isso, texto idêntico',
  T75: 'o sistema imprime "IA: -0, 00" (zero com sinal); fora isso, texto idêntico',
};
const MENOS_ZERO = (t) => t.replace('IA: -0, 00', 'IA: 0, 00');
// Nestes 3 testes a imagem de referência do radar veio da "página completa", salva ANTES do HTML: o "somente HTML" recarregou
// o resultado e o servidor sorteou de novo as competências abaixo de 14. O radar de referência não corresponde aos valores do HTML.
const RADAR_DE_OUTRO_CARREGAMENTO = new Set(['T74', 'T75', 'T77']);
const TITULO_RADAR = 'Grafico Radar';

// ---------------------------------------------------------------- dados dos testes
function lerCsv(t) {
  const linhas = []; let campo = '', linha = [], aspas = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (aspas) { if (ch === '"' && t[i + 1] === '"') { campo += '"'; i++; } else if (ch === '"') aspas = false; else campo += ch; }
    else if (ch === '"') aspas = true; else if (ch === ',') { linha.push(campo); campo = ''; }
    else if (ch === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; } else if (ch !== '\r') campo += ch;
  }
  const [cab, ...resto] = linhas;
  return resto.filter((l) => l.length > 1).map((l) => Object.fromEntries(cab.map((c, i) => [c, l[i]])));
}
const plano = Object.fromEntries(lerCsv(readFileSync(path.join(RECEITA, 'plano_testes.csv'), 'utf-8')).map((r) => [r.teste, r]));
const reais = Object.fromEntries(JSON.parse(readFileSync(path.join(RECEITA, 'testes', 'todos.json'), 'utf-8'))
  .map((r) => ['T' + r.arquivo.split('/t').pop().slice(0, 2), r]));
let ids = args.filter((a) => !a.startsWith('--')).map((a) => a.toUpperCase());
if (!ids.length || ids.includes('TODOS')) ids = Object.keys(reais).filter((t) => plano[t]).sort();

const data = (s) => { const [d, h] = s.split(' '); const [Y, M, D] = d.split('-').map(Number); const [hh, mm, ss] = h.split(':').map(Number); return new Date(Y, M - 1, D, hh, mm, ss); };
function caso(id) {
  const reg = plano[id], real = reais[id];
  const html = readFileSync(path.join(UTILS, 'testes', `t${id.slice(1)}.html`), 'utf-8');
  let nome, genero, email;
  const m = reg.observacoes.match(/nome: (.+?) \(([MF])\) <([^>]+)>/);
  if (m) [, nome, genero, email] = m;
  else { // testes antigos: identidade e gênero tirados da própria página real
    nome = html.match(/Nome:\s*([^<]+)<\/b>/)[1].trim();
    email = (html.match(/Email:<\/b>\s*([^<\s]+)/) || [, 'teste@example.com'])[1];
    const corpo = html.replace(/<[^>]+>/g, ' ');
    genero = (corpo.match(/\b[Ee]la\b/g) || []).length > (corpo.match(/\b[Ee]le\b/g) || []).length ? 'F' : 'M';
  }
  const p1 = reg.parte1_campos.split(' '), p2 = reg.parte2_campos.split(' ');
  // valores que o sistema real sorteou, na ordem em que a página sorteia (grupos de competencias_sorteadas)
  const sorteio = calcularCompleto(p1, p2, real.TR).competencias_sorteadas.map((g) => (real['teia.' + GRUPOS_COMPETENCIA[g][0]] - 14) / 6);
  return { id, nome, genero, email, p1, p2, inicio: data(reg.hora_inicio), fim: data(reg.hora_fim), sorteio };
}

// ---------------------------------------------------------------- comparação de imagens (no navegador)
// caixas: retângulos dos gráficos na página ({ x0, y0, x1, y1, ignorar }); diferenças dentro deles são contadas à parte.
async function compararImagens(pagina, a, b, caixas) {
  return pagina.evaluate(async ([pa, pb, caixas]) => {
    const ler = async (b64) => {
      const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
      const c = new OffscreenCanvas(bmp.width, bmp.height); const x = c.getContext('2d'); x.drawImage(bmp, 0, 0);
      return x.getImageData(0, 0, bmp.width, bmp.height);
    };
    const A = await ler(pa), B = await ler(pb);
    const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
    const desfoque = (img) => { // caixa 3x3, duas passadas (aprox. gaussiano): some o serrilhado do texto, fica o resto
      let src = new Float32Array(w * h * 3);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) src[(y * w + x) * 3 + c] = img.data[(y * img.width + x) * 4 + c];
      for (let passo = 0; passo < 2; passo++) {
        const dst = new Float32Array(src.length);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) {
          let s = 0, n = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const yy = y + dy, xx = x + dx;
            if (yy >= 0 && yy < h && xx >= 0 && xx < w) { s += src[(yy * w + xx) * 3 + c]; n++; }
          }
          dst[(y * w + x) * 3 + c] = s / n;
        }
        src = dst;
      }
      return src;
    };
    const da = desfoque(A), db = desfoque(B);
    const M = 4; // margem: o desfoque espalha 2 px para fora da imagem
    const caixa = (x, y) => caixas.find((k) => x >= k.x0 - M && x < k.x1 + M && y >= k.y0 - M && y < k.y1 + M);
    let fora = 0, graficos = 0, ignorados = 0, ymin = 1e9, ymax = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let m = 0, mb = 0;
      for (let c = 0; c < 3; c++) {
        m = Math.max(m, Math.abs(A.data[(y * A.width + x) * 4 + c] - B.data[(y * B.width + x) * 4 + c]));
        mb = Math.max(mb, Math.abs(da[i * 3 + c] - db[i * 3 + c]));
      }
      if (m === 0) continue;
      const k = caixa(x, y);
      if (!k) { fora++; ymin = Math.min(ymin, y); ymax = Math.max(ymax, y); } // fora dos gráficos: qualquer diferença conta
      else if (mb > 25) { if (k.ignorar) ignorados++; else graficos++; }
    }
    return { alturas: [A.height, B.height], fora, graficos, ignorados, faixaFora: fora ? [ymin, ymax] : null };
  }, [a.toString('base64'), b.toString('base64'), caixas]);
}

// ---------------------------------------------------------------- execução
const dist = path.join(PROJ, 'dist', 'index.html');
if (!existsSync(dist)) throw new Error('rode antes: npm run build');
const tmp = mkdtempSync(path.join(os.tmpdir(), 'pf-e2e-'));
if (pasta) mkdirSync(pasta, { recursive: true });
const navegador = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true });
const norm = (t) => t.replace(/\s+/g, ' ').trim();
const resultados = [];

for (const id of ids) {
  const c = caso(id);
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const externas = [], externasOriginal = [], erros = [];
  await ctx.route(/^(https?|wss?):/, (r) => r.abort()); // nada sai do computador
  // ----- página local
  const pg = await ctx.newPage();
  pg.on('request', (q) => { if (/^(https?|wss?):/.test(q.url())) externas.push(q.url()); });
  pg.on('pageerror', (e) => erros.push(e.message));
  pg.on('console', (m) => { if (m.type() === 'error') erros.push('console: ' + m.text()); });
  await pg.clock.setFixedTime(c.inicio);
  await pg.goto(pathToFileURL(dist).href);
  await pg.waitForSelector('#iniciar-teste');
  await pg.fill('input[name=NOMERESP]', c.nome);
  await pg.fill('input[name=EMAIL]', c.email);
  await pg.fill('input[name=CARGO]', 'Analista');
  if (c.genero === 'F') await pg.click('input[name=SEXO][value=F]', { force: true });
  await pg.click('input[name=ACEITE]');
  await pg.click('#iniciar-teste');
  await pg.waitForSelector('#questionario_1');
  for (const f of c.p1) await pg.click(`label[for=${f}1]`);
  await pg.click('#parte-2');
  await pg.waitForSelector('#questionario_2');
  for (const f of c.p2) await pg.click(`label[for=${f}2]`);
  await pg.clock.setFixedTime(c.fim);
  await pg.evaluate((seq) => { let i = 0; const o = Math.random; Math.random = () => (i < seq.length ? seq[i++] : o()); }, c.sorteio);
  await pg.click('button[type=submit]');
  const quadro = await (await pg.waitForSelector('iframe')).contentFrame();
  await quadro.waitForSelector('.relatorio');
  await quadro.waitForFunction(() => document.querySelectorAll('img[data-pronto]').length === 5);
  await pg.mouse.move(0, 0);
  const meuTexto = norm(await quadro.evaluate(() => document.body.innerText));
  const caixas = await pg.evaluate((radar) => {
    const f = document.querySelector('iframe'), fr = f.getBoundingClientRect();
    const ox = fr.left + scrollX, oy = fr.top + scrollY;
    return [...f.contentDocument.querySelectorAll('img[data-pronto]')].map((im) => {
      const r = im.getBoundingClientRect();
      return { radar: im.title === radar, x0: ox + r.left, y0: oy + r.top, x1: ox + r.right, y1: oy + r.bottom };
    });
  }, TITULO_RADAR);
  for (const k of caixas) k.ignorar = k.radar && RADAR_DE_OUTRO_CARREGAMENTO.has(id);
  const armazenamento = await pg.evaluate(() => localStorage.length + sessionStorage.length + document.cookie.length);
  const minhaImg = await pg.screenshot({ fullPage: true });
  // ----- página original, offline
  const arqOrig = path.join(tmp, `${id}.html`);
  writeFileSync(arqOrig, htmlOriginalOffline(id));
  const po = await ctx.newPage();
  po.on('request', (q) => { if (/^(https?|wss?):/.test(q.url())) externasOriginal.push(q.url()); });
  await po.goto(pathToFileURL(arqOrig).href);
  await po.waitForLoadState('load');
  const origTexto = norm(await po.evaluate(() => document.body.innerText));
  const origImg = await po.screenshot({ fullPage: true });
  // ----- comparação
  if (caixas.length !== 5) erros.push(`${caixas.length} gráficos na página (esperado 5)`);
  const px = await compararImagens(po, origImg, minhaImg, caixas);
  let i = 0; while (i < Math.min(origTexto.length, meuTexto.length) && origTexto[i] === meuTexto[i]) i++;
  const textoIgual = origTexto === meuTexto;
  const r = {
    id, textoIgual, px, externas: externas.length, externasOriginal, erros, armazenamento,
    pixelsIguais: px.alturas[0] === px.alturas[1] && px.fora === 0 && px.graficos <= LIMIAR_GRAFICOS,
    diferenca: textoIgual ? null : { original: origTexto.slice(Math.max(0, i - 30), i + 50), local: meuTexto.slice(Math.max(0, i - 30), i + 50) },
  };
  resultados.push(r);
  const limpo = !r.externas && !r.externasOriginal.length && !r.erros.length && !r.armazenamento;
  let situacao = r.textoIgual && r.pixelsIguais && limpo ? 'IGUAL' : 'DIFERENTE';
  // caso-limite só vale se a diferença for a esperada (no "-0, 00": texto igual depois de trocar só isso)
  if (situacao === 'DIFERENTE' && CASOS_LIMITE[id] && limpo && (id === 'T71' || MENOS_ZERO(origTexto) === meuTexto)) situacao = 'limite';
  r.situacao = situacao;
  const ign = px.ignorados ? ` (radar ignorado: ${px.ignorados})` : '';
  console.log(`${id}  ${situacao.padEnd(9)} texto=${textoIgual ? 'igual' : 'diferente'}  altura=${px.alturas.join('/')}  fora_dos_graficos=${px.fora}  nos_graficos=${px.graficos}${ign}  externas=${externas.length} (original: ${externasOriginal.length}) erros=${erros.length}`);
  if (pasta && situacao !== 'IGUAL') {
    writeFileSync(path.join(pasta, `${id}_original.png`), origImg);
    writeFileSync(path.join(pasta, `${id}_local.png`), minhaImg);
  }
  await ctx.close();
}
await navegador.close();

const iguais = resultados.filter((r) => r.situacao === 'IGUAL').length;
const limites = resultados.filter((r) => r.situacao === 'limite');
const diferentes = resultados.filter((r) => r.situacao === 'DIFERENTE');
const textoIgual = resultados.filter((r) => r.textoIgual).length;
console.log(`\n${iguais}/${resultados.length} idênticos (texto igual; fora dos gráficos, 0 pixels diferentes; nos gráficos ≤ ${LIMIAR_GRAFICOS} px) | ${limites.length} casos-limite conhecidos | ${diferentes.length} diferentes`);
console.log(`texto idêntico em ${textoIgual}/${resultados.length}; requisições externas: ${resultados.reduce((s, r) => s + r.externas, 0)}; erros: ${resultados.reduce((s, r) => s + r.erros.length, 0)}`);
if (resultados.some((r) => r.px.ignorados)) console.log(`radar não comparado em ${[...RADAR_DE_OUTRO_CARREGAMENTO].join(', ')}: a imagem de referência é de outro carregamento (outro sorteio)`);
for (const r of limites) console.log(`  limite ${r.id}: ${CASOS_LIMITE[r.id]}`);
for (const r of diferentes) console.log(`  DIFERENTE ${r.id}: ${JSON.stringify({ diferenca: r.diferenca, px: r.px, externas: r.externas, erros: r.erros })}`);
process.exit(diferentes.length ? 1 : 0);
