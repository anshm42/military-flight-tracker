import { test } from "node:test";
import assert from "node:assert/strict";
import type { Sighting } from "../server/classify.ts";
import { History } from "../server/history.ts";

const MIN = 60_000;
const s = (hex: string, ts: number, extra: Partial<Sighting> = {}): Sighting => ({
  hex, ts, lat: 10, lon: 20, alt: 5000, onGround: false, categories: ["mil"], ...extra,
});

test("stores at most one position per aircraft per minute", () => {
  const h = new History(":memory:");
  h.record([s("a", 0)]);
  h.record([s("a", 20_000)]);
  h.record([s("a", 40_000)]);
  h.record([s("a", MIN)]);
  assert.deepEqual(h.track("a", 0, 10 * MIN, 100).map((p) => p.ts), [0, MIN]);
});

test("upserts aircraft, keeping known fields and first_seen", () => {
  const h = new History(":memory:");
  h.record([s("a", 0, { reg: "N1", callsign: "SAM1", categories: ["gov"], govReason: "callsign SAM" })]);
  h.record([s("a", 5 * MIN, { categories: ["gov", "ladd"] })]);
  const a = h.aircraft("a")!;
  assert.equal(a.reg, "N1");
  assert.equal(a.callsign, "SAM1");
  assert.deepEqual(a.categories, ["gov", "ladd"]);
  assert.equal(a.firstSeen, 0);
  assert.equal(a.lastSeen, 5 * MIN);
  assert.equal(h.aircraft("zzz"), null);
});

test("seen() returns aircraft in window filtered by category", () => {
  const h = new History(":memory:");
  h.record([s("m", 0), s("l", 0, { categories: ["ladd"] })]);
  h.record([s("m", 10 * MIN), s("l", 10 * MIN, { categories: ["ladd"] })]);
  h.record([s("g", 30 * MIN, { categories: ["gov"] })]);

  const inWindow = h.seen(0, 20 * MIN, ["mil", "gov", "ladd"], 100);
  assert.deepEqual(inWindow.map((a) => a.hex).sort(), ["l", "m"]);
  assert.equal(inWindow.find((a) => a.hex === "m")!.points, 2);

  assert.deepEqual(h.seen(0, 60 * MIN, ["gov"], 100).map((a) => a.hex), ["g"]);
  assert.deepEqual(h.seen(0, 60 * MIN, [], 100), []);
});

test("prune removes old positions and stale aircraft", () => {
  const h = new History(":memory:");
  h.record([s("old", 0), s("new", 0)]);
  h.record([s("new", 100 * MIN)]);
  h.prune(50 * MIN);
  assert.equal(h.aircraft("old"), null);
  assert.deepEqual(h.track("new", 0, 200 * MIN, 100).map((p) => p.ts), [100 * MIN]);
});

test("persists across reopen", (t) => {
  const path = `${process.env.TMPDIR ?? "/tmp"}/mft-history-${process.pid}.sqlite`;
  t.after(async () => {
    const { rm } = await import("node:fs/promises");
    for (const f of [path, `${path}-wal`, `${path}-shm`]) await rm(f, { force: true });
  });
  const h1 = new History(path);
  h1.record([s("a", 0)]);
  h1.close();
  const h2 = new History(path);
  assert.equal(h2.seen(0, MIN, ["mil"], 10).length, 1);
  h2.close();
});
