import type { AdsbAircraft } from "./adsb.ts";
import { matchStateCallsign } from "./govRules.ts";

export type Category = "mil" | "gov" | "ladd";
export const CATEGORIES: readonly Category[] = ["mil", "gov", "ladd"];

// adsb.lol dbFlags bits.
const FLAG_MILITARY = 1;
const FLAG_LADD = 8;

export interface GovInfo {
  operator: string;
  owner: string;
  reason: string;
}

/** Government aircraft from the aircraft database, keyed by lowercase ICAO hex. */
export type GovIndex = Map<string, GovInfo>;

export interface Classification {
  categories: Category[];
  /** Why the aircraft counts as government, when it does. */
  govReason?: string;
  operator?: string;
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
  return { categories, govReason, operator: gov ? gov.operator || gov.owner || undefined : undefined };
}
