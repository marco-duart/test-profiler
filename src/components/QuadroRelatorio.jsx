import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const BASE = import.meta.env.BASE_URL;
// O relatório original usa o doctype XHTML 1.0 Transitional ("quase padrão") e só o publicpages.css (sem Bootstrap).
// Esse modo muda a altura de linhas e imagens em células de tabela, então o relatório vive num documento próprio.
// O documento é ESCRITO num iframe about:blank (document.write): um iframe com srcdoc herdaria o modo do pai e ignoraria o doctype.
const DOCUMENTO = `<!DOCTYPE HTML PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "https://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8" /><title>Tecnologia Solides</title>
<link rel="stylesheet" href="${BASE}css/publicpages.css" type="text/css"/></head>
<body leftmargin="0" topmargin="0" marginwidth="0" marginheight="0" style="background: #556370; font-family: Helvetica,Arial,sans-serif; font-size: 12px;"></body></html>`;

/** Mostra os filhos (o relatório) dentro de um iframe do tamanho do conteúdo, para a página rolar como a original. */
export default function QuadroRelatorio({ children }) {
  const ref = useRef(null);
  const [corpo, setCorpo] = useState(null);

  // Altura = a do conteúdo. O iframe é zerado antes de medir porque a tabela raiz do relatório tem height="100%"
  // (acompanharia a altura atual do iframe e a medida nunca diminuiria). Feito direto no DOM: não é estado do React.
  const medir = useCallback(() => {
    const f = ref.current;
    const d = f?.contentDocument;
    if (!d?.documentElement) return;
    f.style.height = '0px';
    const h = Math.max(d.documentElement.scrollHeight, d.body?.scrollHeight || 0);
    f.style.height = h + 'px';
  }, []);

  const pronto = useCallback(() => {
    const d = ref.current.contentDocument;
    setCorpo(d.body);
    const RO = ref.current.contentWindow.ResizeObserver;
    if (RO) new RO(medir).observe(d.body);
    medir();
  }, [medir]);

  useEffect(() => {
    const d = ref.current.contentDocument;
    d.open();
    d.write(DOCUMENTO);
    d.close();
    const folha = d.querySelector('link');
    if (folha.sheet) pronto(); // espera o CSS antes de mostrar o relatório (evita um instante sem estilo)
    else { folha.addEventListener('load', pronto); folha.addEventListener('error', pronto); }
  }, [pronto]);

  useEffect(() => {
    // título, fundo e o preenchimento do corpo do formulário (jumbotron-narrow.css: body{padding:20px 0}) não valem aqui
    const antes = document.title;
    const b = document.body.style;
    document.title = 'Tecnologia Solides';
    b.background = '#556370';
    b.padding = '0';
    b.margin = '0';
    return () => { document.title = antes; b.background = ''; b.padding = ''; b.margin = ''; };
  }, []);

  return (
    <>
      <iframe ref={ref} title="Relatório" style={{ border: 0, display: 'block', width: '100%' }} />
      {corpo && createPortal(children, corpo)}
    </>
  );
}
