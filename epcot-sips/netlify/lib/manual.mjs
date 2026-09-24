// Manual menu updates without an API key: the app hands you a prompt to paste into claude.ai,
// and you upload the JSON reply. This file builds that prompt and validates the upload.
import { ANCHORS, ANCHOR_IDS, COUNTRIES, COUNTRY_IDS, TYPES } from "../../data/places.mjs";
import { cleanBooths } from "./menu.mjs";

export function buildPrompt({ today, current }) {
  const anchors = Object.entries(ANCHORS).map(([id, a]) => `  ${id} = ${a.name}`).join("\n");
  const countries = COUNTRIES.map((c) => `  ${c.id} = ${c.name}`).join("\n");
  return `You are updating the drink menu for a family's EPCOT (Walt Disney World) phone app. Use web search.

Today is ${today}.${current ? ` The app currently has the menu for "${current}".` : ""}

TASK
1. Find out which EPCOT festival is running today (Festival of the Arts, Flower & Garden, Food & Wine, Festival of the Holidays) and its official dates. If none is running, name the NEXT one and its start date, and use its menu if Disney has published it.
2. List EVERY beverage (alcoholic and non-alcoholic) at every booth, marketplace, kitchen, studio and cart for that festival, plus festival-exclusive drinks at permanent spots.
3. List the signature YEAR-ROUND drinks at the 11 World Showcase pavilions (bars, lounges, walk-up windows, kiosks): 3–8 per pavilion, with at least one non-alcoholic option where one exists.

RULES
- Accuracy over completeness. Only include drinks you found in a source. Never invent drinks or prices.
- Prefer disneyworld.disney.go.com and disneyparksblog.com, then recent articles from disneyfoodblog.com, disneytouristblog.com, wdwnt.com, allears.net, touringplans.com, wdwmagic.com. Favor the newest information.
- Keep prices exactly as published (e.g. "$6.00 / $9.75" for two sizes). Use null if unknown.
- Only beverages, no food. If a drink has spirited and non-alcoholic versions, list both.
- Dates are YYYY-MM-DD.

FIELD VALUES (use these ids exactly)
type: ${TYPES.join(", ")}   (na = non-alcoholic, flight = any flight or pairing)

country (the cuisine/country a booth represents; "park" if none):
${countries}

anchor (where the booth physically is in EPCOT; pick the closest):
${anchors}

OUTPUT
Reply with ONLY one JSON object in a single \`\`\`json code block, no other text. Shape:

{
  "festival": { "name": "EPCOT International Food & Wine Festival", "year": 2026, "starts": "2026-08-27", "ends": "2026-11-21", "active": true },
  "nextFestival": { "name": "EPCOT International Festival of the Holidays", "starts": "2026-11-27" },
  "festivalBooths": [
    {
      "name": "Brewer's Collection",
      "country": "germany",
      "anchor": "germany",
      "where": "Germany pavilion",
      "opens": null,
      "closes": null,
      "note": "",
      "drinks": [
        { "name": "Weihenstephaner Hefeweissbier", "price": "$6.00 / $9.75", "type": "beer", "desc": "Wheat beer" }
      ]
    }
  ],
  "yearRoundBooths": [ same booth shape, for the year-round pavilion drinks ],
  "sources": [ "https://…", "https://…" ]
}

- "festival" is the festival whose drinks are in festivalBooths. active = true only if it is running today. If no festival menu is known, use "name": "" and an empty festivalBooths array.
- "opens"/"closes" only when a booth opens later or closes earlier than the festival itself; otherwise null.
- If the reply would be too long, keep going until the JSON is complete. It must be valid JSON.`;
}

const countDrinks = (booths) => booths.reduce((n, b) => n + b.drinks.length, 0);
const isoDate = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

// Accepts the raw reply (code fences, stray text around it) and returns what would change.
export function parseImport(raw) {
  const errors = [], warnings = [];
  let text = String(raw || "").trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a < 0) return { errors: ["Couldn't find any JSON in what you uploaded. Upload Claude's JSON reply."], warnings };
  if (b <= a) return { errors: ["The JSON looks cut off. Ask Claude to \"continue\", then upload the complete reply."], warnings };
  let data;
  try { data = JSON.parse(text.slice(a, b + 1)); }
  catch (e) { return { errors: [`The JSON isn't valid (${e.message}). If Claude's reply was cut off, ask it to "continue" and upload the complete JSON.`], warnings }; }

  // Count what cleanBooths would silently fix, so the preview can say so.
  const audit = (booths, label) => {
    let badCountry = 0, badAnchor = 0, badType = 0;
    for (const bo of Array.isArray(booths) ? booths : []) {
      if (!COUNTRY_IDS.includes(bo?.country)) badCountry++;
      if (!ANCHOR_IDS.includes(bo?.anchor)) badAnchor++;
      for (const d of Array.isArray(bo?.drinks) ? bo.drinks : []) if (!TYPES.includes(d?.type)) badType++;
    }
    if (badCountry) warnings.push(`${label}: ${badCountry} booth${badCountry > 1 ? "s" : ""} had an unknown country (set to "Around the Park").`);
    if (badAnchor) warnings.push(`${label}: ${badAnchor} booth${badAnchor > 1 ? "s" : ""} had an unknown map spot (placed at the country's pavilion or Showcase Plaza).`);
    if (badType) warnings.push(`${label}: ${badType} drink${badType > 1 ? "s" : ""} had an unknown type (set to cocktail).`);
  };

  const sources = (Array.isArray(data.sources) ? data.sources : []).filter((u) => typeof u === "string" && /^https?:\/\//.test(u)).slice(0, 25);
  const out = { errors, warnings, sources };

  if (Array.isArray(data.festivalBooths)) {
    audit(data.festivalBooths, "Festival");
    const booths = cleanBooths(data.festivalBooths);
    const f = data.festival || {};
    const year = Number(f.year) || Number(String(f.starts || "").slice(0, 4)) || new Date().getFullYear();
    const festival = f.name
      ? { name: String(f.name).slice(0, 120), year, starts: isoDate(f.starts), ends: isoDate(f.ends), active: !!f.active }
      : { name: "", year, starts: null, ends: null, active: false };
    const n = countDrinks(booths);
    if (festival.name && n < 15) errors.push(`Only ${n} festival drinks came through for ${festival.name} (need at least 15), so the festival menu wasn't replaced. Ask Claude for the complete list.`);
    else {
      if (festival.name && (!festival.starts || !festival.ends)) warnings.push("The festival is missing its start or end date.");
      const nf = data.nextFestival?.name ? { name: String(data.nextFestival.name).slice(0, 120), starts: isoDate(data.nextFestival.starts) } : null;
      out.festival = { festival, nextFestival: nf, booths, drinks: n };
    }
  } else warnings.push("No festivalBooths list, so the festival menu stays as it is.");

  if (Array.isArray(data.yearRoundBooths)) {
    audit(data.yearRoundBooths, "Year-round");
    const booths = cleanBooths(data.yearRoundBooths, { yearRound: true });
    const n = countDrinks(booths);
    if (n < 10) errors.push(`Only ${n} year-round drinks came through (need at least 10), so the year-round list wasn't replaced.`);
    else out.yearRound = { booths, drinks: n };
  } else warnings.push("No yearRoundBooths list, so the year-round drinks stay as they are.");

  if (!out.festival && !out.yearRound && !errors.length) errors.push("Nothing to update was found in the upload.");
  return out;
}
