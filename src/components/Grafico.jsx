import { useEffect, useRef } from 'react';
import { carregarFundos, desenharPerfilIsolado, desenharEstiloLideranca, desenharLiderancaAtual, desenharAreaTalento, desenharRadar } from '../lib/graficos.js';

// [função de desenho, largura e altura do bitmap, largura e altura na página]
const GRAFICOS = {
  pisolado: [desenharPerfilIsolado, 200, 250, 200, 250],
  lideranca: [desenharEstiloLideranca, 190, 250, 190, 250],
  lidersint: [desenharLiderancaAtual, 190, 250, 190, 250],
  pprof: [desenharAreaTalento, 210, 180, 210, 180],
  teia: [desenharRadar, 800, 600, 600, 450], // o original também é 800×600 mostrado com width="600px"
};

/**
 * Um dos 5 gráficos: desenhado num canvas fora da página, no tamanho original (1 pixel = 1 pixel do bitmap do servidor),
 * e mostrado como <img>, como no original. Um <canvas> na página ganha camada própria no Chrome; o texto pintado por
 * cima vai para outra camada, transparente, e perde a suavização colorida (subpixel). Com <img> o texto fica igual.
 */
export default function Grafico({ tipo, r, title, style }) {
  const ref = useRef(null);
  const [desenhar, w, h, largura, altura] = GRAFICOS[tipo];
  useEffect(() => {
    let vivo = true;
    carregarFundos().then((fundos) => {
      const img = ref.current;
      if (!vivo || !img) return;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      desenhar(c.getContext('2d'), r, fundos);
      img.onload = () => { img.dataset.pronto = '1'; }; // sinal para as conferências automáticas (ferramentas/e2e.mjs)
      img.src = c.toDataURL('image/png');
    });
    return () => { vivo = false; };
  }, [desenhar, r, w, h]);
  return <img ref={ref} width={largura} height={altura} title={title} style={style} />;
}
