// Os 5 gráficos do relatório, desenhados em canvas com o mesmo tamanho dos originais (bitmaps do servidor da Sólides).
// Partes ESTÁTICAS (grade, títulos, rótulos, as 13 regiões da Área de Talento, moldura e nomes dos eixos do radar) vêm das
// imagens originais (src/assets/graficos/*.png, geradas por ferramentas/gerar_fundos.py). Só o que muda é desenhado aqui:
// linhas, marcadores, polígono, anéis e escala do radar. Medidas calibradas contra 78 imagens originais por gráfico.

// As camadas vão EMBUTIDAS no código (data: URLs). Em file:// cada arquivo é de outra origem para o Chrome: desenhar um
// PNG solto "contaminaria" o canvas e impediria transformar o gráfico em <img> (ver components/Grafico.jsx).
const EMBUTIDAS = import.meta.glob('../assets/graficos/*.png', { eager: true, query: '?inline', import: 'default' });
const ARQUIVOS = ['pisolado', 'lideranca', 'lidersint', 'pprof', 'teia_base', 'teia_raios', 'teia_escala_100', 'teia_escala_80', 'teia_escala_70'];

function carregarImagem(nome) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('imagem não encontrada: ' + nome));
    img.src = EMBUTIDAS[`../assets/graficos/${nome}.png`];
  });
}

let cache = null;
/** Carrega (uma vez) as camadas estáticas. Resolve { pisolado, lideranca, lidersint, pprof, teia_base, teia_raios }. */
export function carregarFundos() {
  if (!cache) {
    cache = Promise.all(ARQUIVOS.map(carregarImagem)).then((imgs) => Object.fromEntries(ARQUIVOS.map((n, i) => [n, imgs[i]])));
  }
  return cache;
}

const AZUL = '#0000ff', VERMELHO = '#ff0000', PRETO = '#000000';
const COR_LINHA_AZUL = 'rgb(97,169,243)';
const COR_LINHA_ROSA = 'rgb(243,129,185)';
const COR_LINHA_TENDENCIA = 'rgba(255,0,0,0.25)';

// ------------------------------------------------------------------ gráficos de linha
// xs: coluna (pixel) de cada categoria; y(v) = round(y0 - k·v); eixo: linha cinza do zero (desenhada por cima de tudo)
export const LINHAS = {
  pisolado: { w: 200, h: 250, xs: [41, 82, 124, 165], y0: 138.783, k: 4.7109, eixo: 139, dir: 185 }, // escala padrão (topo 25); ver escalaPerfilIsolado
  lideranca: { w: 190, h: 250, xs: [40, 79, 118, 156], y0: 148.206, k: 4.2394, eixo: 148, dir: 175 },
  lidersint: { w: 190, h: 250, xs: [40, 79, 118, 156], y0: 149.404, k: 4.1794, eixo: 149, dir: 175 },
};

/** Disco azul com contorno preto de 1 px, em pixels exatos (sem suavização). meias: meia-largura do azul em cada linha. */
function disco(ctx, cx, cy, meias) {
  const n = meias.length, topo = -(n - 1) / 2;
  ctx.fillStyle = PRETO;
  ctx.fillRect(cx - 1, cy + topo - 1, 3, 1); // tampa de cima
  ctx.fillRect(cx - 1, cy - topo + 1, 3, 1); // tampa de baixo
  meias.forEach((m, i) => ctx.fillRect(cx - m - 1, cy + topo + i, 2 * m + 3, 1));
  ctx.fillStyle = AZUL;
  meias.forEach((m, i) => ctx.fillRect(cx - m, cy + topo + i, 2 * m + 1, 1));
}

const marcadorCirculo = (ctx, cx, cy) => disco(ctx, cx, cy, [1, 2, 3, 3, 3, 2, 1]); // 7 px de azul (9×9 com contorno)

function marcadorQuadrado(ctx, cx, cy) {
  ctx.fillStyle = PRETO;
  ctx.fillRect(cx - 2, cy - 2, 5, 5);
  ctx.fillStyle = VERMELHO;
  ctx.fillRect(cx - 1, cy - 1, 3, 3);
}

