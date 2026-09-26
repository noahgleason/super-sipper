// The four Walt Disney World theme parks. EPCOT (pavilions, festivals, passport countries) lives in
// places.mjs + drinks.mjs; each other park's lands, drink spots and starter menu live in parks/<id>.mjs.
import { ANCHORS as EPCOT_ANCHORS } from "./places.mjs";
import * as mk from "./parks/mk.mjs";
import * as hs from "./parks/hs.mjs";
import * as ak from "./parks/ak.mjs";

const OTHER = { mk, hs, ak };

// center: for "you're at a different park" detection. accent: header colors outside festival season.
export const PARKS = {
  epcot: { id: "epcot", name: "EPCOT", short: "EPCOT", center: { lat: 28.3720, lng: -81.5494 }, accent: ["#1f5fa8", "#c9982e"], festivals: true },
  mk: { id: "mk", name: "Magic Kingdom", short: "Magic Kingdom", center: { lat: 28.4190, lng: -81.5812 }, accent: ["#2b4c9a", "#d9a520"] },
  hs: { id: "hs", name: "Disney's Hollywood Studios", short: "Hollywood Studios", center: { lat: 28.3573, lng: -81.5600 }, accent: ["#8f1d2c", "#d4a441"] },
  ak: { id: "ak", name: "Disney's Animal Kingdom", short: "Animal Kingdom", center: { lat: 28.3590, lng: -81.5905 }, accent: ["#2f6b3a", "#d98a2b"] },
};
export const PARK_IDS = Object.keys(PARKS);
export const OTHER_PARK_IDS = Object.keys(OTHER);

// Every map spot in every park. EPCOT keeps its original ids so saved check-ins still line up;
// the other parks' ids are prefixed ("mk-aloha-isle").
export const ALL_ANCHORS = (() => {
  const out = {};
  for (const [id, a] of Object.entries(EPCOT_ANCHORS)) out[id] = { ...a, park: "epcot" };
  for (const [park, P] of Object.entries(OTHER)) {
    for (const [id, l] of Object.entries(P.LANDS)) out[id] = { ...l, kind: "land", park };
    for (const [id, v] of Object.entries(P.VENUES)) out[id] = { ...v, kind: "venue", park };
  }
  return out;
})();
export const anchorIdsFor = (park) => Object.keys(ALL_ANCHORS).filter((id) => ALL_ANCHORS[id].park === park);

// What the app needs per park: walking order and a default spot for drinks with no better place.
export const PARK_META = Object.fromEntries(PARK_IDS.map((id) => [id, {
  ...PARKS[id],
  walk: OTHER[id]?.WALK || null,
  home: OTHER[id] ? Object.keys(OTHER[id].LANDS)[0] : "showcase-plaza",
}]));

export const parkSeed = (id) => OTHER[id] && { booths: OTHER[id].BOOTHS, checked: OTHER[id].CHECKED, sources: OTHER[id].SOURCES };
