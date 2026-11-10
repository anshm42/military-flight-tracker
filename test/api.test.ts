import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createHandler } from "../server/api.ts";
import type { Sighting } from "../server/classify.ts";
import { History } from "../server/history.ts";
import { LiveState } from "../server/live.ts";

const now = Date.now();
const sighting: Sighting = {
  hex: "ae1234", ts: now, lat: 1, lon: 2, alt: 1000, onGround: false, categories: ["mil"], callsign: "RCH1",
};

let server: Server;
let base: string;

before(async () => {
  const live = new LiveState();
  const history = new History(":memory:");
  live.update([sighting], now);
  history.record([sighting]);
  server = createServer(createHandler({ live, history, staticDir: null }));
  await new Promise<void>((r) => server.listen(0, r));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const get = async (path: string) => {
  const res = await fetch(base + path);
  return { status: res.status, body: await res.json() };
};

test("live filters by category", async () => {
  assert.equal((await get("/api/live")).body.aircraft.length, 1);
  assert.equal((await get("/api/live?cat=gov,ladd")).body.aircraft.length, 0);
});

test("aircraft detail, track and history", async () => {
  const detail = await get("/api/aircraft/AE1234");
  assert.equal(detail.status, 200);
  assert.equal(detail.body.aircraft.callsign, "RCH1");
  assert.equal(detail.body.live.hex, "ae1234");
  assert.equal((await get("/api/aircraft/ae1234/track")).body.positions.length, 1);
  assert.equal((await get("/api/history?cat=mil")).body.aircraft.length, 1);
});

test("rejects invalid input", async () => {
  for (const path of [
    "/api/live?cat=civil",
    "/api/aircraft/12345",
    "/api/aircraft/ae1234/track?from=yesterday",
    "/api/history?from=2000&to=1000",
    "/api/history?from=0&to=999999999999",
  ]) {
    assert.equal((await get(path)).status, 400, path);
  }
  assert.equal((await get("/api/aircraft/abcdef")).status, 404);
  assert.equal((await get("/elsewhere")).status, 404);
});
