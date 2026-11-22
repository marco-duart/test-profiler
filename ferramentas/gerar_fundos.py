#!/usr/bin/env python3
"""Gera as camadas ESTÁTICAS dos gráficos em src/assets/graficos/ a partir das imagens originais de referência.

Fontes (em utils/referencia-visual/): 9 imagens dos testes T70-T77 + HAR, e 69 imagens extraídas dos PDFs dos testes
T01-T69. Para cada pixel vale a cor MAIS FREQUENTE entre todas: as partes que mudam de um gráfico para outro
(linhas, marcadores, polígono) são minoria em cada posição e somem; o que é fixo (grade, títulos, rótulos, as 13 regiões
da Área de Talento, moldura, nomes dos eixos do radar) fica idêntico ao original.

Saídas:
  pisolado.png, lideranca.png, lidersint.png, pprof.png  fundos completos
  teia_base.png   radar: moldura, título e nomes dos eixos (miolo branco; os anéis e a escala mudam, são desenhados no canvas)
  teia_raios.png  radar: os 21 raios pretos (RGBA)

Uso (a partir de utils/pagina-profiler/):  ../../.venv/bin/python ferramentas/gerar_fundos.py
"""
import collections
import glob
import os

import numpy as np
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(AQUI)
REF = os.path.join(os.path.dirname(PROJ), "referencia-visual")
SAIDA = os.path.join(PROJ, "src", "assets", "graficos")
os.makedirs(SAIDA, exist_ok=True)

CX, CY, RAIO_DISCO = 360, 330, 211           # centro do radar e raio que contém tudo o que é dinâmico
CAIXA_ESCALA = (365, 112, 391, 312)          # x0, y0, x1, y1: onde ficam os números da escala (20…100), desenhados no canvas
FILL, RED = (211, 167, 168), (255, 0, 0)


def carregar(grafico):
    arqs = sorted(glob.glob(os.path.join(REF, f"*_{grafico}.png")) + glob.glob(os.path.join(REF, "pdfs", f"*_{grafico}.png")))
    return np.stack([np.array(Image.open(f).convert("RGB")) for f in arqs])


def modo(A, ignorar=()):
    """Cor mais frequente por pixel. 'ignorar': cores que nunca devem ser escolhidas (se houver alternativa)."""
    n, h, w, _ = A.shape
    chave = (A[..., 0].astype(np.uint32) << 16) | (A[..., 1].astype(np.uint32) << 8) | A[..., 2]
    proibidas = {(r << 16) | (g << 8) | b for r, g, b in ignorar}
    saida = np.zeros((h, w), np.uint32)
    fracao = np.zeros((h, w))
    for y in range(h):
        for x in range(w):
            c = collections.Counter(int(v) for v in chave[:, y, x])
            ok = [(v, k) for k, v in c.most_common() if k not in proibidas]
            k, v = (ok[0][1], ok[0][0]) if ok else (0xFFFFFF, 0)
            saida[y, x] = k
            fracao[y, x] = v / n
    img = np.stack([(saida >> 16) & 255, (saida >> 8) & 255, saida & 255], -1).astype(np.uint8)
    return img, fracao


for g in ("pisolado", "lideranca", "lidersint", "pprof"):
    A = carregar(g)
    img, frac = modo(A)
    Image.fromarray(img).save(os.path.join(SAIDA, f"{g}.png"))
    print(f"{g}: {A.shape[0]} imagens | pixels com menos de 60% de concordância: {int((frac < 0.60).sum())} | 100% iguais: {100 * (frac == 1).mean():.1f}%")

# ---------------------------------------------------------------- radar
A = carregar("teia")
limpo, frac = modo(A, ignorar=(FILL, RED))         # tira o preenchimento e o contorno vermelho do polígono
h, w, _ = limpo.shape
yy, xx = np.mgrid[0:h, 0:w]
disco = np.hypot(xx - CX, yy - CY) <= RAIO_DISCO
x0, y0, x1, y1 = CAIXA_ESCALA
escala = np.zeros((h, w), bool)
escala[y0:y1, x0:x1] = True
# raios: pixels pretos do disco que estão sobre a reta ideal de algum dos 21 raios (isso descarta os números da escala)
import math
sobre_raio = np.zeros((h, w), bool)
for i in range(21):
    ang = math.radians(90 + i * 360 / 21)
    dx_, dy_ = math.cos(ang), -math.sin(ang)
    vx, vy = xx - CX, yy - CY
    ao_longo = vx * dx_ + vy * dy_
    perp = np.abs(vx * dy_ - vy * dx_)
    sobre_raio |= (ao_longo >= -1) & (ao_longo <= 212) & (perp <= 1.7)
preto = np.all(limpo == (0, 0, 0), -1) & disco & sobre_raio
base = limpo.copy()
base[disco] = 255                                  # miolo branco (anéis, raios e escala são colocados por cima)
base[escala] = 255
Image.fromarray(base).save(os.path.join(SAIDA, "teia_base.png"))
raios = np.zeros((h, w, 4), np.uint8)
raios[preto, 3] = 255
Image.fromarray(raios).save(os.path.join(SAIDA, "teia_raios.png"))
print(f"teia: {A.shape[0]} imagens | pixels dos raios: {int(preto.sum())} | pixels sem concordância fora do disco: {int(((frac < 0.60) & ~disco).sum())}")

# ---------------------------------------------------------------- números da escala do radar (por escala usada)
# Cada escala (100/20, 80/10, 70/10) tem seus números; saem das imagens originais daquela escala, só dos pixels em tons
# de cinza (texto sobre branco) ou na cor do preenchimento (texto sobre o polígono), desmisturados em uma camada preta
# com transparência: assim o número aparece certo sobre qualquer fundo.
def n_aneis(img):
    navy = np.all(img == (0, 0, 128), -1)
    ys = [y for y in range(100, 330) if navy[y, 358:363].any()]
    grupos = []
    for y in ys:
        if not grupos or y - grupos[-1][-1] > 1:
            grupos.append([y])
        else:
            grupos[-1].append(y)
    return len(grupos)


ESCALAS = {5: (100, 20), 8: (80, 10), 7: (70, 10)}
por_escala = collections.defaultdict(list)
for img in A:
    por_escala[n_aneis(img)].append(img)
for aneis, imgs in sorted(por_escala.items()):
    if aneis not in ESCALAS:
        print(f"  aviso: escala com {aneis} anéis ignorada ({len(imgs)} imagens)")
        continue
    maximo, passo = ESCALAS[aneis]
    camada = np.zeros((h, w, 4), np.uint8)
    for k in range(1, aneis + 1):
        yk = CY - round(210 * k * passo / maximo)
        for y in range(yk - 6, yk + 7):
            for x in range(369, 392):
                alfas = []
                for im in imgs:
                    r_, g_, b_ = (int(v) for v in im[y, x])
                    if r_ == g_ == b_:                                   # texto sobre fundo branco
                        alfas.append(1 - r_ / 255)
                    elif abs(r_ / 211 - g_ / 167) < 0.02 and abs(g_ / 167 - b_ / 168) < 0.02:   # texto sobre o preenchimento
                        alfas.append(1 - r_ / 211)
                if not alfas:
                    continue
                a = float(np.median(alfas))
                camada[y, x] = (0, 0, 0, int(round(255 * min(1.0, max(0.0, a)))))
    Image.fromarray(camada).save(os.path.join(SAIDA, f"teia_escala_{maximo}.png"))
    print(f"teia_escala_{maximo}.png: {len(imgs)} imagens, {aneis} números")
