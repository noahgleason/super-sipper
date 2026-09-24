// Epcot Sips — hand-drawn SVG art: UI icons, flags, pavilion landmarks, avatars.
// Everything here is original artwork, inlined so it works offline.

// ── UI icons (24×24, stroked) ────────────────────────────────────────────────
const P = {
  map: "M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z M9 4v13.5 M15 6.5V20",
  list: "M4 5h2M4 12h2M4 19h2M9.5 5H20M9.5 12H20M9.5 19H20",
  family: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5 M16 4.3a3.5 3.5 0 0 1 0 6.4 M17.5 14.8c2 .6 3.4 2.3 4 5.2",
  passport: "M5 3h14v18H5z M12 13.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M8.5 10h7 M12 6.5c-1.3 1.8-1.3 5.2 0 7 M12 6.5c1.3 1.8 1.3 5.2 0 7 M9 17.2h6",
  locate: "M12 2.5v3.5M12 18v3.5M2.5 12H6M18 12h3.5 M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z M12 13.2a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4z",
  fit: "M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5",
  plus: "M12 4.5v15M4.5 12h15",
  minus: "M4.5 12h15",
  filter: "M3.5 7H13M17 7h3.5M3.5 17H7M11 17h9.5 M15 4.5v5 M9 14.5v5",
  chevron: "M6 9.5l6 6 6-6",
  close: "M6 6l12 12M18 6 6 18",
  check: "M4.5 12.5l5 5L19.5 7",
  heart: "M12 20s-7.5-4.6-9-9.3C2 7.4 4.2 4.5 7.3 4.5c2 0 3.6 1.1 4.7 2.8 1.1-1.7 2.7-2.8 4.7-2.8 3.1 0 5.3 2.9 4.3 6.2C19.5 15.4 12 20 12 20z",
  star: "M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z",
  sparkle: "M11 3l1.8 5.2L18 10l-5.2 1.8L11 17l-1.8-5.2L4 10l5.2-1.8z M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z",
  pin: "M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3.5 2",
  refresh: "M20 4.5v5h-5 M4 19.5v-5h5 M19.2 9.5A7.5 7.5 0 0 0 5.6 7.5 M4.8 14.5a7.5 7.5 0 0 0 13.6 2",
  compass: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M15.5 8.5l-2 5-5 2 2-5z",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z M15.5 15.5 20.5 20.5",
  user: "M12 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21c.9-4 4-6.5 8-6.5s7.1 2.5 8 6.5",
  trophy: "M7 3.5h10V9a5 5 0 0 1-10 0z M7 5.5H3.5V7A3.5 3.5 0 0 0 7 10.5 M17 5.5h3.5V7a3.5 3.5 0 0 1-3.5 3.5 M12 14v3 M9 17h6v3.5H9z",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3c-2.8 2.6-2.8 15.4 0 18 M12 3c2.8 2.6 2.8 15.4 0 18",
  alert: "M12 3.5 21.5 20h-19z M12 10v4.5 M12 17.2v.01",
  ban: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M5.6 5.6l12.8 12.8",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v6 M12 7.6v.01",
  pencil: "M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4",
  trash: "M4 7h16 M9 7V4h6v3 M6 7l1 13.5h10L18 7 M10 11v6M14 11v6",
  walk: "M13.5 5.5a1.6 1.6 0 1 0 0-.01z M9 21l2.2-6.2L14 17.5V21 M7.5 12.5l2-4.5 4 1 2 3.2H19 M11.2 14.8 10.5 10",
  ticket: "M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z M14 7v10",
  arrow: "M5 12h14M13 6l6 6-6 6",
  gear: "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z M19.4 13.2l1.7 1.3-1.9 3.3-2-.8a7.5 7.5 0 0 1-2 1.2l-.3 2.1h-3.8l-.3-2.1a7.5 7.5 0 0 1-2-1.2l-2 .8-1.9-3.3 1.7-1.3a7.6 7.6 0 0 1 0-2.4L2.9 9.5l1.9-3.3 2 .8a7.5 7.5 0 0 1 2-1.2l.3-2.1h3.8l.3 2.1a7.5 7.5 0 0 1 2 1.2l2-.8 1.9 3.3-1.7 1.3a7.6 7.6 0 0 1 0 2.4z",
  upload: "M12 15.5V4 M7 9l5-5 5 5 M4 14.5V20h16v-5.5",
  copy: "M9 9h11v11H9z M5.5 15H4V4h11v1.5",
  lock: "M5 11h14v10H5z M8 11V7.5a4 4 0 0 1 8 0V11 M12 15v2.5",
  external: "M14 4h6v6 M20 4l-9 9 M18 14v6H4V6h6",
  // drink types
  beer: "M5 7.5h10V21H5z M15 10.5h2.5a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H15 M5 7.5C5 5.5 6.3 4.3 8 4.3c.8-1.2 2.6-1.5 3.6-.6 1.8-.5 3.6.8 3.4 3.8 M8.5 11.5v6 M11.5 11.5v6",
  cider: "M12 7.5c-1.5-1.5-6-1.8-7 2.5-.9 4 1.5 10.5 4.5 10.5 1.3 0 1.7-.6 2.5-.6s1.2.6 2.5.6c3 0 5.4-6.5 4.5-10.5-1-4.3-5.5-4-7-2.5z M12 7.5c0-2 1-3.5 3-4.5",
  wine: "M7 3h10l-.4 5.5a4.6 4.6 0 0 1-9.2 0z M12 13.2V20.5 M8 20.5h8 M7.3 7.2h9.4",
  sparkling: "M9 3h6l-.6 8.2a2.4 2.4 0 0 1-4.8 0z M12 13.8v6.7 M9 20.5h6 M11 6.5v.01 M13 8.5v.01 M11.8 10.5v.01",
  cocktail: "M4 4h16l-8 9z M12 13v7.5 M8 20.5h8 M15.5 4l3-2.2 M6.8 7h10.4",
  frozen: "M12 3v18 M4.2 7.5l15.6 9 M4.2 16.5l15.6-9 M9.5 4.5 12 6l2.5-1.5 M9.5 19.5 12 18l2.5 1.5 M4.8 10.3l2.6-.3-1-2.4 M19.2 13.7l-2.6.3 1 2.4",
  flight: "M2.5 16.5h19v3h-19z M4.5 8h3.8v8.5H4.5z M10.1 8h3.8v8.5h-3.8z M15.7 8h3.8v8.5h-3.8z",
  na: "M7 7.5h10V21H7z M7 11.5h10 M13 7.5V3.8l3-1.5",
  coffee: "M4 9h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z M17 11h1.5a2.5 2.5 0 0 1 0 5h-2 M8 3.5V6 M12 3.5V6",
  glass: "M5 5h14l-1.6 15.5H6.6z M5.5 10.5h13",
  // avatars
  castle: "M4 21V10h3V7h2v3h2V5.5L12 3l1 2.5V10h2V7h2v3h3v11h-6v-4a2 2 0 0 0-4 0v4z",
  rocket: "M12 2c3.5 2.5 5 6.5 4.5 11l-2 3h-5l-2-3C7 8.5 8.5 4.5 12 2z M12 11a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z M9.5 16 7 19.5h3 M14.5 16l2.5 3.5h-3 M11 19.5V22h2v-2.5",
  crown: "M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z",
  moon: "M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z",
  leaf: "M5 19C5 10 11 5 20 5c0 9-5 15-14 15 M5 19l8-8",
  anchor: "M12 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M12 7v14 M8 10.5h8 M4 13c0 4.5 3.5 8 8 8s8-3.5 8-8",
  fish: "M3 12c3-4 7-5.5 11-5 3 .5 5 2.5 7 5-2 2.5-4 4.5-7 5-4 .5-8-1-11-5z M3 12 1.8 8.8 M3 12l-1.2 3.2 M16.2 11h.01",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
  flower: "M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M12 9.5C9 7 10 3 12 3s3 4 0 6.5 M14.4 11.2c1.8-3.4 5.8-3.1 6.4-1.2s-2.6 4.3-6.2 3 M13.5 14.1c3.6 1.4 3.3 5.4 1.6 6.4-1.7 1.1-4-1.2-3.3-4.8 M10.5 14.1c-3.6 1.4-3.3 5.4-1.6 6.4 1.7 1.1 4-1.2 3.3-4.8 M9.6 11.2C7.8 7.8 3.8 8.1 3.2 10s2.6 4.3 6.2 3",
  ferris: "M12 13a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M12 6v.01 M5 6h14 M12-1v14 M7 1l10 10 M17 1 7 11 M12 13l-4 8 M12 13l4 8 M7 21h10",
};
const FILLED = new Set(["star"]);

