import type { Category, Sighting } from "./classify.ts";

const TRAIL_MS = 30 * 60 * 1000;
const EXPIRE_MS = 120 * 1000;

export interface TrailPoint {
  ts: number;
  lat: number;
  lon: number;
  alt: number | null;
}

export interface LiveAircraft extends Sighting {
  /** Positions over the last 30 minutes, oldest first, ending at the current position. */
  trail: TrailPoint[];
}

/** Aircraft currently visible, with short trails. */
export class LiveState {
  private readonly aircraft = new Map<string, LiveAircraft>();
  lastUpdate = 0;

  /** Applies one poll's sightings; `now` is the snapshot time (epoch ms). */
  update(sightings: Sighting[], now: number): void {
    for (const s of sightings) {
      const prev = this.aircraft.get(s.hex);
      const trail = prev?.trail ?? [];
      const last = trail.at(-1);
      if (!last || last.ts < s.ts) trail.push({ ts: s.ts, lat: s.lat, lon: s.lon, alt: s.alt });
      while (trail.length && trail[0].ts < now - TRAIL_MS) trail.shift();
      this.aircraft.set(s.hex, { ...s, trail });
    }
    for (const [hex, ac] of this.aircraft) {
      if (ac.ts < now - EXPIRE_MS) this.aircraft.delete(hex);
    }
    this.lastUpdate = now;
  }

  /** Aircraft in any of the given categories. */
  list(categories: readonly Category[]): LiveAircraft[] {
    return [...this.aircraft.values()].filter((ac) => ac.categories.some((c) => categories.includes(c)));
  }
}
