# 🗺️🍹 Epcot Sips

A phone app for the whole family, built around live maps of the Walt Disney World parks: the four theme parks (EPCOT is the default, then Magic Kingdom, Hollywood Studios and Animal Kingdom) and both water parks (Typhoon Lagoon and Blizzard Beach). Tap the park landmark at the top left to switch parks. EPCOT's menu follows the festivals all year: Food & Wine, then the Festival of the Holidays, then the Festival of the Arts in January, then Flower & Garden, and year-round pavilion drinks in between. The other parks list every bar, lounge, restaurant, stand and cart that pours something worth trying.

## What it does

- **Map of EPCOT.** The map is 1:1 with the real park: the lagoon, walkways, gardens and building footprints come from OpenStreetMap (the same geography as the map in the Disney World app), drawn in an illustrated style with a landmark for each pavilion (pyramid, pagoda, Eiffel Tower and so on) and a drink count. Festival booths show as flag pins. North is at the bottom, so the gates are at the bottom and World Showcase is at the top, like Disney's printed park maps.
- **Maps of the other parks.** Magic Kingdom, Hollywood Studios, Animal Kingdom, Typhoon Lagoon and Blizzard Beach are drawn the same way, 1:1 from OpenStreetMap, each turned so its gates are at the bottom (Magic Kingdom and Animal Kingdom north-up, Hollywood Studios with north to the right, like Disney's maps). The park's landmark is drawn on its real footprint: Cinderella Castle, the Tower of Terror, the Tree of Life, Miss Tilly on Mount Mayday, the Mount Gushmore ski jump; water slides are drawn in too. Zoomed out you see one illustrated marker per land with its drink count; zoom in (or tap a land) and every bar, restaurant, stand and cart appears as a pin at its real spot.
  - **Land colors:** every land has its own look: a soft ground color on the map (Fantasyland pink, Tomorrowland blue, Frontierland desert orange…) plus a matching name plate, pins and drawer accent. EPCOT's four neighborhoods get the same treatment.
  - **Finding a drink:** busy lands and restaurants get a search box and a chip for each bar or stand in the drawer, so you can narrow 100+ drinks to the one you want.
  - **Day and night:** the map follows the real sun over the park. It turns golden around sunrise and sunset, and after dark the walkway lamps, pavilions and Spaceship Earth light up. Add `?sky=21:30` to the URL to preview any time of day.
  - **Moving around:** pinch to zoom, drag to pan. Tap a pavilion to open a drawer with its drinks.
  - **Your location:** the locate button shows a blue "you are here" dot and walking times.
  - **Filters:** a collapsible panel. Turn the festival and year-round drinks on or off. Filter by cocktails, frozen, beer, wine, kid-friendly, coffee, open now, new this week, haven't tried, or your wishlist.
- **List view.** Shows the same drinks in walking order around the park. You can also sort by closest to you, cheapest, or family favorites.
- **Family.** Each person picks their name on their own phone and checks in drinks (tried it, a 1–5 ★ rating, a ♥ wishlist, tasting notes). The Family tab has a leaderboard, favorites, a most-wanted list and a live feed of check-ins.
- **Passport.** A stamp for each park you've sipped in, and a stamp for every World Showcase and festival country. Country stamps only come from EPCOT drinks (a Mexican beer at Magic Kingdom doesn't stamp Mexico). Every drink you've tried is listed, grouped by festival or park, so what you had in September is still there in January. Stamp every country and the screen fills with fireworks (once per person per festival; replay them from the passport).
- **Home Screen app.** You can add it to your phone's Home Screen, and it still opens when park Wi-Fi is spotty.

## How it stays current

```
every morning 5:10am ET  →  daily-check (scheduled function)
                              │  due? (EPCOT menu > 3 days old, a festival started/ended,
                              │        EPCOT year-round list or another park > 21 days old)
                              ▼
                           refresh (background function, up to 15 min)
                              1. Claude searches Disney + trusted Disney news sites
                                 for the festival running today (or the next one)
                              2. a second pass turns the findings into strict JSON
                              3. sanity checks → saved to Netlify Blobs
                              4. more parks queued? hand them to a fresh run
                                 (one park per run, so it never hits the time limit)
```

- **Self-healing.** If a scheduled run is missed, the app starts a refresh itself the next time someone opens it and the menu is overdue.
- **Safe failures.** The new menu is only saved if it passes checks (for example, it must have at least 15 drinks). If a refresh fails, the last good menu stays.
- **Refresh now.** Tap the festival name at the top of the app to see sources and refresh status, and to trigger a refresh by hand.
- **Between festivals** (for example, Dec 31 to mid-January), the map shows year-round pavilion drinks plus "Coming: Festival of the Arts". Upcoming booths are marked with their opening date.
- **Family fixes.** Anyone can add a missing drink (＋) or mark one sold out for the day. The sold-out flag clears itself the next day.

