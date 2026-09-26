// Menu research: Claude searches the web for what's being poured at each park right now,
// then a second call converts the findings into strict JSON the app can trust.
import { Agent, fetch as ufetch } from "undici";
import { ANCHORS, ANCHOR_IDS, COUNTRIES, COUNTRY_IDS, TYPES } from "../../data/places.mjs";
import { ALL_ANCHORS, PARKS, anchorIdsFor } from "../../data/parks.mjs";
import { cleanBooths, todayET, claudeKey } from "./menu.mjs";

// Always Anthropic directly — never a base URL injected by the host (e.g. Netlify's AI Gateway).
const API = "https://api.anthropic.com/v1/messages";
const MODEL = () => process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
// Long research calls can take minutes before the first byte — don't let Node time out.
const dispatcher = new Agent({ headersTimeout: 0, bodyTimeout: 0, connectTimeout: 30_000 });

const SOURCES = [
  "disneyworld.disney.go.com", "disneyparksblog.com", "disneyparks.disney.go.com",
  "disneyfoodblog.com", "disneytouristblog.com", "wdwnt.com", "allears.net", "micechat.com",
  "wdwmagic.com", "touringplans.com", "undercovertourist.com", "mickeyblog.com",
  "wdwprepschool.com", "disneydining.com", "insidethemagic.net", "wdwinfo.com",
];
// Outside EPCOT, TouringPlans keeps park menus (with prices) verified every few days.
const PARK_SOURCES = [...SOURCES, "touringplans.com"];

async function claude(body, { tries = 4 } = {}) {
  let wait = 5000;
  for (let i = 1; ; i++) {
    const res = await ufetch(API, {
      method: "POST",
      dispatcher,
      headers: {
        "content-type": "application/json",
        "x-api-key": claudeKey(),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (res.ok) return JSON.parse(text);
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || i >= tries) {
      const err = new Error(`Claude API ${res.status}: ${text.slice(0, 400)}`);
      err.status = res.status;
      throw err;
    }
    await new Promise((r) => setTimeout(r, wait));
    wait *= 2;
  }
}

/** Run a tool-using research turn, following pause_turn continuations. */
async function research(system, prompt, { maxSearches = 14, maxFetches = 10, domains = SOURCES } = {}) {
  const tools = [
    { type: "web_search_20260318", name: "web_search", max_uses: maxSearches, allowed_domains: domains },
    { type: "web_fetch_20260318", name: "web_fetch", max_uses: maxFetches, max_content_tokens: 15000 },
  ];
  const messages = [{ role: "user", content: prompt }];
  let last;
  for (let turn = 0; turn < 4; turn++) {
    last = await claude({ model: MODEL(), max_tokens: 24000, system, tools, messages });
    if (last.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: last.content });
  }
  // Gather the written findings + every URL Claude cited or fetched.
  const allContent = messages.filter((m) => m.role === "assistant").flatMap((m) => m.content).concat(last.content);
  const text = last.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const urls = new Set();
  for (const b of allContent) {
    for (const c of b.citations || []) if (c.url) urls.add(c.url);
    if (b.type === "web_fetch_tool_result" && b.content?.url) urls.add(b.content.url);
  }
  return { text, sources: [...urls].slice(0, 25), usage: last.usage };
}

const drinkSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "price", "type", "desc"],
  properties: {
    name: { type: "string" },
    price: { type: ["string", "null"], description: 'Exactly as listed, e.g. "$6.00 / $9.75" for 6oz/12oz; null if unknown' },
    type: { type: "string", enum: TYPES },
    desc: { type: "string", description: "Short ingredients/description; empty string if none" },
  },
};
const boothSchemaFor = (anchorIds, countryIds) => ({
  type: "object",
  additionalProperties: false,
  required: ["name", "country", "anchor", "where", "opens", "closes", "note", "drinks"],
  properties: {
    name: { type: "string" },
    country: { type: "string", enum: countryIds },
    anchor: { type: "string", enum: anchorIds },
    where: { type: "string", description: "Location wording as published, e.g. 'Between Germany and Italy'" },
    opens: { type: ["string", "null"], description: "YYYY-MM-DD if this booth opens later than the festival start, else null" },
    closes: { type: ["string", "null"], description: "YYYY-MM-DD if this booth closes before the festival end, else null" },
    note: { type: "string" },
    drinks: { type: "array", items: drinkSchema },
  },
});
const boothSchema = boothSchemaFor(ANCHOR_IDS, COUNTRY_IDS);

const FESTIVAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["festival", "nextFestival", "booths"],
  properties: {
    festival: {
      type: "object",
      additionalProperties: false,
      required: ["name", "year", "starts", "ends", "active"],
      properties: {
        name: { type: "string", description: "Festival whose menu is in booths. Empty string if none." },
        year: { type: "integer" },
        starts: { type: ["string", "null"] },
        ends: { type: ["string", "null"] },
        active: { type: "boolean", description: "true if running today" },
      },
    },
    nextFestival: {
      type: "object",
      additionalProperties: false,
      required: ["name", "starts"],
      properties: { name: { type: "string" }, starts: { type: ["string", "null"] } },
    },
    booths: { type: "array", items: boothSchema },
  },
};
const YEAR_ROUND_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["booths"],
  properties: { booths: { type: "array", items: boothSchema } },
};

const anchorGuide = () => Object.entries(ANCHORS).map(([id, a]) => `- ${id}: ${a.name}`).join("\n");
const countryGuide = () => COUNTRIES.map((c) => `- ${c.id}: ${c.name}`).join("\n");
// Outside EPCOT: every land and drink spot, with the land each spot is in.
export const parkAnchorGuide = (park) => anchorIdsFor(park).map((id) => {
  const a = ALL_ANCHORS[id];
  return `- ${id}: ${a.name}${a.kind === "land" ? " (the whole land — use only for carts or spots not listed)" : a.land ? ` (${ALL_ANCHORS[a.land]?.name})` : ""}`;
}).join("\n");

/** Second pass: research notes → strict JSON. */
async function toJSON(notes, schema, instructions, { mapping } = {}) {
  const prompt = `${instructions}

${mapping || `Map each booth/location to:
• country — the cuisine/country it represents, or "park" if none. Allowed ids:
${countryGuide()}
• anchor — where it physically is in EPCOT (pick the closest). Allowed ids:
${anchorGuide()}`}

Drink type must be one of: ${TYPES.join(", ")} ("na" = non-alcoholic, "flight" = any flight or pairing).
If a drink has a non-alcoholic and a spirited version at different prices, list them as two drinks.
Only include beverages (no food). Keep prices exactly as published. Dates as YYYY-MM-DD.

RESEARCH NOTES:
${notes}`;
  const base = { model: MODEL(), max_tokens: 32000, messages: [{ role: "user", content: prompt }] };
  try {
    const out = await claude({ ...base, output_config: { format: { type: "json_schema", schema } } });
    return JSON.parse(out.content.find((b) => b.type === "text").text);
  } catch (e) {
    if (e.status !== 400) throw e;
    // Fallback if structured outputs aren't available for the chosen model.
    const out = await claude({ ...base, messages: [{ role: "user", content: prompt + "\n\nReply with ONLY the JSON object, matching this JSON Schema:\n" + JSON.stringify(schema) }] });
    const t = out.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    return JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
  }
}

const SYSTEM = `You research beverage menus at EPCOT (Walt Disney World) for a family's phone app.
Accuracy matters more than completeness: only report drinks you found in a source, never invent items or prices.
Prefer Disney's official pages and the most recently published articles; menus change during festivals
(booths open late, items rotate, some get replaced), so favor newer information and say when something changed.`;

