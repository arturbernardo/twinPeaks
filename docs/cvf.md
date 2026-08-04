# Mapa CVF — Competing Values Framework (Cameron & Quinn)

Documentação do card **"Culture map — Competing Values Framework"** da página `/network`:
o que é o framework, como o projeto o calcula e quais são os limites da leitura.

## O framework

O CVF tem origem empírica: Quinn & Rohrbaugh (1983) analisaram estatisticamente os
critérios usados na literatura para julgar "eficácia organizacional" e encontraram dois
eixos de tensão que explicavam quase toda a variação. Cameron & Quinn os transformaram
no framework de diagnóstico de cultura mais difundido (*Diagnosing and Changing
Organizational Culture*, 1999; 3ª ed. 2011), acompanhado do questionário OCAI.

Os dois eixos:

1. **Foco interno ↔ externo** — a organização olha para dentro (integração, pessoas,
   processos) ou para fora (mercado, cliente, diferenciação)?
2. **Flexibilidade ↔ estabilidade** — valoriza autonomia e mudança, ou controle e
   previsibilidade?

Cruzados, formam quatro quadrantes, cada um com um "verbo":

| Quadrante | Posição | Verbo | Cultura em uma frase |
|---|---|---|---|
| **Clan** | interno + flexível | Collaborate | Família: mentoria, participação, coesão, desenvolvimento de pessoas |
| **Adhocracy** | externo + flexível | Create | Inovação: experimentação, risco, pioneirismo |
| **Market** | externo + estável | Compete | Resultado: metas, cliente, competitividade agressiva |
| **Hierarchy** | interno + estável | Control | Processo: eficiência, previsibilidade, conformidade |

Pontos centrais da teoria:

- **Valores concorrentes**: os quadrantes diagonais se tensionam (Clan × Market,
  Adhocracy × Hierarchy). Investir num polo cobra preço no oposto.
- **Não existe cultura "certa"**: eficácia é alinhamento entre cultura e estratégia/
  ambiente — um laboratório de inovação quer Adhocracy; uma operação regulada quer
  Hierarchy.
- **Ciclo de vida**: organizações tipicamente nascem Adhocracy, ganham traços de Clan
  enquanto pequenas e derivam para Hierarchy/Market ao escalar. Ver a posição de cada
  setor no plano é ver essa deriva por área.

## Como o projeto calcula

O instrumento oficial (OCAI) é um questionário de percepção auto-declarada. Aqui a
posição é **derivada de evidência comportamental** — as histórias e as forças que elas
sustentam — o que é coerente com a tese do produto (cultura como evidência, não opinião).

1. **Mapeamento tags → quadrantes**, declarado em `lib/taxonomy.ts` (`CVF_QUADRANTS`),
   auditável como o resto da taxonomia:
   - Clan: `trust_building`, `psych_safety`, `mentorship`, `supportiveness`, `diplomacy`, `facilitation`
   - Adhocracy: `creative_innovation`, `learning_agility`
   - Market: `results_focus`, `customer_focus`, `drive_energy`
   - Hierarchy: `execution_reliability`, `attention_to_detail`, `accountability`
   - **Neutras** (sem encaixe claro, não puxam o ponto): `healthy_conflict`,
     `critical_evaluation`, `ownership`, `calm_under_pressure`
2. **Score por quadrante** (`cvfMap()` em `lib/scoring.ts`): média das forças da pessoa
   nas tags do quadrante, contando **só tags com evidência** (≥1 história); sem
   evidência vale 0 — o prior bayesiano não é sinal.
3. **Coordenadas**:
   - `x = (adhocracy + market − clan − hierarchy) / 2` → foco externo (+) vs. interno (−)
   - `y = (clan + adhocracy − market − hierarchy) / 2` → flexibilidade (+) vs. estabilidade (−)
4. **Agregados**: centróide por setor (anel colorido) e da empresa (✕).

No plot (`components/CVFMap.tsx`), cada pessoa é um **ponto anônimo** — o hover mostra
apenas setor e quadrante dominante, nunca o nome. A posição vem só do perfil público de
tags, então não há vazamento de autoria.

## Como ler (e como não ler)

- **Perto do centro ≠ "sem cultura"**: significa perfil equilibrado **ou pouca
  evidência**. Coerente com a regra do produto: ausência de evidência é baixa
  confiança, nunca nota baixa.
- **Diagonais são as tensões reais**: um setor em Market e outro em Clan vão discordar
  sobre o que é "bom trabalho" — o mapa antecipa esse atrito.
- O cálculo usa **scores absolutos**, não a alocação ipsativa de 100 pontos do OCAI
  oficial; as posições são comparáveis entre si dentro do sistema, mas não são
  "resultados OCAI".
- O mapeamento tags→quadrantes é uma interpretação editorial (documentada acima);
  mudá-lo muda o mapa — por isso vive na taxonomia versionada, não escondido no código
  de visualização.

## Referências

- Cameron, K. S. & Quinn, R. E. *Diagnosing and Changing Organizational Culture:
  Based on the Competing Values Framework*. Jossey-Bass, 3ª ed., 2011.
- Quinn, R. E. & Rohrbaugh, J. "A Spatial Model of Effectiveness Criteria: Towards a
  Competing Values Approach to Organizational Analysis". *Management Science* 29(3), 1983.
