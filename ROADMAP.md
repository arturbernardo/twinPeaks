# Roadmap — melhorias de modelagem e features

Estado atual do modelo (referência): evidência extraída de histórias (`data/gen/` + live) → score
bayesiano suavizado `(s + 1) / (n + 3)` em `lib/scoring.ts`, com pesos por fonte
(manager 1.5 / peer 1.0 / self 0.5), tudo rastreável à quote verbatim. Pessoas têm ciclo de vida
(`status`, `previousRoles`, datas) e pertencem a setor + squad (`lib/db.ts`).

## Prioridades

| # | Item | Impacto | Esforço | Status |
|---|------|---------|---------|--------|
| 1 | Grafo social da cultura | Alto (demo forte + insight novo) | M | **feito** (inclui grafo 3D pessoa-a-pessoa, arestas sem direção) |
| 2 | Recência no scoring (decaimento temporal) | Alto (credibilidade dos números) | P–M | planejado |
| 3 | Corroboração por autores distintos | Médio (honestidade do selo) | P | planejado |
| 4 | Evidência ancorada ao time da época | Médio | M | planejado |
| 5 | Janela de Johari completa (4 quadrantes) | Médio | P | planejado |
| 6 | Arquétipos dinâmicos via agente | Médio | P–M | planejado |
| 7 | `compose_team` com diversidade Belbin | Baixo–médio | P | planejado |
| 8 | Proveniência da extração (live) | Baixo | P | planejado |

---

## 1. Grafo social da cultura — PRÓXIMA IMPLEMENTAÇÃO

**Ideia.** Cada história peer/manager é uma aresta `autor → sujeito`: o dataset já contém uma
rede de observação cultural que nunca foi modelada. Ela responde perguntas que nenhum score
individual responde: quem enxerga quem? Há squads que só se auto-observam (câmara de eco)?
Quem são as "pontes culturais" (citadas por vários setores)? Quem está culturalmente invisível
(ninguém escreve sobre a pessoa)?

**Restrição de anonimato (importante).** O produto promete autoria anônima no perfil
(`EvidenceCard` mostra "anonymous colleague"). Um grafo pessoa→pessoa quebraria essa promessa.
Decisão de design: **arestas agregadas por squad/setor; no nível individual, expor apenas
grau de entrada** (quantas pessoas/fontes distintas observam alguém), nunca quem escreveu sobre quem.

**Módulo novo `lib/graph.ts`:**

- `buildCultureGraph()` — deriva de `getStories()` (ignora `self` e `authorId: null`):
  - nós = squads/setores; peso da aresta = nº de histórias entre eles;
  - por pessoa: `inDegree` (autores distintos que a citam) e `observedBy` (squads distintos).
- Métricas:
  - **Câmara de eco**: % de histórias de um squad cujo autor é do próprio squad.
  - **Pontes culturais**: pessoas citadas por ≥N squads diferentes (top-K).
  - **Invisíveis**: pessoas ativas com `inDegree` 0–1 — onde o gêmeo digital está cego.
  - **Reciprocidade** entre setores: A observa B, mas B observa A?

**Ferramenta do agente** (`lib/agent-tools.ts`): `culture_network` retornando as métricas acima;
registrar no system prompt (`app/api/chat/route.ts`) e no `TOOL_LABELS` do
`components/chat/ChatPanel.tsx` ("mapping culture network").

**UI** (`app/network/page.tsx` + link no `app/layout.tsx`):

- Heatmap squad × squad (quem observa quem) — viável sem lib de grafo; recharts já disponível,
  ou SVG próprio.
- Cards: pontes culturais, câmaras de eco, invisíveis.
- Evitar force-layout no hackathon (custo alto, pouco ganho sobre o heatmap).

**Critério de pronto:** agente responde "que squad está numa bolha?" e "quem conecta setores?"
com números auditáveis; página `/network` renderiza com os dados atuais (231 histórias).

---

## 2. Recência no scoring (decaimento temporal)

Hoje `computeScores` ignora `createdAt`: evidência de 11 meses atrás pesa igual à de ontem.

- Peso da evidência × `0.5 ^ (idadeEmMeses / 6)` (meia-vida 6 meses; constante exportada).
- O denominador `n` deve decair igualmente, senão o prior domina perfis antigos.
- Destrava **tendência**: série `strength(t)` avaliada em janelas trimestrais → sparkline por tag
  no perfil (`app/people/[id]`) e no time.
- Cuidado: as datas de `build-data.ts` são determinísticas espalhadas por ~12 meses — bom para
  testar o efeito.

## 3. Corroboração por autores distintos

`confidenceLabel` conta histórias: 4 histórias do mesmo colega viram "strong" igual a 4 autores
diferentes. Mudança pequena em `lib/scoring.ts`:

- Contar `distinctAuthors` por tag (dado já existe: `authorId` via `storyId`).
- "strong" passa a exigir ≥4 histórias **e** ≥2 autores distintos; senão cai para "supported".
- Exibir no tooltip da `StrengthBar` ("3 stories from 2 people").

## 4. Evidência ancorada ao time da época

`teamProfile`/`findOutliers` filtram por membros ativos atuais; a contribuição de quem saiu
desaparece e histórias antigas contam para o time novo da pessoa.

- Resolver o squad/setor da pessoa **na data da história** usando `previousRoles` (períodos
  `from`–`to` já existem).
- Feature derivada: ferramenta `attrition_loss` — "o que o setor perdeu culturalmente com as
  saídas?" (conversa com a seção de ex-integrantes em `app/teams/[id]`).

## 5. Janela de Johari completa

`divergencesFor` só reporta `blind_spot` e `self_gap`. Adicionar:

- **Aberto**: self e outros altos e convergentes (|delta| pequeno, evidência dos dois lados).
- **Desconhecido**: zero evidência de qualquer fonte (tags candidatas a explorar na entrevista).
- `JohariPanel` passa a renderizar os 4 quadrantes — completa o framework que dá nome ao painel.

## 6. Arquétipos dinâmicos via agente

`ARCHETYPES` são fixos em `lib/taxonomy.ts`. Permitir que o agente componha um arquétipo ad-hoc
("time para operação regulada") e rode `gapAnalysis` contra ele:

- `gap_analysis` aceita `customTargets: Partial<Record<TagId, number>>` além de `archetypeId`.
- Opcional: persistir arquétipos criados em `data/live-archetypes.json`.

## 7. `compose_team` com diversidade Belbin

A taxonomia já marca `theory: "Belbin"`. O guloso atual só maximiza cobertura das tags pedidas;
penalizar times onde todos cobrem o mesmo papel Belbin (bônus de diversidade por `theory` no
`gain`) — é literalmente a tese do Belbin.

## 8. Proveniência da extração

Nas histórias live, gravar junto da evidência: modelo usado, versão do prompt e timestamp da
extração (`lib/extraction.ts` → `addLiveStory`). Reforça a auditabilidade que é o coração do
produto e permite re-extração em migrações.
