// Builds public/map-data.js: EPCOT's real footprints (lagoon, walkways, gardens, buildings)
// from OpenStreetMap, projected to meters and simplified, so the map is 1:1 with the park.
//
//   node scripts/build-map.mjs            # download from Overpass
//   node scripts/build-map.mjs osm.json   # use a saved Overpass response
//
// Map data © OpenStreetMap contributors (ODbL).
import fs from "node:fs";

const BBOX = [28.3655, -81.5555, 28.3775, -81.5440]; // S, W, N, E
const QUERY = `[out:json][timeout:100];(way(${BBOX});relation(${BBOX})[natural=water];);out geom;`;
const MIRRORS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];

async function download() {
  for (const url of MIRRORS) {
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" }, body: "data=" + encodeURIComponent(QUERY) });
      if (res.ok) return await res.json();
      console.warn(`${url}: ${res.status}`);
    } catch (e) { console.warn(`${url}: ${e.message}`); }
  }
  throw new Error("Every Overpass mirror failed");
}

const osm = process.argv[2] ? JSON.parse(fs.readFileSync(process.argv[2], "utf8")) : await download();

// Same projection as the app: meters from the origin, north at the bottom (gates at the bottom
// of the screen, World Showcase at the top, like Disney's printed maps).
const ORIGIN = { lat: 28.3695, lng: -81.5495 };
const KX = Math.cos(ORIGIN.lat * Math.PI / 180) * 111320, KY = 110540;
const proj = (p) => [-(p.lon - ORIGIN.lng) * KX, (p.lat - ORIGIN.lat) * KY];

function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
    let best = -1, bd = tol;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / L;
      if (d > bd) { bd = d; best = i; }
    }
    if (best > 0) { keep[best] = 1; stack.push([a, best], [best, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const area = (r) => { let s = 0; for (let i = 0; i < r.length; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length]; s += x1 * y2 - x2 * y1; } return Math.abs(s / 2); };
const f1 = (n) => (Math.round(n * 10) / 10).toString();
function pathD(rings, closed) {
  return rings.map((r) => {
    let d = "", px = 0, py = 0;
    r.forEach(([x, y], i) => {
      // absolute first point, then relative moves: much smaller output
      if (!i) d += `M${f1(x)} ${f1(y)}`;
      else d += `l${f1(x - px)} ${f1(y - py)}`;
      px = Math.round(x * 10) / 10; py = Math.round(y * 10) / 10;
    });
    return closed ? d + "z" : d;
  }).join("");
}

// Stitch multipolygon member ways into closed rings.
function stitch(ways) {
  const segs = ways.map((w) => w.slice()), rings = [];
  const same = (a, b) => a.lat === b.lat && a.lon === b.lon;
  while (segs.length) {
    let ring = segs.shift();
    let grew = true;
    while (!same(ring[0], ring[ring.length - 1]) && grew) {
      grew = false;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i], end = ring[ring.length - 1];
        if (same(s[0], end)) ring = ring.concat(s.slice(1));
        else if (same(s[s.length - 1], end)) ring = ring.concat(s.slice(0, -1).reverse());
        else continue;
        segs.splice(i, 1); grew = true; break;
      }
    }
    rings.push(ring);
  }
  return rings;
}

const layers = {};
const add = (layer, rings, closed = true) => { rings = rings.filter((r) => r && r.length > 1); if (rings.length) (layers[layer] ||= []).push(pathD(rings, closed)); };
const labels = {};
const closedWay = (g) => g.length > 3 && g[0].lat === g[g.length - 1].lat && g[0].lon === g[g.length - 1].lon;
// Closed rings start and end on the same point, so simplify them as two open halves.
const ringOf = (g, tol) => {
  const p = g.map(proj), h = p.length >> 1;
  const r = [...simplify(p.slice(0, h + 1), tol).slice(0, -1), ...simplify(p.slice(h), tol).slice(0, -1)];
  return r.length > 2 ? r : null;
};
const centroid = (r) => { let x = 0, y = 0; r.forEach((p) => { x += p[0]; y += p[1]; }); return [x / r.length, y / r.length]; };

