// Main API for Epcot Sips. Shared family data + the auto-refreshed menu live in Netlify Blobs.
//
//   GET    /api/state            menu (current festival + year-round) + family check-ins + refresh status
//   POST   /api/profile          create/update a family member
//   POST   /api/checkin          tried / rating / wishlist / note for one drink
//   POST   /api/drinks           add a drink the menu is missing
//   DELETE /api/drinks/:id       remove a family-added drink
//   POST   /api/status           mark a drink sold out today (clears itself tomorrow)
//   POST   /api/refresh          re-research the menu now
//   POST   /api/verify           check the family code
//
// Optional env vars: FAMILY_CODE (passcode for changes), EPCOT_SIPS_CLAUDE_KEY (your own Anthropic key;
// enables "Refresh now"), REFRESH_CODE (password for "Refresh now"), AUTO_REFRESH=on (also refresh on a schedule), ANTHROPIC_MODEL, REFRESH_DAYS.

import { ANCHORS, COUNTRIES, COUNTRY_IDS, RING, TYPES } from "../../data/places.mjs";
import {
  store, readMenus, flatten, festivalId, todayET, dueJobs, triggerRefresh, readStatus, REFRESH_DAYS, daysBetween, claudeKey, autoRefreshOn,
} from "../lib/menu.mjs";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const clean = (v, max = 200) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
const memberKey = (name) => `member/${encodeURIComponent(clean(name, 24).toLowerCase())}`;

function authorized(req) {
  const code = process.env.FAMILY_CODE;
  if (!code) return true;
  return (req.headers.get("x-family-code") || "").trim().toLowerCase() === code.trim().toLowerCase();
}

// Separate password for starting a (paid) menu refresh. Kept in Netlify, never in the repo.
function refreshAllowed(req) {
  const code = process.env.REFRESH_CODE;
  if (!code) return true;
  return (req.headers.get("x-refresh-code") || "").trim().toLowerCase() === code.trim().toLowerCase();
}

async function listJSON(s, prefix) {
  const { blobs } = await s.list({ prefix });
  const rows = await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" })));
  return rows.filter(Boolean);
}

async function getState(req) {
  const s = store();
  const today = todayET();
  const [menus, custom, statuses, members, firstSeen, refresh] = await Promise.all([
    readMenus(s), listJSON(s, "custom/"), listJSON(s, "status/"), listJSON(s, "member/"),
    s.get("menu/firstseen", { type: "json" }), readStatus(s),
  ]);
  const { fest, yr } = menus;
  const fid = festivalId(fest.festival);

  // Self-healing: if the scheduled check hasn't refreshed an overdue menu, start it now.
  const due = dueJobs(menus);
  let autoTrigger = null;
  if (due.jobs.length && autoRefreshOn()) {
    autoTrigger = await triggerRefresh({ siteUrl: new URL(req.url).origin, ...due }).catch((e) => ({ started: false, why: e.message }));
  }

  const soldOut = Object.fromEntries(statuses.filter((x) => x.date === today).map((x) => [x.drinkId, x]));
  const seen = firstSeen || {};
  const newCutoff = fest.festival?.starts ? addDays(fest.festival.starts, 3) : "0000";
  const decorate = (d) => {
    const fs = seen[d.id] || null;
    return { ...d, status: soldOut[d.id] || null, firstSeen: fs, isNew: !!fs && fs > newCutoff && daysBetween(fs, today) <= 10 };
  };
  const drinks = [
    ...flatten(fest.booths, fid).map((d) => ({ ...d, source: "festival" })),
    ...flatten(yr.booths, "yr").map((d) => ({ ...d, source: "yearround" })),
    ...custom.filter((c) => c.festivalId === fid || c.festivalId === "yr" || !c.festivalId),
  ].map(decorate);

  return {
    today,
    festival: fest.festival,
    festivalId: fid,
    nextFestival: fest.nextFestival || null,
    menu: {
      checkedAt: fest.checkedAt, origin: fest.origin, sources: fest.sources || [],
      yearRoundCheckedAt: yr.checkedAt, yearRoundSources: yr.sources || [],
    },
    refresh: {
      ...refresh,
      enabled: !!claudeKey(),
      needsCode: !!process.env.REFRESH_CODE,
      auto: autoRefreshOn(),
      everyDays: REFRESH_DAYS(),
      due: due.jobs, dueReason: due.reason, autoTrigger,
    },
    countries: COUNTRIES,
    anchors: ANCHORS,
    ring: RING,
    types: TYPES,
    drinks,
    members,
    requiresCode: !!process.env.FAMILY_CODE,
  };
}

