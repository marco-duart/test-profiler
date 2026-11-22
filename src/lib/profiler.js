// Porta fiel de assesment-recipe/scripts/profiler.py (função pura, sem DOM).
// Mantém a MESMA ordem de operações do Python: em ponto flutuante, somar em outra ordem muda a 15ª casa.
// Verificação: `npm run verificar` compara com o gabarito gerado pelo Python (ferramentas/golden.json).
import { PESOS, FAIXAS, IF_APROX_COEF } from './dados.js';

export const FAT = ['D', 'I', 'S', 'C'];
const MAXP = { D: 217, I: 217, S: 210, C: 212 };
const MAXM = { D: 103, I: 109, S: 95, C: 132 };
export const LETRA = { D: 'E', I: 'C', S: 'P', C: 'A' };
const NORMA = { D: [25.747, 5.323], I: [26.329, 5.666], S: [24.33, 4.35], C: [23.661, 5.396] };
const NIVEIS = ['EB', 'MB', 'B', 'A', 'MA', 'EA'];
export const GRUPOS_COMPETENCIA = {
  agressividade: ['agressividade', 'independencia', 'multi_tarefas'],
  automotivacao: ['automotivacao', 'capacidade_de_sonhar', 'entusiasmo', 'sociabilidade'],
  concentracao: ['concentracao', 'condescendencia', 'detalhismo', 'dominancia', 'empatia', 'hab_artistica', 'paciencia'],
  exatidao: ['exatidao'],
  aptidao_para_habilidades_tecnicas: ['aptidao_para_habilidades_tecnicas'],
  extroversao: ['extroversao', 'facilidade_em_lidar_com_mudancas'],
  formalidade: ['formalidade', 'se_desenvolve_pelo_trabalho'],
  se_desenvolve_pelo_relacionamento: ['se_desenvolve_pelo_relacionamento'],
};
const TR_CORTES = [[131, 'Muito Baixo'], [219.5, 'Baixo'], [456, 'Normal'], [699.5, 'Alto']];
const VELOCIDADE = [[-21.83, 'Extremamente Comedido'], [-10.9, 'Muito Comedido'], [-2.0, 'Comedido'],
  [2.5, 'Velocidade Normal'], [11.7, 'Rápido'], [23.75, 'Muito Rápido']];
const MAPA_COMPETENCIAS = [-48.0, 41.0, -21.0, 22.0]; // x mín, x máx, y mín, y máx
// grupo: [âncora x, âncora y, R, L]  ->  valor = 100·(R − distância(ponto, âncora)) / L, com teto 100
const ANCORAS_COMPETENCIA = {
  agressividade: [-48, -21, 87, 74], automotivacao: [-48, 22, 87, 74],
  exatidao: [41, -21, 87, 74], concentracao: [41, 22, 87, 74],
  extroversao: [-48, 0, 91, 89], aptidao_para_habilidades_tecnicas: [41, 0, 91, 89],
  formalidade: [0, -21, 65, 63], se_desenvolve_pelo_relacionamento: [0, 22, 65, 63],
};
const PISO_SORTEIO = 14.0;

// round() do Python: o resultado é o double mais próximo da string decimal correta (igual a Number(toFixed)).
const pyRound = (x, nd) => Number(x.toFixed(nd));
const r2 = (x) => pyRound(x + 1e-9, 2);
const soma = (xs) => xs.reduce((s, x) => s + x, 0);
const maximo = (xs) => Math.max(...xs);
const minimo = (xs) => Math.min(...xs);
const zeros = () => ({ D: 0, I: 0, S: 0, C: 0 });

function somas(marcados) {
  const pp = zeros(), pm = zeros(), g = zeros();
  let contados = 0;
  for (const f of new Set(marcados)) {
    const p = PESOS[f];
    if (!p) throw new Error('campo desconhecido: ' + f);
    if (p.canal === 'ignorado') continue;
    contados += 1;
    const alvo = p.canal === 'P+' ? pp : pm;
    for (const k of FAT) {
      alvo[k] += p[k];
      g[k] += p['G' + k];
    }
  }
  return [pp, pm, g, contados];
}

/** Pontos do Geral (inteiros) de uma parte. Usado pela apresentação para as barras do "Gráfico do Perfil Geral". */
export function pontosGeral(marcados) {
  return somas(marcados)[2];
}

