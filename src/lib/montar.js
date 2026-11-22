// Monta tudo o que o relatório mostra a partir das respostas: cálculo (profiler.js), sorteio das competências, ordem das
// frases de validação, escolha do texto descritivo. Funções puras (o sorteio recebe o gerador de números aleatórios).
import { calcularCompleto, pontosGeral, FAT, GRUPOS_COMPETENCIA } from './profiler.js';
import { TEXTOS } from './textos.js';
import { escaparHtml, php } from './formatar.js';

/** Grupos de competência cujo cálculo deu menos de 14 recebem UM valor aleatório de 14,00 a 20,00 (igual para o grupo todo),
 *  como o sistema original faz. */
export function sortearCompetencias(r, rnd = Math.random) {
  const out = { ...r };
  for (const grupo of r.competencias_sorteadas) {
    const v = Math.round((14 + rnd() * 6) * 100) / 100;
    for (const nome of GRUPOS_COMPETENCIA[grupo]) out['teia.' + nome] = v;
  }
  return out;
}

// Ordem das frases no original (inferida e conferida em 211 textos reais, sem nenhum conflito).
const ORDEM_VALIDACAO = [
  ['atencao', 'Atenção para perfil negativo'], ['tempo', 'Tempo consumido'], ['sobredotado', 'Mostra-se sobredotado'],
  ['extremamente', 'extremamente equalizados'], ['levemente', 'levemente equalizados'], ['dificuldade', 'Dificuldade em definir'],
  ['energia', 'Energia Muito baixa'], ['niveis', 'Niveis de perfil negativo'], ['resultado', 'O Resultado pode ser'],
  ['verificar', 'Verificar Perfil positivo'], ['contraditorios', 'contraditórios'], ['correta', 'correta e sincera'],
];
const rotulo = (m) => (ORDEM_VALIDACAO.find(([, t]) => m.includes(t)) || ['outro'])[0];

/** Conteúdo da caixa "Validação do Teste" montado como o servidor: cada frase tem o seu final. A maioria termina em <br>;
 *  "O Resultado pode ser interpretado…" termina em espaço (o "Verificar Perfil positivo…" seguinte fica na mesma linha);
 *  o tempo "Muito Alto" termina em " <br>" (linha própria); o tempo "Muito Baixo" COMEÇA com <br> e termina em espaço
 *  (deixa uma linha vazia antes e a frase seguinte continua na mesma linha). Conferido nas 107 páginas reais salvas. */
function montarValidacao(msgs, esc) {
  const idx = (m) => ORDEM_VALIDACAO.findIndex(([k]) => k === rotulo(m));
  const ord = [...msgs].sort((a, b) => idx(a) - idx(b)); // sort estável
  let html = '';
  for (const m of ord) {
    const t = esc(m);
    if (m.startsWith('Tempo consumido') && m.includes('Muito Baixo')) html += '<br>' + t + ' ';
    else if (m.startsWith('Tempo consumido') && m.includes('Muito Alto')) html += t + ' <br>';
    else if (m.startsWith('O Resultado pode ser')) html += t + ' ';
    else html += t + '<br>';
  }
  return html;
}

/** O HTML da caixa, exatamente como o servidor o escreve depois de "Validação do Teste: ". A página usa esta string inteira
 *  (e não um elemento por linha) porque o Chrome posiciona o texto por nó: nós diferentes deslocam letras em 1/64 de pixel. */
export const htmlValidacao = (msgs) => montarValidacao(msgs, escaparHtml);

/** As linhas visíveis da caixa (o que fica entre os <br>), para as conferências. */
export function linhasValidacao(msgs) {
  const linhas = montarValidacao(msgs, (m) => m).split('<br>').map((l) => l.trim());
  if (linhas.length && linhas[linhas.length - 1] === '') linhas.pop();
  return linhas;
}

/** Larguras (texto do atributo width) das duas imagens de cada barra do "Gráfico do Perfil Geral", como o servidor imprime:
 *  Geral SEM arredondar calculado como g/T·100, barra = Geral·143/40 (40% = 143 px), parte cinza = 143 − barra (fica negativa
 *  acima de 40%), com 14 algarismos significativos. Conferido em 616 atributos de 77 testes: 615 iguais (1 difere no 14º
 *  algarismo por ruído numérico do próprio servidor; invisível). */
export function barrasGeral(parte1) {
  const g = pontosGeral(parte1);
  const tot = FAT.reduce((s, k) => s + g[k], 0);
  return Object.fromEntries(FAT.map((k) => {
    const G = tot ? (g[k] / tot) * 100 : 25;
    const barra = (G * 143) / 40;
    return [k, [php(barra), php(143 - barra)]];
  }));
}

/** Texto descritivo (HTML) por perfil e gênero. Se o perfil não existe no banco: mesmas 2 primeiras letras, depois a
 *  letra inicial sozinha, depois qualquer perfil que comece com ela. Devolve { html, perfilUsado, exato }. */
export function escolherTexto(perfil, genero) {
  const perfis = Object.keys(TEXTOS);
  const g = genero === 'F' ? 'F' : 'M';
  const candidatos = [perfil, ...perfis.filter((p) => p === perfil.slice(0, 2)), ...perfis.filter((p) => p.startsWith(perfil.slice(0, 2))),
    ...perfis.filter((p) => p === perfil[0]), ...perfis.filter((p) => p.startsWith(perfil[0])), 'E'];
  const usado = candidatos.find((p) => TEXTOS[p]);
  return { html: TEXTOS[usado][g] || TEXTOS[usado][g === 'M' ? 'F' : 'M'], perfilUsado: usado, exato: usado === perfil };
}

const primeiroNome = (nome) => {
  const p = nome.trim().split(/\s+/)[0] || '';
  return p.charAt(0).toUpperCase() + p.slice(1);
};

/** dados: { nome, email, genero ('M'|'F'), parte1, parte2 (listas de campos), inicio, fim (Date) } */
export function montarResultado(dados, rnd = Math.random) {
  const segundos = Math.floor(dados.fim.getTime() / 1000) - Math.floor(dados.inicio.getTime() / 1000); // como o servidor: dos horários em segundos
  const base = calcularCompleto(dados.parte1, dados.parte2, segundos);
  const r = sortearCompetencias(base, rnd);
  const texto = escolherTexto(r.perfil, dados.genero);
  return {
    r,
    segundos,
    validacaoHtml: htmlValidacao(r.validacao),
    barras: barrasGeral(dados.parte1),
    textoHtml: texto.html.replaceAll('{NOME}', escaparHtml(primeiroNome(dados.nome))),
    textoAproximado: !texto.exato ? texto.perfilUsado : null,
  };
}