function addDays(iso, n) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export default async (req) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  const method = req.method.toUpperCase();

  try {
    if (method === "GET" && path === "state") return json(await getState(req));
    if (method !== "GET" && !authorized(req)) return json({ error: "Wrong or missing family code" }, 401);
    if (method === "POST" && path === "verify") return json({ ok: true });

    const body = method === "POST" ? await req.json().catch(() => ({})) : {};
    const s = store();

    if (method === "POST" && path === "profile") {
      const name = clean(body.member, 24);
      if (!name) return json({ error: "member is required" }, 400);
      const key = memberKey(name);
      const rec = (await s.get(key, { type: "json" })) || { name, items: {} };
      rec.name = name;
      rec.emoji = clean(body.emoji, 8) || rec.emoji || "🥤";
      rec.updated = new Date().toISOString();
      await s.setJSON(key, rec);
      return json({ ok: true, member: rec });
    }

    if (method === "POST" && path === "checkin") {
      const name = clean(body.member, 24);
      const drinkId = clean(body.drinkId, 200);
      if (!name || !drinkId) return json({ error: "member and drinkId are required" }, 400);
      const key = memberKey(name);
      const rec = (await s.get(key, { type: "json" })) || { name, emoji: "🥤", items: {} };
      if (body.emoji) rec.emoji = clean(body.emoji, 8);
      const next = { ...(rec.items[drinkId] || {}) };
      if ("tried" in body) next.tried = !!body.tried;
      if ("want" in body) next.want = !!body.want;
      if ("rating" in body) next.rating = Math.max(0, Math.min(5, Number(body.rating) || 0));
      if ("note" in body) next.note = clean(body.note, 280);
      if (next.rating > 0) next.tried = true;
      // A snapshot keeps your passport readable after the festival (and its menu) moves on.
      if (body.snapshot && typeof body.snapshot === "object") {
        const sn = body.snapshot;
        next.snap = {
          name: clean(sn.name, 100), booth: clean(sn.booth, 80), price: clean(sn.price, 40),
          type: TYPES.includes(sn.type) ? sn.type : "cocktail",
          country: COUNTRY_IDS.includes(sn.country) ? sn.country : "park",
          festival: clean(sn.festival, 80),
        };
      }
      next.at = new Date().toISOString();
      if (!next.tried && !next.want && !next.rating && !next.note) delete rec.items[drinkId];
      else rec.items[drinkId] = next;
      rec.updated = next.at;
      await s.setJSON(key, rec);
      return json({ ok: true, member: rec });
    }

    if (method === "POST" && path === "drinks") {
      const name = clean(body.name, 90);
      if (!name) return json({ error: "Drink name is required" }, 400);
      const { fest } = await readMenus(s);
      const country = COUNTRY_IDS.includes(body.country) ? body.country : "park";
      const anchor = ANCHORS[body.anchor] ? body.anchor : null;
      const id = `custom--${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const drink = {
        id, name, country,
        anchor: anchor || { usa: "america" }[country] || (ANCHORS[country] ? country : "showcase-plaza"),
        type: TYPES.includes(body.type) ? body.type : "cocktail",
        price: clean(body.price, 30) || null,
        desc: clean(body.desc, 240),
        booth: clean(body.booth, 60) || "Found by the family",
        where: "", opens: null, closes: null, yearRound: !!body.yearRound, note: "",
        source: "family", addedBy: clean(body.member, 24), addedAt: new Date().toISOString(),
        festivalId: body.yearRound ? "yr" : festivalId(fest.festival),
      };
      await s.setJSON(`custom/${id}`, drink);
      return json({ ok: true, drink });
    }

    if (method === "DELETE" && path.startsWith("drinks/")) {
      const id = clean(decodeURIComponent(path.slice(7)), 200);
      if (!id.startsWith("custom--")) return json({ error: "Only family-added drinks can be deleted" }, 400);
      await s.delete(`custom/${id}`);
      return json({ ok: true });
    }

    if (method === "POST" && path === "status") {
      const drinkId = clean(body.drinkId, 200);
      if (!drinkId) return json({ error: "drinkId is required" }, 400);
      const key = `status/${encodeURIComponent(drinkId)}`;
      if (body.soldOut) await s.setJSON(key, { drinkId, soldOut: true, date: todayET(), by: clean(body.member, 24), at: new Date().toISOString() });
      else await s.delete(key);
      return json({ ok: true });
    }

    if (method === "POST" && path === "refresh") {
      if (!refreshAllowed(req)) return json({ error: "Wrong refresh password" }, 403);
      const jobs = Array.isArray(body.jobs) ? body.jobs.filter((j) => ["festival", "yearround"].includes(j)) : ["festival", "yearround"];
      const out = await triggerRefresh({ siteUrl: url.origin, jobs, reason: `requested by ${clean(body.member, 24) || "someone"}`, manual: true });
      return json(out, out.started ? 200 : 409);
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    console.error(err);
    return json({ error: "Server error", detail: String(err?.message || err) }, 500);
  }
};

export const config = { path: "/api/*" };
