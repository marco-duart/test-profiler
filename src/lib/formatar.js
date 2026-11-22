// Formatos de número iguais aos do relatório original (conferidos em 107 páginas salvas).
const pad2 = (n) => String(n).padStart(2, '0');

/** Vírgula decimal. espaco=true reproduz o "0, 00" do original (IA, IP e a tabela de fatores). */
export function virg(n, casas = 2, espaco = false) {
  const [i, d] = Number(n).toFixed(casas).split('.');
  return d === undefined ? i : `${i},${espaco ? ' ' : ''}${d}`;
}

/** Ponto decimal com casas fixas (IF). */
export const ponto = (n, casas = 2) => Number(n).toFixed(casas);

/** IEM: número "solto" do PHP, sem zeros à direita ("0", "23.18", "11.8"). */
export const iem = (n) => String(Number(n));

/** Tempo de resposta: m'ss" com os segundos SEM zero à esquerda (6'7"). */
export const tempo = (s) => `${Math.floor(s / 60)}'${s % 60}"`;

/** Como o `echo` do PHP imprime um float (14 algarismos significativos, sem zeros à direita). Usado nas barras. */
export const php = (x) => String(Number(Number(x).toPrecision(14)));

/** dd/mm/aaaa hh:mm:ss */
export function dataHora(d) {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export const escaparHtml = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
