import Grafico from './Grafico.jsx';
import { TOOLTIPS_INDICES as TT, TOOLTIPS_GRAFICOS as TG, TOOLTIPS_ICONES as TI, DIREITOS_AUTORAIS } from '../lib/molde.js';
import { virg, ponto, iem, tempo, dataHora } from '../lib/formatar.js';

const FATORES = [['Executor', 'D'], ['Comunicador', 'I'], ['Planejador', 'S'], ['Analista', 'C']];
const IMG = (nome) => `${import.meta.env.BASE_URL}img/${nome}`;

function Indice({ nome, rotulo }) { // <b><a title="…">IEM: </a></b>
  return <b><a title={TT[nome]}>{rotulo}</a></b>;
}

/**
 * O relatório resumido (não o estendido), com a mesma estrutura de tabelas da página original.
 * Cada trecho de texto é UM nó, como no HTML do servidor (por isso os textos montados com `${…}`): o Chrome posiciona
 * o texto nó a nó, e "{valor}% ({faixa})" em JSX viraria 4 nós, deslocando as letras seguintes em 1/64 de pixel.
 */
export default function Relatorio({ dados, resultado }) {
  const { r, validacaoHtml, barras, textoHtml, textoAproximado } = resultado;

  return (
    <table width="100%" height="100%" border="0" cellSpacing="0" cellPadding="0">
      <tbody>
        <tr>
          <td>
            <table width="800" border="0" align="center" cellPadding="0" cellSpacing="0" className="relatorio">
              <tbody>
                <tr>
                  <td>
                    <table width="800" border="0" cellSpacing="0" cellPadding="0" style={{ height: 130 }}>
                      <tbody>
                        <tr>
                          <td width="96" bgColor="#FFFFFF" style={{ paddingLeft: 15, height: 50 }} className="plogo">
                            <img width="200px" className="logomarca" src={IMG('25_logosys_ibc.png')} alt="" border="0"
                              style={{ display: 'block', marginTop: -30, maxHeight: 200, maxWidth: 800 }} /><br />
                          </td>
                          <td width="696" bgColor="#FFFFFF">
                            <h1 className="nomefantasia" style={{ position: 'relative', top: -15, marginLeft: 45 }}>IBC ASSESSMENT</h1><br />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td bgColor="#FFF">
                    <table width="710" border="0" align="center" cellPadding="0" cellSpacing="0" className="form" style={{ top: 0 }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: 20, paddingTop: 0 }}>
                            <div style={{ width: 735, lineHeight: '1.5em' }} className="relatorio">
                              <center>
                                <table border="0" cellPadding="2" cellSpacing="0" width="100%">
                                  <tbody>
                                    <tr>
                                      <td width="80%"><b>{`Nome: ${dados.nome}`}</b></td>
                                      <td width="20%"><p align="right"><b>{`Perfil: ${r.perfil}`}</b></p></td>
                                    </tr>
                                    <tr>
                                      <td><b>Data:</b>{` ${dataHora(dados.fim)} `}<b>| Email:</b>{` ${dados.email}`}</td>
                                    </tr>
                                    <tr>
                                      <td width="100%" colSpan="2">
                                        <Indice nome="Energia" rotulo="Energia:" />{` ${virg(r.EN)}% (${r.EN_c}) | `}
                                        <Indice nome="IEM" rotulo="IEM: " />{`${iem(r.IEM)} (${r.IEM_c}) | `}
                                        <Indice nome="IA" rotulo="IA: " />{`${virg(r.IA, 2, true)} (${r.IA_c}) | `}
                                        <Indice nome="Moral" rotulo="Moral: " />{`${virg(r.MRL)} (${r.MRL_c})`}
                                        <br />
                                        <Indice nome="IP" rotulo="IP: " />{`${virg(r.IP, 2, true)} (${r.IP_c}) | `}
                                        <Indice nome="Amplitude" rotulo="Amplitude: " />{`${virg(r.AMP)} (${r.AMP_c}) | `}
                                        <Indice nome="TR" rotulo="TR: " />{`${tempo(resultado.segundos)} (${r.TR_c}) | `}
                                        <Indice nome="IF" rotulo="IF: " />{`${ponto(r.IF)} (${r.IF_c})`}
                                        <br />
                                        {/* no original o espaço depois de ENP/INC fica DENTRO do <b> (kerning do "P" com o espaço) */}
                                        <b><a title={TT.ENP}>ENP</a>{' '}</b>{`${virg(r.ENP)} (${r.ENP_c}) | `}
                                        <b><a title={TT.INC}>INC</a>{' '}</b>{`${virg(r.INC)} (${r.INC_c})`}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                                <div align="center">
                                  <center>
                                    <p align="justify" style={{ border: '1px solid black', padding: 20 }}
                                      dangerouslySetInnerHTML={{ __html: 'Validação do Teste: ' + validacaoHtml }} />
                                  </center>
                                </div>
                                <div align="center">
                                  <center>
                                    <table border="0" cellPadding="0" cellSpacing="0" width="595">
                                      <tbody>
                                        <tr><td width="100%" colSpan="6"></td></tr>
                                        <tr>
                                          <td width="13%"></td>
                                          <td width="7%"></td>
                                          <td width="11%" align="center">Perfil+</td>
                                          <td width="11%" align="center">Perfil-</td>
                                          <td width="11%" align="center">Geral</td>
                                          <td width="41%" align="left">Gráfico do Perfil Geral</td>
                                        </tr>
                                        {FATORES.map(([nome, k]) => {
                                          const [largura, resto] = barras[k]; // 40% = 143 px; acima disso a barra passa de 143 (como no original)
                                          return (
                                            <tr key={k}>
                                              <td width="26%" align="right">{nome}</td>
                                              <td style={{ textAlign: 'center' }} width="7%"><b><font size="3">{k}</font></b></td>
                                              <td width="11%" align="center">{`${virg(r[k + '+'], 2, true)}%`}</td>
                                              <td width="11%" align="center">{`${virg(r[k + '-'], 2, true)}%`}</td>
                                              <td width="11%" align="center">{`${virg(r[k + 'g'], 2, true)}%`}</td>
                                              <td width="41%">
                                                <img height="12" width={largura} style={{ float: 'left' }} src={IMG('figura01.gif')} alt="" />
                                                <img height="12" width={resto} src={IMG('figura02b.jpg')} alt="" />{` (${r[k + 'nv']})`}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </center>
                                </div>
                                <br /><br />
                                <div align="center">
                                  <center>
                                    <table border="0" cellPadding="0" cellSpacing="0" width="100%">
                                      <tbody>
                                        <tr>
                                          <td width="30%" valign="bottom"><Grafico tipo="pisolado" r={r} title={TG.pisolado} style={{ float: 'left' }} /><br /></td>
                                          <td width="30%" valign="bottom"><Grafico tipo="lideranca" r={r} title={TG.lideranca} style={{ float: 'left' }} /></td>
                                          <td width="30%" valign="bottom"><Grafico tipo="lidersint" r={r} title={TG.lidersint} style={{ float: 'left' }} /></td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </center>
                                </div>
                              </center>
                              <br />
                              <div style={{ width: '100%' }} align="justify">
                                <center>
                                  <Grafico tipo="pprof" r={r} title={TG.pprof} style={{ padding: 5, width: 210, float: 'left' }} />
                                </center>
                                {textoAproximado && <span style={{ display: 'none' }} data-texto-aproximado={textoAproximado} />}
                                <div dangerouslySetInnerHTML={{ __html: textoHtml }} />
                                <p><b>Tomada de Decisão</b>{`: ${r.decisao}`}</p>
                              </div>
                              <div align="center">
                                <Grafico tipo="teia" r={r} title={TG.teia} style={{ padding: 5, width: 600 }} />
                              </div>
                              <br /><br />
                              <table border="0" cellPadding="2" cellSpacing="0" width="100%" className="rodape">
                                <tbody>
                                  <tr>
                                    <td width="77%"></td>
                                    <td width="23%" className="imgsactions">
                                      <p align="right">
                                        <a onClick={(e) => e.preventDefault()} href="#"><img border="0" src={IMG('mailp.jpg')} title={TI.email} width="29" height="32" alt="" /></a>{' '}
                                        <a onClick={(e) => { e.preventDefault(); e.currentTarget.ownerDocument.defaultView.print(); }} href="#"><img border="0" src={IMG('iconpdf.png')} title={TI.pdf} width="29" height="32" alt="" /></a>
                                      </p>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
                <tr className="pn"><td><span style={{ backgroundColor: '#d1d1d1' }}></span></td></tr>
                <tr className="pn">
                  <td bgColor="#d1d1d1">
                    <table width="774" border="0" align="center" cellPadding="0" cellSpacing="0" id="copyright">
                      <tbody>
                        <tr>
                          <td height="28" valign="bottom" style={{ backgroundColor: '#d1d1d1', padding: 25, textAlign: 'justify' }}>
                            <span style={{ float: 'right', width: '98%' }}>{DIREITOS_AUTORAIS}</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
                <tr className="pn"><td><span style={{ backgroundColor: '#d1d1d1' }}><br /></span></td></tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
