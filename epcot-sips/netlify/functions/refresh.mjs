// Background worker (runs up to 15 minutes): researches the current menus and saves them.
// Triggered by the daily scheduled check, by the app when a refresh is overdue, or by "Refresh now".
import { store, readMenus, refreshSecret, readStatus, todayET, flatten, festivalId } from "../lib/menu.mjs";
import { researchFestival, researchYearRound } from "../lib/research.mjs";

export default async (req) => {
  const s = store();
  if (req.headers.get("x-refresh-secret") !== (await refreshSecret(s))) return new Response("forbidden", { status: 403 });

  const { jobs = ["festival"], reason = "" } = await req.json().catch(() => ({}));
  const startedAt = new Date().toISOString();
  const log = [];
  await s.setJSON("refresh/status", { state: "running", startedAt, jobs, reason });

  try {
    const { fest: prevFest } = await readMenus(s);

    if (jobs.includes("festival")) {
      const next = await researchFestival(prevFest);
      await s.setJSON("menu/festival-previous", prevFest);
      await s.setJSON("menu/festival", next);
      await markFirstSeen(s, flatten(next.booths, festivalId(next.festival)));
      log.push(`festival: ${next.festival.name || "none running"} — ${next.booths.length} booths`);
    }
    if (jobs.includes("yearround")) {
      const yr = await researchYearRound();
      await s.setJSON("menu/yearround", yr);
      await markFirstSeen(s, flatten(yr.booths, "yr"));
      log.push(`year-round: ${yr.booths.length} spots`);
    }
    await s.setJSON("refresh/status", { state: "ok", startedAt, finishedAt: new Date().toISOString(), jobs, reason, message: log.join(" · ") });
  } catch (err) {
    console.error("refresh failed", err);
    const prev = await readStatus(s);
    await s.setJSON("refresh/status", {
      state: "error", startedAt, finishedAt: new Date().toISOString(), jobs, reason,
      message: String(err?.message || err).slice(0, 500), lastOk: prev.state === "ok" ? prev.finishedAt : prev.lastOk,
    });
  }
  return new Response("done");
};

// Remember the day each drink first appeared, so the app can badge "New".
async function markFirstSeen(s, drinks) {
  const seen = (await s.get("menu/firstseen", { type: "json" })) || {};
  const today = todayET();
  let changed = false;
  for (const d of drinks) if (!seen[d.id]) { seen[d.id] = today; changed = true; }
  if (changed) await s.setJSON("menu/firstseen", seen);
}

export const config = { path: "/internal/refresh", background: true };
