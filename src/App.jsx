import { useState } from 'react';
import Formulario from './components/Formulario.jsx';
import QuadroRelatorio from './components/QuadroRelatorio.jsx';
import Relatorio from './components/Relatorio.jsx';
import { montarResultado } from './lib/montar.js';

/** Formulário -> (Concluir) -> relatório calculado na hora. Tudo fica só na memória desta aba: recarregar volta ao início. */
export default function App() {
  const [dados, setDados] = useState(null); // { dados, resultado } quando concluído
  const concluir = (d) => { setDados({ dados: d, resultado: montarResultado(d) }); window.scrollTo(0, 0); };
  return dados
    ? <QuadroRelatorio><Relatorio dados={dados.dados} resultado={dados.resultado} /></QuadroRelatorio>
    : <Formulario onConcluir={concluir} />;
}
