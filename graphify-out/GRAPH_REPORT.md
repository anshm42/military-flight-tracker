# Graph Report - military-flight-tracker  (2026-11-10)

## Corpus Check
- Corpus is ~3,325 words - fits in a single context window. You may not need a graph.

## Summary
- 133 nodes · 185 edges · 8 communities
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.84)
- Token cost: 68,002 input · 0 output

## Community Hubs (Navigation)
- Tracker Spec & API
- Agent Workflow Docs
- Classifier & Tests
- Package Dependencies
- TypeScript Config
- NPM Scripts
- Government Detection
- adsb.lol Client

## God Nodes (most connected - your core abstractions)
1. `Military/Government/LADD Flight Tracker Spec` - 18 edges
2. `compilerOptions` - 12 edges
3. `Agent skills configuration` - 12 edges
4. `Triage label mapping` - 8 edges
5. `History store (SQLite data/tracker.sqlite)` - 8 edges
6. `scripts` - 7 edges
7. `GitHub Issues tracker (gh CLI)` - 6 edges
8. `Classifier` - 6 edges
9. `HTTP API` - 6 edges
10. `normalize()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Agent skills configuration` --references--> `Single-context repo layout`  [EXTRACTED]
  CLAUDE.md → docs/agents/domain.md
- `Agent skills configuration` --references--> `needs-info`  [EXTRACTED]
  CLAUDE.md → docs/agents/triage-labels.md
- `Agent skills configuration` --references--> `needs-triage`  [EXTRACTED]
  CLAUDE.md → docs/agents/triage-labels.md
- `Agent skills configuration` --references--> `ready-for-human`  [EXTRACTED]
  CLAUDE.md → docs/agents/triage-labels.md
- `Agent skills configuration` --references--> `wontfix`  [EXTRACTED]
  CLAUDE.md → docs/agents/triage-labels.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Poll-classify-store pipeline** — spec_polling, spec_adsb_lol, spec_classification, spec_live_state, spec_history_store [INFERRED 0.85]
- **Government detection mechanism** — spec_government_category, spec_government_index, spec_opensky_aircraft_database, spec_govrules, spec_state_operator_prefixes, spec_exclusion_keywords [EXTRACTED 1.00]
- **Five canonical triage roles** — docs_agents_triage_labels_needs_triage, docs_agents_triage_labels_needs_info, docs_agents_triage_labels_ready_for_agent, docs_agents_triage_labels_ready_for_human, docs_agents_triage_labels_wontfix [EXTRACTED 1.00]

## Communities (8 total, 0 thin omitted)

### Community 0 - "Tracker Spec & API"
Cohesion: 0.13
Nodes (28): Acceptance criteria, adsb.lol API, aircraft table, GET /api/aircraft/:hex, GET /api/aircraft/:hex/track, GET /api/history, GET /api/live, Classifier (+20 more)

### Community 1 - "Agent Workflow Docs"
Cohesion: 0.12
Nodes (25): Agent skills configuration, Graphify usage (query graphify-out, /graphify --update), military-flight-tracker project, Architecture Decision Records (docs/adr/), Domain Docs consumption guide, /domain-modeling skill, GLOSSARY.md, GLOSSARY-MAP.md (multi-context) (+17 more)

### Community 2 - "Classifier & Tests"
Cohesion: 0.12
Nodes (17): CATEGORIES, Category, Classification, classify(), GovIndex, GovInfo, EXCLUDE_KEYWORDS, EXCLUDE_RE (+9 more)

### Community 3 - "Package Dependencies"
Cohesion: 0.09
Nodes (20): dependencies, csv-parse, leaflet, devDependencies, @types/leaflet, @types/node, typescript, vite (+12 more)

### Community 4 - "TypeScript Config"
Cohesion: 0.14
Nodes (13): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleResolution, noEmit, skipLibCheck (+5 more)

### Community 5 - "NPM Scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, dev:web, start, test, typecheck

### Community 6 - "Government Detection"
Cohesion: 0.43
Nodes (7): Exclusion keywords, Government category (gov), Government index, server/govRules.ts curated lists, Known limits (heuristic gov detection, ADS-B coverage), OpenSky aircraft database CSV, State operator ICAO codes / callsign prefixes

### Community 7 - "adsb.lol Client"
Cohesion: 0.40
Nodes (4): AdsbAircraft, AdsbSnapshot, fetchGlobal(), HttpError

## Knowledge Gaps
- **12 isolated node(s):** `csv-parse`, `leaflet`, `@types/leaflet`, `@types/node`, `typescript` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 59 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Military/Government/LADD Flight Tracker Spec` connect `Tracker Spec & API` to `Agent Workflow Docs`, `Government Detection`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Triage label mapping` (e.g. with `PRs as triage surface (disabled)` and `GitHub Issues tracker (gh CLI)`) actually correct?**
  _`Triage label mapping` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `csv-parse`, `leaflet`, `@types/leaflet` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tracker Spec & API` be split into smaller, more focused modules?**
  _Cohesion score 0.13227513227513227 - nodes in this community are weakly interconnected._
- **Why does `military-flight-tracker project` connect `Agent Workflow Docs` to `Tracker Spec & API`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Should `Agent Workflow Docs` be split into smaller, more focused modules?**
  _Cohesion score 0.12307692307692308 - nodes in this community are weakly interconnected._
- **Should `Classifier & Tests` be split into smaller, more focused modules?**
  _Cohesion score 0.1225296442687747 - nodes in this community are weakly interconnected._