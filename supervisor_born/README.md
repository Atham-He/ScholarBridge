# supervisor_born

`supervisor_born` is an expansion of `ybq22/supervisor`: instead of only generating a local Claude Code skill, it builds an **authorized mentor twin** that can be deployed onto a platform, chat with students, collect student signals, and generate an interview recommendation report.

This repository ships with two layers:

1. A **workflow engine** for persona building:
   - public information collection (homepage, papers, lab pages, optional URLs)
   - upload parsing (txt/md/pdf/doc/docx/png/jpg/jpeg)
   - evidence chunking and provenance storage
   - persona distillation
   - agent-card export

2. A **runtime layer** for platform usage:
   - chat endpoint
   - student intake
   - fit evaluation
   - session persistence
   - minimal web UI

## What is different from the original `supervisor`

The original project focuses on the pipeline:

`mentor name + affiliation -> public search -> optional uploads -> AI analysis -> JSON profile + Claude Code skill`.

`supervisor_born` keeps that skeleton, but adds:

- authorization metadata
- platform-ready persona bundle
- student chat runtime
- candidate evaluation workflow
- agent-card export
- minimal browser UI and REST API
- mock mode so the project can run without an LLM key

## Directory

```text
supervisor_born/
├── docs/
│   └── supervisor_born_design.md
├── examples/
│   ├── build-request.json
│   └── uploads/
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── scripts/
│   └── smoke.mjs
└── src/
    ├── cli.mjs
    ├── config.mjs
    ├── lib/
    │   └── utils.mjs
    ├── parsers.mjs
    ├── prompts.mjs
    ├── providers/
    │   ├── llm.mjs
    │   └── public.mjs
    ├── retrieval.mjs
    ├── server.mjs
    ├── services.mjs
    ├── storage.mjs
    └── workflows/
        ├── buildPersona.mjs
        ├── chatPersona.mjs
        └── evaluateStudent.mjs
```

## Quick start

### 1) Zero-key smoke test

This runs end-to-end in mock mode and does **not** require network or API keys.

```bash
npm run smoke
```

### 2) Install dependencies and start the platform

```bash
npm install && cp .env.example .env && npm run dev
```

Then open:

```text
http://localhost:3000
```

### 3) Create a persona from the CLI

```bash
node src/cli.mjs build --name "Geoffrey Hinton" --affiliation "University of Toronto" --authorized-by "demo-admin" --public-url "https://www.cs.toronto.edu/~hinton/" --upload "./examples/uploads/mentor_bio.txt" --upload "./examples/uploads/project_brief.md"
```

Each create/build call writes a new persona under a unique slug derived from `name + affiliation + random short hash`, so repeated builds do not overwrite each other. Use the returned `slug` for chat, evaluation, and updates.

### 4) Update an existing persona

```bash
node src/cli.mjs update --slug "geoffrey-hinton-university-of-toronto-a1b2c3d4" --public-url "https://www.cs.toronto.edu/~hinton/" --upload "./examples/uploads/project_brief.md"
```

Update requires an exact existing slug. It keeps old sources, adds new sources, deduplicates by URL/path/id, and re-distills the persona in place.

### 5) Chat with the generated persona

```bash
node src/cli.mjs chat --mentor "geoffrey-hinton-university-of-toronto-a1b2c3d4" --message "我对表征学习很感兴趣，适合加入你的组吗？"
```

### 6) Evaluate a student

```bash
node src/cli.mjs evaluate --mentor "geoffrey-hinton-university-of-toronto-a1b2c3d4" --student-file "./examples/student_profile.json"
```

## LLM providers

The runtime supports three modes:

- `mock` (default): no API key, deterministic heuristic outputs
- `openai`: OpenAI-compatible `/chat/completions`
- `deepseek`: DeepSeek Chat via the OpenAI-compatible `/chat/completions` API
- `anthropic`: Anthropic Messages API

Set `.env` or environment variables:

```bash
LLM_PROVIDER=openai OPENAI_API_KEY=... OPENAI_MODEL=gpt-4o-mini npm run dev
```

DeepSeek text-only mode:

```bash
LLM_PROVIDER=deepseek DEEPSEEK_API_KEY=... npm run dev
```

or:

```bash
LLM_PROVIDER=anthropic ANTHROPIC_API_KEY=... ANTHROPIC_MODEL=claude-3-7-sonnet-latest npm run dev
```

Public search defaults to `WEB_SEARCH_PROVIDER=multi`, which tries Bing and Google first, then combines search results with institution homepage probes and OpenAlex. DuckDuckGo is still available with `WEB_SEARCH_PROVIDER=duckduckgo` or `all`, but it is no longer in the default path. For production-grade search, set `BING_SEARCH_API_KEY` or `GOOGLE_SEARCH_API_KEY` + `GOOGLE_SEARCH_CX`; otherwise the runtime falls back to best-effort HTML parsing, which can differ from browser results because of anti-bot and localization behavior.
Google Scholar profile discovery is also best-effort: the workflow first tries the official Google Scholar author search and then falls back to search-result and third-party-index hints when Scholar blocks scripted requests.

## Data model

Each persona is stored under:

```text
data/personas/<slug>/
├── agent-card.md
├── chunks.json
├── input.json
├── persona.json
├── sources.json
├── uploads/
├── sessions/
└── evaluations/
```

## Supported uploads

- `.txt`, `.text`, `.md`
- `.pdf`
- `.docx`
- `.doc`
- `.png`, `.jpg`, `.jpeg`

Image understanding works when an LLM provider with vision support is configured. In mock mode, image uploads are accepted and recorded, but only metadata-level placeholder summaries are generated.
DeepSeek is configured as text-only by default, so image uploads are recorded with a conservative placeholder rather than sent to the model.

## Production notes

This MVP intentionally keeps the scoring logic transparent. It should **assist** mentor screening, not replace a mentor’s final decision.

The recommended next production steps are:

- approval UI for mentor edits before publishing
- stronger provenance and versioning
- institution SSO and role-based access
- more reliable public search provider
- embedding-based retrieval instead of lexical ranking
- policy layer for admissions / hiring language
