#!/usr/bin/env python3
"""Gera src/lib/textos.js: banco de textos descritivos por perfil (letras) e gênero, extraído das páginas de resultado salvas.

Fontes: utils/testes/t*.html (77 testes, identidades fictícias) e utils/Assesment/resultados_html/teste*.html (28 pessoas reais).
Trecho extraído: do fim do <center> que contém #imagemprofissional até o parágrafo "Tomada de Decisão".
O primeiro nome da pessoa vira {NOME}. Em seguida, uma verificação de privacidade falha se sobrar QUALQUER nome
das páginas reais no texto gerado.

Uso (a partir de utils/pagina-profiler/):  python3 ferramentas/extrair_textos.py
"""
import collections
import glob
import json
import os
import re
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(AQUI)
UTILS = os.path.dirname(PROJ)


def ler(caminho):
    raw = open(caminho, encoding="utf-8", errors="replace").read()
    raw = re.sub(r"(?s)<script.*?</script>|<!--.*?-->", "", raw)
    m = re.search(r'id="imagemprofissional".*?</center>(.*?)<p><b>Tomada de Decis', raw, re.S)
    nome = re.search(r"Nome:\s*([^<]+)</b>", raw)
    perfil = re.search(r"Perfil:\s*([A-Z]+)", raw)
    if not (m and nome and perfil):
        return None
    texto = re.sub(r">\s+<", "><", re.sub(r"\s+", " ", m.group(1))).strip()
    return {"perfil": perfil.group(1), "nome": nome.group(1).strip(), "html": texto}


def sem_tags(h):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", h))


def genero(h):
    t = sem_tags(h)
    f, m = len(re.findall(r"\b[Ee]la\b", t)), len(re.findall(r"\b[Ee]le\b", t))
    return ("F" if f > m else "M" if m > f else None), f, m


paginas = []
for a in sorted(glob.glob(os.path.join(UTILS, "testes", "t[0-9][0-9].html"))):
    p = ler(a)
    if p:
        p["fonte"], p["arq"] = "teste", os.path.basename(a)
        paginas.append(p)
for a in sorted(glob.glob(os.path.join(UTILS, "Assesment", "resultados_html", "teste*.html"))):
    p = ler(a)
    if p:
        p["fonte"], p["arq"] = "real", os.path.basename(a)
        paginas.append(p)
print(len(paginas), "páginas lidas")

grupos = collections.defaultdict(lambda: collections.defaultdict(list))
for p in paginas:
    primeiro = p["nome"].split()[0]
    h = re.sub(r"\b" + re.escape(primeiro) + r"\b", "{NOME}", p["html"], flags=re.I)
    g, f, m = genero(h)
    if g is None:
        print("  gênero indefinido:", p["arq"], p["perfil"], f, m)
        continue
    grupos[p["perfil"]][g].append((h, p["arq"]))

textos, problemas = {}, 0
for perfil in sorted(grupos):
    textos[perfil] = {}
    for g, itens in sorted(grupos[perfil].items()):
        variantes = collections.Counter(h for h, _ in itens)
        if len(variantes) > 1:
            problemas += 1
            print(f"  ATENÇÃO {perfil}/{g}: {len(variantes)} variantes distintas em {len(itens)} páginas:", [a for _, a in itens])
        textos[perfil][g] = variantes.most_common(1)[0][0]
print(len(textos), "perfis com texto |", sum(len(v) for v in textos.values()), "combinações perfil x gênero |", problemas, "conflitos")

# ------------------------------------------------------------ verificação de privacidade
tokens = set()
for p in paginas:
    if p["fonte"] == "real":
        for t in re.split(r"\s+", p["nome"]):
            t = t.strip(".,;:()")
            if len(t) >= 3:
                tokens.add(t.lower())
alvo = "\n".join(h for g in textos.values() for h in g.values())
# Palavras comuns que coincidem com partes de nomes reais (conferidas à mão em 21/11/2026).
# "dos" é só a preposição; "faria" só pode aparecer como o verbo em "como nenhum outro faria".
PARTICULAS = {"dos", "das"}
HOMONIMOS = {"faria": r"como nenhum outro faria\."}
texto_puro = sem_tags(alvo)
achados = []
for t in sorted(tokens - PARTICULAS):
    for m in re.finditer(r"\b" + re.escape(t) + r"\b", texto_puro, re.I):
        permitido = t in HOMONIMOS and re.search(HOMONIMOS[t], texto_puro[max(0, m.start() - 30):m.end() + 5], re.I)
        if not permitido:
            achados.append(t)
            break
