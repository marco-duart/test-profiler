#!/usr/bin/env python3
"""Gera src/lib/dados.js e src/lib/adjetivos.js a partir dos arquivos de assesment-recipe e do formulário original.

- dados.js:      pesos dos 87 adjetivos (pesos.csv), faixas (faixas.json), coeficientes do IF aproximado.
- adjetivos.js:  os 87 adjetivos na ordem e na divisão em colunas do formulário original (utils/pagina-1.html).

Uso (a partir de utils/pagina-profiler/):  python3 ferramentas/gerar_dados.py
Não edite os arquivos gerados à mão.
"""
import csv
import html
import json
import os
import re

AQUI = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(AQUI)
UTILS = os.path.dirname(PROJ)
RECEITA = os.path.join(os.path.dirname(UTILS), "assesment-recipe")
FAT = "DISC"

# ---------------------------------------------------------------- dados.js
pesos = {}
for r in csv.DictReader(open(os.path.join(RECEITA, "pesos.csv"), encoding="utf-8")):
    pesos[r["campo"]] = {"canal": r["canal"], **{k: int(r[k]) for k in FAT}, **{"G" + k: int(r["G" + k]) for k in FAT}}
faixas = json.load(open(os.path.join(RECEITA, "scripts", "faixas.json"), encoding="utf-8"))
modelos = json.load(open(os.path.join(RECEITA, "scripts", "modelos_aproximados.json"), encoding="utf-8"))
faixas = {k: {"classes": v["classes"], "cortes": v["cortes"], "convencao": v.get("convencao", ">=")} for k, v in faixas.items()}
if_coef = modelos["IF"]["coef"]
with open(os.path.join(PROJ, "src", "lib", "dados.js"), "w", encoding="utf-8") as f:
    f.write("// GERADO por ferramentas/gerar_dados.py a partir de assesment-recipe (pesos.csv, faixas.json, modelos_aproximados.json).\n")
    f.write("// Não edite à mão.\n")
    f.write("export const PESOS = " + json.dumps(pesos, ensure_ascii=False, indent=1) + ";\n\n")
    f.write("export const FAIXAS = " + json.dumps(faixas, ensure_ascii=False, indent=1) + ";\n\n")
    f.write("export const IF_APROX_COEF = " + json.dumps(if_coef) + ";\n")

# ---------------------------------------------------------------- adjetivos.js
raw = open(os.path.join(UTILS, "pagina-1.html"), encoding="utf-8").read()
ini, fim = raw.find('id="questionario_1"'), raw.find('id="parte-2"')
trecho = raw[ini:fim]
colunas = re.split(r'<div class="col-lg-3[^"]*">', trecho)[1:]
adjetivos = []
for c, bloco in enumerate(colunas):
    for campo, rotulo in re.findall(r'name="([^"]+)1" id="[^"]+" value="ON"\s*/?>\s*<label for="[^"]+">([^<]+)</label>', bloco):
        adjetivos.append({"campo": campo, "rotulo": html.unescape(rotulo).strip(), "coluna": c})
assert len(adjetivos) == 87, len(adjetivos)
assert all(a["campo"] in pesos for a in adjetivos), [a["campo"] for a in adjetivos if a["campo"] not in pesos]
assert set(pesos) == {a["campo"] for a in adjetivos}
with open(os.path.join(PROJ, "src", "lib", "adjetivos.js"), "w", encoding="utf-8") as f:
    f.write("// GERADO por ferramentas/gerar_dados.py a partir de utils/pagina-1.html (ordem e colunas do formulário original).\n")
    f.write("export const ADJETIVOS = " + json.dumps(adjetivos, ensure_ascii=False, indent=1) + ";\n")
print("dados.js:", len(pesos), "adjetivos com pesos |", len(faixas), "faixas | adjetivos.js:", len(adjetivos), "em", len(colunas), "colunas")