export function icon(name, cls = "") {
  const d = P[name] || P.glass;
  const filled = FILLED.has(name);
  return `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${d}" ${filled ? 'fill="currentColor" stroke="none"' : ""}${name === "more" ? ' stroke="currentColor" stroke-width="3.2" stroke-linecap="round"' : ""}/></svg>`;
}

export const TYPE_ICON = { beer: "beer", cider: "cider", wine: "wine", sparkling: "sparkling", cocktail: "cocktail", frozen: "frozen", flight: "flight", na: "na", coffee: "coffee" };

// ── Flags (30×20) ────────────────────────────────────────────────────────────
const tri = (dir, a, b, c) => dir === "v"
  ? `<rect width="10" height="20" fill="${a}"/><rect x="10" width="10" height="20" fill="${b}"/><rect x="20" width="10" height="20" fill="${c}"/>`
  : `<rect width="30" height="6.67" fill="${a}"/><rect y="6.67" width="30" height="6.67" fill="${b}"/><rect y="13.33" width="30" height="6.67" fill="${c}"/>`;
const starPts = (cx, cy, R, r = R * 0.4, n = 5) => {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r : R;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`);
  }
  return pts.join(" ");
};
const union = (w = 30, h = 20) => `<rect width="${w}" height="${h}" fill="#1f3d7a"/>
  <path d="M0 0L${w} ${h}M${w} 0L0 ${h}" stroke="#fff" stroke-width="${h / 5}"/>
  <path d="M0 0L${w} ${h}M${w} 0L0 ${h}" stroke="#c8202f" stroke-width="${h / 15}"/>
  <path d="M${w / 2} 0v${h}M0 ${h / 2}h${w}" stroke="#fff" stroke-width="${h / 3}"/>
  <path d="M${w / 2} 0v${h}M0 ${h / 2}h${w}" stroke="#c8202f" stroke-width="${h / 5}"/>`;
const emblem = (bg, glyph) => `<rect width="30" height="20" fill="${bg}"/><g transform="translate(9 4) scale(.5)" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="${glyph}"/></g>`;

const FLAGS = {
  mexico: tri("v", "#0b6b3a", "#fff", "#c8202f") + `<circle cx="15" cy="10" r="2.6" fill="#8a5a2b"/><path d="M12.6 11.5q2.4 2 4.8 0" stroke="#3a7d3a" fill="none" stroke-width=".8"/>`,
  norway: `<rect width="30" height="20" fill="#ba0c2f"/><path d="M11 0v20M0 10h30" stroke="#fff" stroke-width="5"/><path d="M11 0v20M0 10h30" stroke="#00205b" stroke-width="2.6"/>`,
  china: `<rect width="30" height="20" fill="#de2910"/><polygon points="${starPts(6, 5.5, 3.3)}" fill="#ffde00"/>${[[11, 2.4], [13, 4.5], [13, 7.5], [11, 9.5]].map(([x, y]) => `<polygon points="${starPts(x, y, 1.05)}" fill="#ffde00"/>`).join("")}`,
  germany: tri("h", "#111", "#dd0000", "#ffce00"),
  italy: tri("v", "#009246", "#fff", "#ce2b37"),
  usa: `<rect width="30" height="20" fill="#fff"/>${[0, 2, 4, 6].map((i) => `<rect y="${i * 2.857}" width="30" height="2.857" fill="#b22234"/>`).join("")}<rect width="13" height="11.43" fill="#3c3b6e"/>${[0, 1, 2, 3].flatMap((r) => [0, 1, 2, 3, 4].map((c) => `<circle cx="${1.6 + c * 2.45 + (r % 2) * 1.2}" cy="${1.6 + r * 2.7}" r=".55" fill="#fff"/>`)).join("")}`,
  japan: `<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#bc002d"/>`,
  morocco: `<rect width="30" height="20" fill="#c1272d"/><polygon points="15,4.2 18.4,14.6 9.5,8.2 20.5,8.2 11.6,14.6" fill="none" stroke="#006233" stroke-width="1.1" stroke-linejoin="round"/>`,
  france: tri("v", "#0055a4", "#fff", "#ef4135"),
  uk: union(),
  canada: `<rect width="30" height="20" fill="#fff"/><rect width="7.5" height="20" fill="#d52b1e"/><rect x="22.5" width="7.5" height="20" fill="#d52b1e"/><path d="M15 3.6l1.2 2.3 1.4-.6-.5 3.3 1.8-1.8.4 1.2 2.1-.4-.8 2.2.9.5-3.4 2.7.4 1.3-3-.4V17h-1v-3.1l-3 .4.4-1.3-3.4-2.7.9-.5-.8-2.2 2.1.4.4-1.2 1.8 1.8-.5-3.3 1.4.6z" fill="#d52b1e"/>`,
  india: tri("h", "#ff9933", "#fff", "#138808") + `<circle cx="15" cy="10" r="2.4" fill="none" stroke="#000080" stroke-width=".7"/><circle cx="15" cy="10" r=".5" fill="#000080"/>`,
  spain: `<rect width="30" height="20" fill="#aa151b"/><rect y="5" width="30" height="10" fill="#f1bf00"/><rect x="7" y="7.5" width="3" height="5" fill="#aa151b" opacity=".75"/>`,
  greece: `<rect width="30" height="20" fill="#0d5eaf"/>${[1, 3, 5, 7].map((i) => `<rect y="${i * 2.222}" width="30" height="2.222" fill="#fff"/>`).join("")}<rect width="11.1" height="11.1" fill="#0d5eaf"/><path d="M5.55 0v11.1M0 5.55h11.1" stroke="#fff" stroke-width="2.222"/>`,
  belgium: tri("v", "#111", "#fdda24", "#ef3340"),
  brazil: `<rect width="30" height="20" fill="#009c3b"/><polygon points="15,2.2 27,10 15,17.8 3,10" fill="#ffdf00"/><circle cx="15" cy="10" r="4.4" fill="#002776"/><path d="M10.8 9.2q4.2-1.2 8.4 1.4" stroke="#fff" stroke-width=".7" fill="none"/>`,
  australia: `<rect width="30" height="20" fill="#012169"/><svg width="15" height="10" viewBox="0 0 30 20">${union()}</svg><polygon points="${starPts(7.5, 15, 2.4)}" fill="#fff"/>${[[22.5, 4.5], [19.5, 9.5], [25.5, 8.5], [22.5, 16]].map(([x, y]) => `<polygon points="${starPts(x, y, 1.3)}" fill="#fff"/>`).join("")}`,
  ireland: tri("v", "#169b62", "#fff", "#ff883e"),
  poland: `<rect width="30" height="10" fill="#fff"/><rect y="10" width="30" height="10" fill="#dc143c"/>`,
  korea: `<rect width="30" height="20" fill="#fff"/><path d="M15 5a5 5 0 0 1 0 10a2.5 2.5 0 0 1 0-5a2.5 2.5 0 0 0 0-5" fill="#c60c30" transform="rotate(-56 15 10)"/><path d="M15 15a5 5 0 0 1 0-10a2.5 2.5 0 0 1 0 5a2.5 2.5 0 0 0 0 5" fill="#003478" transform="rotate(-56 15 10)"/><g stroke="#000" stroke-width=".8"><path d="M4.5 4.5l2.5-2.5M5.5 5.5 8 3M6.5 6.5 9 4"/><path d="M21 16l2.5 2.5M22 15l2.5 2.5M23 14l2.5 2.5"/><path d="M21 4l2.5 2.5M23 2l2.5 2.5"/><path d="M4.5 15.5 7 18M6.5 13.5 9 16"/></g>`,
  philippines: `<rect width="30" height="10" fill="#0038a8"/><rect y="10" width="30" height="10" fill="#ce1126"/><polygon points="0,0 17.3,10 0,20" fill="#fff"/><circle cx="5.8" cy="10" r="2.2" fill="#fcd116"/>`,
  argentina: tri("h", "#74acdf", "#fff", "#74acdf") + `<circle cx="15" cy="10" r="2" fill="#f6b40e"/>`,
  africa: emblem("#b4561f", "M12 3v4 M5 8c2-2 12-2 14 0 M4 8c3 1.5 13 1.5 16 0 M12 9v11 M9 20h6 M2 21h20"),
  alps: emblem("#2d5c8a", "M1 20l7-12 4 6 3-4 8 10z M6.5 10.5 8 12l1.5-1.5"),
  hawaii: emblem("#c23b6b", P.flower),
  caribbean: emblem("#0e8a8a", "M12 21V10 M12 10C9 6 5 6 3 8 M12 10c3-4 7-4 9-2 M12 10c-1-4-4-6-7-6 M12 10c1-4 4-6 7-6 M6 21h12"),
  scandinavia: emblem("#355d8c", P.frozen),
  park: emblem("#23262b", "M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M4 13h16 M12 5l-4.5 8 4.5 8 4.5-8z"),
};

