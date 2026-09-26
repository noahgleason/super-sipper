// Background worker (runs up to 15 minutes): researches the current menus and saves them.
// Triggered by the daily scheduled check, by the app when a refresh is overdue, or by "Refresh now".
// Each run handles one park (EPCOT's festival + year-round lists count as one); if more parks are
// queued it hands them to a fresh run, so a full refresh never hits the time limit.
import { store, readMenus, refreshSecret, readStatus, flatten, festivalId, markFirstSeen } from "../lib/menu.mjs";
import { researchFestival, researchYearRound, researchPark } from "../lib/research.mjs";

export default async (req) => {
  const s = store();
  const secret = await refreshSecret(s);
  if (req.headers.get("x-refresh-secret") !== secret) return new Response("forbidden", { status: 403 });

  const { jobs = ["festival"], reason = "", log: prior = [], startedAt = new Date().toISOString() } = await req.json().catch(() => ({}));
  const epcotJobs = jobs.filter((j) => j === "festival" || j === "yearround");
  const now = epcotJobs.length ? epcotJobs : jobs.slice(0, 1);
  const rest = jobs.filter((j) => !now.includes(j));
  const log = [...prior];
  await s.setJSON("refresh/status", { state: "running", startedAt, jobs, reason, message: log.join(" · ") });

  try {
    const { fest: prevFest } = await readMenus(s);

    if (now.includes("festival")) {
      const next = await researchFestival(prevFest);
      await s.setJSON("menu/festival-previous", prevFest);
      await s.setJSON("menu/festival", next);
      await markFirstSeen(s, flatten(next.booths, festivalId(next.festival)));
      log.push(`festival: ${next.festival.name || "none running"} — ${next.booths.length} booths`);
    }
    if (now.includes("yearround")) {
      const yr = await researchYearRound();
      await s.setJSON("menu/yearround", yr);
      await markFirstSeen(s, flatten(yr.booths, "yr"));
      log.push(`year-round: ${yr.booths.length} spots`);
    }
    for (const job of now.filter((j) => j.startsWith("park:"))) {
      const id = job.slice(5);
      const menu = await researchPark(id);
      await s.setJSON(`menu/park/${id}`, menu);
      await markFirstSeen(s, flatten(menu.booths, id), { baseline: true });
      log.push(`${id}: ${menu.booths.length} spots`);
    }

    if (rest.length) {
      await s.setJSON("refresh/status", { state: "running", startedAt, jobs, reason, message: log.join(" · ") });
      await fetch(new URL("/internal/refresh", req.url), {
        method: "POST",
        headers: { "content-type": "application/json", "x-refresh-secret": secret },
        body: JSON.stringify({ jobs: rest, reason, log, startedAt }),
      });
      return new Response("continued");
    }
    await s.setJSON("refresh/status", { state: "ok", startedAt, finishedAt: new Date().toISOString(), jobs, reason, message: log.join(" · ") });
  } catch (err) {
    console.error("refresh failed", err);
    const prev = await readStatus(s);
    await s.setJSON("refresh/status", {
      state: "error", startedAt, finishedAt: new Date().toISOString(), jobs, reason,
      message: [...log, String(err?.message || err).slice(0, 500)].join(" · "), lastOk: prev.state === "ok" ? prev.finishedAt : prev.lastOk,
    });
  }
  return new Response("done");
};

export const config = { path: "/internal/refresh", background: true };
