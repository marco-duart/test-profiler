import { useEffect, useRef, useState } from 'react';
import { ADJETIVOS } from '../lib/adjetivos.js';

const BASE = import.meta.env.BASE_URL;
// mesma expressão do jQuery Validate 1.16 (o TLD é opcional)
const EMAIL = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const COLUNAS = [0, 1, 2, 3].map((c) => ADJETIVOS.filter((a) => a.coluna === c));

function Erro({ mostrar, texto = 'Campo obrigatório' }) {
  return mostrar ? <label className="error">{texto}</label> : null;
}

/** Os três blocos do formulário original (dados pessoais, parte 1, parte 2), com a mesma marcação e as mesmas classes.
 *  Nada é enviado: no Concluir chama onConcluir(dados). */
export default function Formulario({ onConcluir }) {
  const [etapa, setEtapa] = useState('dados');
  const [saindo, setSaindo] = useState(null);
  const [alerta, setAlerta] = useState(0); // número do disparo (reinicia a animação)
  const [tentou, setTentou] = useState(false);
  const [c, setC] = useState({ NOMERESP: '', EMAIL: '', TELEFONE: '', CELULAR: '', CPF: '', CARGO: '', NASCIMENTO: '', UF: '', SEXO: 'M', ACEITE: false });
  const [p1, setP1] = useState(() => new Set());
  const [p2, setP2] = useState(() => new Set());
  const inicio = useRef(null);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const set = (campo) => (e) => setC((o) => ({ ...o, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const erros = {
    nome: !c.NOMERESP.trim(),
    email: !c.EMAIL.trim() ? 'Campo obrigatório' : !EMAIL.test(c.EMAIL.trim()) ? 'Informe um endereço de email válido' : null,
    sexo: !c.SEXO,
    aceite: !c.ACEITE,
  };
  const valido = !erros.nome && !erros.email && !erros.sexo && !erros.aceite;

  function ir(para) {
    setSaindo(etapa);
    setEtapa(para);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaindo(null), 600);
    window.scrollTo(0, 0);
  }
  const avisar = () => setAlerta((n) => n + 1);

  function iniciar(e) {
    e.preventDefault();
    setTentou(true);
    if (!valido) return;
    inicio.current = new Date();
    ir('p1');
  }
  function irParte2(e) {
    e.preventDefault();
    if (p1.size > 4) ir('p2'); else avisar();
  }
  function concluir(e) {
    e.preventDefault();
    setTentou(true);
    if (valido && p2.size > 4) {
      onConcluir({
        nome: c.NOMERESP.trim(), email: c.EMAIL.trim(), genero: c.SEXO, cargo: c.CARGO.trim(),
        parte1: [...p1], parte2: [...p2], inicio: inicio.current, fim: new Date(),
      });
    } else avisar();
  }
  const alternar = (setter) => (campo) => () => setter((o) => { const n = new Set(o); if (n.has(campo)) n.delete(campo); else n.add(campo); return n; });

  const bloco = (nome, conteudo, props = {}) => {
    if (etapa === nome) return <div className="pf-entrando" {...props}>{conteudo}</div>;
    if (saindo === nome) return <div className="pf-saindo"><div className="pf-miolo">{conteudo}</div></div>;
    return null;
  };

  const checkbox = (parte) => (a) => {
    const id = a.campo + parte;
    const marcados = parte === 1 ? p1 : p2;
    return (
      <div className="funkyradio-success" key={id}>
        <input type="checkbox" name={id} id={id} value="ON" checked={marcados.has(a.campo)} onChange={alternar(parte === 1 ? setP1 : setP2)(a.campo)} />
        {parte === 1
          ? <label htmlFor={id}>{a.rotulo}</label>
          : <label htmlFor={id}><span className="pequena-instrucao">devo/preciso ser</span> <div className="div-pi"> {a.rotulo} </div> </label>}
      </div>
    );
  };

  return (
    <div className="container">
      {alerta > 0 && (
        <div className="alert alert-warning pf-alerta" id="mensagens-sistema" key={alerta} onAnimationEnd={() => setAlerta(0)}>
          <strong>Ops!</strong> Você precisa escolher pelo menos 5 opções.
        </div>
      )}
      <div className="header clearfix">
        <nav><ul className="nav nav-pills pull-right"></ul></nav>
        <h3 className="text-muted">
          <img style={{ width: 250, height: 'auto' }} src={`${BASE}img/logo-assessment-ibc.png`} height="65px" alt="" />
        </h3>
      </div>
      <form id="form_profiler" noValidate onSubmit={concluir}>
        {bloco('dados', (
          <div id="dados-pessoais">
            <p className="lead" style={{ fontSize: 18, textAlign: 'justify', paddingTop: 5 }}>Teste de Perfil Comportamental Profiler. <br />Preencha os dados abaixo para começar!</p>
            <div className="form-group">
              <label htmlFor="nome">Nome</label>
              <input type="text" className={'form-control' + (tentou && erros.nome ? ' error' : '')} name="NOMERESP" placeholder="Digite seu nome completo" value={c.NOMERESP} onChange={set('NOMERESP')} />
              <Erro mostrar={tentou && erros.nome} />
            </div>
            <div className="form-group">
              <label htmlFor="exampleInputEmail1">Email</label>
              <input type="email" className={'form-control' + (tentou && erros.email ? ' error' : '')} name="EMAIL" aria-describedby="emailHelp" placeholder="Informe seu email" value={c.EMAIL} onChange={set('EMAIL')} />
              <Erro mostrar={tentou && erros.email} texto={erros.email} />
            </div>
            <div className="form-group">
              <label htmlFor="exampleInputEmail1">Telefone</label>
              <input className="form-control phone" name="TELEFONE" placeholder="Informe seu telefone" maxLength="15" value={c.TELEFONE} onChange={set('TELEFONE')} />
            </div>
            <div className="form-group">
              <label htmlFor="exampleInputEmail1">Celular</label>
              <input className="form-control phone" name="CELULAR" placeholder="Informe seu celular" maxLength="15" value={c.CELULAR} onChange={set('CELULAR')} />
            </div>
            <div className="form-group">
              <label htmlFor="exampleInputEmail1">CPF</label>
              <input className="form-control" name="CPF" placeholder="Informe seu CPF" value={c.CPF} onChange={set('CPF')} />
            </div>
            <div className="form-group">
              <label htmlFor="cargo">Profissão / Cargo</label>
              <input type="text" className="form-control" name="CARGO" placeholder="Informe sua profissão" value={c.CARGO} onChange={set('CARGO')} />
            </div>
            <div className="form-group">
              <label htmlFor="exampleInputEmail1">Data de nascimento</label>
              <input className="form-control aniversario" name="NASCIMENTO" placeholder="Sua data de nascimento" maxLength="10" value={c.NASCIMENTO} onChange={set('NASCIMENTO')} />
            </div>
            <div className="form-group">
              <label htmlFor="exampleInputEmail1">Estado (UF)</label>
              <input className="form-control" name="UF" placeholder="Seu estado" value={c.UF} onChange={set('UF')} />
            </div>
            <div className="form-group">
              <label htmlFor="exampleInputEmail1">Gênero</label> <br />
              <div className="btn-group" data-toggle="buttons">
                <label className={'btn btn-default' + (c.SEXO === 'M' ? ' active' : '')}>
                  <input type="radio" name="SEXO" value="M" checked={c.SEXO === 'M'} onChange={set('SEXO')} /> Masculino
                </label>
                <label className={'btn btn-default' + (c.SEXO === 'F' ? ' active' : '')}>
                  <input type="radio" name="SEXO" value="F" checked={c.SEXO === 'F'} onChange={set('SEXO')} /> Feminino
                </label>
              </div>
            </div>
            <div className="form-group">
              <input type="checkbox" name="ACEITE" value="1" className={'form-check-input' + (tentou && erros.aceite ? ' error' : '')} checked={c.ACEITE} onChange={set('ACEITE')} />{' '}
              <a href="#privacidade" onClick={(e) => e.preventDefault()}>Li e aceito a Politica de Privacidade</a>
              <Erro mostrar={tentou && erros.aceite} />
            </div>
            <a className="btn btn-lg btn-success" href="#questionario_1" role="button" id="iniciar-teste" onClick={iniciar}>Iniciar teste</a>
          </div>
        ))}
        {bloco('p1', (
          <div className="row marketing" id="questionario_1">
            <h3>Questionário -  parte 1 de 2</h3>
            <p></p>
            <p>
              <strong>1)</strong> Marque abaixo os  adjetivos que você considera que fazem parte do seu Perfil.<br />
              <strong>2)</strong> Lembre-se, não marque o que você gostaria de ser, mas sim, aquilo que  você realmente é.<br />
              <strong>3)</strong> Analise tanto os seus pontos positivos como os seus pontos negativos  e seja o mais sincero possível.<br />
              <strong>4)</strong> Esta pesquisa é individual, não solicite apoio de outra pessoa para  não prejudicar o resultado.<br />
              <strong>5)</strong> Não interrompa o questionário com distrações ou conversas. Não  discuta o questionário com pessoas à sua volta.<br />
              <strong>6)</strong> Seja sincero, o objetivo da pesquisa não é qualificar ou  desqualificar.<br />
              <strong>7)</strong> Reserve pelo menos 10 minutos para responder ao questionário sem  interrupções.
            </p>
            <p></p>
            {COLUNAS.map((col, i) => (
              <div className="col-lg-3 col-md-4" key={i}><div className="funkyradio">{col.map(checkbox(1))}</div></div>
            ))}
            <a className="btn btn-lg btn-success botao pull-right" role="button" id="parte-2" href="#questionario_2" onClick={irParte2}>Ir para a parte final</a>
          </div>
        ))}
        {bloco('p2', (
          <div className="row marketing" id="questionario_2">
            <h3>Questionário -  parte 2 de 2</h3>
            <p>Marque agora a forma como as outras pessoas pensam que você deve (ou precisa) ser para ter um desempenho melhor.</p>
            {COLUNAS.map((col, i) => (
              <div className="col-lg-3" key={i}>
                <div className="funkyradio">{col.map(checkbox(2))}</div>
                {/* no original o botão está DENTRO da última coluna (o </div> depois dele fecha a coluna) */}
                {i === COLUNAS.length - 1 && <button className="btn btn-lg btn-success botao pull-right" type="submit" value="resultado" role="button">Concluir</button>}
              </div>
            ))}
          </div>
        ))}
      </form>
      <footer className="footer"><p>© 2017 Solides, Tecnologia</p></footer>
    </div>
  );
}
