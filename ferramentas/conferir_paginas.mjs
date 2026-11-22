// Confere a APRESENTAÇÃO do relatório (o que a página escreve) contra as 105 páginas reais salvas, sem navegador:
//   1. formato impresso de cada índice (vírgula, espaço, ponto, zeros) — usando o próprio valor da página;
//   2. linhas da caixa "Validação do Teste" (ordem das frases e onde ficam os <br>);
//   3. texto descritivo (banco de textos + primeiro nome);
//   4. "Tomada de Decisão";
//   5. nos 77 testes (entrada conhecida): o cabeçalho inteiro calculado pela página e as larguras das barras do Geral.
// Uso: npm run paginas      (precisa dos dados locais de utils/; termina com erro se algo divergir fora dos casos-limite)
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { FAT, calcularCompleto, mensagensValidacao, tomadaDecisao } from '../src/lib/profiler.js';
import { linhasValidacao, escolherTexto, barrasGeral } from '../src/lib/montar.js';
import { virg, ponto, iem, tempo } from '../src/lib/formatar.js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const UTILS = path.dirname(path.dirname(AQUI));
const RECEITA = path.join(path.dirname(UTILS), 'assesment-recipe');

// Casos-limite conhecidos do sistema original (ruído numérico do servidor; documentados em DESCOBERTAS seções 20 e 21)
const CASOS_LIMITE = {
  'T71:perfil': 'dois fatores com 25,00 exatos: o sistema tirou as letras',
  'T71:IA': 'o sistema imprime "-0, 00" (zero com sinal)',
  'T72:IA': 'o sistema imprime "-0, 00" (zero com sinal)',
  'T75:IA': 'o sistema imprime "-0, 00" (zero com sinal)',
  'T40:barraS': 'o sistema difere no 14º algarismo da largura (ruído numérico; invisível)',
};