export async function researchFestival(prev) {
  const today = todayET();
  const notes = await research(SYSTEM, `Today is ${today} (Orlando time).

1. Which EPCOT festival is running today (International Festival of the Arts, Flower & Garden, Food & Wine, Festival of the Holidays — or none)? Give its official dates. If none is running today, name the NEXT one and its start date.
2. For the festival running today — or, if none is running, the next festival if its menus have been published — list EVERY beverage (alcoholic and non-alcoholic) at every festival booth/marketplace/kitchen/studio, plus festival-exclusive drinks at permanent locations and carts (e.g. Joffrey's, Connections Eatery, CommuniCore, pavilion carts).
   For each booth: name, which country/cuisine it represents, exact location wording, opening/closing dates if different from the festival dates, and each drink's exact name, price(s) as published and short description.
3. Note anything that changed recently (booths opening later, items swapped or discontinued).
${prev?.festival?.name ? `\nFor reference, our current data is for "${prev.festival.name}" (checked ${String(prev.checkedAt).slice(0, 10)}). Re-verify rather than copying.` : ""}

Search several sources, cross-check them, and write complete, organized notes grouped by booth. Include the URLs you relied on.`);

  const data = await toJSON(notes.text, FESTIVAL_SCHEMA,
    `Convert these research notes about EPCOT festival drinks into JSON. Today is ${today}. "festival" is the festival whose drinks are listed in booths (active=false if it hasn't started yet). If no festival menu is known, return an empty booths array and festival.name "".`);

  const booths = cleanBooths(data.booths);
  const f = data.festival || {};
  const festival = f.name ? { name: f.name, year: f.year || Number(today.slice(0, 4)), starts: f.starts, ends: f.ends, active: !!f.active } : { name: "", year: Number(today.slice(0, 4)), starts: null, ends: null, active: false };

  // Sanity checks — never replace a good menu with a thin or empty one by mistake.
  const drinkCount = booths.reduce((n, b) => n + b.drinks.length, 0);
  if (festival.name && drinkCount < 15) throw new Error(`Research found only ${drinkCount} drinks for ${festival.name}; keeping previous menu`);

  return {
    festival,
    nextFestival: data.nextFestival?.name ? data.nextFestival : null,
    booths,
    sources: notes.sources,
    checkedAt: new Date().toISOString(),
    origin: "claude",
    model: MODEL(),
  };
}

export async function researchYearRound() {
  const today = todayET();
  const notes = await research(SYSTEM, `Today is ${today}. List the signature drinks available YEAR-ROUND (not festival-only) at EPCOT's World Showcase pavilions right now — bars, lounges, walk-up windows, kiosks and quick-service spots.
Cover all 11 pavilions: Mexico (e.g. La Cava del Tequila, Choza de Margarita), Norway, China, Germany, Italy, The American Adventure, Japan, Morocco, France (e.g. Les Vins des Chefs de France), United Kingdom (e.g. Rose & Crown Pub), Canada.
For each pavilion give 3–8 standout drinks with the location name, exact price as currently listed (if you can find it) and a short description. Include at least one non-alcoholic option per pavilion when one exists. Use current menus only and include source URLs.`, { maxSearches: 12, maxFetches: 8 });

  const data = await toJSON(notes.text, YEAR_ROUND_SCHEMA,
    "Convert these notes about year-round EPCOT World Showcase drinks into JSON. Each booth is one bar/kiosk/restaurant; use its pavilion as country and anchor (usa → anchor 'america'). opens/closes should be null.");
  const booths = cleanBooths(data.booths, { yearRound: true });
  const drinkCount = booths.reduce((n, b) => n + b.drinks.length, 0);
  if (drinkCount < 10) throw new Error(`Year-round research found only ${drinkCount} drinks; keeping previous list`);
  return { booths, sources: notes.sources, checkedAt: new Date().toISOString(), origin: "claude", model: MODEL() };
}

