import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import type { Category } from "../server/classify.ts";
import type { AircraftRecord, Position, SeenAircraft } from "../server/history.ts";
import type { LiveAircraft } from "../server/live.ts";

const LIVE_REFRESH_MS = 10_000;
const LIST_LIMIT = 300;
const CATEGORY_ORDER: Category[] = ["mil", "gov", "ladd"];
const COLORS: Record<Category, string> = { mil: "#ff6b3d", gov: "#39dcc0", ladd: "#f2cd4c" };
const LABELS: Record<Category, string> = { mil: "Military", gov: "Government", ladd: "LADD" };
const PLANE_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5l1.6 7.3 7.9 4.3v1.7l-7.9-2.2-.5 5.8 2.7 2v1.3L12 20.6l-3.8 1.1v-1.3l2.7-2-.5-5.8-7.9 2.2v-1.7l7.9-4.3z"/></svg>';

type Mode = "live" | "history";
/** Fields shared by live aircraft and history records, enough for the list. */
interface ListItem {
  hex: string;
  callsign?: string | null;
  reg?: string | null;
  type?: string | null;
  categories: Category[];
  alt?: number | null;
  onGround?: boolean;
  country?: string | null;
  points?: number;
}

const state = {
  mode: "live" as Mode,
  enabled: new Set<Category>(CATEGORY_ORDER),
  search: "",
  selected: null as string | null,
  /** Stored record of the selected aircraft, kept so live refreshes can redraw its details. */
  selectedRecord: null as AircraftRecord | null,
  /** Keep the map centred on the selected aircraft as it moves (live mode). */
  follow: false,
  live: [] as LiveAircraft[],
  liveUpdated: 0,
  history: [] as SeenAircraft[],
  track: [] as Position[],
};

// ---------- DOM ----------

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const listEl = $<HTMLUListElement>("#list");
const statusEl = $("#status");
const detailEl = $("#detail");
const searchEl = $<HTMLInputElement>("#search");
const historyForm = $<HTMLFormElement>("#history-form");
const replayEl = $("#replay");
const scrubEl = $<HTMLInputElement>("#scrub");
const scrubTimeEl = $("#scrub-time");
const playEl = $<HTMLButtonElement>("#play");

const escapeHtml = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const primary = (cats: Category[]) => CATEGORY_ORDER.find((c) => cats.includes(c)) ?? "mil";
const label = (a: ListItem) => a.callsign || a.reg || a.hex.toUpperCase();
const fmtAlt = (alt?: number | null, onGround?: boolean) =>
  onGround ? "GND" : alt == null ? "—" : alt >= 18000 ? `FL${Math.round(alt / 100)}` : `${alt.toLocaleString()} ft`;
const fmtTime = (ms: number) =>
  new Date(ms).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

const matchesSearch = (a: ListItem) =>
  !state.search || [a.hex, a.callsign, a.reg].some((v) => v?.toLowerCase().includes(state.search));
const visible = (a: ListItem) => a.categories.some((c) => state.enabled.has(c)) && matchesSearch(a);

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body as T;
}

// ---------- Map ----------

const map = L.map("map", { zoomControl: false, worldCopyJump: true, minZoom: 2 }).setView([35, 0], 3);
// Standard OSM tiles, darkened in CSS (.basemap) to fit the console theme.
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  className: "basemap",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);
map.attributionControl.addAttribution(
  'Positions <a href="https://adsb.lol">adsb.lol</a> (ODbL) · Aircraft data <a href="https://opensky-network.org">OpenSky Network</a>',
);
L.control.zoom({ position: "bottomright" }).addTo(map);

map.on("dragstart", () => state.follow && setFollow(false));

const canvas = L.canvas({ padding: 0.5 });
const trailLayer = L.layerGroup().addTo(map);
const planeLayer = L.layerGroup().addTo(map);
const markers = new Map<string, L.Marker>();

function planeIcon(cats: Category[], track: number | undefined, selected: boolean): L.DivIcon {
  return L.divIcon({
    className: `plane ${primary(cats)}${selected ? " selected" : ""}`,
    html: `<div style="transform: rotate(${track ?? 0}deg)">${PLANE_SVG}</div>`,
    iconSize: selected ? [26, 26] : [20, 20],
  });
}

function placeMarker(hex: string, latlng: L.LatLngExpression, cats: Category[], name: string, track?: number): void {
  const icon = planeIcon(cats, track, hex === state.selected);
  const existing = markers.get(hex);
  if (existing) {
    existing.setLatLng(latlng).setIcon(icon).setTooltipContent(escapeHtml(name));
    return;
  }
  const m = L.marker(latlng, { icon, keyboard: false })
    .bindTooltip(escapeHtml(name), { direction: "top", offset: [0, -12], className: "plane-tip" })
    .on("click", () => select(hex));
  markers.set(hex, m.addTo(planeLayer));
}

