# Profiler local (React + Vite)

Recriação **local e não oficial** do teste Profiler: a pessoa responde (dados, parte 1, parte 2) e, ao concluir, o relatório
resumido aparece na hora, com o mesmo layout, logo, barras e gráficos do original. **Nada é salvo nem enviado**: sem servidor,
sem banco, sem `localStorage`/cookies e sem nenhuma requisição externa. Recarregar a página volta ao início.

Uso pessoal. A pasta tem logo, CSS e textos de terceiros: **fica só neste computador** (não suba para a nuvem).

## Abrir
```
npm install          # uma vez
npm run build        # gera dist/index.html
```
Depois abra `dist/index.html` no navegador (funciona direto do disco, `file://`). Para desenvolver: `npm run dev`.

## Como está organizado
| Pasta / arquivo | O que é |
|---|---|
| `src/lib/profiler.js` | porta fiel do algoritmo (`assesment-recipe/scripts/profiler.py`), função pura |
| `src/lib/montar.js` | monta o resultado: cálculo, sorteio das competências abaixo de 14, linhas da validação, barras do Perfil Geral, texto descritivo |
| `src/lib/graficos.js` | desenho dos 5 gráficos (canvas fora da página, no tamanho original) |
| `src/lib/dados.js`, `adjetivos.js`, `textos.js`, `molde.js` | **gerados** (pesos, os 87 adjetivos, textos por perfil/gênero, tooltips); não edite à mão |
| `src/components/Formulario.jsx` | os 3 blocos do formulário (marcação e classes do original) |
| `src/components/Relatorio.jsx` | o relatório (estrutura de tabelas do original) |
| `src/components/QuadroRelatorio.jsx` | mostra o relatório num `iframe` com o doctype original (XHTML Transitional) |
| `src/components/Grafico.jsx` | cada gráfico é mostrado como `<img>` (como no original), não como `<canvas>` |
| `public/css`, `public/img` | CSS e imagens originais (formulário e relatório) |
| `src/assets/graficos` | camadas fixas dos gráficos (grade, títulos, 13 regiões da Área de Talento, nomes do radar…), embutidas no `index.html` |
| `ferramentas/` | geradores e verificações (abaixo) |

## Verificações (todas passam)
| Comando | O que prova |
|---|---|
| `npm run verificar` | o algoritmo em JS dá o mesmo resultado que o Python em 377 casos (77 testes reais + 300 aleatórios): `OK 377/377` |
| `npm run acuracia` | refaz a tabela de acerto (`assesment-recipe/ACURACIA.md`) com o algoritmo em JS e os mesmos dados reais: **idêntica linha a linha**, 9.639 de 9.642 = **99,97%** |
| `npm run paginas` | confere a apresentação contra 107 páginas reais (77 testes + 30 antigas): formatos dos números, linhas da validação, texto descritivo, Tomada de Decisão, cabeçalho e larguras das barras. Só restam os casos-limite conhecidos |
| `npm run e2e` | abre `dist/index.html` por `file://` e refaz os 77 testes reais clicando como um usuário (mesmos dados, respostas e horário; os sorteios recebem os valores que o sistema real sorteou). Compara com a página original renderizada offline: texto visível; fora dos gráficos, **todos os pixels** (exige 0 diferentes); dentro dos gráficos, só o que sobrevive a um leve desfoque (até 200 px); zero requisições externas; nada guardado no navegador. Resultado: **74/77 idênticos + 3 casos-limite**. Leva ~25 min; para alguns testes: `node ferramentas/e2e.mjs T70 T02` |
| `npm run formulario` | compara as 3 etapas do formulário com as páginas originais salvas (`utils/pagina-1.html`, `pagina-2.html`): **0 pixels de diferença** |
| `npm run graficos -- pasta` | compara os 5 gráficos com as imagens originais dos 77 testes (média de 2 a 150 pixels diferentes por imagem; as imagens têm de 38 mil a 480 mil pixels) |

`e2e` e `formulario` usam o `dist/`: rode `npm run build` antes. Para regerar os dados depois de mudar o algoritmo: `npm run golden` e `npm run verificar`.

## O que é fiel e o que não é
- **Fiel:** o algoritmo é o mesmo do Python (377/377 e a mesma tabela de acerto, 99,97%). Refazendo os 77 testes reais no navegador, o relatório tem **texto idêntico em 74** e é **idêntico pixel a pixel fora dos gráficos** (mesma altura, 0 pixels diferentes). Os 3 restantes são os casos-limite abaixo. Dentro dos 5 gráficos sobram de 0 a 100 pixels por página (mediana 30): bordas de polígono e frações de pixel do desenho.
- **Detalhes que fazem a cópia ser exata** (ver `assesment-recipe/DESCOBERTAS.md`, seção 21): cada trecho de texto é um único nó, como no HTML do servidor; os gráficos são `<img>`, não `<canvas>`, para o texto manter a suavização colorida; a validação é a mesma string HTML que o servidor monta.
- **Competências abaixo de 14:** o sistema real sorteia um valor de 14 a 20 (um por grupo); a página faz o mesmo, então esses valores mudam a cada resultado.
- **Texto descritivo:** vem do banco extraído das páginas salvas (23 perfis). Para os 10 perfis que só existem em um gênero, o outro é **derivado** trocando palavras (aproximado, marcado em `APROXIMADOS`). Perfis sem texto usam o mais parecido.
- **Dois casos-limite não reproduzíveis** (ruído numérico do servidor original): perfil com **dois fatores exatamente em 25,00** (aparece com letra a mais) e o "−0,00" do IA quando o valor é zero exato.
- **Gráficos de liderança:** o valor exato do servidor (3 casas) não é totalmente conhecido; a diferença é de frações de pixel.
- **Radar de T74, T75 e T77 no `e2e`:** a imagem de referência salva veio de outro carregamento do resultado (o servidor sorteou de novo as competências abaixo de 14), então o radar desses 3 testes não é comparado.
- Ícone de e-mail do relatório não faz nada; o de PDF chama a impressão do navegador.
- Gênero começa em "Masculino" (como o botão do original aparece marcado).