export function flag(id, cls = "flag") {
  const body = FLAGS[id] || FLAGS.park;
  return `<svg class="${cls}" viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs></defs>${body}</svg>`;
}
export const flagBody = (id) => FLAGS[id] || FLAGS.park;

// ── Pavilion landmarks (illustrated, ~40 wide, ground at y≈8) ────────────────
const O = 'stroke="#2a241e" stroke-width=".7" stroke-linejoin="round"';
const shadow = (w = 19) => `<ellipse cx="1.5" cy="8.6" rx="${w}" ry="3.2" fill="#1d2a17" opacity=".28"/>`;
const win = (xs, y, w = 1.6, h = 2.4, c = "#2a241e") => xs.map((x) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`).join("");

export const LANDMARKS = {
  mexico: `${shadow(18)}
    <path d="M-18 8V3h36v5z" fill="#d8c29c" ${O}/><path d="M0 3h18v5H0z" fill="#bfa47a"/>
    <path d="M-14 3v-5h28v5z" fill="#dcc7a2" ${O}/><path d="M0-2h14v5H0z" fill="#c2a77d"/>
    <path d="M-10.5-2v-5h21v5z" fill="#e0cca8" ${O}/><path d="M0-7h10.5v5H0z" fill="#c6ab82"/>
    <path d="M-7-7v-4.5h14V-7z" fill="#e3d0ad" ${O}/><path d="M0-11.5h7V-7H0z" fill="#c9af86"/>
    <path d="M-4.5-11.5V-17h9v5.5z" fill="#b8472f" ${O}/><path d="M-1.4-11.5v-3.4h2.8v3.4z" fill="#2a241e"/>
    <path d="M-5.5-17h11" stroke="#2a241e" stroke-width="1.2"/>
    <path d="M-2.4 8V-11.5h4.8V8z" fill="#cdb38b" ${O}/>
    <path d="M-2.4 5h4.8M-2.4 2h4.8M-2.4-1h4.8M-2.4-4h4.8M-2.4-7h4.8M-2.4-10h4.8" stroke="#8d7552" stroke-width=".45"/>`,
  norway: `${shadow(14)}
    <path d="M-11 8V-1h22v9z" fill="#6e4a30" ${O}/>
    <path d="M-14-1 -6-7.5h12L14-1z" fill="#3b2a1f" ${O}/>
    <path d="M-7-7.5v-4h14v4z" fill="#7a5337" ${O}/>
    <path d="M-9.5-7.5 0-15l9.5 7.5z" fill="#33251b" ${O}/>
    <path d="M-3.5-13v-3h7v3z" fill="#7a5337" ${O}/>
    <path d="M-2.2-15.5 0-26l2.2 10.5z" fill="#2c2018" ${O}/>
    <path d="M-14-1l-2-2.5M14-1l2-2.5M-9.5-7.5l-1.8-2.2M9.5-7.5l1.8-2.2" stroke="#2a241e" stroke-width="1.1" stroke-linecap="round"/>
    <path d="M-2 8V3.5a2 2 0 0 1 4 0V8z" fill="#2a241e"/>
    <path d="M-7 8V1M-4.5 8V1M4.5 8V1M7 8V1" stroke="#4e3322" stroke-width=".6"/>`,
  china: `${shadow(17)}
    <path d="M-16 8V4.5h32V8z" fill="#efe9dc" ${O}/><path d="M-13.5 4.5V2h27v2.5z" fill="#f5f0e4" ${O}/>
    <path d="M-10 2v-6h20v6z" fill="#b3302a" ${O}/>
    <path d="M-7 2v-6M-3.5 2v-6M0 2v-6M3.5 2v-6M7 2v-6" stroke="#e2b33d" stroke-width=".55"/>
    <path d="M-15-3.5Q0-8.5 15-3.5L11-7Q0-10 -11-7z" fill="#2d5aa6" ${O}/>
    <path d="M-7.5-7v-3.8h15V-7z" fill="#b3302a" ${O}/>
    <path d="M-11.5-10Q0-14.5 11.5-10L8-13Q0-15.5-8-13z" fill="#2d5aa6" ${O}/>
    <path d="M-5-13v-3h10v3z" fill="#b3302a" ${O}/>
    <path d="M-8-15.5Q0-19 8-15.5L0-21.5z" fill="#2d5aa6" ${O}/>
    <circle cx="0" cy="-23" r="1.5" fill="#e2b33d" ${O}/>`,
  germany: `${shadow(18)}
    <path d="M-17 8V-5h13V8z" fill="#f0e3c6" ${O}/>
    <path d="M-17-1h13M-17 3.5h13M-14-5V8M-10.5-5l3.5 6M-7-5V8" stroke="#5a3a26" stroke-width=".8"/>
    <path d="M-18.5-5-10.5-13.5-2.5-5z" fill="#b3432f" ${O}/>
    <path d="M-3.5 8V-13h8V8z" fill="#e5d2ab" ${O}/>
    <circle cx=".5" cy="-7.5" r="2.6" fill="#fff" ${O}/><path d="M.5-9v1.5l1.2.8" stroke="#2a241e" stroke-width=".55" fill="none"/>
    <path d="M-5-13 .5-23.5 6-13z" fill="#4d5b6b" ${O}/><path d="M.5-23.5v-2.5" stroke="#2a241e" stroke-width=".7"/>
    <path d="M4.5 8V-2h12.5V8z" fill="#dcc49c" ${O}/>
    <path d="M3.5-2 10.75-9.5 18-2z" fill="#a83c2a" ${O}/>
    ${win([7, 10, 13], 1)}<path d="M-1.2 8V3.5a1.7 1.7 0 0 1 3.4 0V8z" fill="#2a241e"/>`,
  italy: `${shadow(18)}
    <path d="M-3.5 8V-19h7V8z" fill="#b95d3b" ${O}/>
    <path d="M-3.5-14h7M-3.5-9h7M-3.5 0h7" stroke="#7d3a24" stroke-width=".6"/>
    <path d="M-2-17.5v-2a1 1 0 0 1 2 0v2zM0-17.5v-2a1 1 0 0 1 2 0v2z" fill="#2a241e"/>
    <path d="M-4.3-19h8.6l-4.3-7.5z" fill="#6c9a7a" ${O}/>
    <path d="M3.5 8V-4.5h14.5V8z" fill="#ecc0ae" ${O}/>
    <path d="M3.5-4.5h14.5" stroke="#f7ecdf" stroke-width="1.4"/>
    ${[5, 8, 11, 14].map((x) => `<path d="M${x} 8V4a1.3 1.3 0 0 1 2.6 0v4z" fill="#f7ecdf" stroke="#2a241e" stroke-width=".4"/>`).join("")}
    ${win([5.4, 9, 12.6], -2, 1.8, 2.2, "#7d3a24")}
    <path d="M-13 8V-11" stroke="#efe6d5" stroke-width="2.2"/><path d="M-14.5-11h3" stroke="#2a241e" stroke-width="1"/>
    <path d="M-14.2-12.6 -13-14.5-11.8-12.6z" fill="#d6a741" ${O}/>`,
  america: `${shadow(19)}
    <path d="M-17 8V-4h34V8z" fill="#a8432f" ${O}/>
    <path d="M-17.8-4h35.6" stroke="#f4efe4" stroke-width="1.6"/>
    ${win([-15, -12, -9, 7.4, 10.4, 13.4], -1.5, 1.7, 2.6, "#f4efe4")}${win([-15, -12, -9, 7.4, 10.4, 13.4], 3.5, 1.7, 2.6, "#f4efe4")}
    <path d="M-6 8V-4h12V8z" fill="#f4efe4" ${O}/>
    <path d="M-4.5 8V-3M-1.5 8V-3M1.5 8V-3M4.5 8V-3" stroke="#bdb6a6" stroke-width=".8"/>
    <path d="M-7-4 0-9.5 7-4z" fill="#f4efe4" ${O}/>
    <path d="M-3-9.5v-4h6v4z" fill="#f4efe4" ${O}/>
    <path d="M-3.8-13.5Q0-20.5 3.8-13.5z" fill="#f4efe4" ${O}/><path d="M0-18.5V-22" stroke="#2a241e" stroke-width=".7"/>`,
  japan: `${shadow(16)}
    <path d="M-5 8V-17h10V8z" fill="#c4442f" ${O}/>
    ${[[5, 13.5], [0, 12], [-5, 10.5], [-10, 9], [-15, 7.5]].map(([y, w]) => `<path d="M-${w} ${y}Q0 ${y - 3.2} ${w} ${y}L${w - 3} ${y - 3.2}H-${w - 3}z" fill="#2d5d7c" ${O}/>`).join("")}
    <path d="M0-17.5V-26" stroke="#d6a741" stroke-width="1.2"/>
    ${[-19, -21, -23].map((y) => `<path d="M-1.4 ${y}h2.8" stroke="#d6a741" stroke-width=".9"/>`).join("")}
    <path d="M-2 8V4.5h4V8z" fill="#2a241e"/>
    <path d="M-19 8V-2M-13 8V-2" stroke="#c4302a" stroke-width="1.3"/><path d="M-20.5-2.4q4.5-1.2 9 0M-19.8 0h7.6" stroke="#c4302a" stroke-width="1.2" fill="none"/>`,
  morocco: `${shadow(18)}
    <path d="M3 8V-3h15V8z" fill="#e6cda0" ${O}/>
    <path d="M3-3h15" stroke="#2f7d5a" stroke-width="1.4"/>
    <path d="M8.5 8V3.5a2 2 0 0 1 .5-2.2L10.5 0 12 1.3a2 2 0 0 1 .5 2.2V8z" fill="#2a241e"/>
    <path d="M-4 8V-18h8V8z" fill="#d9b07a" ${O}/>
    <path d="M-4-10l4 4 4-4M-4-14l4 4 4-4" stroke="#2f7d5a" stroke-width=".8" fill="none"/>
    <path d="M-4.8-18h9.6v-2h-9.6z" fill="#2f7d5a" ${O}/>
    <path d="M-2-20v-3.5h4v3.5z" fill="#d9b07a" ${O}/>
    <path d="M-2.6-23.5h5.2l-2.6-2.5z" fill="#2f7d5a" ${O}/><circle cx="0" cy="-27" r=".8" fill="#d6a741"/>
    <path d="M-1-2v-3a1 1 0 0 1 2 0v3z" fill="#2a241e"/>
    <path d="M-17 8V1h13V8z" fill="#ecd8b2" ${O}/><path d="M-14 8V4.5a1.6 1.6 0 0 1 3.2 0V8z" fill="#2f7d5a"/>`,
  france: `${shadow(18)}
    <path d="M4 8V-3.5h14V8z" fill="#efe3c8" ${O}/>
    <path d="M2.8-3.5 6-9h9l3.2 5.5z" fill="#4e5866" ${O}/>
    ${win([6, 9.3, 12.6], -1, 1.6, 2.6)}${win([6, 9.3, 12.6], 3.6, 1.6, 2.6)}
    <path d="M-12 8-4.5-5-2.3-17h2.6l2.2 12L10 8H6.2Q-1 .5-8.2 8z" fill="#8c6a47" ${O}/>
    <path d="M-7.6-.5h13.2M-4.5-5.5h7M-2.6-12h3.2" stroke="#2a241e" stroke-width=".9"/>
    <path d="M-2.3-17h2.6l-.7-5.5h-1.2z" fill="#8c6a47" ${O}/><path d="M-1-22.5V-26" stroke="#2a241e" stroke-width=".6"/>
    <path d="M-5.5-3 3.5-3M-3.5-9h5" stroke="#6b4f33" stroke-width=".4"/>`,
  uk: `${shadow(18)}
    <path d="M-17 8V-3h12V8z" fill="#f2e8d2" ${O}/>
    <path d="M-17 2h12M-14-3V8M-8-3V8M-14 2l6-5" stroke="#3a2a1f" stroke-width=".8"/>
    <path d="M-18.5-3-11-11.5-3.5-3z" fill="#c9a256" ${O}/>
    <path d="M-5 8V-6h13V8z" fill="#efe3c8" ${O}/>
    <path d="M-5-1h13M-5 3.5h13M-1-6V8M4-6V8" stroke="#3a2a1f" stroke-width=".8"/>
    <path d="M-6.5-6 1.5-14l8 8z" fill="#5a4a3c" ${O}/>
    <path d="M4-12.5v-3.5h2.5v6z" fill="#a8432f" ${O}/>
    <path d="M11 8V-5h5V8z" fill="#c8302a" ${O}/><path d="M10.7-5q2.8-2 5.6 0" fill="#c8302a" ${O}/>
    <path d="M12-2.5h3v6h-3z" fill="#f6e7c7" opacity=".85"/><path d="M13.5-2.5v6M12 .5h3" stroke="#c8302a" stroke-width=".5"/>`,
  canada: `${shadow(19)}
    <path d="M-14 8V-3h28V8z" fill="#cdbfa6" ${O}/>
    ${win([-11, -7, -3, 1.5, 5.5, 9.5], 1, 1.8, 3)}
    <path d="M-7-3-4-13h8L7-3z" fill="#4c9a86" ${O}/>
    <path d="M-16 8V-6h5V8zM11 8V-6h5V8z" fill="#c3b49a" ${O}/>
    <path d="M-17-6-13.5-15-10-6zM10-6 13.5-15 17-6z" fill="#4c9a86" ${O}/>
    <path d="M0-13v-3M-13.5-15v-2M13.5-15v-2" stroke="#2a241e" stroke-width=".6"/>
    <path d="M-21 8V-10" stroke="#8a5a36" stroke-width="2.6"/>
    <path d="M-22.3-7h2.6M-22.3-3h2.6M-22.3 1h2.6" stroke="#c4442f" stroke-width="1.2"/><path d="M-24-10h6" stroke="#2c5c7c" stroke-width="1.3"/>`,
};
export const PAV_KEYS = Object.keys(LANDMARKS);

export function spaceshipEarth() {
  // Geodesic sphere on a tripod — drawn at its own scale (radius 16).
  const tris = [];
  for (let r = -16; r <= 16; r += 4) tris.push(`M-20 ${r}h40`);
  for (let k = -40; k <= 40; k += 4.6) { tris.push(`M${k - 12} -20L${k + 12} 20`); tris.push(`M${k + 12} -20L${k - 12} 20`); }
  return `<ellipse cx="3" cy="23" rx="15" ry="4" fill="#1d2a17" opacity=".28"/>
    <path d="M-9 13-11 23M9 13l2 10M0 15v8" stroke="#8b949c" stroke-width="2.4"/>
    <circle r="16" fill="url(#seG)" stroke="#4a5058" stroke-width=".8"/>
    <g clip-path="url(#seClip)"><path d="${tris.join("")}" stroke="#fff" stroke-width=".35" opacity=".45"/></g>
    <circle r="16" fill="url(#seShine)"/>`;
}

// ── Avatars ──────────────────────────────────────────────────────────────────
export const AVATARS = [
  ["castle", "#3a5ba0"], ["rocket", "#c4442f"], ["globe", "#2f7d6a"], ["crown", "#b8862b"],
  ["star", "#6a4aa8"], ["compass", "#29596b"], ["anchor", "#1f3d7a"], ["leaf", "#4f8a3a"],
  ["bolt", "#d08a1e"], ["moon", "#3b3f6b"], ["fish", "#1f8aa0"], ["flower", "#b8406e"],
  ["ferris", "#a8432f"], ["trophy", "#8a6a2b"], ["sparkle", "#9a3fb0"], ["heart", "#c8304a"],
];
const AV = Object.fromEntries(AVATARS);

// Member avatars are stored as "@key" (new) or a legacy emoji.
export function avatar(value, cls = "avatar") {
  const v = String(value || "");
  if (v.startsWith("@") && AV[v.slice(1)]) {
    const k = v.slice(1);
    return `<span class="${cls} av-svg" style="--av:${AV[k]}">${icon(k)}</span>`;
  }
  return `<span class="${cls}">${v ? v.replace(/[<>&"]/g, "") : icon("user")}</span>`;
}