function geral(g, arred = true) {
  const tot = soma(FAT.map((k) => g[k]));
  const out = {};
  for (const k of FAT) out[k] = tot ? (arred ? r2((100 * g[k]) / tot) : (100 * g[k]) / tot) : 25.0;
  return out;
}

const clipLid = (x) => r2(Math.min(30.0, Math.max(-20.0, x)));

function lideranca(G) {
  const v1 = G.D + G.I - 52.04;
  const v2 = 1.7001 * (G.I + G.S) - 85.9905;
  return [clipLid(v1), clipLid(v2), clipLid(-v1), clipLid(-v2)];
}

function talento(G) {
  const dx = Math.max(-48.0, Math.min(48.0, 2 * (G.S + G.C) - 100));
  const dy = Math.max(-22.0, Math.min(22.0, 100 - 2 * (G.D + G.C)));
  return [r2(dx), r2(dy)];
}

function calcular(parte1, parte2) {
  const [pp, pm, g1, n1] = somas(parte1);
  const [, , g2, n2] = somas(parte2);
  const r = {};
  for (const k of FAT) {
    r[k + '+'] = Math.min(100.0, r2((100 * pp[k]) / MAXP[k]));
    r[k + '-'] = Math.min(100.0, r2((100 * pm[k]) / MAXM[k]));
  }
  const G1 = geral(g1), G2 = geral(g2);
  const U1 = geral(g1, false), U2 = geral(g2, false); // sem arredondar: usados nos índices derivados
  for (const k of FAT) r[k + 'g'] = G1[k];
  const azul = FAT.map((k) => r2(G1[k] - 25));
  const verm = FAT.map((k) => r2(G2[k] - 25));
  for (let i = 0; i < 4; i++) {
    r[`pisolado.d${i + 1}pi`] = azul[i];
    r[`pisolado.d${i + 5}`] = verm[i];
  }
  const iem = r2(soma(azul.map((a, i) => Math.abs(a - verm[i]))));
  r.IEM = iem;
  const t = iem < 30 ? 0.2 : iem < 80 ? 0.65 : 0.92;
  FAT.forEach((k, i) => { // "Tendência de adequação"; com IEM = 0 o sistema manda zeros
    const au = U1[k] - 25, vu = U2[k] - 25;
    r[`pisolado.d${i + 9}`] = iem ? r2(vu + t * (au - vu)) : 0.0;
  });
  const G1v = FAT.map((k) => G1[k]);
  const U1v = FAT.map((k) => U1[k]);
  // Amplitude, IA e IP: calculados com o Geral SEM arredondar e só então arredondados para exibir
  r.AMP = r2(maximo(U1v) - minimo(U1v));
  r._IA_bruto = maximo(U1v) + minimo(U1v) - 50;
  r.IA = r2(r._IA_bruto);
  const spu = soma(FAT.map((k) => (pp[k] < MAXP[k] ? (100 * pp[k]) / MAXP[k] : 100.0)));
  const smu = soma(FAT.map((k) => (pm[k] < MAXM[k] ? (100 * pm[k]) / MAXM[k] : 100.0)));
  r._IP_bruto = smu ? spu / smu : 25.0;
  r.IP = r2(r._IP_bruto);
  r._EN_bruto = (100 * n1) / 87;
  r.EN = r2((100 * n1) / 87);
  const n2Moral = n2 + (new Set(parte2).has('C82') ? 0.5 : 0.0); // Resoluto: não conta na parte 1; conta meio na parte 2
  r.MRL = n2Moral ? r2((0.5 * n1) / n2Moral) : null;
  r.ENP = r2(Math.min(100.0, Math.max(0.0, (100 * (U1.D + U1.C - 36.8)) / 25.2)));
  r.INC = r2(Math.min(100.0, Math.max(0.0, (100 * (U1.D + U1.I - 29.7)) / 46.2)));
  const DESEMPATE = 'SDCI'; // S antes de D, D antes de C, C antes de I
  const ordem = FAT.filter((k) => G1[k] >= 25)
    .sort((a, b) => (G1[b] - G1[a]) || (DESEMPATE.indexOf(a) - DESEMPATE.indexOf(b)));
  r.perfil = ordem.map((k) => LETRA[k]).join('');
  [...lideranca(U1), ...lideranca(U2)].forEach((v, i) => { r[`lideranca.d${i + 1}`] = v; });
  // Liderança Atual: regra por faixa de IEM, sobre os valores JÁ CORTADOS da liderança azul (d1-d4) e vermelha (d5-d8)
  const azl = [1, 2, 3, 4].map((i) => r[`lideranca.d${i}`]);
  const vrm = [5, 6, 7, 8].map((i) => r[`lideranca.d${i}`]);
  let atual;
  if (iem >= 80) atual = azl.map((a, i) => 0.92 * a + 0.08 * vrm[i]);
  else if (iem >= 30) atual = azl.map((a, i) => 0.5 * a + 0.5 * vrm[i]);
  else atual = azl.map((a, i) => Math.max(0.5 * a + 0.5 * vrm[i], vrm[i] + 0.2 * (a - vrm[i])));
  atual.forEach((v, i) => { r[`lidersint.d${i + 1}`] = pyRound(Math.min(30.0, Math.max(-20.0, v)) + 1e-9, 4); });
  [r['pprof.dx'], r['pprof.dy']] = talento(U1);
  [r['pprof.dx2'], r['pprof.dy2']] = talento(U2);
  r._G_bruto = { ...U1 }; // Geral da parte 1 sem arredondar (usado nas competências)
  r.IF_aprox = r2(5.9423 + 0.2299 * n1 - 0.3154 * r.AMP - 0.031 * r.ENP);
  for (const k of FAT) r['barra_' + k] = r2((100 * g1[k]) / 87);
  r.cerebro = {
    frontal: r2(1.5 * (U1.D + U1.C)), posterior: r2(1.5 * (U1.I + U1.S)),
    esquerdo: r2(U1.S + U1.C), direito: r2(U1.D + U1.I),
    frontal_esq_C: r2(1.5 * U1.C), frontal_dir_D: r2(1.5 * U1.D),
    posterior_esq_S: r2(1.5 * U1.S), posterior_dir_I: r2(1.5 * U1.I),
  };
  r.n1 = n1;
  r.n2 = n2;
  return r;
}

