// Entry point: polls adsb.lol, keeps live state and history, serves the API and frontend.

import { existsSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { HttpError, fetchGlobal } from "./adsb.ts";
import { loadGovIndex } from "./aircraftDb.ts";
import { toSightings, type GovIndex } from "./classify.ts";
import { createHandler } from "./api.ts";
import { History } from "./history.ts";
import { LiveState } from "./live.ts";

const PORT = Number(process.env.PORT ?? 3000);
const DATA_DIR = "data";
const DIST_DIR = "dist";
const POLL_MS = 20_000;
const MAX_BACKOFF_MS = 5 * 60_000;
const RETENTION_MS = 30 * 24 * 3600 * 1000;

mkdirSync(DATA_DIR, { recursive: true });
const live = new LiveState();
const history = new History(join(DATA_DIR, "tracker.sqlite"));

// Polling starts once the government index is ready, so early sightings aren't misclassified.
// If it cannot load, government aircraft are still caught by callsign.
let govIndex: GovIndex = new Map();

let pollTimer: NodeJS.Timeout;
async function poll(delay = POLL_MS): Promise<void> {
  let next = POLL_MS;
  try {
    const snapshot = await fetchGlobal();
    const sightings = toSightings(snapshot, govIndex);
    live.update(sightings, snapshot.now);
    history.record(sightings);
  } catch (err) {
    next = Math.min(Math.max(delay, POLL_MS) * 2, MAX_BACKOFF_MS);
    const why = err instanceof HttpError ? `HTTP ${err.status}` : String(err);
    console.warn(`poll failed (${why}), retrying in ${next / 1000}s`);
  }
  pollTimer = setTimeout(() => poll(next), next);
}
loadGovIndex(DATA_DIR)
  .then(
    (index) => {
      govIndex = index;
      console.log(`government index loaded: ${index.size} aircraft`);
    },
    (err) => console.error(`government index unavailable, using callsign rules only: ${err}`),
  )
  .then(() => poll());

const pruneTimer = setInterval(() => history.prune(Date.now() - RETENTION_MS), 3600_000);

const server = createServer(createHandler({ live, history, staticDir: existsSync(DIST_DIR) ? DIST_DIR : null }));
server.listen(PORT, () => console.log(`listening on http://localhost:${PORT}`));

function shutdown(): void {
  clearTimeout(pollTimer);
  clearInterval(pruneTimer);
  server.close();
  history.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
