// Acerto da PÁGINA: refaz a tabela de assesment-recipe/ACURACIA.md usando o algoritmo em JavaScript (src/lib/profiler.js)
// contra os mesmos dados reais (77 testes + 211 resultados) e compara linha a linha com a tabela do Python.
// Uso: npm run acuracia      (precisa dos dados locais de utils/testes; termina com erro se qualquer linha divergir)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  FAT, GRUPOS_COMPETENCIA, calcularCompleto, classeIndice, nivelFator, classeTr, tomadaDecisao, mensagensValidacao,
  competencias, ifExato,
} from '../src/lib/profiler.js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const UTILS = path.dirname(path.dirname(AQUI));
const RECEITA = path.join(path.dirname(UTILS), 'assesment-recipe');

// ---------------------------------------------------------------- dados (os mesmos do relatorio_acuracia.py)
function lerCsv(texto) {
  const linhas = []; let campo = '', linha = [], aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (aspas) { if (ch === '"' && texto[i + 1] === '"') { campo += '"'; i++; } else if (ch === '"') aspas = false; else campo += ch; }
    else if (ch === '"') aspas = true;
    else if (ch === ',') { linha.push(campo); campo = ''; }
    else if (ch === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
    else if (ch !== '\r') campo += ch;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  const [cab, ...resto] = linhas;
  return resto.filter((l) => l.length > 1).map((l) => Object.fromEntries(cab.map((c, i) => [c, l[i]])));
}
const plano = Object.fromEntries(lerCsv(readFileSync(path.join(RECEITA, 'plano_testes.csv'), 'utf-8')).map((r) => [r.teste, r]));
const reais = Object.fromEntries(JSON.parse(readFileSync(path.join(RECEITA, 'testes', 'todos.json'), 'utf-8'))
  .map((r) => ['T' + r.arquivo.split('/t').pop().slice(0, 2), r]));
const base = JSON.parse(readFileSync(path.join(UTILS, 'testes', 'base_completa.json'), 'utf-8'));
const T = Object.keys(reais).filter((t) => plano[t]).sort();
const C = Object.fromEntries(T.map((t) => [t, calcularCompleto(plano[t].parte1_campos.split(' '), plano[t].parte2_campos.split(' '), reais[t].TR)]));
const linhas = [];

const frases = (x) => new Set((x || '').split(/(?<=\.)\s+/).map((s) => s.trim()).filter(Boolean));
const mesmoConjunto = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

function num(nome, campos, tol, obs = '', amostra = null) {
  let ok = 0, n = 0, emax = 0;
  for (const t of T) {
    for (const c of campos) {
      let a = C[t][c], b = reais[t][c];
      if ((b === null || b === undefined) && c === 'IEM') b = 0.0;
      if (a === null || a === undefined || b === null || b === undefined) continue;
      n += 1;
      const e = Math.abs(a - b);
      emax = Math.max(emax, e);
      ok += e <= tol ? 1 : 0;
    }
  }
  linhas.push([nome, amostra || `${T.length} testes`, n, ok, emax, obs]);
}
function cat(nome, pares, obs = '', amostra = null, igual = (a, b) => a === b) {
  linhas.push([nome, amostra || `${T.length} testes`, pares.length, pares.filter(([a, b]) => igual(a, b)).length, null, obs]);
}

// ---------------------------------------------------------------- valores numéricos (77 testes)
const SINAIS = ['+', '-'];
num('Perfil+ e Perfil− (8 valores)', FAT.flatMap((k) => SINAIS.map((s) => k + s)), 0.015);
num('Geral D/I/S/C', FAT.map((k) => k + 'g'), 0.015);
num('Gráfico perfil: linha azul e vermelha', [1, 2, 3, 4].map((i) => `pisolado.d${i}pi`).concat([5, 6, 7, 8].map((i) => `pisolado.d${i}`)), 0.015);
num('Gráfico perfil: tendência de adequação', [9, 10, 11, 12].map((i) => `pisolado.d${i}`), 0.015);
num('IEM, Amplitude, IA, IP', ['IEM', 'AMP', 'IA', 'IP'], 0.015);
num('Energia, ENP, INC', ['EN', 'ENP', 'INC'], 0.015);
num('Moral', ['MRL'], 0.015, 'inclui a regra especial do Resoluto');
num('IF (com tempo de resposta)', ['IF'], 0.011, 'sem o TR: só aproximado (~0,6)');
num('Liderança (azul e vermelha)', [1, 2, 3, 4, 5, 6, 7, 8].map((i) => `lideranca.d${i}`), 0.015);
num('Liderança Atual (Interação)', [1, 2, 3, 4].map((i) => `lidersint.d${i}`), 0.015, 'perfil misto com valores já cortados');
num('Área de Talento (dx, dy, azul e vermelha)', ['pprof.dx', 'pprof.dy', 'pprof.dx2', 'pprof.dy2'], 0.015);
cat('Letras do perfil', T.map((t) => [C[t].perfil, reais[t].perfil]), 'T71: dois fatores com 25,00 exatos (ruído numérico do sistema)');

// ---------------------------------------------------------------- classificações (211 resultados: testes + pessoas reais)
const nv = [], tr = [], dec = [], msg = [], fx = [];
for (const r of base) {
  const G = Object.fromEntries(FAT.map((k) => [k, r[k + 'g']]));
  for (const k of FAT) if (r[k + 'nv']) nv.push([nivelFator(k, G[k]), r[k + 'nv']]);
  if (r.TR_c) tr.push([classeTr(r.TR), r.TR_c]);
  if (r.decisao) dec.push([tomadaDecisao(G), r.decisao]);
  if (r.validacao !== null && r.validacao !== undefined) msg.push([frases(mensagensValidacao(r, r.TR_c || null).join(' ')), frases(r.validacao)]);
  for (const k of ['EN', 'IEM', 'IA', 'MRL', 'IP', 'AMP', 'IF', 'ENP', 'INC']) {
    if (r[k] !== null && r[k] !== undefined && r[k + '_c']) fx.push([classeIndice(k, r[k]), r[k + '_c'].trim()]);
  }
}
cat('Níveis dos fatores (EB…EA)', nv, '', `${base.length} resultados`);
cat('Faixas dos 9 índices (pelo número mostrado)', fx, '2 números exatamente no corte; pelos adjetivos: 100%', `${base.length} resultados`);
cat('Faixa do tempo de resposta', tr, '', `${base.length} resultados`);
cat('Tomada de decisão', dec, '', `${dec.length} resultados`);
cat('Mensagens de validação (conjunto exato)', msg, '', `${base.length} resultados`, mesmoConjunto);
{
  let ok = 0, n = 0, emax = 0;
  for (const r of base) {
    if (r.IF === null || r.IF === undefined || !r.TR) continue;
    const G = Object.fromEntries(FAT.map((k) => [k, r[k + 'g']]));
    const e = Math.abs(ifExato(G, r.EN, r.IP, r.TR) - r.IF);
    n += 1; emax = Math.max(emax, e); ok += e <= 0.011 ? 1 : 0;
  }
  linhas.push(['IF (fórmula) em todos os resultados', `${n} resultados`, n, ok, emax, 'erro máx. 0,01 = arredondamento']);
}

// ---------------------------------------------------------------- competências
{
  let okT = 0, nT = 0, okH = 0, nH = 0, okS = 0, nS = 0, emaxT = 0, emaxH = 0;
  for (const t of T) {
    const sort = new Set(C[t].competencias_sorteadas.flatMap((g) => GRUPOS_COMPETENCIA[g]));
    for (const [k, v] of Object.entries(reais[t])) {
      if (!k.startsWith('teia.')) continue;
      if (sort.has(k.slice(5))) { nS += 1; okS += v >= 14 && v <= 20 ? 1 : 0; continue; }
      const e = Math.abs(C[t][k] - v);
      nT += 1; okT += e <= 1e-9 ? 1 : 0; emaxT = Math.max(emaxT, e);
    }
  }
  for (const r of base) {
    if (r.fonte !== 'html_hist' || !('teia.agressividade' in r)) continue;
    const [comp, sorteados] = competencias(Object.fromEntries(FAT.map((k) => [k, r[k + 'g']])));
    const sort = new Set(sorteados.flatMap((g) => GRUPOS_COMPETENCIA[g]));
    for (const [k, v] of Object.entries(comp)) {
      if (!(k in r)) continue;
      if (sort.has(k.slice(5))) { nS += 1; okS += r[k] >= 14 && r[k] <= 20 ? 1 : 0; continue; }
      const e = Math.abs(v - r[k]);
      nH += 1; okH += e <= 0.05 ? 1 : 0; emaxH = Math.max(emaxH, e);
    }
  }
  linhas.push(['Competências (21): testes', `${T.length} testes`, nT, okT, emaxT, 'fórmula exata; igual até a 12ª casa']);
  linhas.push(['Competências (21): histórico', '28 páginas antigas', nH, okH, emaxH, 'Geral só com 2 casas: erro ≤ 0,05']);
  linhas.push(['Competências sorteadas (cálculo < 14)', 'testes + histórico', nS, okS, null, 'o sistema sorteia 14–20: faixa prevista, valor não']);
}

// ---------------------------------------------------------------- tabela (mesmo formato do Python) e comparação
const pct = (x) => `${(Math.round(x * 100) / 100).toFixed(2)}%`;
let totOk = 0, totN = 0;
const tabela = ['| Componente | Amostra | Valores conferidos | % acerto | % erro | Maior erro | Observação |', '|---|---|---|---|---|---|---|'];
for (const [nome, amostra, n, ok, emax, obs] of linhas) {
  totOk += ok; totN += n;
  tabela.push(`| ${nome} | ${amostra} | ${n} | ${pct((100 * ok) / n)} | ${pct((100 * (n - ok)) / n)} | ${emax === null ? '' : emax.toFixed(3)} | ${obs} |`);
}
tabela.push(`| **TOTAL** | | **${totN}** | **${pct((100 * totOk) / totN)}** | **${pct((100 * (totN - totOk)) / totN)}** | | |`);
console.log(tabela.join('\n'));

const doPython = readFileSync(path.join(RECEITA, 'ACURACIA.md'), 'utf-8').split('\n').filter((l) => l.startsWith('|'));
const diferentes = tabela.filter((l, i) => l !== doPython[i]);
if (diferentes.length || doPython.length !== tabela.length) {
  console.log(`\nDIVERGE da tabela do Python (assesment-recipe/ACURACIA.md) em ${diferentes.length} linha(s):`);
  for (const l of diferentes) console.log('  JS:     ', l);
  process.exit(1);
}
console.log(`\nIDÊNTICO à tabela do Python (assesment-recipe/ACURACIA.md): ${tabela.length - 2} linhas, ${totOk}/${totN} = ${pct((100 * totOk) / totN)}`);