function marcadorX(ctx, cx, cy) {
  ctx.fillStyle = PRETO;
  for (const [dx, dy] of [[-2, -2], [2, -2], [-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1], [-2, 2], [2, 2]]) ctx.fillRect(cx + dx, cy + dy, 1, 1);
}

function serie(ctx, cfg, valores, corLinha, marcador) {
  const pts = valores.map((v, i) => [cfg.xs[i], Math.round(cfg.y0 - cfg.k * v)]);
  ctx.strokeStyle = corLinha;
  ctx.lineWidth = 1;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x + 0.5, y + 0.5) : ctx.moveTo(x + 0.5, y + 0.5)));
  ctx.stroke();
  for (const [x, y] of pts) marcador(ctx, x, y);
}

function desenharLinha(ctx, nome, fundos, azul, vermelha, tendencia, cfgEscala = null, preparar = null) {
  const cfg = cfgEscala || LINHAS[nome];
  ctx.clearRect(0, 0, cfg.w, cfg.h);
  ctx.drawImage(fundos[nome], 0, 0);
  if (preparar) preparar(ctx, cfg, fundos[nome]);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, cfg.w, cfg.h);
  ctx.clip();
  serie(ctx, cfg, azul, COR_LINHA_AZUL, marcadorCirculo);
  if (vermelha) serie(ctx, cfg, vermelha, COR_LINHA_ROSA, marcadorQuadrado);
  if (tendencia) serie(ctx, cfg, tendencia, COR_LINHA_TENDENCIA, marcadorX);
  ctx.restore();
  // a moldura do gráfico (4 bordas) e a linha do eixo (zero) ficam POR CIMA dos marcadores, como no original
  const fundo = fundos[nome];
  const E = 20, T = 21, B = 233, D = cfg.dir;
  ctx.drawImage(fundo, E, T, D - E + 1, 1, E, T, D - E + 1, 1);
  ctx.drawImage(fundo, E, B, D - E + 1, 1, E, B, D - E + 1, 1);
  ctx.drawImage(fundo, E, T, 1, B - T + 1, E, T, 1, B - T + 1);
  ctx.drawImage(fundo, D, T, 1, B - T + 1, D, T, 1, B - T + 1);
  if (preparar) {
    ctx.fillStyle = 'rgb(136,136,136)';
    ctx.fillRect(21, cfg.eixo, 164, 1);
  } else {
    ctx.drawImage(fundos[nome], 0, cfg.eixo, cfg.w, 1, 0, cfg.eixo, cfg.w, 1);
  }
}

const pega = (r, prefixo, ini, n = 4) => Array.from({ length: n }, (_, i) => r[`${prefixo}${ini + i}`]);

/** Eixo do Perfil Isolado (regra do original, conferida em 212 imagens): piso fixo em -20; topo = máximo dos dados
 *  (no mínimo 20) mais 7% da amplitude, arredondado para cima (passo 5 se couber em 25, senão passo 10). */
export function escalaPerfilIsolado(valores) {
  const d = Math.max(20, ...valores);
  const ajustado = d + 0.07 * (d + 20);
  if (ajustado <= 25) return { topo: 25, passo: 5 };
  return { topo: Math.ceil(ajustado / 10) * 10, passo: 10 };
}