// ── Magic Kingdom, Hollywood Studios, Animal Kingdom ───────────────────────
// No festivals here: one list of what every bar, lounge, restaurant, stand and cart pours today.
const PARK_FOCUS = {
  mk: "Magic Kingdom only serves alcohol at table-service restaurants and The Beak and Barrel lounge, so include those beer/wine/cocktail lists, plus signature non-alcoholic drinks at quick-service spots, snack stands and carts (DOLE Whip floats at Aloha Isle, LeFou's Brew at Gaston's Tavern, frozen drinks, Joffrey's specialty coffees, seasonal specials).",
  hs: "Include Oga's Cantina and Star Wars: Galaxy's Edge (Milk Stand, Docking Bay 7, Kat Saka's Kettle, Ronto Roasters), Toy Story Land, BaseLine Tap House, the Hollywood Brown Derby Lounge, Tune-In Lounge (50's Prime Time Café), Sci-Fi Dine-In, Roundup Rodeo BBQ, quick-service spots, stands and carts.",
  tl: "Typhoon Lagoon is a water park: include Let's Go Slurpin', Leaning Palms, Typhoon Tilly's, Snack Shack, Lowtide Lou's, Surf Doggies and the Joffrey's carts.",
  bb: "Blizzard Beach is a water park: include Polar Pub, Frostbite Freddy's Frozen Freshments, Lottawatta Lodge, Avalunch, Warming Hut and the Joffrey's carts. It closes part of the year for refurbishment; list its drinks as served when open.",
  ak: "Include Nomad Lounge, Pongu Pongu and Satu'li Canteen (Pandora), Dawa Bar, Thirsty River Bar, Tusker House, Tiffins, Yak & Yeti (restaurant, Quality Beverages, Local Food Cafés), Harambe Market, Isle of Java, Warung Outpost, quick-service spots, stands and carts.",
};

export async function researchPark(park) {
  const today = todayET();
  const P = PARKS[park];
  const ids = anchorIdsFor(park);
  const notes = await research(SYSTEM.replace("at EPCOT", `at ${P.name}`), `Today is ${today} (Orlando time). List every beverage currently served at ${P.name} (Walt Disney World): cocktails, beer, cider, wine by the glass, flights, and signature/specialty non-alcoholic drinks (floats, frozen drinks, specialty lemonades, specialty coffees, souvenir drinks).
${PARK_FOCUS[park] || ""}
Skip generic fountain sodas, bottled water, milk, juice and plain coffee/tea. Skip drinks only sold at separately ticketed after-hours parties; include seasonal drinks everyone can buy and say when they end.
For each location give its exact name, which land it is in, and each drink's exact name, price as published and a short description. Prefer menus verified in the last few weeks (touringplans.com menus show a "last verified" date). Include the URLs you relied on.`, { maxSearches: 14, maxFetches: 14, domains: PARK_SOURCES });

  const schema = { type: "object", additionalProperties: false, required: ["booths"], properties: { booths: { type: "array", items: boothSchemaFor(ids, ["park"]) } } };
  const data = await toJSON(notes.text, schema,
    `Convert these notes about drinks at ${P.name} into JSON. Each booth is one bar, restaurant, stand or cart. country is always "park". opens/closes are null unless a drink list is seasonal (e.g. closes on the last day of Halloween season). Put the land name in "where".`,
    { mapping: `anchor — which spot at ${P.name} the location is (pick the exact spot when it's listed, otherwise its land). Allowed ids:\n${parkAnchorGuide(park)}` });
  const booths = cleanBooths(data.booths, { yearRound: true, park });
  const drinkCount = booths.reduce((n, b) => n + b.drinks.length, 0);
  if (drinkCount < 15) throw new Error(`${P.short} research found only ${drinkCount} drinks; keeping previous list`);
  return { booths, sources: notes.sources, checkedAt: new Date().toISOString(), origin: "claude", model: MODEL() };
}
