// Persistent history of tracked aircraft and their positions (SQLite via node:sqlite).

import { DatabaseSync } from "node:sqlite";
import { CATEGORIES, type Category, type Sighting } from "./classify.ts";

/** Minimum gap between stored positions of one aircraft. */
const POSITION_INTERVAL_MS = 60_000;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS aircraft (
  hex TEXT PRIMARY KEY,
  reg TEXT, type TEXT, callsign TEXT,
  categories TEXT NOT NULL,
  gov_reason TEXT, operator TEXT, country TEXT,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  last_pos_ts INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS positions (
  hex TEXT NOT NULL, ts INTEGER NOT NULL,
  lat REAL NOT NULL, lon REAL NOT NULL, alt INTEGER, gs REAL, track REAL
);
CREATE INDEX IF NOT EXISTS positions_hex_ts ON positions (hex, ts);
CREATE INDEX IF NOT EXISTS positions_ts ON positions (ts);
CREATE INDEX IF NOT EXISTS aircraft_last_seen ON aircraft (last_seen);
`;

export interface AircraftRecord {
  hex: string;
  reg: string | null;
  type: string | null;
  callsign: string | null;
  categories: Category[];
  govReason: string | null;
  operator: string | null;
  country: string | null;
  firstSeen: number;
  lastSeen: number;
}

export interface SeenAircraft extends AircraftRecord {
  /** Stored positions inside the queried window. */
  points: number;
  windowFirst: number;
  windowLast: number;
}

export interface Position {
  ts: number;
  lat: number;
  lon: number;
  alt: number | null;
  gs: number | null;
  track: number | null;
}

type Row = Record<string, string | number | null>;

const toRecord = (r: Row): AircraftRecord => ({
  hex: r.hex as string,
  reg: r.reg as string | null,
  type: r.type as string | null,
  callsign: r.callsign as string | null,
  categories: (r.categories as string).split(",") as Category[],
  govReason: r.gov_reason as string | null,
  operator: r.operator as string | null,
  country: r.country as string | null,
  firstSeen: r.first_seen as number,
  lastSeen: r.last_seen as number,
});

export class History {
  private readonly db: DatabaseSync;

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;");
    this.db.exec(SCHEMA);
  }

  /** Stores one poll's sightings in a single transaction. */
  record(sightings: Sighting[]): void {
    const lastPos = this.db.prepare("SELECT last_pos_ts FROM aircraft WHERE hex = ?");
    const upsert = this.db.prepare(`
      INSERT INTO aircraft (hex, reg, type, callsign, categories, gov_reason, operator, country, first_seen, last_seen, last_pos_ts)
      VALUES (:hex, :reg, :type, :callsign, :categories, :gov_reason, :operator, :country, :ts, :ts, :last_pos_ts)
      ON CONFLICT (hex) DO UPDATE SET
        reg = coalesce(excluded.reg, reg), type = coalesce(excluded.type, type),
        callsign = coalesce(excluded.callsign, callsign), categories = excluded.categories,
        gov_reason = excluded.gov_reason, operator = excluded.operator, country = excluded.country,
        last_seen = max(last_seen, excluded.last_seen), last_pos_ts = excluded.last_pos_ts`);
    const insertPos = this.db.prepare(
      "INSERT INTO positions (hex, ts, lat, lon, alt, gs, track) VALUES (?, ?, ?, ?, ?, ?, ?)",
    );

    this.db.exec("BEGIN");
    try {
      for (const s of sightings) {
        const prev = lastPos.get(s.hex)?.last_pos_ts as number | undefined;
        const storePos = prev === undefined || s.ts - prev >= POSITION_INTERVAL_MS;
        if (storePos) insertPos.run(s.hex, s.ts, s.lat, s.lon, s.alt, s.gs ?? null, s.track ?? null);
        upsert.run({
          hex: s.hex,
          reg: s.reg ?? null,
          type: s.type ?? null,
          callsign: s.callsign ?? null,
          categories: s.categories.join(","),
          gov_reason: s.govReason ?? null,
          operator: s.operator ?? null,
          country: s.country ?? null,
          ts: s.ts,
          last_pos_ts: storePos ? s.ts : prev!,
        });
      }
      this.db.exec("COMMIT");
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }

  /** Deletes positions, and aircraft not seen, before `before` (epoch ms). */
  prune(before: number): void {
    this.db.prepare("DELETE FROM positions WHERE ts < ?").run(before);
    this.db.prepare("DELETE FROM aircraft WHERE last_seen < ?").run(before);
  }

  aircraft(hex: string): AircraftRecord | null {
    const row = this.db.prepare("SELECT * FROM aircraft WHERE hex = ?").get(hex) as Row | undefined;
    return row ? toRecord(row) : null;
  }

  /** Stored positions of one aircraft in [from, to], oldest first. */
  track(hex: string, from: number, to: number, limit: number): Position[] {
    return this.db
      .prepare("SELECT ts, lat, lon, alt, gs, track FROM positions WHERE hex = ? AND ts BETWEEN ? AND ? ORDER BY ts LIMIT ?")
      .all(hex, from, to, limit) as unknown as Position[];
  }

  /** Aircraft with stored positions in [from, to] belonging to any of `categories`, most recent first. */
  seen(from: number, to: number, categories: readonly Category[], limit: number): SeenAircraft[] {
    // Only members of the fixed category set are inlined, so this cannot inject SQL.
    const catFilter = CATEGORIES.filter((c) => categories.includes(c)).map((c) => `instr(',' || a.categories || ',', ',${c},') > 0`).join(" OR ");
    const rows = this.db
      .prepare(`
        SELECT a.*, count(*) AS points, min(p.ts) AS window_first, max(p.ts) AS window_last
        FROM positions p JOIN aircraft a ON a.hex = p.hex
        WHERE p.ts BETWEEN ? AND ? AND (${catFilter || "0"})
        GROUP BY p.hex ORDER BY window_last DESC LIMIT ?`)
      .all(from, to, limit) as Row[];
    return rows.map((r) => ({
      ...toRecord(r),
      points: r.points as number,
      windowFirst: r.window_first as number,
      windowLast: r.window_last as number,
    }));
  }

  close(): void {
    this.db.close();
  }
}
