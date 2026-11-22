// Página de apoio de ferramentas/comparar_graficos.mjs: desenha um gráfico e compara com a imagem original, pixel a pixel.
import * as G from '/src/lib/graficos.js';

const FUNCOES = {
  pisolado: [G.desenharPerfilIsolado, 200, 250],
  lideranca: [G.desenharEstiloLideranca, 190, 250],
  lidersint: [G.desenharLiderancaAtual, 190, 250],
  pprof: [G.desenharAreaTalento, 210, 180],
  teia: [(ctx, r, f) => G.desenharRadar(ctx, r, f), 800, 600],
};
const fundos = G.carregarFundos();

async function decodificar(b64) {
  const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
  const c = new OffscreenCanvas(bmp.width, bmp.height);
  const x = c.getContext('2d');
  x.drawImage(bmp, 0, 0);
  return x.getImageData(0, 0, bmp.width, bmp.height);
}

window.testar = async (grafico, r, refB64, devolverPng = false) => {
  const [fn, w, h] = FUNCOES[grafico];
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  fn(ctx, r, await fundos);
  const meu = ctx.getImageData(0, 0, w, h).data;
  const ref = (await decodificar(refB64)).data;
  let difs = 0, graves = 0, soma = 0;
  const onde = [];
  for (let i = 0; i < w * h; i++) {
    const d = Math.max(Math.abs(meu[i * 4] - ref[i * 4]), Math.abs(meu[i * 4 + 1] - ref[i * 4 + 1]), Math.abs(meu[i * 4 + 2] - ref[i * 4 + 2]));
    if (d > 0) difs++;
    if (d > 60) { graves++; if (onde.length < 12) onde.push([i % w, Math.floor(i / w)]); }
    soma += d;
  }
  return { w, h, difs, graves, media: soma / (w * h), onde, png: devolverPng ? canvas.toDataURL('image/png') : null };
};
window.pronto = true;
