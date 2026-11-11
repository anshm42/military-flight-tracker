import type { AdsbAircraft, AdsbSnapshot } from "./adsb.ts";
import { matchStateCallsign } from "./govRules.ts";

export type Category = "mil" | "gov" | "ladd";
export const CATEGORIES: readonly Category[] = ["mil", "gov", "ladd"];

// adsb.lol dbFlags bits.
const FLAG_MILITARY = 1;
const FLAG_LADD = 8;

export interface GovInfo {
  operator: string;
  owner: string;
  country: string;
  reason: string;
}

/** Government aircraft from the aircraft database, keyed by lowercase ICAO hex. */
export type GovIndex = Map<string, GovInfo>;

export interface Classification {
  categories: Category[];
  /** Why the aircraft counts as government, when it does. */
  govReason?: string;
  operator?: string;
  country?: string;
}

/** Returns the tracked categories an aircraft belongs to, or null if it is not tracked. */
export function classify(ac: AdsbAircraft, govIndex: GovIndex): Classification | null {
  const flags = ac.dbFlags ?? 0;
  const categories: Category[] = [];
  if (flags & FLAG_MILITARY) categories.push("mil");

  const gov = govIndex.get(ac.hex.toLowerCase());
  const govReason = gov?.reason ?? (ac.flight ? matchStateCallsign(ac.flight) : null) ?? undefined;
  if (govReason) categories.push("gov");

  if (flags & FLAG_LADD) categories.push("ladd");
  if (categories.length === 0) return null;
  return {
    categories,
    govReason,
    operator: gov ? gov.operator || gov.owner || undefined : undefined,
    country: gov?.country || undefined,
  };
}

/** One observation of a tracked aircraft: position plus classification. */
export interface Sighting extends Classification {
  hex: string;
  /** Time of the position, epoch ms. */
  ts: number;
  callsign?: string;
  reg?: string;
  type?: string;
  lat: number;
  lon: number;
  /** Barometric altitude in feet; null when unknown or on the ground. */
  alt: number | null;
  onGround: boolean;
  gs?: number;
  track?: number;
  squawk?: string;
}

/** Classifies a snapshot, keeping tracked aircraft that have a position. */
export function toSightings(snapshot: AdsbSnapshot, govIndex: GovIndex): Sighting[] {
  const out: Sighting[] = [];
  for (const ac of snapshot.ac) {
    if (typeof ac.lat !== "number" || typeof ac.lon !== "number") continue;
    const cls = classify(ac, govIndex);
    if (!cls) continue;
    out.push({
      ...cls,
      hex: ac.hex.toLowerCase(),
      ts: Math.round(snapshot.now - (ac.seen_pos ?? 0) * 1000),
      // Some transponders broadcast placeholder callsigns like "00000000" or "@@@@@@@@".
      callsign: ac.flight?.trim().replace(/^[0@]+$/, "") || undefined,
      reg: ac.r || undefined,
      type: ac.t || undefined,
      lat: ac.lat,
      lon: ac.lon,
      alt: typeof ac.alt_baro === "number" ? ac.alt_baro : null,
      onGround: ac.alt_baro === "ground",
      gs: ac.gs,
      track: ac.track,
      squawk: ac.squawk,
    });
  }
  return out;
}
