import { test } from "node:test";
import assert from "node:assert/strict";
import { countryOfHex, originOfHex } from "../server/icao.ts";

test("country from ICAO address block", () => {
  assert.equal(countryOfHex("ae1234"), "United States");
  assert.equal(countryOfHex("3C4B2A"), "Germany");
  assert.equal(countryOfHex("7cf9c8"), "Australia");
  assert.equal(countryOfHex("155555"), "Russia");
});

test("sub-blocks win over the block containing them", () => {
  assert.equal(countryOfHex("43eaff"), "Guernsey");
  assert.equal(countryOfHex("400801"), "United Kingdom");
  assert.equal(countryOfHex("789001"), "Hong Kong");
  assert.equal(countryOfHex("780001"), "China");
});

test("non-ICAO and unallocated addresses have no country", () => {
  assert.equal(countryOfHex("~ae1234"), null);
  assert.equal(countryOfHex("000001"), null);
});

test("origin groups", () => {
  assert.equal(originOfHex("ae1234"), "us");
  assert.equal(originOfHex("3c4b2a"), "nato"); // Germany
  assert.equal(originOfHex("43c123"), "nato"); // United Kingdom
  assert.equal(originOfHex("7cf9c8"), "other"); // Australia
  assert.equal(originOfHex("~000001"), "other");
});
