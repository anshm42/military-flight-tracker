import { test } from "node:test";
import assert from "node:assert/strict";
import type { Sighting } from "../server/classify.ts";
import { LiveState } from "../server/live.ts";

const MIN = 60_000;
const s = (hex: string, ts: number, extra: Partial<Sighting> = {}): Sighting => ({
  hex, ts, lat: ts / MIN, lon: 0, alt: 1000, onGround: false, categories: ["mil"], ...extra,
});

test("builds trails without duplicate points", () => {
  const live = new LiveState();
  live.update([s("a", 0)], 0);
  live.update([s("a", MIN)], MIN);
  live.update([s("a", MIN)], MIN + 20_000); // same position report again
  const [ac] = live.list(["mil"]);
  assert.deepEqual(ac.trail.map((p) => p.ts), [0, MIN]);
});

test("drops trail points older than 30 minutes", () => {
  const live = new LiveState();
  live.update([s("a", 0)], 0);
  live.update([s("a", 31 * MIN)], 31 * MIN);
  assert.deepEqual(live.list(["mil"])[0].trail.map((p) => p.ts), [31 * MIN]);
});

test("expires aircraft unseen for over 2 minutes", () => {
  const live = new LiveState();
  live.update([s("a", 0), s("b", 0)], 0);
  live.update([s("b", 3 * MIN)], 3 * MIN);
  assert.deepEqual(live.list(["mil"]).map((a) => a.hex), ["b"]);
});

test("filters by category", () => {
  const live = new LiveState();
  live.update([s("a", 0), s("b", 0, { categories: ["gov", "ladd"] })], 0);
  assert.deepEqual(live.list(["ladd"]).map((a) => a.hex), ["b"]);
  assert.equal(live.list(["mil", "gov"]).length, 2);
});
