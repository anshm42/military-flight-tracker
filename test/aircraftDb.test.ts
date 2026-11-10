import { test } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { buildGovIndex } from "../server/aircraftDb.ts";

// Same shape as the OpenSky "complete" export: single quotes, camelCase headers, bare fields.
const CSV = `'icao24','country','operator','operatorIcao','owner','registration'
'3C4B2A','Germany','Bundespolizei','','','D-HVBA'
'48416A',Netherlands,'','NAF','',T-235
'A12345','United States','','','Smith''s Flying Club Police Dept',N123
'A00001','United States','United Airlines','UAL','',N1UA
'',,'Ministry of Nothing','','',X
'E80A1B','Chile','','','Ministerio del Interior y Seguridad Pública',CC-ABC
`;

test("indexes only government rows, keyed by lowercase hex", async () => {
  const index = await buildGovIndex(Readable.from([CSV]));
  assert.deepEqual([...index.keys()].sort(), ["3c4b2a", "48416a", "e80a1b"]);
  assert.equal(index.get("3c4b2a")?.country, "Germany");
  assert.match(index.get("48416a")!.reason, /NAF/);
  assert.match(index.get("e80a1b")!.reason, /ministerio/);
});