export function classeIndice(nome, valor) {
  const f = FAIXAS[nome];
  const acima = f.convencao === '>' ? (v, c) => v > c : (v, c) => v >= c;
  return f.classes[f.cortes.reduce((n, c) => n + (acima(valor, c) ? 1 : 0), 0)];
}

export function nivelFator(k, g) {
  const [mu, s] = NORMA[k];
  const z = (g - mu) / s;
  const js = [-2, -1, 0, 1, 2];
  for (let i = 0; i < js.length; i++) if (z <= js[i]) return NIVEIS[i];
  return 'EA';
}

export function classeTr(segundos) {
  for (const [corte, c] of TR_CORTES) if (segundos < corte) return c;
  return 'Muito Alto';
}

// Estilo de decisão: 6 classes por faixas de D+C (centro 48,20; passo 5,115), ajustadas em 211 resultados reais.
const ESTILO_CENTRO = 48.20, ESTILO_PASSO = 5.115;
const ESTILOS = ['Extremamente Emocional', 'Muito Emocional', 'Emocional', 'Racional', 'Muito Racional', 'Extremamente Racional'];

export function tomadaDecisao(G) {
  const z = (G.D + G.C - ESTILO_CENTRO) / ESTILO_PASSO;
  const i = z >= 2 ? 5 : z >= 1 ? 4 : z >= 0 ? 3 : z >= -1 ? 2 : z >= -2 ? 1 : 0;
  const d = G.D - G.S;
  let vel = 'Extremamente Rápido';
  for (const [corte, c] of VELOCIDADE) {
    if (d < corte) { vel = c; break; }
  }
  return `${ESTILOS[i]}, ${vel}`;
}