function clearMap(): void {
  planeLayer.clearLayers();
  trailLayer.clearLayers();
  markers.clear();
}

// ---------- Rendering ----------

function renderCounts(items: ListItem[]): void {
  for (const c of CATEGORY_ORDER) {
    const n = items.filter((a) => a.categories.includes(c)).length;
    document.querySelector(`[data-count="${c}"]`)!.textContent = String(n);
  }
}

function renderList(items: ListItem[]): void {
  // Aircraft broadcasting a callsign first, then those known only by registration or hex.
  const sorted = [...items].sort(
    (a, b) => Number(!a.callsign) - Number(!b.callsign) || label(a).localeCompare(label(b)),
  );
  const focusedHex = (document.activeElement as HTMLElement | null)?.dataset?.hex;
  const rows = sorted.slice(0, LIST_LIMIT).map((a) => {
    const meta = [a.type, a.reg && a.reg !== a.callsign ? a.reg : null, a.country, a.points ? `${a.points} pts` : null]
      .filter(Boolean)
      .join(" · ");
    return `<li role="option" tabindex="0" data-hex="${escapeHtml(a.hex)}" aria-selected="${a.hex === state.selected}">
      <span class="bar ${primary(a.categories)}"></span>
      <span class="call">${escapeHtml(label(a))}</span>
      <span class="alt">${state.mode === "live" ? fmtAlt(a.alt, a.onGround) : ""}</span>
      <span class="meta">${escapeHtml(meta || a.hex.toUpperCase())}</span>
    </li>`;
  });
  if (sorted.length > LIST_LIMIT) rows.push(`<li class="more">+${sorted.length - LIST_LIMIT} more — refine search</li>`);
  if (!sorted.length) rows.push(`<li class="more">No aircraft match</li>`);
  listEl.innerHTML = rows.join("");
  if (focusedHex) listEl.querySelector<HTMLElement>(`li[data-hex="${CSS.escape(focusedHex)}"]`)?.focus();
}

function renderLive(): void {
  const shown = state.live.filter(visible);
  const keep = new Set(shown.map((a) => a.hex));
  for (const [hex, m] of markers) {
    if (!keep.has(hex)) {
      planeLayer.removeLayer(m);
      markers.delete(hex);
    }
  }
  trailLayer.clearLayers();
  for (const a of shown) {
    placeMarker(a.hex, [a.lat, a.lon], a.categories, label(a), a.track);
    if (a.trail.length > 1) {
      const selected = a.hex === state.selected;
      L.polyline(
        a.trail.map((p) => [p.lat, p.lon] as L.LatLngTuple),
        { renderer: canvas, color: COLORS[primary(a.categories)], weight: selected ? 2.5 : 1, opacity: selected ? 0.9 : 0.3, interactive: false },
      ).addTo(trailLayer);
    }
  }
  renderCounts(state.live.filter(matchesSearch));
  renderList(shown);
}

function renderHistory(): void {
  renderCounts(state.history.filter(matchesSearch));
  renderList(state.history.filter(visible));
}

function render(): void {
  if (state.mode === "live") renderLive();
  else renderHistory();
}

function renderStatus(): void {
  if (state.mode === "history") {
    statusEl.className = "";
    statusEl.textContent = `${state.history.length} aircraft in window`;
    return;
  }
  if (!state.liveUpdated) return;
  const age = Math.round((Date.now() - state.liveUpdated) / 1000);
  statusEl.className = age > 90 ? "stale" : "";
  statusEl.innerHTML = `<span class="pulse"></span>DATA ${age}s OLD · ${state.live.length} AIRCRAFT TRACKED`;
  statusEl.title = "Age of the latest worldwide snapshot from adsb.lol (refreshed every 20 s), and how many tracked aircraft it holds across all categories.";
}

// ---------- Detail ----------

function detailRows(rows: [string, unknown][]): string {
  return rows
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `<dt>${k}</dt><dd>${escapeHtml(v)}</dd>`)
    .join("");
}

