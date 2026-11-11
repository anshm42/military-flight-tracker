# Graph Report - military-flight-tracker  (2026-11-10)

## Corpus Check
- Corpus is ~6,884 words - fits in a single context window. You may not need a graph.

## Summary
- 209 nodes · 359 edges · 7 communities
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.85)
- Token cost: 61,814 input · 0 output

## Community Hubs (Navigation)
- Tracker Spec & API Design
- HTTP API Server
- adsb.lol Client
- Package Dependencies
- Agent Workflow Docs
- Classifier, Live & History
- TypeScript Config

## God Nodes (most connected - your core abstractions)
1. `Military / Government / LADD Flight Tracker` - 17 edges
2. `History` - 13 edges
3. `compilerOptions` - 12 edges
4. `Agent skills configuration` - 12 edges
5. `Sighting` - 10 edges
6. `Classifier` - 10 edges
7. `History Store (SQLite)` - 10 edges
8. `LiveState` - 9 edges
9. `Triage label mapping` - 8 edges
10. `Web UI` - 8 edges

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
- **Five canonical triage roles** — docs_agents_triage_labels_needs_triage, docs_agents_triage_labels_needs_info, docs_agents_triage_labels_ready_for_agent, docs_agents_triage_labels_ready_for_human, docs_agents_triage_labels_wontfix [EXTRACTED 1.00]
- **Government Aircraft Detection** — spec_government_index, spec_opensky_aircraft_database, server_govrules, spec_callsign_prefix_rule, spec_exclusion_keywords [EXTRACTED 1.00]
- **History Track Replay Flow** — spec_history_mode, spec_api_history, spec_api_aircraft_track, spec_positions_table, spec_track_replay_slider [INFERRED 0.85]
- **Poll-Classify-Store Ingestion Pipeline** — spec_poller, spec_classifier, spec_live_state, spec_history_store [INFERRED 0.85]

## Communities (7 total, 0 thin omitted)

### Community 0 - "Tracker Spec & API Design"
Cohesion: 0.07
Nodes (36): Acceptance Criteria, adsb.lol, aircraft Table, GET /api/aircraft/:hex, GET /api/aircraft/:hex/track, GET /api/history, GET /api/live, Cloudflare Workers / D1 (+28 more)

### Community 1 - "HTTP API Server"
Cohesion: 0.09
Nodes (26): ApiDeps, BadRequest, CONTENT_TYPES, createHandler(), parseCategories(), parseHex(), parseTime(), parseWindow() (+18 more)

### Community 2 - "adsb.lol Client"
Cohesion: 0.09
Nodes (25): AdsbAircraft, AdsbSnapshot, fetchGlobal(), HttpError, classify(), GovIndex, GovInfo, toSightings() (+17 more)

### Community 3 - "Package Dependencies"
Cohesion: 0.07
Nodes (27): dependencies, csv-parse, leaflet, devDependencies, @types/leaflet, @types/node, typescript, vite (+19 more)

### Community 4 - "Agent Workflow Docs"
Cohesion: 0.12
Nodes (25): Agent skills configuration, Graphify usage (query graphify-out, /graphify --update), military-flight-tracker project, Architecture Decision Records (docs/adr/), Domain Docs consumption guide, /domain-modeling skill, GLOSSARY.md, GLOSSARY-MAP.md (multi-context) (+17 more)

### Community 5 - "Classifier, Live & History"
Cohesion: 0.18
Nodes (5): buildGovIndex(), clean(), download(), loadGovIndex(), matchGovRecord()

### Community 6 - "TypeScript Config"
Cohesion: 0.14
Nodes (13): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleResolution, noEmit, skipLibCheck (+5 more)

## Knowledge Gaps
- **19 isolated node(s):** `leaflet`, `@types/leaflet`, `@types/node`, `typescript`, `Graphify usage (query graphify-out, /graphify --update)` (+14 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 86 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `csv-parse` connect `Package Dependencies` to `Classifier, Live & History`?**
  _High betweenness centrality (0.182) - this node is a cross-community bridge._
- **What connects `leaflet`, `@types/leaflet`, `@types/node` to the rest of the system?**
  _19 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tracker Spec & API Design` be split into smaller, more focused modules?**
  _Cohesion score 0.07474747474747474 - nodes in this community are weakly interconnected._
- **Why does `Known Limits` connect `Tracker Spec & API Design` to `adsb.lol Client`?**
  _High betweenness centrality (0.163) - this node is a cross-community bridge._
- **Should `HTTP API Server` be split into smaller, more focused modules?**
  _Cohesion score 0.08637873754152824 - nodes in this community are weakly interconnected._
- **Should `adsb.lol Client` be split into smaller, more focused modules?**
  _Cohesion score 0.08907563025210084 - nodes in this community are weakly interconnected._
- **Should `Package Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._