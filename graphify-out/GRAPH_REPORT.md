# Graph Report - military-flight-tracker  (2026-11-10)

## Corpus Check
- 25 files · ~10,255 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 1, .css 1)

## Summary
- 270 nodes · 496 edges · 8 communities (7 shown, 1 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `90861861`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Military / Government / LADD Flight Tracker
- api.ts
- index.ts
- package.json
- Agent skills configuration
- main.ts
- compilerOptions

## God Nodes (most connected - your core abstractions)
1. `Military / Government / LADD Flight Tracker` - 17 edges
2. `History` - 13 edges
3. `compilerOptions` - 12 edges
4. `Agent skills configuration` - 12 edges
5. `Sighting` - 10 edges
6. `renderLive()` - 10 edges
7. `renderDetail()` - 10 edges
8. `select()` - 10 edges
9. `History Store (SQLite)` - 10 edges
10. `Classifier` - 10 edges

## Surprising Connections (you probably didn't know these)
- `ListItem` --references--> `Category`  [EXTRACTED]
  web/main.ts → server/classify.ts
- `Agent skills configuration` --references--> `Single-context repo layout`  [EXTRACTED]
  CLAUDE.md → docs/agents/domain.md
- `Agent skills configuration` --references--> `needs-info`  [EXTRACTED]
  CLAUDE.md → docs/agents/triage-labels.md
- `Agent skills configuration` --references--> `needs-triage`  [EXTRACTED]
  CLAUDE.md → docs/agents/triage-labels.md
- `Agent skills configuration` --references--> `ready-for-human`  [EXTRACTED]
  CLAUDE.md → docs/agents/triage-labels.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Five canonical triage roles** — docs_agents_triage_labels_needs_triage, docs_agents_triage_labels_needs_info, docs_agents_triage_labels_ready_for_agent, docs_agents_triage_labels_ready_for_human, docs_agents_triage_labels_wontfix [EXTRACTED 1.00]
- **Government Aircraft Detection** — spec_government_index, spec_opensky_aircraft_database, server_govrules, spec_callsign_prefix_rule, spec_exclusion_keywords [EXTRACTED 1.00]
- **History Track Replay Flow** — spec_history_mode, spec_api_history, spec_api_aircraft_track, spec_positions_table, spec_track_replay_slider [INFERRED 0.85]
- **Poll-Classify-Store Ingestion Pipeline** — spec_poller, spec_classifier, spec_live_state, spec_history_store [INFERRED 0.85]

## Communities (8 total, 1 thin omitted)

### Community 0 - "Military / Government / LADD Flight Tracker"
Cohesion: 0.07
Nodes (36): Acceptance Criteria, adsb.lol, aircraft Table, GET /api/aircraft/:hex, GET /api/aircraft/:hex/track, GET /api/history, GET /api/live, Cloudflare Workers / D1 (+28 more)

### Community 1 - "api.ts"
Cohesion: 0.08
Nodes (27): ApiDeps, BadRequest, CONTENT_TYPES, createHandler(), parseCategories(), parseHex(), parseTime(), parseWindow() (+19 more)

### Community 2 - "index.ts"
Cohesion: 0.07
Nodes (30): AdsbAircraft, AdsbSnapshot, fetchGlobal(), HttpError, buildGovIndex(), clean(), download(), loadGovIndex() (+22 more)

### Community 3 - "package.json"
Cohesion: 0.07
Nodes (27): dependencies, csv-parse, leaflet, devDependencies, @types/leaflet, @types/node, typescript, vite (+19 more)

### Community 4 - "Agent skills configuration"
Cohesion: 0.12
Nodes (25): Agent skills configuration, Graphify usage (query graphify-out, /graphify --update), military-flight-tracker project, Architecture Decision Records (docs/adr/), Domain Docs consumption guide, /domain-modeling skill, GLOSSARY.md, GLOSSARY-MAP.md (multi-context) (+17 more)

### Community 5 - "main.ts"
Cohesion: 0.07
Nodes (53): BLOCKS, countryOfHex(), NATO, Origin, originOfHex(), ORIGINS, canvas, CATEGORY_ORDER (+45 more)

### Community 6 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleResolution, noEmit, skipLibCheck (+5 more)

## Knowledge Gaps
- **18 isolated node(s):** `@types/leaflet`, `@types/node`, `typescript`, `FlightAware`, `Flightradar24` (+13 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 109 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Known Limits` connect `Military / Government / LADD Flight Tracker` to `index.ts`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **What connects `@types/leaflet`, `@types/node`, `typescript` to the rest of the system?**
  _18 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Military / Government / LADD Flight Tracker` be split into smaller, more focused modules?**
  _Cohesion score 0.07474747474747474 - nodes in this community are weakly interconnected._
- **Why does `csv-parse` connect `package.json` to `index.ts`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08350951374207188 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0693815987933635 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._