function renderDetail(record: AircraftRecord | null, live: LiveAircraft | null): void {
  const a = live ?? record;
  if (!a) return;
  const cats = a.categories;
  const refocusFollow = document.activeElement?.classList.contains("follow");
  detailEl.style.setProperty("--accent", COLORS[primary(cats)]);
  detailEl.innerHTML = `
    <button class="close" type="button" aria-label="Close details">×</button>
    <h2>${escapeHtml(a.callsign || a.reg || a.hex.toUpperCase())}</h2>
    <p class="sub">${escapeHtml([a.type, a.reg].filter(Boolean).join(" · ") || "Unknown type")}</p>
    <div class="chips">${cats.map((c) => `<span class="chip ${c}">${LABELS[c]}</span>`).join("")}</div>
    <dl>${detailRows([
      ["Hex", a.hex.toUpperCase()],
      ["Altitude", live ? fmtAlt(live.alt, live.onGround) : null],
      ["Speed", live?.gs != null ? `${Math.round(live.gs)} kt` : null],
      ["Heading", live?.track != null ? `${Math.round(live.track)}°` : null],
      ["Squawk", live?.squawk],
      ["Country", a.country],
      ["Operator", a.operator],
      ["Why gov", a.govReason],
      ["First seen", record ? fmtTime(record.firstSeen) : null],
      ["Last seen", record ? fmtTime(record.lastSeen) : null],
    ])}</dl>
    <p class="links">
      ${live ? `<button class="follow" type="button" aria-pressed="${state.follow}">${state.follow ? "Following" : "Follow"}</button>` : ""}
      <a href="https://globe.adsb.lol/?icao=${encodeURIComponent(a.hex)}" target="_blank" rel="noopener">Open on adsb.lol ↗</a>
    </p>`;
  detailEl.hidden = false;
  detailEl.querySelector(".close")!.addEventListener("click", () => select(null));
  const followBtn = detailEl.querySelector<HTMLButtonElement>(".follow");
  followBtn?.addEventListener("click", () => setFollow(!state.follow));
  if (refocusFollow) followBtn?.focus();
}

function setFollow(on: boolean): void {
  state.follow = on;
  const btn = detailEl.querySelector<HTMLButtonElement>(".follow");
  if (btn) {
    btn.setAttribute("aria-pressed", String(on));
    btn.textContent = on ? "Following" : "Follow";
  }
  const live = state.selected ? state.live.find((a) => a.hex === state.selected) : undefined;
  if (on && live) map.panTo([live.lat, live.lon]);
}

async function select(hex: string | null): Promise<void> {
  state.selected = hex;
  state.selectedRecord = null;
  setFollow(false);
  stopReplay();
  if (!hex) {
    detailEl.hidden = true;
    replayEl.hidden = true;
    if (state.mode === "history") clearMap();
    render();
    return;
  }
  render();
  listEl.querySelector('li[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  try {
    const { aircraft, live } = await getJson<{ aircraft: AircraftRecord | null; live: LiveAircraft | null }>(
      `/api/aircraft/${encodeURIComponent(hex)}`,
    );
    if (state.selected !== hex) return;
    state.selectedRecord = aircraft;
    renderDetail(aircraft, live);
    if (state.mode === "history") await loadTrack(hex);
    else if (live) map.panTo([live.lat, live.lon]);
  } catch (err) {
    statusEl.textContent = `Could not load ${hex}: ${(err as Error).message}`;
  }
}

listEl.addEventListener("click", (e) => {
  const li = (e.target as HTMLElement).closest<HTMLLIElement>("li[data-hex]");
  if (li) select(li.dataset.hex!);
});
listEl.addEventListener("keydown", (e) => {
  const li = (e.target as HTMLElement).closest<HTMLLIElement>("li[data-hex]");
  if (!li) return;
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    select(li.dataset.hex!);
  } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    const next = e.key === "ArrowDown" ? li.nextElementSibling : li.previousElementSibling;
    (next as HTMLElement | null)?.focus();
  }
});

// ---------- Live mode ----------

let liveTimer: number | undefined;

async function refreshLive(): Promise<void> {
  try {
    const { updated, aircraft } = await getJson<{ updated: number; aircraft: LiveAircraft[] }>("/api/live");
    if (state.mode !== "live") return;
    state.live = aircraft;
    state.liveUpdated = updated || Date.now();
    renderLive();
    renderStatus();
    if (state.selected) {
      const current = aircraft.find((a) => a.hex === state.selected) ?? null;
      if (current) {
        renderDetail(state.selectedRecord, current);
        if (state.follow) map.panTo([current.lat, current.lon]);
      } else if (state.follow) {
        setFollow(false); // aircraft left coverage
      }
    }
  } catch (err) {
    statusEl.className = "stale";
    statusEl.textContent = `Feed error: ${(err as Error).message}`;
  }
}

// ---------- History mode ----------

const toLocalInput = (ms: number) => {
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 16);
};

