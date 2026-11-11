// Curated rules for spotting government (state, non-commercial) aircraft worldwide.
// Heuristic by nature: edit these lists to tune false positives / negatives.

/**
 * ICAO operator designators (also used as callsign prefixes) of state operators.
 * Military operators are mostly caught by adsb.lol's military flag already; they are
 * listed here so aircraft missing that flag are still picked up.
 */
export const STATE_OPERATORS: Record<string, string> = {
  // United States
  SAM: "US Air Force Special Air Mission",
  EXEC: "US executive transport",
  PAT: "US Army Priority Air Transport",
  RCH: "US Air Mobility Command",
  CNV: "US Navy",
  NASA: "NASA",
  // Canada
  CFC: "Canadian Forces",
  // Europe
  RRR: "UK Royal Air Force",
  GAF: "German Air Force",
  GAM: "German Army",
  CTM: "French Air Force (COTAM)",
  FAF: "French Air Force",
  IAM: "Italian Air Force",
  BAF: "Belgian Air Force",
  NAF: "Netherlands Air Force",
  SUI: "Swiss Air Force",
  PLF: "Polish Air Force",
  // Middle East
  QAF: "Qatar Amiri Flight",
  AUH: "Abu Dhabi Presidential Flight",
  DUB: "Dubai Air Wing",
  ORF: "Oman Royal Flight",
  BAH: "Bahrain Amiri Flight",
  KAF: "Kuwait Air Force",
  RSF: "Royal Saudi Air Force",
  // Oceania
  ASY: "Royal Australian Air Force",
};

/** Phrases in an operator/owner name that indicate a government body. Matched on whole words, accents stripped. */
export const GOV_KEYWORDS: string[] = [
  // generic
  "government", "govt", "gobierno", "gouvernement", "governo", "regierung", "bundesregierung",
  "ministry", "ministerio", "ministere", "ministero", "ministerium", "bundesministerium", "ministerstvo",
  "presidential", "presidencia", "presidency", "royal flight", "amiri flight", "air wing",
  "republic of", "kingdom of", "state of", "commonwealth of", "county of", "city of",
  "united states", "u s department", "department of",
  // law enforcement
  "police", "polizei", "policia", "polizia", "politie", "polis", "gendarmerie", "guardia civil",
  "carabinieri", "guardia di finanza", "bundespolizei", "sheriff", "highway patrol", "state patrol",
  // borders & coasts
  "coast guard", "coastguard", "guardia costiera", "kustwacht", "border", "customs", "douane",
  "aduana", "zoll", "homeland security",
  // agencies
  "federal aviation administration", "nasa", "noaa", "federal bureau", "department of justice",
];

/** Phrases that veto a keyword match (common false positives). */
export const EXCLUDE_KEYWORDS: string[] = [
  "credit union", "flight school", "flying club", "museum", "republic airways", "state of the art",
  // Companies: government bodies don't register this way, but churches ("... Ministry Inc"),
  // car shops ("... Customs Llc") and firms ("United States Steel Corp") would otherwise match.
  "inc", "llc", "ltd", "corp", "corporation",
];

const normalize = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const phraseRegex = (phrases: string[]) =>
  new RegExp(`\\b(${phrases.map(normalize).join("|")})\\b`);

// OpenSky appends the registry country to some names ("United Airlines - Inc. - United States Of America",
// "Korean Air Lines Co. Ltd. - Korea - Republic Of"); that suffix says nothing about the operator.
const COUNTRY_SUFFIX = /\s+-\s+(united states of america|[^-]+\s+-\s+republic of)\s*$/i;

const GOV_RE = phraseRegex(GOV_KEYWORDS);
const EXCLUDE_RE = phraseRegex(EXCLUDE_KEYWORDS);

export interface OperatorRecord {
  operator: string;
  owner: string;
  operatorIcao: string;
}

/** Returns why a database record is a government aircraft, or null if it is not. */
export function matchGovRecord(rec: OperatorRecord): string | null {
  const icao = rec.operatorIcao.trim().toUpperCase();
  if (STATE_OPERATORS[icao]) return `operator ${icao}: ${STATE_OPERATORS[icao]}`;
  for (const [field, value] of [["operator", rec.operator], ["owner", rec.owner]] as const) {
    const text = normalize(value.replace(COUNTRY_SUFFIX, ""));
    if (!text || EXCLUDE_RE.test(text)) continue;
    const hit = GOV_RE.exec(text);
    if (hit) return `${field} "${value.trim()}" matches "${hit[1]}"`;
  }
  return null;
}

/** Returns why a callsign belongs to a state operator (e.g. SAM123, EXEC1F), or null. */
export function matchStateCallsign(callsign: string): string | null {
  const m = /^([A-Z]{3,4})\d/.exec(callsign.trim().toUpperCase());
  if (!m) return null;
  // Prefer the 4-letter code (EXEC, NASA) before falling back to the 3-letter one.
  for (const code of [m[1], m[1].slice(0, 3)]) {
    if (STATE_OPERATORS[code]) return `callsign ${code}: ${STATE_OPERATORS[code]}`;
  }
  return null;
}