function gradePerfilIsolado(esc) {
  const ppu = 212 / (esc.topo + 20);
  const y = (v) => Math.round(233 - ppu * (v + 20));
  return (ctx, cfg, padrao) => {
    // apaga o interior e a coluna dos números do fundo padrão; título e moldura ficam
    ctx.fillStyle = '#fff';
    ctx.fillRect(21, 22, 164, 211);
    ctx.fillRect(0, 12, 20, 235);
    // faixas alternadas (cinza quando floor(v/passo) é ímpar), linhas de grade e números
    for (let v = -20; v < esc.topo; v += esc.passo) {
      if (Math.floor(v / esc.passo) % 2 !== 0) {
        ctx.fillStyle = 'rgb(244,244,244)';
        ctx.fillRect(21, y(v + esc.passo), 164, y(v) - y(v + esc.passo));
      }
    }
    ctx.fillStyle = 'rgb(227,227,227)';
    for (let v = -20 + esc.passo; v < esc.topo; v += esc.passo) ctx.fillRect(21, y(v), 164, 1);
    ctx.fillStyle = 'rgb(68,68,68)';
    ctx.font = '11px "DejaVu Sans", Verdana, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    for (let v = -20; v <= esc.topo; v += esc.passo) ctx.fillText(String(v), 11, y(v) + 4);
    ctx.textAlign = 'left';
    // nomes das categorias: copiados do fundo padrão, deslocados junto com a linha do zero
    const dz = y(0) - 139;
    ctx.drawImage(padrao, 22, 147, 162, 12, 22, 147 + dz, 162, 12);
    // pontinhos de escala em +20 e -20 (cruzes pretas; a de cima tem o centro vermelho)
    const yt = y(20);
    ctx.fillStyle = PRETO;
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) ctx.fillRect(41 + dx, yt + dy, 1, 1);
    ctx.fillRect(41, 232, 1, 1);
    ctx.fillRect(41, 234, 1, 1);
    ctx.fillStyle = VERMELHO;
    ctx.fillRect(41, yt, 1, 1);
  };
}

export function desenharPerfilIsolado(ctx, r, fundos) {
  const azul = [1, 2, 3, 4].map((i) => r[`pisolado.d${i}pi`]);
  const verm = pega(r, 'pisolado.d', 5);
  const tend = pega(r, 'pisolado.d', 9);
  const esc = escalaPerfilIsolado([...azul, ...verm, ...tend]);
  const ppu = 212 / (esc.topo + 20);
  const cfg = { ...LINHAS.pisolado, y0: 233 - 20 * ppu, k: ppu, eixo: Math.round(233 - 20 * ppu) };
  desenharLinha(ctx, 'pisolado', fundos, azul, verm, tend, cfg, esc.topo === 25 ? null : gradePerfilIsolado(esc));
}

export function desenharEstiloLideranca(ctx, r, fundos) {
  desenharLinha(ctx, 'lideranca', fundos, pega(r, 'lideranca.d', 1), pega(r, 'lideranca.d', 5), null);
}

export function desenharLiderancaAtual(ctx, r, fundos) {
  desenharLinha(ctx, 'lidersint', fundos, pega(r, 'lidersint.d', 1), null, null);
}

// ------------------------------------------------------------------ Área de Talento
const TALENTO = { w: 210, h: 180, x0: 105, kx: 1.5, y0: 93.5, ky: 1.733, eixo: 94, raio: 56 }; // raio = DIÂMETRO do círculo preto em pixels

/** gdImageEllipse do GD (algoritmo de Kennedy, "A Fast Bresenham Type Algorithm For Drawing Ellipses"), traço de 1 px. */
function circuloPreto(ctx, mx, my, diametro) {
  const dados = new ImageData(TALENTO.w, TALENTO.h);
  const pix = (x, y) => {
    if (x < 0 || y < 0 || x >= TALENTO.w || y >= TALENTO.h) return;
    const o = (y * TALENTO.w + x) * 4;
    dados.data[o + 3] = 255; // preto opaco
  };
  const a = diametro >> 1, b = diametro >> 1;
  pix(mx + a, my);
  pix(mx - a, my);
  let mx1 = mx - a, my1 = my, mx2 = mx + a, my2 = my;
  const aq = a * a, bq = b * b, dx = aq << 1, dy = bq << 1;
  let r = a * bq, rx = r << 1, ry = 0, x = a;
  while (x > 0) {
    if (r > 0) { my1++; my2--; ry += dx; r -= ry; }
    if (r <= 0) { x--; mx1++; mx2--; rx -= dy; r += rx; }
    pix(mx1, my1); pix(mx1, my2); pix(mx2, my1); pix(mx2, my2);
  }
  const c = document.createElement('canvas');
  c.width = TALENTO.w; c.height = TALENTO.h;
  c.getContext('2d').putImageData(dados, 0, 0);
  ctx.drawImage(c, 0, 0);
}

const pontoTalento = (ctx, cx, cy) => disco(ctx, cx, cy, [1, 2, 2, 2, 1]); // bolinha de 5 px (7×7 com contorno)

