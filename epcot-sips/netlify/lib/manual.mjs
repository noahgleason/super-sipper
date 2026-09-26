// Manual menu updates without an API key: the app hands you a prompt to paste into claude.ai,
// and you upload the JSON reply. This file builds that prompt and validates the upload.
import { ANCHORS, ANCHOR_IDS, COUNTRIES, COUNTRY_IDS, TYPES } from "../../data/places.mjs";
import { ALL_ANCHORS, PARKS, anchorIdsFor } from "../../data/parks.mjs";
import { cleanBooths } from "./menu.mjs";

// What to be sure to cover at each park (the prompt already asks for everything).
const PARK_HINTS = {
  mk: `Magic Kingdom only pours alcohol at table-service restaurants (Be Our Guest, Cinderella's Royal Table, The Crystal Palace, The Plaza, Tony's Town Square, Liberty Tree Tavern, The Diamond Horseshoe, Jungle Navigation Co. Skipper Canteen) and The Beak and Barrel lounge. Also cover signature non-alcoholic drinks at quick-service spots, snack stands and carts: Aloha Isle and Sunshine Tree Terrace (DOLE Whip floats), Gaston's Tavern (LeFou's Brew), Cheshire Café, Golden Oak Outpost, Joffrey's carts, AstroFizz, Cool Ship, Main Street Bakery and so on.`,
  hs: `Cover Star Wars: Galaxy's Edge (Oga's Cantina, Milk Stand, Docking Bay 7, Kat Saka's Kettle, Ronto Roasters), Toy Story Land (Woody's Lunch Box, Roundup Rodeo BBQ), BaseLine Tap House, The Hollywood Brown Derby and its Lounge, Tune-In Lounge and 50's Prime Time Café, Sci-Fi Dine-In Theater, Hollywood & Vine, ABC Commissary, Backlot Express, Oasis Canteen, Dockside Diner, Joffrey's and the carts.`,
  tl: `Typhoon Lagoon is a water park: cover Let's Go Slurpin' (its bar), Leaning Palms, Typhoon Tilly's, Snack Shack, Lowtide Lou's, Surf Doggies, the Joffrey's carts and any seasonal stands. Souvenir refill cups aren't drinks; skip them.`,
  bb: `Blizzard Beach is a water park: cover Polar Pub, Frostbite Freddy's Frozen Freshments, Lottawatta Lodge, Avalunch, Warming Hut, Cooling Hut, the Joffrey's carts and any seasonal stands. Souvenir refill cups aren't drinks; skip them. If the park is closed for its seasonal refurbishment, say so and list what it serves when open.`,
  ak: `Cover Nomad Lounge, Pandora (Pongu Pongu, Satu'li Canteen), Dawa Bar, Thirsty River Bar & Trek Snacks, Tusker House, Tiffins, Yak & Yeti (Restaurant, Quality Beverages, Local Food Cafés), Harambe Market, Kusafiri, Isle of Java, Warung Outpost, Flame Tree Barbecue, Satu'li, Terra Treats and the carts.`,
};

/** A prompt for one of the other parks: year-round (plus seasonal) drinks at every spot. */
export function buildParkPrompt({ today, park }) {
  const P = PARKS[park];
  const spots = anchorIdsFor(park).map((id) => {
    const a = ALL_ANCHORS[id];
    return `  ${id} = ${a.name}${a.kind === "land" ? " (whole land: only for carts or spots not listed)" : a.land ? ` — ${ALL_ANCHORS[a.land]?.name}` : ""}`;
  }).join("\n");
  return `You are updating the drink menu for ${P.name} (Walt Disney World) in a family's phone app. Use web search.

Today is ${today}.

TASK
List EVERY beverage currently served at ${P.name}: cocktails, beer, cider, wine by the glass, flights, and signature/specialty non-alcoholic drinks (floats, frozen drinks, specialty lemonades and slushes, specialty coffees, souvenir drinks, seasonal specials), at every bar, lounge, restaurant, quick-service spot, snack stand and cart.
${PARK_HINTS[park] || ""}

RULES
- Accuracy over completeness. Only include drinks you found in a source. Never invent drinks or prices.
- Best sources: touringplans.com park menus (they show a "Last verified" date; prefer ones from the last few weeks), disneyworld.disney.go.com, disneyparksblog.com, then recent disneyfoodblog.com, wdwnt.com, allears.net, wdwmagic.com articles.
- Skip generic items: fountain sodas, bottled water, milk, juice boxes, plain brewed coffee and tea.
- Skip drinks only sold at separately ticketed after-hours parties. Seasonal drinks anyone can buy are fine: set "closes" to the last day they're sold.
- Keep prices exactly as published (e.g. "$14.00"). Use null if unknown.
- Dates are YYYY-MM-DD.

FIELD VALUES (use these ids exactly)
type: ${TYPES.join(", ")}   (na = non-alcoholic, flight = any flight or pairing)

anchor (where the drink is poured; pick the exact spot when it's listed, otherwise its land):
${spots}

OUTPUT
Reply with ONLY one JSON object in a single \`\`\`json code block, no other text. Shape:

{
  "park": "${park}",
  "booths": [
    {
      "name": "Exact location name",
      "anchor": "${anchorIdsFor(park).find((id) => ALL_ANCHORS[id].kind === "venue") || anchorIdsFor(park)[0]}",
      "where": "Land name",
      "opens": null,
      "closes": null,
      "note": "",
      "drinks": [
        { "name": "Drink name", "price": "$14.00", "type": "cocktail", "desc": "Short ingredients/description" }
      ]
    }
  ],
  "sources": [ "https://…", "https://…" ]
}

- One booth per location. If a location has a seasonal list, make it a second booth with the same name plus " (Halloween)" or similar, and set "closes".
- If the reply would be too long, keep going until the JSON is complete. It must be valid JSON.`;
}

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
export function parseImport(raw, park = "epcot") {
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

  if (park !== "epcot") {
    const P = PARKS[park];
    if (data.park && data.park !== park && PARKS[data.park]) errors.push(`This reply is for ${PARKS[data.park].short}, not ${P.short}. Switch parks in Settings and upload it there.`);
    const list = data.booths || data.yearRoundBooths;
    if (!Array.isArray(list)) { errors.push(`No "booths" list in the reply, so ${P.short} stays as it is.`); return out; }
    const ids = anchorIdsFor(park);
    const badAnchor = list.filter((b) => !ids.includes(b?.anchor)).length;
    if (badAnchor) warnings.push(`${badAnchor} location${badAnchor > 1 ? "s" : ""} had an unknown map spot (placed on their land).`);
    const booths = cleanBooths(list, { yearRound: true, park });
    const n = countDrinks(booths);
    if (n < 15) errors.push(`Only ${n} drinks came through for ${P.short} (need at least 15), so its menu wasn't replaced.`);
    else if (!errors.length) out.park = { booths, drinks: n };
    return out;
  }

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