export function mensagensValidacao(r, trClasse = null) {
  const P = FAT.map((k) => r[k + '+']);
  const M = FAT.map((k) => r[k + '-']);
  const G = {};
  for (const k of FAT) G[k] = r[k + 'g'];
  const av = [];
  if (soma(P) >= 320) av.push('Mostra-se sobredotado e de muitas qualidades.');
  if (r.AMP < 3.5) av.push('Perfil geral extremamente equalizados.');
  if (P.every((p) => p >= 35 && p <= 65)) av.push('Perfis positivos levemente equalizados. O candidato pode se encontrar em um período de estresse.');
  if (soma(M) === 0) av.push('Atenção para perfil negativo muito baixo.', 'Niveis de perfil negativo muito baixos.');
  if (maximo(P) < 35) av.push('Dificuldade em definir para si um estilo claro de comportamento.');
  if (r.EN < 14.4) av.push('Energia Muito baixa.');
  if (minimo(P) < 14.5) av.push('Verificar Perfil positivo menor.');
  if (maximo(P) > 86) av.push('Verificar Perfil positivo maior.');
  const top = [...FAT].sort((a, b) => G[b] - G[a]).filter((k) => G[k] > 25).join('');
  if (['DS', 'CI', 'IC'].includes(top)) av.push('Os dois perfis predominantes são contraditórios. É raro este perfil.');
  const msgs = [...av];
  if (trClasse === 'Muito Alto' || trClasse === 'Muito Baixo') msgs.push(`Tempo consumido para a resposta do questionário foi ${trClasse}.`);
  if (!av.length) msgs.push('O Teste indica ter sido feito de maneira correta e sincera.');
  if (av.some((m) => m.startsWith('Verificar Perfil positivo'))) msgs.push('O Resultado pode ser interpretado como um reflexo verdadeiro do candidato no teste.');
  return msgs;
}

export function competencias(G) {
  const [xmin, xmax, ymin, ymax] = MAPA_COMPETENCIAS;
  const x = Math.max(xmin, Math.min(xmax, 2 * (G.S + G.C) - 100));
  const y = Math.max(ymin, Math.min(ymax, 100 - 2 * (G.D + G.C)));
  const out = {}, sorteados = [];
  for (const [grupo, [ax, ay, R, L]] of Object.entries(ANCORAS_COMPETENCIA)) {
    let v = Math.min(100.0, (100 * (R - Math.hypot(x - ax, y - ay))) / L);
    if (v < PISO_SORTEIO) { v = 17.0; sorteados.push(grupo); }
    for (const nome of GRUPOS_COMPETENCIA[grupo]) out['teia.' + nome] = pyRound(v, 12);
  }
  return [out, sorteados];
}

export function ifExato(G, en, ip, segundos) { // recebe Geral, Energia e IP SEM arredondar
  const gs = FAT.map((k) => G[k]);
  return r2(17.24 + 0.2 * en - 0.14 * (G.D + G.C) - 0.01 * Math.min(ip, 25.0) - 0.39 * maximo(gs) + 0.21 * minimo(gs) - 0.00286 * segundos);
}

function ifAprox(G, en, enp) {
  const c = IF_APROX_COEF;
  const gs = FAT.map((k) => G[k]);
  return r2(c[0] + c[1] * en + c[2] * maximo(gs) + c[3] * minimo(gs) + c[4] * enp);
}

/** parte1/parte2: listas de nomes de campo (ex.: ['lider','corajoso','C82']); segundos: tempo de resposta. */
export function calcularCompleto(parte1, parte2, segundos = null) {
  const r = calcular(parte1, parte2);
  r.ENP = Math.max(0.0, Math.min(100.0, r.ENP));
  r.INC = Math.max(0.0, Math.min(100.0, r.INC));
  const G = {};
  for (const k of FAT) G[k] = r[k + 'g'];
  for (const k of FAT) r[k + 'nv'] = nivelFator(k, G[k]);
  r.IF_aprox = ifAprox(G, r.EN, r.ENP);
  r.IF = segundos !== null ? ifExato(r._G_bruto, r._EN_bruto, r._IP_bruto, segundos) : null;
  for (const nome of ['EN', 'IEM', 'IA', 'MRL', 'IP', 'AMP', 'ENP', 'INC']) {
    if (r[nome] !== null && r[nome] !== undefined) {
      const bruto = r['_' + nome + '_bruto'];
      r[nome + '_c'] = classeIndice(nome, bruto !== undefined ? bruto : r[nome]); // IA e IP: sem arredondar, como o sistema
    }
  }
  r.IF_c_aprox = classeIndice('IF', r.IF_aprox);
  r.IF_c = r.IF !== null ? classeIndice('IF', r.IF) : null;
  r.TR_c = segundos !== null ? classeTr(segundos) : null;
  r.decisao = tomadaDecisao(G);
  r.validacao = mensagensValidacao(r, r.TR_c);
  const [comp, sorteadas] = competencias(r._G_bruto);
  r.competencias_sorteadas = sorteadas;
  Object.assign(r, comp);
  return r;
}
