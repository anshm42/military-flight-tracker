// Client for the adsb.lol v2 API (https://api.adsb.lol). Data is ODbL licensed.

const GLOBAL_URL = "https://api.adsb.lol/v2/lat/0/lon/0/dist/25000";
const TIMEOUT_MS = 30_000;

/** Subset of the readsb aircraft fields this app uses. */
export interface AdsbAircraft {
  hex: string;
  flight?: string;
  r?: string;
  t?: string;
  dbFlags?: number;
  lat?: number;
  lon?: number;
  alt_baro?: number | "ground";
  gs?: number;
  track?: number;
  squawk?: string;
  seen_pos?: number;
}

export interface AdsbSnapshot {
  /** Server time of the snapshot, epoch ms. */
  now: number;
  ac: AdsbAircraft[];
}

export class HttpError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`adsb.lol responded ${status}`);
    this.status = status;
  }
}

/** Fetches every aircraft adsb.lol currently tracks worldwide. */
export async function fetchGlobal(): Promise<AdsbSnapshot> {
  const res = await fetch(GLOBAL_URL, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "user-agent": "military-flight-tracker (+https://github.com/anshm42/military-flight-tracker)" },
  });
  if (!res.ok) throw new HttpError(res.status);
  const body = (await res.json()) as Partial<AdsbSnapshot>;
  if (typeof body.now !== "number" || !Array.isArray(body.ac)) {
    throw new Error("adsb.lol response missing now/ac");
  }
  return { now: body.now, ac: body.ac };
}
