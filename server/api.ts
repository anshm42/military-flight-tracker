// HTTP routes: JSON API under /api, plus the built frontend.

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { CATEGORIES, type Category } from "./classify.ts";
import type { History } from "./history.ts";
import type { LiveState } from "./live.ts";

const DAY_MS = 24 * 3600 * 1000;
const MAX_WINDOW_MS = 7 * DAY_MS;
const MAX_TRACK_POINTS = 7 * 24 * 60; // a full window at one point per minute
const MAX_HISTORY_AIRCRAFT = 2000;

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
};

export interface ApiDeps {
  live: LiveState;
  history: History;
  /** Directory of the built frontend; null to serve the API only. */
  staticDir: string | null;
}

class BadRequest extends Error {}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

function parseCategories(raw: string | null): Category[] {
  if (raw === null || raw === "") return [...CATEGORIES];
  const cats = raw.split(",");
  for (const c of cats) {
    if (!CATEGORIES.includes(c as Category)) throw new BadRequest(`unknown category "${c}"`);
  }
  return cats as Category[];
}

function parseTime(raw: string | null, name: string): number | null {
  if (raw === null || raw === "") return null;
  const ms = /^\d+$/.test(raw) ? Number(raw) : Date.parse(raw);
  if (!Number.isFinite(ms)) throw new BadRequest(`invalid ${name}: expected epoch ms or ISO 8601`);
  return ms;
}

/** Reads ?from&to, defaulting to the last 24 hours. */
function parseWindow(params: URLSearchParams): { from: number; to: number } {
  const to = parseTime(params.get("to"), "to") ?? Date.now();
  const from = parseTime(params.get("from"), "from") ?? to - DAY_MS;
  if (from >= to) throw new BadRequest("from must be before to");
  if (to - from > MAX_WINDOW_MS) throw new BadRequest("window must be 7 days or less");
  return { from, to };
}

function parseHex(raw: string): string {
  const hex = decodeURIComponent(raw).toLowerCase();
  if (!/^~?[0-9a-f]{6}$/.test(hex)) throw new BadRequest("invalid hex");
  return hex;
}

function routeApi(path: string, params: URLSearchParams, { live, history }: ApiDeps, res: ServerResponse): void {
  if (path === "/api/live") {
    const categories = parseCategories(params.get("cat"));
    return sendJson(res, 200, { updated: live.lastUpdate, aircraft: live.list(categories) });
  }
  if (path === "/api/history") {
    const { from, to } = parseWindow(params);
    const categories = parseCategories(params.get("cat"));
    return sendJson(res, 200, { from, to, aircraft: history.seen(from, to, categories, MAX_HISTORY_AIRCRAFT) });
  }
  const m = /^\/api\/aircraft\/([^/]+)(\/track)?$/.exec(path);
  if (m) {
    const hex = parseHex(m[1]);
    if (m[2]) {
      const { from, to } = parseWindow(params);
      return sendJson(res, 200, { hex, from, to, positions: history.track(hex, from, to, MAX_TRACK_POINTS) });
    }
    const record = history.aircraft(hex);
    const current = live.get(hex);
    if (!record && !current) return sendJson(res, 404, { error: "aircraft not found" });
    return sendJson(res, 200, { aircraft: record, live: current });
  }
  sendJson(res, 404, { error: "not found" });
}

async function serveStatic(staticDir: string, path: string, res: ServerResponse): Promise<void> {
  const root = resolve(staticDir);
  let file = resolve(join(root, decodeURIComponent(path)));
  if (file !== root && !file.startsWith(root + sep)) return sendJson(res, 404, { error: "not found" });
  const info = await stat(file).catch(() => null);
  if (!info || info.isDirectory()) file = join(root, "index.html"); // single-page app fallback
  res.writeHead(200, { "content-type": CONTENT_TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).on("error", () => res.destroy()).pipe(res);
}

export function createHandler(deps: ApiDeps) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") return sendJson(res, 405, { error: "method not allowed" });
      const url = new URL(req.url ?? "/", "http://localhost");
      if (url.pathname.startsWith("/api/")) return routeApi(url.pathname, url.searchParams, deps, res);
      if (deps.staticDir) return await serveStatic(deps.staticDir, url.pathname, res);
      sendJson(res, 404, { error: "not found" });
    } catch (err) {
      if (err instanceof BadRequest || err instanceof URIError) return sendJson(res, 400, { error: err.message });
      console.error(err);
      if (!res.headersSent) sendJson(res, 500, { error: "internal error" });
    }
  };
}