for (const e of osm.elements) {
  const t = e.tags || {};
  if (e.type === "relation") {
    const outer = stitch(e.members.filter((m) => m.role === "outer" && m.geometry).map((m) => m.geometry));
    const inner = stitch(e.members.filter((m) => m.role === "inner" && m.geometry).map((m) => m.geometry));
    const rings = [...outer, ...inner].map((g) => ringOf(g, 0.6)).filter(Boolean);
    if (rings.length) add("water", rings);
    if (t.name === "World Showcase Lagoon") labels.lagoon = centroid(ringOf(outer[0], 1));
    continue;
  }
  const g = e.geometry;
  if (!g || g.length < 2) continue;
  const closed = closedWay(g);
  const poly = () => { const r = ringOf(g, 0.35); return r && area(r) > 4 ? r : null; };
  const line = (tol = 0.5) => simplify(g.map(proj), tol);

  if (t.tourism === "theme_park" && t.name === "EPCOT") { labels.park = true; add("park", [ringOf(g, 0.8)]); continue; }
  if (t.natural === "water" || t.leisure === "swimming_pool" || t.amenity === "fountain" && closed) { const r = poly(); if (r) add("water", [r]); continue; }
  if (t.waterway === "canal" || t.waterway === "stream") { add(closed ? "water" : "canal", [closed ? ringOf(g, 0.5) : line()], closed); continue; }
  if (t.building && t.building !== "no" || t.man_made === "bridge") {
    const r = poly(); if (!r) continue;
    const k = t.man_made === "bridge" ? "bridge" : t.building === "roof" ? "roof" : t.building === "greenhouse" ? "glass"
      : t.tourism === "attraction" || t.tourism === "gallery" || t.tourism === "aquarium" || t.building === "train_station" || t.building === "transportation" ? "attr" : "bld";
    add(k, [r]);
    if (t.name === "Spaceship Earth") labels.spaceshipEarth = centroid(r);
    if (t.name === "Disney Skyliner Station: Epcot-International Gateway") labels.gateway = centroid(r);
    if (t.name === "Epcot Ticket Booths") (labels.tickets ||= []).push(centroid(r));
    continue;
  }
  if (t.man_made === "pier" && closed) { const r = poly(); if (r) add("plaza", [r]); continue; }
  if (t.man_made === "pier") { add("pier", [line()], false); continue; }
  if (t.railway === "monorail") { add("monorail", [line(0.8)], false); continue; }
  if (t.railway === "platform" && closed) { const r = poly(); if (r) add("plaza", [r]); continue; }
  if (closed && (t.area === "yes" && t.highway || t["area:highway"])) { const r = poly(); if (r) add("plaza", [r]); continue; }
  if (t.highway === "pedestrian" || t.highway === "living_street") { add("walkW", [line()], false); continue; }
  if (t.highway === "footway" || t.highway === "steps" || t.highway === "corridor") { add("walk", [line()], false); continue; }
  if (t.highway === "path") { add("path", [line()], false); continue; }
  if (t.highway === "service" || t.highway === "unclassified" || t.highway === "busway") { add("service", [line(0.8)], false); continue; }
  if (["secondary", "tertiary"].includes(t.highway)) { add("road", [line(0.8)], false); continue; }
  if (t.amenity === "parking" && closed) { const r = poly(); if (r) add("parking", [r]); continue; }
  if (!closed) continue;
  if (t.landuse === "forest" || t.natural === "wood" || t.natural === "wetland") { const r = poly(); if (r) add("forest", [r]); continue; }
  if (t.landuse === "flowerbed") { const r = poly(); if (r) add("flowers", [r]); continue; }
  if (t.leisure === "garden" || t.leisure === "playground" || t.landuse === "grass" || t.leisure === "park") { const r = poly(); if (r) add("garden", [r]); continue; }
  if (t.natural === "beach" || t.natural === "sand" || t.natural === "bare_rock") { const r = poly(); if (r) add("sand", [r]); continue; }
}

const out = {
  origin: ORIGIN,
  labels,
  layers: Object.fromEntries(Object.entries(layers).map(([k, v]) => [k, v.join("")])),
};
const js = `// Generated by scripts/build-map.mjs. Do not edit by hand.\n// Map data © OpenStreetMap contributors (ODbL).\nexport const MAP = ${JSON.stringify(out)};\n`;
fs.writeFileSync(new URL("../public/map-data.js", import.meta.url), js);
console.log(`map-data.js: ${(js.length / 1024).toFixed(0)} KB`, Object.fromEntries(Object.entries(out.layers).map(([k, v]) => [k, `${(v.length / 1024).toFixed(0)}K`])), labels);
