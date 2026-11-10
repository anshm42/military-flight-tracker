// Builds the government aircraft index from the OpenSky Network aircraft database.

import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { parse } from "csv-parse";
import type { GovIndex } from "./classify.ts";
import { matchGovRecord } from "./govRules.ts";

const DB_URL = "https://s3.opensky-network.org/data-samples/metadata/aircraft-database-complete-2025-08.csv";
const FILE_NAME = "aircraft-db.csv";
const MAX_AGE_MS = 30 * 24 * 3600 * 1000;

// Some fields keep their quotes after relaxed parsing ('Bay County Sheriff''s Dept').
const clean = (s: string | undefined) => (s ?? "").trim().replace(/^'(.*)'$/, "$1").replaceAll("''", "'");

/** Parses the OpenSky CSV (single-quoted, camelCase headers), keeping only government aircraft. */
export async function buildGovIndex(csv: Readable): Promise<GovIndex> {
  const index: GovIndex = new Map();
  const parser = csv.pipe(
    parse({ columns: true, quote: "'", relax_quotes: true, relax_column_count: true, skip_records_with_error: true }),
  );
  for await (const row of parser as AsyncIterable<Record<string, string | undefined>>) {
    const hex = row.icao24?.trim().toLowerCase();
    if (!hex) continue;
    const operator = clean(row.operator);
    const owner = clean(row.owner);
    const reason = matchGovRecord({ operator, owner, operatorIcao: row.operatorIcao ?? "" });
    if (reason) index.set(hex, { operator, owner, country: clean(row.country), reason });
  }
  return index;
}

/** Downloads the database into dataDir when missing or older than 30 days, then indexes it. */
export async function loadGovIndex(dataDir: string): Promise<GovIndex> {
  const file = join(dataDir, FILE_NAME);
  const age = await stat(file).then((s) => Date.now() - s.mtimeMs, () => Infinity);
  if (age > MAX_AGE_MS) {
    try {
      await download(DB_URL, file);
    } catch (err) {
      // A stale copy is still far better than none.
      if (age === Infinity) throw err;
      console.warn(`aircraft db refresh failed, using cached copy: ${err}`);
    }
  }
  return buildGovIndex(createReadStream(file));
}

async function download(url: string, dest: string): Promise<void> {
  await mkdir(join(dest, ".."), { recursive: true });
  console.log(`downloading aircraft database from ${url}`);
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`aircraft db download failed: ${res.status}`);
  const tmp = `${dest}.part`;
  try {
    await pipeline(res.body, createWriteStream(tmp));
    await rename(tmp, dest);
  } catch (err) {
    await unlink(tmp).catch(() => {});
    throw err;
  }
}
