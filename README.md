# Gêmeo Digital de Cultura — Lumina (Hackathon)

Um "gêmeo digital" da cultura da empresa: histórias curtas sobre colaboradores viram **tags positivas de cultura** com evidências (citações verbatim) e **scores probabilísticos transparentes**. Um **agente com ferramentas** responde o que a gestão não consegue ver.

> Mapa de forças, não sistema de nota: só tags positivas; ausência de evidência = baixa confiança, nunca "perfil fraco". Autoria das histórias é anônima nos perfis.

## Rodar

```bash
npm install
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env.local   # necessária p/ chat, submit ao vivo e re-extração
npm run dev                                         # http://localhost:3000
```

O dashboard, times e perfis funcionam **offline** (dados sintéticos commitados em `data/`). A chave só é usada nas duas chamadas ao vivo: o agente de chat e a extração de uma história nova.

## Scripts

```bash
npx tsx scripts/build-data.ts       # regenera data/*.json a partir de data/gen/ + personas
npx tsx scripts/assert-scoring.ts   # valida que as narrativas plantadas emergem dos dados
npx tsx --env-file=.env.local scripts/extract-all.ts  # re-extrai todas as tags com o pipeline real (API)
```

## Como funciona

- **Score**: força = (evidência ponderada + 1) / (peso total de histórias + 3) — média posterior Beta(1,2). Pesos por fonte: gestão 1.5, colega 1.0, auto-relato 0.5. Cada score mostra os "recibos": quais histórias, de quais fontes, com quais citações.
- **Taxonomia fixa** (18 tags) ancorada em Lencioni (5 disfunções invertidas), Edmondson (segurança psicológica), Belbin (papéis de time) — `lib/taxonomy.ts`.
- **Janela de Johari**: divergência entre como a pessoa se vê (self) e como os outros a veem (pares+gestão) → pontos cegos e gaps de autopercepção.
- **Agente** (`/chat`): Claude com 7 ferramentas de consulta auditáveis (ranquear por tag, perfil de pessoa/time, outliers, lacunas vs. arquétipo, montar time). Cada chip 🔧 na UI é uma consulta real. Modo **Entrevista** = resposta ao cold start: o próprio agente colhe histórias novas.

## Roteiro do demo (3 min)

1. **Dashboard** (20s): cultura como evidência; outliers na lateral.
2. **Perfil** (40s): `/people/rafael-siqueira` — radar vs. time e o painel Johari (ele se acha "conflito saudável"; os pares veem "diplomacia").
3. **Agente** (70s): "Monte um time de 5 pessoas onde todos sejam ótimos em evitar conflitos" → chips de ferramentas + roster com evidências; depois "Que perfil falta na Engenharia para um ambiente de startup?" (lacuna plantada: foco no cliente e inovação).
4. **Ao vivo** (40s): `/submit` — conte uma história sobre alguém e veja a tag nascer no perfil (card destacado).
5. **Fecho** (10s): ética (só forças, tudo auditável) + cold start via agente entrevistador.

## Narrativas plantadas nos dados sintéticos

- **Outlier**: Helena Fontes (Vendas) — mentora num time de meta e ritmo.
- **Lacuna**: Engenharia sem `customer_focus`/`creative_innovation` vs. arquétipo startup.
- **Divergência**: Rafael Siqueira (PM) — self diz `healthy_conflict`, pares veem `diplomacy`.
- **Diplomatas**: 6 pessoas cross-time fortes em `diplomacy` para a query de montar time.