export function desenharAreaTalento(ctx, r, fundos) {
  const T = TALENTO;
  ctx.clearRect(0, 0, T.w, T.h);
  ctx.drawImage(fundos.pprof, 0, 0);
  const px = (dx) => Math.round(T.x0 + T.kx * dx);
  const py = (dy) => Math.round(T.y0 - T.ky * dy);
  const [ax, ay] = [px(r['pprof.dx']), py(r['pprof.dy'])];
  const [bx, by] = [px(r['pprof.dx2']), py(r['pprof.dy2'])];
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, T.w, T.h);
  ctx.clip();
  circuloPreto(ctx, ax, ay, T.raio);
  marcadorQuadrado(ctx, bx, by);
  pontoTalento(ctx, ax, ay);
  ctx.restore();
  ctx.drawImage(fundos.pprof, 0, T.eixo, T.w, 1, 0, T.eixo, T.w, 1); // eixo por cima dos marcadores
}

// ------------------------------------------------------------------ Competências (radar)
export const EIXOS_RADAR = [
  ['agressividade', 'Agressividade'], ['independencia', 'Independencia'], ['multi_tarefas', 'Multitarefas'],
  ['automotivacao', 'Automotivacao'], ['capacidade_de_sonhar', 'Cap Sonhar'], ['entusiasmo', 'Entusiasmo'],
  ['sociabilidade', 'Sociabilidade'], ['empatia', 'Empatia'], ['paciencia', 'Paciencia'],
  ['hab_artistica', 'Perfil Artistico'], ['detalhismo', 'Detalhismo'], ['exatidao', 'Exatidao'],
  ['aptidao_para_habilidades_tecnicas', 'Perfil Tecnico'], ['concentracao', 'Concentracao'],
  ['condescendencia', 'Condescendencia'], ['formalidade', 'Formalidade'], ['se_desenvolve_pelo_trabalho', 'Desenv Trabalho'],
  ['dominancia', 'Dominancia'], ['extroversao', 'Extroversao'], ['facilidade_em_lidar_com_mudancas', 'Fac Mudancas'],
  ['se_desenvolve_pelo_relacionamento', 'Desenv Relac'],
];
const RADAR = { w: 800, h: 600, cx: 360, cy: 330, R: 210, N: 21 };

/** Escala do radar (regra do original, confirmada em 77 exemplos): o maior número de anéis é 8; o passo cresce até caber. */
export function escalaRadar(maximo) {
  for (const passo of [1, 2, 5, 10, 20, 50]) {
    const aneis = Math.ceil(maximo / passo);
    if (aneis <= 8) return { max: passo * aneis, passo, aneis };
  }
  return { max: 100, passo: 20, aneis: 5 };
}

function vertice(i, raio) {
  const ang = ((90 + (i * 360) / RADAR.N) * Math.PI) / 180;
  return [RADAR.cx + raio * Math.cos(ang), RADAR.cy - raio * Math.sin(ang)];
}

/** Linha do GD (gdImageLine) com espessura: sem suavização, o traço grosso é "vertical" nas retas mais horizontais
 *  e "horizontal" nas mais verticais. É o algoritmo das linhas e dos contornos dos gráficos originais. */
