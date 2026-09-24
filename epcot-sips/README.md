# 🗺️🍹 Epcot Sips

A phone app for the whole family, built around a live map of EPCOT. It keeps its drink menu up to date on its own, all year: Food & Wine, then the Festival of the Holidays, then the Festival of the Arts in January, then Flower & Garden, and year-round pavilion drinks in between.

## What it does

- **Map of EPCOT.** The map is drawn from the pavilions' real GPS coordinates. It's drawn like an illustrated park map: lagoon, promenade, trees, Future World buildings and a hand-drawn landmark for each pavilion (pyramid, pagoda, Eiffel Tower and so on) with a drink count. Festival booths show as flag pins. North is at the bottom so it matches Disney's park maps.
  - **Moving around:** pinch to zoom, drag to pan. Tap a pavilion to open a drawer with its drinks.
  - **Your location:** the locate button shows a blue "you are here" dot and walking times.
  - **Filters:** a collapsible panel. Turn the festival and year-round drinks on or off. Filter by cocktails, frozen, beer, wine, kid-friendly, coffee, open now, new this week, haven't tried, or your wishlist.
- **List view.** Shows the same drinks in walking order around the park. You can also sort by closest to you, cheapest, or family favorites.
- **Family.** Each person picks their name on their own phone and checks in drinks (tried it, a 1–5 ★ rating, a ♥ wishlist, tasting notes). The Family tab has a leaderboard, favorites, a most-wanted list and a live feed of check-ins.
- **Passport.** Country stamps plus every drink you've tried, grouped by festival, so what you had in September is still there in January.
- **Home Screen app.** You can add it to your phone's Home Screen, and it still opens when park Wi-Fi is spotty.

## How it stays current

```
every morning 5:10am ET  →  daily-check (scheduled function)
                              │  due? (menu > 3 days old, a festival started/ended,
                              │        or year-round list > 21 days old)
                              ▼
                           refresh (background function, up to 15 min)
                              1. Claude searches Disney + trusted Disney news sites
                                 for the festival running today (or the next one)
                              2. a second pass turns the findings into strict JSON
                              3. sanity checks → saved to Netlify Blobs
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

### Menu refreshes (you choose when Claude runs)
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
| `REFRESH_CODE` | a password | Optional. Required to tap **Refresh the menu now** (the phone remembers it after one correct try) |
| `FAMILY_CODE` | e.g. `figment` | Optional passcode for making changes |
| `REFRESH_DAYS` | `3` | Optional. How often to re-check mid-festival |
| `ANTHROPIC_MODEL` | `claude-sonnet-5` | Optional model override |

3. Redeploy. Then open the app, tap the festival name at the top, and tap **Refresh the menu now**. Set `REFRESH_CODE` too, or anyone with the link can start a refresh. The first full research run takes a few minutes.

**Cost:** each refresh runs a web-research session (up to ~26 searches and page reads) followed by a formatting pass. With `AUTO_REFRESH=on` at the default schedule that's roughly 10–12 refreshes a month, and the exact cost depends on the model and how many pages it reads. Check your usage in the Anthropic Console after the first run and set a spend limit you're comfortable with. Raising `REFRESH_DAYS` makes it cheaper.

Without the key, the app still works using the starter menu (2026 Food & Wine, current as of Sept 24, 2026), but it won't update itself.

## Files

```
public/                       front end (map, list, family, passport; no build step)
netlify/functions/api.mjs     app API
netlify/functions/refresh.mjs background menu researcher
netlify/functions/daily-check.mjs  daily schedule
netlify/lib/menu.mjs          storage, ids, "is a refresh due?"
netlify/lib/research.mjs      Claude web research + JSON conversion
data/places.mjs               real pavilion coordinates, map spots, countries
data/drinks.mjs               starter menu / fallback
```

Ratings are saved with a snapshot of each drink, so your passport keeps its history after a festival's menu is replaced.

Please enjoy responsibly. The Kid-friendly filter shows every non-alcoholic drink.