## Deploy

Netlify's drag-and-drop deploy **can't run functions**. Use GitHub or the CLI.

**GitHub (recommended)**
1. Put this folder in a new GitHub repo. Don't include `node_modules`.
2. In Netlify, go to **Add new site → Import an existing project** and pick the repo, then deploy. The settings come from `netlify.toml`.

**CLI**
```bash
npm install
npx netlify-cli login
npx netlify-cli deploy --build --prod
```

### Update the menu by hand (no API key, no cost to the site)
1. In the app, tap the **gear** (Settings) and enter the menu password (`REFRESH_CODE`).
2. Pick the park at the top of Settings (each park has its own prompt), then tap **Copy prompt** and paste it into a new chat at claude.ai with web search on. The prompt already includes today's date and every map spot (for the other parks, every bar, restaurant and stand with its land), country and drink type the app accepts.
3. Save Claude's JSON reply as a file (or copy the whole reply), then upload or paste it under **Upload the reply** and tap **Check it**.
4. The app shows what it found (festival, dates, booth and drink counts) and anything it had to fix. Tap **Update the map** to publish it for everyone.

It never replaces a menu with a thin one: the festival needs at least 15 drinks, EPCOT's year-round list at least 10 and another park's list at least 15. A reply for the wrong park is refused. The previous festival menu is kept in storage as a backup.

### Menu refreshes with an API key (you choose when Claude runs)
The app never calls Claude on its own unless you say so:

- **No key set:** Claude is never called. The app uses the starter menu.
- **`EPCOT_SIPS_CLAUDE_KEY` set:** the menu updates only when someone taps **Refresh the menu now**.
- **`EPCOT_SIPS_CLAUDE_KEY` + `AUTO_REFRESH=on`:** it also refreshes on its own (daily check, and when someone opens an overdue menu).

The app deliberately ignores `ANTHROPIC_API_KEY` and `ANTHROPIC_BASE_URL`. Netlify's AI Gateway injects those into functions automatically and bills the usage to your Netlify credits; this app always calls `api.anthropic.com` with your own key instead.

1. Get an API key at https://console.anthropic.com. Consider setting a monthly spend limit there.
2. In Netlify, go to **Site configuration → Environment variables** and add the ones you need:

| Key | Value | |
| --- | --- | --- |
| `EPCOT_SIPS_CLAUDE_KEY` | `sk-ant-…` | **Required** for any refresh |
| `AUTO_REFRESH` | `on` | Optional. Leave unset for manual-only refreshes |
| `REFRESH_CODE` | a password | Password for Settings: manual menu uploads and API refreshes (the phone remembers it after one correct try) |
| `FAMILY_CODE` | e.g. `figment` | Optional passcode for making changes |
| `REFRESH_DAYS` | `3` | Optional. How often to re-check mid-festival |
| `ANTHROPIC_MODEL` | `claude-sonnet-5` | Optional model override |

3. Redeploy. Then open the app, tap the festival name at the top, and tap **Refresh the menu now**. Set `REFRESH_CODE` too, or anyone with the link can start a refresh. The first full research run takes a few minutes.

**Cost:** each refresh runs a web-research session (up to ~26 searches and page reads) followed by a formatting pass. With `AUTO_REFRESH=on` at the default schedule that's roughly 10–12 refreshes a month, and the exact cost depends on the model and how many pages it reads. Check your usage in the Anthropic Console after the first run and set a spend limit you're comfortable with. Raising `REFRESH_DAYS` makes it cheaper.

Without the key, the app still works using the starter menus (2026 Food & Wine, current as of Sept 24, 2026; the other parks from TouringPlans' menus verified Sept 2026), but it won't update itself.

## Files

```
public/                       front end (map, list, family, passport; no build step)
netlify/functions/api.mjs     app API
netlify/functions/refresh.mjs background menu researcher
netlify/functions/daily-check.mjs  daily schedule
netlify/lib/menu.mjs          storage, ids, "is a refresh due?"
netlify/lib/research.mjs      Claude web research + JSON conversion
data/places.mjs               EPCOT: real pavilion coordinates, map spots, countries
data/drinks.mjs               EPCOT starter menu / fallback
data/parks.mjs                the four parks, and every map spot in each
data/parks/{mk,hs,ak,tl,bb}.mjs  each park's lands (with their colors), drink spots (OpenStreetMap positions) and starter menu
public/maps/<park>.js         park footprints for the maps (generated)
scripts/build-map.mjs         rebuilds the maps from OpenStreetMap: node scripts/build-map.mjs [park]
```

Ratings are saved with a snapshot of each drink, so your passport keeps its history after a festival's menu is replaced.

Please enjoy responsibly. The Kid-friendly filter shows every non-alcoholic drink.
