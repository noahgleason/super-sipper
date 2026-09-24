// Scheduled function: every morning (5:10am Orlando time) decide whether the menu
// needs re-researching, and if so hand off to the background worker.
import { readMenus, dueJobs, triggerRefresh } from "../lib/menu.mjs";

export default async (req, context) => {
  const menus = await readMenus();
  const { jobs, reason } = dueJobs(menus);
  const siteUrl = process.env.URL || context?.site?.url;
  const result = await triggerRefresh({ siteUrl, jobs, reason });
  console.log("daily-check", JSON.stringify({ jobs, reason, result }));
};

export const config = { schedule: "10 9 * * *" };
