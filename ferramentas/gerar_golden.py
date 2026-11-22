#!/usr/bin/env python3
"""Gera ferramentas/golden.json: respostas dos 77 testes reais + 300 casos aleatórios, com o resultado do Python.

Uso (a partir de utils/pagina-profiler/):  ../../.venv/bin/python ferramentas/gerar_golden.py
O profiler.js tem que reproduzir TODAS as chaves (npm run verificar).
"""
import csv
import json
import os
import random
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RECEITA = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(AQUI))), "assesment-recipe")
sys.path.insert(0, os.path.join(RECEITA, "scripts"))
os.chdir(RECEITA)
import profiler as P  # noqa: E402

plano = {r["teste"]: r for r in csv.DictReader(open("plano_testes.csv", encoding="utf-8"))}
reais = {"T" + r["arquivo"].split("/t")[-1][:2]: r for r in json.load(open("testes/todos.json", encoding="utf-8"))}
casos = [{"id": t, "p1": plano[t]["parte1_campos"].split(), "p2": plano[t]["parte2_campos"].split(), "tr": reais[t]["TR"]}
         for t in sorted(reais) if t in plano]
rng, campos = random.Random(42), list(P.PESOS)
for i in range(300):
    casos.append({"id": f"R{i}", "p1": rng.sample(campos, rng.randint(5, 60)),
                  "p2": rng.sample(campos, rng.randint(5, 60)), "tr": rng.randint(60, 3600)})
for c in casos:
    c["esperado"] = P.calcular_completo(c["p1"], c["p2"], c["tr"])
json.dump(casos, open(os.path.join(AQUI, "golden.json"), "w", encoding="utf-8"), ensure_ascii=False)
print(len(casos), "casos gravados em ferramentas/golden.json")
