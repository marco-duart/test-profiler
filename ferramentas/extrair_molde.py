#!/usr/bin/env python3
"""Gera src/lib/molde.js com os textos fixos do relatório original (tooltips dos índices e dos gráficos, direitos autorais),
extraídos de utils/testes/t74.html. Uso (a partir de utils/pagina-profiler/):  python3 ferramentas/extrair_molde.py"""
import html
import json
import os
import re

AQUI = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(AQUI)
UTILS = os.path.dirname(PROJ)

raw = open(os.path.join(UTILS, "testes", "t74.html"), encoding="utf-8", errors="replace").read()
corpo = raw[raw.find("<body"):]
corpo = re.sub(r"(?s)<script.*?</script>|<!--.*?-->", "", corpo)


def tooltip(texto):
    return re.sub(r"\s+", " ", html.unescape(texto)).strip()


# tooltips dos índices: <a title='...'> seguido do rótulo
indices = {}
for m in re.finditer(r"""<a\s+title=(['"])(.*?)\1\s*>\s*([A-Za-zçã]+):?\s*</a>""", corpo, re.S):
    indices[m.group(3)] = tooltip(m.group(2))
esperados = ["Energia", "IEM", "IA", "Moral", "IP", "Amplitude", "TR", "IF", "ENP", "INC"]
assert all(k in indices for k in esperados), (sorted(indices), esperados)

graficos = {}
for chave, filtro in (("pisolado", "pisolado"), ("lideranca", "lideranca"), ("lidersint", "lidersint"), ("pprof", "pprof"), ("teia", "teia")):
    m = re.search(r"<img\s+src=\"https://plugins\.solides\.adm\.br/grafico\.php\?stroke=[^\"]*_" + filtro + r"&[^\"]*\"\s+title=(['\"])(.*?)\1", corpo, re.S)
    if not m:  # a ordem dos atributos varia: procurar o title na mesma tag
        m = re.search(r"<img[^>]*_" + filtro + r"&[^>]*?title=(['\"])(.*?)\1", corpo, re.S) or \
            re.search(r"<img[^>]*title=(['\"])(.*?)\1[^>]*filename=\"[^\"]*_" + filtro + r"\.jpeg", corpo, re.S)
    assert m, filtro
    graficos[chave] = tooltip(m.group(2))

icones = {}
for chave, arq in (("email", "mailp.jpg"), ("pdf", "iconpdf.png")):
    m = re.search(r"<img[^>]*" + re.escape(arq) + r"[^>]*title=(['\"])(.*?)\1", corpo, re.S)
    assert m, arq
    icones[chave] = tooltip(m.group(2))

m = re.search(r'id="copyright".*?<span[^>]*>(.*?)</span>', corpo, re.S)
direitos = tooltip(re.sub(r"<[^>]+>", " ", m.group(1)))
assert "Coaching Assessment" in direitos

with open(os.path.join(PROJ, "src", "lib", "molde.js"), "w", encoding="utf-8") as f:
    f.write("// GERADO por ferramentas/extrair_molde.py a partir de utils/testes/t74.html (textos fixos do relatório original).\n")
    f.write("export const TOOLTIPS_INDICES = " + json.dumps(indices, ensure_ascii=False, indent=1) + ";\n\n")
    f.write("export const TOOLTIPS_GRAFICOS = " + json.dumps(graficos, ensure_ascii=False, indent=1) + ";\n\n")
    f.write("export const TOOLTIPS_ICONES = " + json.dumps(icones, ensure_ascii=False, indent=1) + ";\n\n")
    f.write("export const DIREITOS_AUTORAIS = " + json.dumps(direitos, ensure_ascii=False) + ";\n")
print("molde.js:", len(indices), "tooltips de índices |", len(graficos), "de gráficos |", len(icones), "ícones | direitos:", len(direitos), "caracteres")