print("nomes reais verificados:", len(tokens), "| encontrados no texto:", achados or "nenhum")
if achados:
    print("FALHA DE PRIVACIDADE: ajuste a extração antes de usar.")
    sys.exit(1)
if "{NOME}" not in alvo:
    print("FALHA: nenhum {NOME} encontrado; a troca de nome não funcionou.")
    sys.exit(1)

# ------------------------------------------------------------ gênero que falta
# Perfis com texto em um só gênero: o outro é derivado trocando palavras, usando as trocas aprendidas nos pares reais
# (perfis que têm os dois textos). Artigos curtos ambíguos ("o", "um") não são trocados. Marcado em APROXIMADOS.
import difflib


def tokens(h):
    return [t for t in re.findall(r"<[^>]+>|[^\s<]+|\s+", h)]


def nu(t):  # palavra sem pontuação nas pontas -> (prefixo, nucleo, sufixo)
    m = re.match(r"^([^\wÀ-ú{}]*)(.*?)([^\wÀ-ú{}]*)$", t)
    return m.group(1), m.group(2), m.group(3)


votos = collections.defaultdict(collections.Counter)
iguais = collections.Counter()   # palavras que aparecem IGUAIS nos dois gêneros (dependem do contexto: não trocar)
for perfil, gs in textos.items():
    if "M" in gs and "F" in gs:
        a = [t for t in tokens(gs["M"]) if t.strip() and not t.startswith("<")]
        b = [t for t in tokens(gs["F"]) if t.strip() and not t.startswith("<")]
        for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
            if op == "equal":
                for x in a[i1:i2]:
                    iguais[nu(x)[1]] += 1
            if op == "replace" and (i2 - i1) == (j2 - j1):
                for x, y in zip(a[i1:i2], b[j1:j2]):
                    nx, ny = nu(x)[1], nu(y)[1]
                    if nx and ny and nx != ny and re.fullmatch(r"[A-Za-zÀ-ú-]+", nx) and re.fullmatch(r"[A-Za-zÀ-ú-]+", ny):
                        votos[nx][ny] += 1
masc_fem = {k: v.most_common(1)[0][0] for k, v in votos.items()
            if k not in {"o", "um"} and (iguais[k] == 0 or k.lower() in {"ele"})}
fem_masc = {}
for k, v in masc_fem.items():
    fem_masc.setdefault(v, k)
print("trocas aprendidas:", len(masc_fem), "palavras masculino->feminino")


def converter(h, mapa):
    def troca(m):
        t = m.group(0)
        if t.startswith("<") or not t.strip():
            return t
        pre, n, suf = nu(t)
        return pre + mapa.get(n, n) + suf
    return re.sub(r"<[^>]+>|[^\s<]+|\s+", troca, h)


aproximados = {}
for perfil, gs in textos.items():
    if len(gs) == 1:
        (g, h), = gs.items()
        outro = "F" if g == "M" else "M"
        gs[outro] = converter(h, masc_fem if g == "M" else fem_masc)
        aproximados[perfil] = outro
print("gêneros derivados (aproximados):", aproximados)

with open(os.path.join(PROJ, "src", "lib", "textos.js"), "w", encoding="utf-8") as f:
    f.write("// GERADO por ferramentas/extrair_textos.py. Textos de terceiros: uso pessoal, NÃO sobe para a nuvem.\n")
    f.write("// TEXTOS[perfil][gênero] = HTML; {NOME} = primeiro nome. Gênero: M ou F.\n")
    f.write("export const TEXTOS = " + json.dumps(textos, ensure_ascii=False, indent=1) + ";\n")
    f.write("// APROXIMADOS[perfil] = gênero cujo texto foi derivado (não existe original salvo para essa combinação).\n")
    f.write("export const APROXIMADOS = " + json.dumps(aproximados, ensure_ascii=False) + ";\n")
print("textos.js gravado:", os.path.getsize(os.path.join(PROJ, "src", "lib", "textos.js")) // 1024, "KB")