function linhaGD(buf, w, h, x1, y1, x2, y2, espessura, [r, g, b]) {
  const pixel = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const o = (y * w + x) * 4;
    buf[o] = r; buf[o + 1] = g; buf[o + 2] = b; buf[o + 3] = 255;
  };
  const dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
  if (dx === 0) { for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) for (let k = 0; k < espessura; k++) pixel(x1 - (espessura >> 1) + k, y); return; }
  if (dy === 0) { for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let k = 0; k < espessura; k++) pixel(x, y1 - (espessura >> 1) + k); return; }
  if (dy <= dx) {
    const ac = Math.cos(Math.atan2(dy, dx));
    let wid = ac !== 0 ? Math.trunc(espessura / ac) : 1;
    if (wid === 0) wid = 1;
    let d = 2 * dy - dx;
    const incr1 = 2 * dy, incr2 = 2 * (dy - dx);
    let x, y, xend, ydir;
    if (x1 > x2) { x = x2; y = y2; ydir = -1; xend = x1; } else { x = x1; y = y1; ydir = 1; xend = x2; }
    const traco = () => { const ws = y - (wid >> 1); for (let k = ws; k < ws + wid; k++) pixel(x, k); };
    traco();
    const sobe = (y2 - y1) * ydir > 0;
    while (x < xend) {
      x++;
      if (d < 0) d += incr1; else { y += sobe ? 1 : -1; d += incr2; }
      traco();
    }
  } else {
    const as = Math.sin(Math.atan2(dy, dx));
    let wid = as !== 0 ? Math.trunc(espessura / as) : 1;
    if (wid === 0) wid = 1;
    let d = 2 * dx - dy;
    const incr1 = 2 * dx, incr2 = 2 * (dx - dy);
    let x, y, yend, xdir;
    if (y1 > y2) { y = y2; x = x2; yend = y1; xdir = -1; } else { y = y1; x = x1; yend = y2; xdir = 1; }
    const traco = () => { const ws = x - (wid >> 1); for (let k = ws; k < ws + wid; k++) pixel(k, y); };
    traco();
    const dir = (x2 - x1) * xdir > 0;
    while (y < yend) {
      y++;
      if (d < 0) d += incr1; else { x += dir ? 1 : -1; d += incr2; }
      traco();
    }
  }
}

const inteiros = (pts) => pts.map(([x, y]) => [Math.round(x), Math.round(y)]);

function poligonoGD(buf, pts, espessura, cor) {
  const v = inteiros(pts);
  for (let i = 0; i < v.length; i++) {
    const [x0, y0] = v[i], [x1, y1] = v[(i + 1) % v.length];
    linhaGD(buf, RADAR.w, RADAR.h, x0, y0, x1, y1, espessura, cor);
  }
}

function camadaAneis(esc, pts) {
  const dados = new ImageData(RADAR.w, RADAR.h);
  poligonoGD(dados.data, pts, 4, [255, 0, 0]);             // contorno do polígono (vermelho, espessura 4 no GD)
  const topo = new ImageData(RADAR.w, RADAR.h);
  for (let k = 1; k <= esc.aneis; k++) {
    const raio = (RADAR.R * k * esc.passo) / esc.max;
    poligonoGD(topo.data, Array.from({ length: RADAR.N }, (_, i) => vertice(i, raio)), 1, [0, 0, 128]);
  }
  const camada = (img) => {
    const c = document.createElement('canvas');
    c.width = RADAR.w; c.height = RADAR.h;
    c.getContext('2d').putImageData(img, 0, 0);
    return c;
  };
  return [camada(dados), camada(topo)];
}

/** valores: objeto com as chaves 'teia.<competência>' (como em calcularCompleto), já com os sorteios aplicados. */
export function desenharRadar(ctx, valores, fundos) {
  ctx.clearRect(0, 0, RADAR.w, RADAR.h);
  ctx.drawImage(fundos.teia_base, 0, 0);
  const lista = EIXOS_RADAR.map(([chave]) => valores['teia.' + chave]);
  const esc = escalaRadar(Math.max(...lista));
  const pts = lista.map((v, i) => vertice(i, (RADAR.R * Math.min(v, esc.max)) / esc.max));
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = 'rgb(211,167,168)';
  ctx.fill();
  const [contorno, aneis] = camadaAneis(esc, pts);
  ctx.drawImage(contorno, 0, 0);
  ctx.drawImage(aneis, 0, 0);
  ctx.drawImage(fundos.teia_raios, 0, 0);
  const numeros = fundos['teia_escala_' + esc.max];
  if (numeros) {
    ctx.drawImage(numeros, 0, 0); // números da escala, tirados das imagens originais daquela escala
  } else { // escala que não apareceu nas imagens de referência: texto comum
    ctx.fillStyle = PRETO;
    ctx.font = '13px Arial, Helvetica, "Liberation Sans", sans-serif';
    ctx.textBaseline = 'alphabetic';
    for (let k = 1; k <= esc.aneis; k++) ctx.fillText(String(k * esc.passo), 369, RADAR.cy - Math.round((RADAR.R * k * esc.passo) / esc.max) + 5);
  }
}
