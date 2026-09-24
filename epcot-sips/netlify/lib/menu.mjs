// Shared menu helpers: storage, normalization, stable ids, and "is a refresh due?" logic.
import { getStore } from "@netlify/blobs";
import { BOOTHS as SEED_BOOTHS, FESTIVAL as SEED_FESTIVAL, NEXT_FESTIVAL as SEED_NEXT } from "../../data/drinks.mjs";
import { ANCHOR_IDS, COUNTRY_IDS, COUNTRY_HOME, TYPES } from "../../data/places.mjs";

export const store = () => getStore({ name: "epcot-sips", consistency: "strong" });

export const REFRESH_DAYS = () => Math.max(1, Number(process.env.REFRESH_DAYS) || 3);
export const YEAR_ROUND_DAYS = 21;

export function todayET(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
export const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

export const slug = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

const isoDate = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const str = (v, max = 240) => (v == null ? "" : String(v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max));

export function festivalId(f) {
  if (!f?.name) return "none";
  const short = slug(f.name.replace(/epcot|international|festival|the|of/gi, " "));
  return `${short}-${f.year || (f.starts || "").slice(0, 4)}`;
}

/** Validate + clean booths coming from the seed file or from Claude. */
export function cleanBooths(booths, { yearRound = false } = {}) {
  const out = [];
  for (const b of Array.isArray(booths) ? booths : []) {
    const name = str(b.name, 80);
    if (!name) continue;
    const country = COUNTRY_IDS.includes(b.country) ? b.country : "park";
    let anchor = ANCHOR_IDS.includes(b.anchor) ? b.anchor : COUNTRY_HOME[country] || "showcase-plaza";
    const drinks = [];
    for (const d of Array.isArray(b.drinks) ? b.drinks : []) {
      const row = Array.isArray(d) ? { name: d[0], price: d[1], type: d[2], desc: d[3] } : d;
      const dn = str(row?.name, 100);
      if (!dn) continue;
      drinks.push({
        name: dn,
        price: str(row.price, 40) || null,
        type: TYPES.includes(row.type) ? row.type : "cocktail",
        desc: str(row.desc, 260),
      });
    }
    if (!drinks.length) continue;
    out.push({
      name, country, anchor,
      where: str(b.where, 90),
      opens: isoDate(b.opens), closes: isoDate(b.closes),
      yearRound: yearRound || !!b.yearRound,
      note: str(b.note, 200),
      drinks,
    });
  }
  return out;
}

/** Flatten booths → drinks with stable ids (ratings are keyed on these). */
export function flatten(booths, prefix) {
  const seen = new Set();
  const out = [];
  for (const b of booths) {
    for (const d of b.drinks) {
      const base = b.yearRound ? `yr--${b.country}--${slug(d.name)}` : `${prefix}--${b.country}--${slug(d.name)}`;
      let id = base;
      if (seen.has(id)) id = `${base}--${slug(b.name)}`;
      let n = 2;
      while (seen.has(id)) id = `${base}--${n++}`;
      seen.add(id);
      out.push({
        id, ...d,
        country: b.country, anchor: b.anchor, booth: b.name, where: b.where,
        opens: b.opens, closes: b.closes, yearRound: b.yearRound, note: b.note,
      });
    }
  }
  return out;
}

export function seedFestival() {
  const all = cleanBooths(SEED_BOOTHS);
  return {
    festival: { ...SEED_FESTIVAL },
    nextFestival: SEED_NEXT,
    booths: all.filter((b) => !b.yearRound),
    sources: [
      "https://www.disneytouristblog.com/full-menus-2026-epcot-food-wine-festival-drinks-dishes-desserts-disney-world/",
      "https://www.micechat.com/440970-epcot-food-and-wine-festival-guide/",
    ],
    checkedAt: `${SEED_FESTIVAL.updated}T12:00:00Z`,
    origin: "seed",
  };
}
export function seedYearRound() {
  return {
    booths: cleanBooths(SEED_BOOTHS).filter((b) => b.yearRound),
    sources: [],
    checkedAt: null, // never researched → refresh is due right away
    origin: "seed",
  };
}

export async function readMenus(s = store()) {
  const [fest, yr] = await Promise.all([
    s.get("menu/festival", { type: "json" }),
    s.get("menu/yearround", { type: "json" }),
  ]);
  return { fest: fest || seedFestival(), yr: yr || seedYearRound() };
}

/** Which refresh jobs should run now, and why. */
export function dueJobs({ fest, yr }, now = new Date()) {
  const today = todayET(now);
  const jobs = [];
  const reasons = [];
  const age = fest.checkedAt ? daysBetween(fest.checkedAt.slice(0, 10), today) : Infinity;
  const f = fest.festival || {};
  if (age >= REFRESH_DAYS()) { jobs.push("festival"); reasons.push(`festival menu is ${age} days old`); }
  else if (f.active && f.ends && f.ends < today) { jobs.push("festival"); reasons.push(`${f.name} ended ${f.ends}`); }
  else if (!f.active && fest.nextFestival?.starts && fest.nextFestival.starts <= today) { jobs.push("festival"); reasons.push(`${fest.nextFestival.name} has started`); }

  const yAge = yr.checkedAt ? daysBetween(yr.checkedAt.slice(0, 10), today) : Infinity;
  if (yAge >= YEAR_ROUND_DAYS) { jobs.push("yearround"); reasons.push(yr.checkedAt ? `year-round list is ${yAge} days old` : "year-round list never researched"); }
  return { jobs, reason: reasons.join("; ") };
}

/** Shared secret the scheduled/api functions use to call the background worker. */
export async function refreshSecret(s = store()) {
  let secret = await s.get("config/secret");
  if (!secret) {
    secret = crypto.randomUUID() + crypto.randomUUID();
    await s.set("config/secret", secret);
  }
  return secret;
}

export async function readStatus(s = store()) {
  return (await s.get("refresh/status", { type: "json" })) || { state: "never" };
}

/**
 * Kick the background worker (returns quickly — Netlify answers 202).
 * Skips if a run started recently, or (for automatic triggers) if one failed recently.
 */
export async function triggerRefresh({ siteUrl, jobs, reason, manual = false }) {
  if (!process.env.ANTHROPIC_API_KEY) return { started: false, why: "ANTHROPIC_API_KEY is not set" };
  if (!jobs?.length) return { started: false, why: "nothing due" };
  const s = store();
  const st = await readStatus(s);
  const since = st.startedAt ? (Date.now() - Date.parse(st.startedAt)) / 60000 : Infinity;
  if (st.state === "running" && since < 20) return { started: false, why: "a refresh is already running" };
  if (!manual && st.state === "error" && since < 360) return { started: false, why: "last refresh failed recently; waiting before retrying" };
  if (!manual && st.state === "queued" && since < 20) return { started: false, why: "a refresh was just queued" };

  await s.setJSON("refresh/status", { ...st, state: "queued", startedAt: new Date().toISOString(), jobs, reason, manual });
  const secret = await refreshSecret(s);
  const res = await fetch(new URL("/internal/refresh", siteUrl), {
    method: "POST",
    headers: { "content-type": "application/json", "x-refresh-secret": secret },
    body: JSON.stringify({ jobs, reason }),
  });
  return { started: res.status < 300, status: res.status, jobs };
}
