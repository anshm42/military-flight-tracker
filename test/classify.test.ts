import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, toSightings, type GovIndex } from "../server/classify.ts";
import { matchGovRecord, matchStateCallsign } from "../server/govRules.ts";

const empty: GovIndex = new Map();

test("military flag", () => {
  assert.deepEqual(classify({ hex: "ae1234", dbFlags: 1 }, empty)?.categories, ["mil"]);
});

test("LADD flag", () => {
  assert.deepEqual(classify({ hex: "a00001", dbFlags: 8 }, empty)?.categories, ["ladd"]);
});

test("military and LADD together", () => {
  assert.deepEqual(classify({ hex: "a00001", dbFlags: 9 }, empty)?.categories, ["mil", "ladd"]);
});

test("government via database index, case-insensitive hex", () => {
  const index: GovIndex = new Map([["3c4b2a", { operator: "Bundespolizei", owner: "", country: "Germany", reason: "r" }]]);
  const c = classify({ hex: "3C4B2A" }, index);
  assert.deepEqual(c?.categories, ["gov"]);
  assert.equal(c?.govReason, "r");
  assert.equal(c?.operator, "Bundespolizei");
  assert.equal(c?.country, "Germany");
});

test("government via state callsign", () => {
  const c = classify({ hex: "ae0001", flight: "SAM44   " }, empty);
  assert.deepEqual(c?.categories, ["gov"]);
  assert.match(c!.govReason!, /SAM/);
});

test("civil aircraft dropped", () => {
  assert.equal(classify({ hex: "a12345", flight: "UAL123", dbFlags: 0 }, empty), null);
  assert.equal(classify({ hex: "a12345" }, empty), null);
});

test("callsign prefixes", () => {
  assert.match(matchStateCallsign("EXEC1F")!, /EXEC/);
  assert.match(matchStateCallsign("GAF681")!, /German Air Force/);
  assert.equal(matchStateCallsign("SAMSON"), null);
  assert.equal(matchStateCallsign("DLH400"), null);
});

const rec = (operator: string, owner = "", operatorIcao = "") => ({ operator, owner, operatorIcao });

test("database record keywords, multilingual and accent-insensitive", () => {
  assert.ok(matchGovRecord(rec("Ministère de l'Intérieur")));
  assert.ok(matchGovRecord(rec("", "Policía Nacional")));
  assert.ok(matchGovRecord(rec("U.S. Customs and Border Protection")));
  assert.ok(matchGovRecord(rec("", "", "qaf")));
});

test("database record exclusions and non-matches", () => {
  assert.equal(matchGovRecord(rec("Lufthansa")), null);
  assert.equal(matchGovRecord(rec("", "State of the Art Aviation LLC")), null);
  assert.equal(matchGovRecord(rec("Police Credit Union")), null);
  assert.equal(matchGovRecord(rec("Minneapolis Flyers")), null);
});

test("toSightings keeps tracked aircraft with positions and normalizes fields", () => {
  const sightings = toSightings(
    {
      now: 1_000_000,
      ac: [
        { hex: "AE1234", dbFlags: 1, flight: "RCH123  ", lat: 1, lon: 2, alt_baro: 30000, seen_pos: 2.5 },
        { hex: "ae9999", dbFlags: 1 }, // no position
        { hex: "a11111", lat: 1, lon: 2 }, // civil
        { hex: "a00001", dbFlags: 8, flight: "00000000", lat: 3, lon: 4, alt_baro: "ground" },
      ],
    },
    empty,
  );
  assert.equal(sightings.length, 2);
  assert.deepEqual(
    { hex: sightings[0].hex, ts: sightings[0].ts, callsign: sightings[0].callsign, alt: sightings[0].alt },
    { hex: "ae1234", ts: 997_500, callsign: "RCH123", alt: 30000 },
  );
  assert.equal(sightings[1].onGround, true);
  assert.equal(sightings[1].alt, null);
  assert.equal(sightings[1].callsign, undefined);
  assert.equal(toSightings({ now: 0, ac: [{ hex: "a1", dbFlags: 1, flight: "@@@@@@@@", lat: 0, lon: 0 }] }, empty)[0].callsign, undefined);
});
