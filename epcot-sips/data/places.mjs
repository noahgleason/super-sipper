// Real-world coordinates for EPCOT (from Google Places, Sept 2026).
// The map is drawn from these, so the "you are here" dot lines up with the park.

export const PAVILIONS = {
  mexico:  { lat: 28.3715732, lng: -81.5474780, name: "Mexico",         glyph: "pyramid" },
  norway:  { lat: 28.3704748, lng: -81.5470250, name: "Norway",         glyph: "stave" },
  china:   { lat: 28.3699373, lng: -81.5469085, name: "China",          glyph: "temple" },
  germany: { lat: 28.3682286, lng: -81.5470909, name: "Germany",        glyph: "clock" },
  italy:   { lat: 28.3675495, lng: -81.5481423, name: "Italy",          glyph: "campanile" },
  america: { lat: 28.3675562, lng: -81.5493722, name: "The American Adventure", glyph: "colonial" },
  japan:   { lat: 28.3676050, lng: -81.5507920, name: "Japan",          glyph: "pagoda" },
  morocco: { lat: 28.3683445, lng: -81.5516149, name: "Morocco",        glyph: "minaret" },
  france:  { lat: 28.3692695, lng: -81.5525557, name: "France",         glyph: "eiffel" },
  uk:      { lat: 28.3704824, lng: -81.5518782, name: "United Kingdom", glyph: "tudor" },
  canada:  { lat: 28.3715670, lng: -81.5512794, name: "Canada",         glyph: "lodge" },
};

// Walking order around World Showcase, clockwise on the Disney-style map
// (Mexico on the left, Canada on the right).
export const RING = ["mexico", "norway", "china", "germany", "italy", "america", "japan", "morocco", "france", "uk", "canada"];

export const LANDMARKS = {
  "spaceship-earth": { lat: 28.3754780, lng: -81.5493830, name: "Spaceship Earth", glyph: "sphere" },
  communicore:       { lat: 28.3738053, lng: -81.5501105, name: "CommuniCore Hall" },
  "test-track":      { lat: 28.3729193, lng: -81.5473327, name: "Test Track" },
  "mission-space":   { lat: 28.3739735, lng: -81.5468587, name: "Mission: SPACE" },
  guardians:         { lat: 28.3747463, lng: -81.5478364, name: "Cosmic Rewind" },
  odyssey:           { lat: 28.3722884, lng: -81.5480704, name: "Odyssey Pavilion" },
  "the-land":        { lat: 28.3740066, lng: -81.5519644, name: "The Land" },
  imagination:       { lat: 28.3727435, lng: -81.5514664, name: "Imagination!" },
  seas:              { lat: 28.3749084, lng: -81.5506814, name: "The Seas" },
};

// Extra named spots where festival booths often sit (placed from OpenStreetMap footprints).
const EXTRA = {
  "showcase-plaza":        { lat: 28.37145, lng: -81.54939, name: "Showcase Plaza" },
  "plaza-mexico-side":     { lat: 28.37150, lng: -81.54850, name: "Showcase Plaza (Mexico side)" },
  "plaza-canada-side":     { lat: 28.37150, lng: -81.55030, name: "Showcase Plaza (Canada side)" },
  "port-of-entry":         { lat: 28.37170, lng: -81.54980, name: "Near Port of Entry" },
  "disney-traders":        { lat: 28.37170, lng: -81.54899, name: "Near Disney Traders" },
  "culinary-corridor":     { lat: 28.37225, lng: -81.55030, name: "Walkway by Imagination" },
  "east-walkway":          { lat: 28.37225, lng: -81.54830, name: "Walkway by Test Track" },
  creations:               { lat: 28.37356, lng: -81.54885, name: "Near Creations Shop" },
  connections:             { lat: 28.37445, lng: -81.54905, name: "Connections Eatery" },
};

const mid = (a, b) => ({ lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 });

// Anchors: every place a booth can be pinned to.
export const ANCHORS = (() => {
  const out = {};
  for (const [id, p] of Object.entries(PAVILIONS)) out[id] = { ...p, kind: "pavilion" };
  for (let i = 0; i < RING.length - 1; i++) {
    const a = RING[i], b = RING[i + 1];
    out[`${a}-${b}`] = { ...mid(PAVILIONS[a], PAVILIONS[b]), name: `Between ${PAVILIONS[a].name} and ${PAVILIONS[b].name}`, kind: "between" };
  }
  for (const [id, p] of Object.entries(LANDMARKS)) out[id] = { ...p, kind: "landmark" };
  for (const [id, p] of Object.entries(EXTRA)) out[id] = { ...p, kind: "spot" };
  return out;
})();

export const ANCHOR_IDS = Object.keys(ANCHORS);

// Countries a drink can belong to. Festival "countries" beyond the 11 pavilions
// come and go, so this list is generous. "park" = not tied to a country.
export const COUNTRIES = [
  { id: "mexico", name: "Mexico", flag: "🇲🇽", pavilion: true },
  { id: "norway", name: "Norway", flag: "🇳🇴", pavilion: true },
  { id: "china", name: "China", flag: "🇨🇳", pavilion: true },
  { id: "germany", name: "Germany", flag: "🇩🇪", pavilion: true },
  { id: "italy", name: "Italy", flag: "🇮🇹", pavilion: true },
  { id: "usa", name: "United States", flag: "🇺🇸", pavilion: true },
  { id: "japan", name: "Japan", flag: "🇯🇵", pavilion: true },
  { id: "morocco", name: "Morocco", flag: "🇲🇦", pavilion: true },
  { id: "france", name: "France", flag: "🇫🇷", pavilion: true },
  { id: "uk", name: "United Kingdom", flag: "🇬🇧", pavilion: true },
  { id: "canada", name: "Canada", flag: "🇨🇦", pavilion: true },
  { id: "india", name: "India", flag: "🇮🇳" },
  { id: "africa", name: "Africa", flag: "🌍" },
  { id: "alps", name: "The Alps", flag: "🏔️" },
  { id: "spain", name: "Spain", flag: "🇪🇸" },
  { id: "greece", name: "Greece", flag: "🇬🇷" },
  { id: "belgium", name: "Belgium", flag: "🇧🇪" },
  { id: "brazil", name: "Brazil", flag: "🇧🇷" },
  { id: "australia", name: "Australia", flag: "🇦🇺" },
  { id: "hawaii", name: "Hawaiʻi", flag: "🌺" },
  { id: "ireland", name: "Ireland", flag: "🇮🇪" },
  { id: "poland", name: "Poland", flag: "🇵🇱" },
  { id: "korea", name: "South Korea", flag: "🇰🇷" },
  { id: "philippines", name: "Philippines", flag: "🇵🇭" },
  { id: "caribbean", name: "Caribbean", flag: "🏝️" },
  { id: "argentina", name: "Argentina", flag: "🇦🇷" },
  { id: "scandinavia", name: "Scandinavia", flag: "❄️" },
  { id: "park", name: "Around the Park", flag: "✨" },
];
export const COUNTRY_IDS = COUNTRIES.map((c) => c.id);

// Which pavilion anchor a country's booths default to on the map.
export const COUNTRY_HOME = {
  mexico: "mexico", norway: "norway", china: "china", germany: "germany", italy: "italy",
  usa: "america", japan: "japan", morocco: "morocco", france: "france", uk: "uk", canada: "canada",
};

export const TYPES = ["beer", "cider", "wine", "sparkling", "cocktail", "frozen", "flight", "na", "coffee"];
