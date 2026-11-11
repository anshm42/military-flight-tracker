# Military / Government / LADD Flight Tracker — Spec

## Goal

A web map showing, worldwide, aircraft that are:

- **Military** — any country.
- **Government** — non-military state aircraft of any country (heads of state, ministries, police, coast guard, border/customs, etc.).
- **LADD** — aircraft on the FAA Limiting Aircraft Data Displayed list (hidden by commercial trackers such as FlightAware and Flightradar24).

The tracker has two modes:

- **Live** — current positions with short trails.
- **History** — what was seen in a time window, and the stored track of any aircraft, replayable.

## Data sources

### adsb.lol (positions, military and LADD flags)

Unfiltered community ADS-B aggregator. Free, no API key (rate limits are dynamic). Data is ODbL licensed; attribution is required.

- `GET https://api.adsb.lol/v2/lat/0/lon/0/dist/25000` returns every aircraft currently tracked worldwide (~10k aircraft, ~5 MB uncompressed, gzip on the wire).
- Fields used per aircraft: `hex`, `flight` (callsign), `r` (registration), `t` (ICAO type), `dbFlags`, `lat`, `lon`, `alt_baro`, `gs`, `track`, `squawk`, `seen_pos`.
- `dbFlags` bit `1` = military, bit `8` = LADD. (Bit `4` = PIA; not tracked.)
- Responses carry no owner/operator information.

### OpenSky aircraft database (government detection)

Global aircraft metadata CSV:
`https://s3.opensky-network.org/data-samples/metadata/aircraft-database-complete-2025-08.csv`
(fallback: `metadata/aircraftDatabase.csv`). ~100 MB.

Columns used: `icao24`, `registration`, `typecode`, `operator`, `operatorcallsign`, `operatoricao`, `owner`.

Downloaded once into `data/`, re-downloaded when older than 30 days.

## Polling

- One global adsb.lol request every 10 s.
- adsb.lol rate-limits per request, not per byte (measured Nov 2026: burst of ~9, then ~8 requests/min per IP). Splitting into `/v2/mil` + `/v2/ladd` + hex lookups costs 3+ requests per refresh, so a single global request is the fastest option.
- Request timeout; on 429 / 5xx / network error, exponential backoff (cap 5 min), then resume normal interval after a success.
- Only aircraft with a position (`lat`/`lon`) and at least one category are kept.

## Classification

An aircraft can belong to several categories.

| Category | Rule |
| --- | --- |
| `mil` | `dbFlags & 1` |
| `ladd` | `dbFlags & 8` |
| `gov` | hex is in the government index, **or** the callsign starts with a curated state-operator prefix |

### Government index

Built at startup by stream-parsing the OpenSky CSV and keeping only rows where:

- `operatoricao` is in the curated list of state operator ICAO codes, **or**
- `operator` or `owner` matches a curated keyword (multilingual: government, ministry, police, coast guard, border, customs, gobierno, policía, regierung, bundespolizei, gendarmerie, ministère, guardia costiera, …),
- **and** no exclusion keyword matches (to cut obvious false positives).

Each kept row stores `{ operator, owner, reason }`, where `reason` explains which rule matched. Only matches are held in memory.

### Curated lists

Kept in one source file (`server/govRules.ts`), easy to edit:

- Keywords and exclusion keywords.
- State operator ICAO codes / callsign prefixes, e.g. `SAM`, `EXEC` (US), `GAF`, `GAM` (DE), `CFC` (CA), `RRR`, `KRF` (UK), `CTM`, `FAF` (FR), `IAM` (IT), `ASY` (AU).

## Live state

- In memory, keyed by hex.
- Each entry: latest position, categories, reason, registration, type, callsign, and a trail of the last 30 minutes.
- Entries unseen for 120 s are removed.

## History

SQLite file `data/tracker.sqlite`, via Node's built-in `node:sqlite`.

```sql
aircraft(
  hex TEXT PRIMARY KEY,
  reg TEXT, type TEXT, callsign TEXT,
  categories TEXT,       -- comma-separated: mil,gov,ladd
  gov_reason TEXT, operator TEXT, country TEXT,
  first_seen INTEGER,    -- epoch ms
  last_seen INTEGER,
  last_pos_ts INTEGER    -- ts of last stored position
)
positions(
  hex TEXT, ts INTEGER, lat REAL, lon REAL, alt INTEGER, gs REAL, track REAL
)
-- indexes: positions(hex, ts), positions(ts), aircraft(last_seen)
```

- Each poll writes in one transaction: upsert `aircraft`, insert `positions`.
- At most one stored position per aircraft per minute (tracked via `aircraft.last_pos_ts`, so it survives restarts). Keeps write volume low, including for a future Cloudflare Workers/D1 port.
- Rows older than 30 days are pruned hourly.

## HTTP API

All responses are JSON. Invalid input → `400` with `{ "error": "..." }`.

| Endpoint | Returns |
| --- | --- |
| `GET /api/live?cat=mil,gov,ladd` | Current aircraft (filtered by category; default all) with trails, plus last poll time |
| `GET /api/aircraft/:hex` | Stored info, first/last seen, categories, government reason |
| `GET /api/aircraft/:hex/track?from&to` | Stored positions in the window, time-ordered |
| `GET /api/history?from&to&cat` | Aircraft seen in the window |

Validation:

- `hex`: 6 hex characters (case-insensitive; `~`-prefixed non-ICAO addresses allowed).
- `from` / `to`: epoch ms or ISO 8601; `from < to`; window at most 7 days.
- `cat`: subset of `mil`, `gov`, `ladd`.
- Row limits on track and history responses.

## Web UI

Leaflet map with OpenStreetMap tiles.

- Plane icons rotated by track and colored by category (mil / gov / ladd).
- Category filter toggles; search by hex, registration or callsign.
- Sidebar list of visible aircraft; clicking an aircraft (list or map) opens a details panel: registration, type, callsign, altitude, speed, categories, government reason/operator.
- **Live mode**: refresh from `/api/live` every 5 s; draw trails.
- **History mode**: pick a date range → list from `/api/history`; select an aircraft → draw its stored track with a time slider to replay it.
- Attribution: adsb.lol (ODbL), OpenSky Network, OpenStreetMap.

## Stack

- Node 24 + TypeScript, run directly by Node's built-in type stripping (no build step for the server); `tsc` for type checking only.
- Server: `node:http`, `node:sqlite`, `csv-parse`.
- Frontend: Vite + Leaflet.
- Tests: `node:test`.
- Single process: poller, classifier, live state, history, API, and static frontend serving.

## Acceptance criteria

1. `npm test` passes: classifier (military, LADD, government via database, government via callsign, civil dropped, exclusions), CSV index building, history (upsert, dedupe, prune, window query).
2. After the first poll, `/api/live` returns non-zero counts for `mil`, `ladd` and `gov`, and government includes non-US aircraft.
3. `positions` grows across polls; after a server restart, `/api/history` still returns earlier aircraft.
4. In the browser: markers render, filters toggle, details panel opens, history track replays.

## Non-goals

- Cloudflare Workers hosting (planned later; current target is a single Node process).

- PIA aircraft, user accounts, alerts/notifications.
- Own ADS-B receiver input.
- Owner lookup beyond the OpenSky database.

## Known limits

- Government detection is heuristic: OpenSky operator/owner data is incomplete, so expect false positives and negatives. Tune via `server/govRules.ts`.
- LADD flags rely on adsb.lol's copy of the FAA list (US aircraft only, by design of LADD).
- Coverage is limited to adsb.lol's feeder network; many military aircraft do not transmit ADS-B.
