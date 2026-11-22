// Compara src/lib/profiler.js com o gabarito do Python (ferramentas/golden.json). Uso: npm run verificar
import { readFileSync } from 'node:fs';
import { calcularCompleto } from '../src/lib/profiler.js';

const casos = JSON.parse(readFileSync(new URL('./golden.json', import.meta.url), 'utf-8'));
const TOL = 1e-9;
let ok = 0;
const falhas = [];

function comparar(esp, obs, caminho, erros) {
  if (esp === null || typeof esp !== 'object') {
    if (typeof esp === 'number' && typeof obs === 'number') {
      if (!(Math.abs(esp - obs) <= TOL)) erros.push(`${caminho}: esperado ${esp}, obtido ${obs}`);
    } else if (esp !== obs) erros.push(`${caminho}: esperado ${JSON.stringify(esp)}, obtido ${JSON.stringify(obs)}`);
    return;
  }
  if (Array.isArray(esp)) {
    if (!Array.isArray(obs) || esp.length !== obs.length) { erros.push(`${caminho}: lista diferente (${JSON.stringify(esp)} x ${JSON.stringify(obs)})`); return; }
    esp.forEach((v, i) => comparar(v, obs[i], `${caminho}[${i}]`, erros));
    return;
  }
  if (obs === null || typeof obs !== 'object') { erros.push(`${caminho}: esperado objeto, obtido ${obs}`); return; }
  for (const k of Object.keys(esp)) comparar(esp[k], obs[k], `${caminho}.${k}`, erros);
  for (const k of Object.keys(obs)) if (!(k in esp)) erros.push(`${caminho}.${k}: chave a mais no JS`);
}

for (const c of casos) {
  const erros = [];
  comparar(c.esperado, calcularCompleto(c.p1, c.p2, c.tr), c.id, erros);
  if (erros.length) falhas.push(...erros); else ok += 1;
}
if (falhas.length) {
  console.log(falhas.slice(0, 40).join('\n'));
  console.log(`\nFALHOU: ${ok}/${casos.length} casos idênticos (${falhas.length} divergências)`);
  process.exit(1);
}
console.log(`OK ${ok}/${casos.length}`);