const ENT = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', ccedil: 'ç', atilde: 'ã', eacute: 'é', aacute: 'á', iacute: 'í', oacute: 'ó', uacute: 'ú', ecirc: 'ê', ocirc: 'ô', otilde: 'õ', agrave: 'à', acirc: 'â' };
const decodificar = (s) => s.replace(/&(#\d+|[a-z]+);/gi, (m, e) => (e[0] === '#' ? String.fromCharCode(Number(e.slice(1))) : ENT[e.toLowerCase()] ?? m));
const limpar = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi, '');
const texto = (h) => decodificar(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const num = (s) => Number(s.replace(/\s/g, '').replace(',', '.'));

// ---------------------------------------------------------------- dados
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

const paginas = [
  ...readdirSync(path.join(UTILS, 'testes')).filter((f) => /^t\d\d\.html$/.test(f)).sort().map((f) => ({ id: 'T' + f.slice(1, 3), arq: `testes/${f}` })),
  ...readdirSync(path.join(UTILS, 'Assesment', 'resultados_html')).filter((f) => /^teste\d+\.html$/.test(f)).sort().map((f) => ({ id: f.replace('.html', ''), arq: `Assesment/resultados_html/${f}` })),
];

// ---------------------------------------------------------------- conferências
const INDICES = [ // [chave, regex no texto, formatador]
  ['EN', /Energia:? (\d+, ?\d+)%? \(([^)]+)\)/, (v) => virg(v)],
  ['IEM', /IEM:? (-?[\d.]+) \(([^)]+)\)/, (v) => iem(v)],
  ['IA', /IA:? (-?\d+, ?\d+) \(([^)]+)\)/, (v) => virg(v, 2, true)],
  ['MRL', /Moral:? (-?\d+, ?\d+) \(([^)]+)\)/, (v) => virg(v)],
  ['IP', /IP:? (-?\d+, ?\d+) \(([^)]+)\)/, (v) => virg(v, 2, true)],
  ['AMP', /Amplitude:? (\d+, ?\d+) \(([^)]+)\)/, (v) => virg(v)],
  ['TR', /TR:? (\d+'\d+") \(([^)]+)\)/, (v) => tempo(v)],
  ['IF', /IF:? (-?\d+\.\d+) \(([^)]+)\)/, (v) => ponto(v)],
  ['ENP', /ENP:? (\d+, ?\d+) \(([^)]+)\)/, (v) => virg(v)],
  ['INC', /INC:? (\d+, ?\d+) \(([^)]+)\)/, (v) => virg(v)],
];
const tr = (s) => { const m = s.match(/(\d+)'(\d+)"/); return Number(m[1]) * 60 + Number(m[2]); };
const ROTULOS = { D: 'Executor D', I: 'Comunicador I', S: 'Planejador S', C: 'Analista C' };
/** Os números que a própria página mostra (como o leitor scripts/ler_resultado.py). */
function lerRegistro(t) {
  const r = {};
  for (const k of FAT) {
    const m = t.match(new RegExp(ROTULOS[k] + ' (\\d+, ?\\d+)% (\\d+, ?\\d+)% (\\d+, ?\\d+)% \\((\\w+)\\)'));
    [r[k + '+'], r[k + '-'], r[k + 'g']] = [num(m[1]), num(m[2]), num(m[3])];
  }
  for (const [k, re] of INDICES) {
    const m = t.match(re);
    if (m) { r[k] = k === 'TR' ? tr(m[1]) : num(m[1]); r[k + '_c'] = m[2]; }
  }
  return r;
}

const contagem = {}, falhas = [], limites = [];
function conta(regra, ok, id, detalhe, chave = null) {
  const c = (contagem[regra] ||= [0, 0]);
  c[1] += 1;
  if (ok) { c[0] += 1; return; }
  const lim = CASOS_LIMITE[`${id}:${chave || regra}`];
  (lim ? limites : falhas).push(`${regra} | ${id} | ${detalhe}${lim ? ' | ' + lim : ''}`);
}

for (const { id, arq } of paginas) {
  const bruto = limpar(readFileSync(path.join(UTILS, arq), 'utf-8'));
  const corpo = bruto.slice(bruto.indexOf('<body'));
  const t = texto(corpo);
  const teste = plano[id] && id.startsWith('T') ? id : null;
  const nome = corpo.match(/Nome:\s*([^<]+)<\/b>/)[1].trim();
  const perfil = corpo.match(/Perfil:\s*([A-Z]+)/)[1];

  // 1. formatos (valor da própria página -> formatador da página -> mesmo texto?)
  for (const [k, re, fmt] of INDICES) {
    const m = t.match(re);
    if (!m) continue;
    const valor = k === 'TR' ? tr(m[1]) : num(m[1]);
    conta('formato dos índices', fmt(valor) === m[1], id, `${k}: página "${m[1]}" x formatado "${fmt(valor)}"`, k);
  }
  // 2. validação: linhas e ordem
  const caixa = corpo.match(/Validação do Teste:([\s\S]*?)<\/p>/i)[1];
  const real = caixa.split(/<br\s*\/?>/i).map((l) => texto(l));   // mantém linhas vazias (<br><br>)
  if (real[real.length - 1] === '') real.pop();
  const r = lerRegistro(t);
  const msgs = teste ? calcularCompleto(plano[id].parte1_campos.split(' '), plano[id].parte2_campos.split(' '), r.TR).validacao
    : mensagensValidacao(r, r.TR_c || null);
  const minhas = linhasValidacao(msgs);
  conta('validação (linhas e ordem)', JSON.stringify(minhas) === JSON.stringify(real), id, `página ${JSON.stringify(real)} x página local ${JSON.stringify(minhas)}`);
  // 3. texto descritivo
  const mTexto = corpo.match(/id="imagemprofissional"[\s\S]*?<\/center>([\s\S]*?)<p><b>Tomada de Decis/);
  if (mTexto) {
    const genero = (texto(mTexto[1]).match(/\b[Ee]la\b/g) || []).length > (texto(mTexto[1]).match(/\b[Ee]le\b/g) || []).length ? 'F' : 'M';
    const primeiro = nome.split(/\s+/)[0];
    const meu = escolherTexto(perfil, genero).html.replaceAll('{NOME}', primeiro.charAt(0).toUpperCase() + primeiro.slice(1));
    conta('texto descritivo', texto(meu) === texto(mTexto[1]), id, `perfil ${perfil}/${genero}: textos diferentes`);
  }
  // 4. tomada de decisão
  const dec = corpo.match(/Tomada de Decisão<\/b>\s*:\s*([^<]+)</)[1].trim();
  const G = Object.fromEntries(FAT.map((k) => [k, r[k + 'g']]));
  conta('tomada de decisão', tomadaDecisao(G) === dec, id, `página "${dec}" x "${tomadaDecisao(G)}"`);

  // 5. testes: cabeçalho calculado + barras do Geral
  if (teste) {
    const c = calcularCompleto(plano[id].parte1_campos.split(' '), plano[id].parte2_campos.split(' '), r.TR);
    conta('perfil (letras)', c.perfil === perfil, id, `página ${perfil} x ${c.perfil}`, 'perfil');
    for (const [k, re, fmt] of INDICES) {
      const m = t.match(re);
      const valor = k === 'TR' ? r.TR : c[k];
      const classe = k === 'TR' ? c.TR_c : c[k + '_c'];
      conta('cabeçalho calculado', `${fmt(valor)} (${classe})` === `${m[1]} (${m[2]})`, id, `${k}: página "${m[1]} (${m[2]})" x "${fmt(valor)} (${classe})"`, k);
    }
    const linhasFat = [...corpo.matchAll(/>\s*(\d+, ?\d+)%\s*<\/td>\s*<td[^>]*>\s*(\d+, ?\d+)%\s*<\/td>\s*<td[^>]*>\s*(\d+, ?\d+)%\s*<\/td>\s*<td width='41%'>\s*<img height='12' width='([^']+)'[^>]*\/>\s*<img height='12' width='([^']+)'[^>]*\/>\s*\(([A-Z]+)\)/g)];
    const barras = barrasGeral(plano[id].parte1_campos.split(' '));
    FAT.forEach((k, i) => {
      const [, pmais, pmenos, geral, w1, w2, nv] = linhasFat[i];
      const esperado = [virg(c[k + '+'], 2, true), virg(c[k + '-'], 2, true), virg(c[k + 'g'], 2, true), c[k + 'nv']];
      conta('tabela de fatores', JSON.stringify(esperado) === JSON.stringify([pmais, pmenos, geral, nv]), id,
        `${k}: página ${JSON.stringify([pmais, pmenos, geral, nv])} x ${JSON.stringify(esperado)}`);
      conta('larguras das barras (atributo)', JSON.stringify(barras[k]) === JSON.stringify([w1, w2]), id,
        `${k}: página ${JSON.stringify([w1, w2])} x ${JSON.stringify(barras[k])}`, `barra${k}`);
    });
  }
}

console.log(`${paginas.length} páginas reais (${paginas.filter((p) => p.id.startsWith('T')).length} testes + ${paginas.filter((p) => !p.id.startsWith('T')).length} históricas)\n`);
for (const [regra, [ok, n]] of Object.entries(contagem)) console.log(`${regra.padEnd(30)} ${String(ok).padStart(4)}/${n}`);
if (limites.length) { console.log('\ncasos-limite conhecidos (não reproduzíveis):'); for (const l of limites) console.log('  ' + l); }
if (falhas.length) { console.log('\nDIVERGÊNCIAS:'); for (const f of falhas.slice(0, 40)) console.log('  ' + f); process.exit(1); }
console.log('\nTudo igual às páginas reais (fora os casos-limite conhecidos).');