async function loadHistory(): Promise<void> {
  const data = new FormData(historyForm);
  const from = new Date(String(data.get("from"))).getTime();
  const to = new Date(String(data.get("to"))).getTime();
  statusEl.textContent = "Loading…";
  try {
    const res = await getJson<{ aircraft: SeenAircraft[] }>(`/api/history?from=${from}&to=${to}`);
    state.history = res.aircraft;
    select(null);
    renderStatus();
  } catch (err) {
    statusEl.textContent = `History error: ${(err as Error).message}`;
  }
}

historyForm.addEventListener("submit", (e) => {
  e.preventDefault();
  loadHistory();
});

async function loadTrack(hex: string): Promise<void> {
  const data = new FormData(historyForm);
  const from = new Date(String(data.get("from"))).getTime();
  const to = new Date(String(data.get("to"))).getTime();
  const { positions } = await getJson<{ positions: Position[] }>(
    `/api/aircraft/${encodeURIComponent(hex)}/track?from=${from}&to=${to}`,
  );
  if (state.selected !== hex) return;
  state.track = positions;
  clearMap();
  if (!positions.length) return;
  const cats = state.history.find((a) => a.hex === hex)?.categories ?? ["mil"];
  const line = L.polyline(positions.map((p) => [p.lat, p.lon] as L.LatLngTuple), {
    renderer: canvas,
    color: COLORS[primary(cats)],
    weight: 2.5,
    opacity: 0.85,
  }).addTo(trailLayer);
  map.fitBounds(line.getBounds(), { padding: [60, 60], maxZoom: 9 });
  scrubEl.max = String(positions.length - 1);
  scrubEl.value = scrubEl.max;
  replayEl.hidden = false;
  showTrackPoint(positions.length - 1, cats);
}

function showTrackPoint(i: number, cats = state.history.find((a) => a.hex === state.selected)?.categories ?? ["mil"]): void {
  const p = state.track[i];
  if (!p || !state.selected) return;
  const record = state.history.find((a) => a.hex === state.selected);
  placeMarker(state.selected, [p.lat, p.lon], cats, record ? label(record) : state.selected, p.track ?? undefined);
  scrubTimeEl.textContent = `${fmtTime(p.ts)} · ${fmtAlt(p.alt)}`;
}

let replayTimer: number | undefined;
function stopReplay(): void {
  clearInterval(replayTimer);
  replayTimer = undefined;
  playEl.textContent = "▶";
  playEl.setAttribute("aria-label", "Play track");
}

scrubEl.addEventListener("input", () => showTrackPoint(Number(scrubEl.value)));
playEl.addEventListener("click", () => {
  if (replayTimer) return stopReplay();
  if (Number(scrubEl.value) >= state.track.length - 1) scrubEl.value = "0";
  playEl.textContent = "❚❚";
  playEl.setAttribute("aria-label", "Pause track");
  replayTimer = window.setInterval(() => {
    const next = Number(scrubEl.value) + 1;
    if (next >= state.track.length) return stopReplay();
    scrubEl.value = String(next);
    showTrackPoint(next);
  }, 120);
});

// ---------- Controls ----------

function setMode(mode: Mode): void {
  state.mode = mode;
  for (const tab of document.querySelectorAll<HTMLButtonElement>("[data-mode]")) {
    tab.setAttribute("aria-selected", String(tab.dataset.mode === mode));
  }
  historyForm.hidden = mode !== "history";
  clearInterval(liveTimer);
  clearMap();
  select(null);
  if (mode === "live") {
    refreshLive();
    liveTimer = window.setInterval(refreshLive, LIVE_REFRESH_MS);
  } else {
    renderStatus();
  }
}

for (const tab of document.querySelectorAll<HTMLButtonElement>("[data-mode]")) {
  tab.addEventListener("click", () => setMode(tab.dataset.mode as Mode));
}

for (const box of document.querySelectorAll<HTMLInputElement>(".cats input")) {
  box.addEventListener("change", () => {
    if (box.checked) state.enabled.add(box.value as Category);
    else state.enabled.delete(box.value as Category);
    render();
  });
}

searchEl.addEventListener("input", () => {
  state.search = searchEl.value.trim().toLowerCase();
  render();
});

document.addEventListener("keydown", (e) => {
  const typing = e.target instanceof HTMLElement && e.target.matches("input, textarea");
  if (!typing && e.key.toLowerCase() === "f" && state.mode === "live" && state.selected) setFollow(!state.follow);
  if (e.key === "Escape" && state.selected) select(null);
});

(historyForm.elements.namedItem("to") as HTMLInputElement).value = toLocalInput(Date.now());
(historyForm.elements.namedItem("from") as HTMLInputElement).value = toLocalInput(Date.now() - 6 * 3600_000);
setInterval(renderStatus, 1000);
setMode("live");
