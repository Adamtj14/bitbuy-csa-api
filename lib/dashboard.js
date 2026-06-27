// Builds the Satori element tree for the portrait 1200x1600 family dashboard.
// Refined style: Inter type, whitespace + hairline rules (no boxes), minimal labels.

import { iconDataUri } from "./icons.js";
import { graphDataUri } from "./graph.js";

export const W = 1200;
export const H = 1600;

const INK = "#111111";
// No true grays on a 6-color panel — gray dithers to colored speckle. So "secondary"
// text is still solid black; hierarchy comes from size + weight, not tone.
const MUTE = "#111111";
const RED = "#C8302A";
const GREEN = "#1F8A4C";
const BLUE = "#2156C0";
const HAIR = "#111111";
const FONT = "Inter";

// ---- tiny hyperscript helper -------------------------------------------------
function h(type, props, ...kids) {
  const children = kids.flat().filter((c) => c !== null && c !== undefined && c !== false);
  return {
    type,
    props: {
      ...(props || {}),
      children:
        children.length === 0 ? undefined : children.length === 1 ? children[0] : children,
    },
  };
}
const box = (style, ...kids) => h("div", { style: { display: "flex", ...style } }, ...kids);
const col = (style, ...kids) => box({ flexDirection: "column", ...style }, ...kids);
const row = (style, ...kids) => box({ flexDirection: "row", ...style }, ...kids);
const txt = (style, s) => h("div", { style: { display: "flex", ...style } }, String(s));
const img = (src, w, hh, style = {}) =>
  h("img", { src, width: w, height: hh, style: { width: w, height: hh, ...style } });

const hr = (style = {}) =>
  box({ height: 1, backgroundColor: HAIR, marginTop: 18, marginBottom: 18, ...style });
const vr = (style = {}) =>
  box({ width: 1, backgroundColor: HAIR, alignSelf: "stretch", ...style });

const label = (s, style = {}) =>
  txt(
    { fontSize: 13, fontWeight: 600, letterSpacing: 2.5, color: MUTE, ...style },
    s.toUpperCase()
  );

// ---- month grid --------------------------------------------------------------
function monthWeeks(year, month) {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function monthGrid(cal) {
  const weeks = monthWeeks(cal.year, cal.month);
  const dows = ["S", "M", "T", "W", "T", "F", "S"];
  const cw = 62, chh = 40;
  const cell = (content, hgt = chh) =>
    box({ width: cw, height: hgt, alignItems: "center", justifyContent: "center" }, content);

  const headRow = row(
    {},
    ...dows.map((d) => cell(txt({ fontSize: 14, fontWeight: 600, color: MUTE }, d), 26))
  );

  const weekRows = weeks.map((wk) =>
    row(
      {},
      ...wk.map((d) => {
        if (d === null) return cell(txt({}, ""));
        if (d === cal.today) {
          return cell(
            box(
              {
                width: 40, height: 40, borderRadius: 20, backgroundColor: RED,
                alignItems: "center", justifyContent: "center",
              },
              txt({ fontSize: 21, fontWeight: 600, color: "#FFFFFF" }, d)
            )
          );
        }
        const hasEvent = cal.eventDays.includes(d);
        return cell(
          col(
            { alignItems: "center" },
            txt({ fontSize: 21, fontWeight: 400, color: INK }, d),
            hasEvent
              ? box({ width: 5, height: 5, borderRadius: 3, backgroundColor: RED, marginTop: 3 })
              : box({ width: 5, height: 5, marginTop: 3 })
          )
        );
      })
    )
  );

  return col({}, headRow, ...weekRows);
}

// ---- next 7 days -------------------------------------------------------------
function next7(cal) {
  return col(
    {},
    ...cal.next7.map((d, i) =>
      row(
        {
          alignItems: "center", justifyContent: "space-between",
          paddingTop: 8, paddingBottom: 8,
        },
        row(
          { alignItems: "baseline" },
          txt({ fontSize: 17, fontWeight: 600, width: 54, color: INK }, d.dow),
          txt({ fontSize: 16, fontWeight: 400, color: d.items[0] ? INK : MUTE }, d.items[0] || "—")
        ),
        d.items.length > 1 ? txt({ fontSize: 14, color: RED, fontWeight: 600 }, `+${d.items.length - 1}`) : txt({}, "")
      )
    )
  );
}

// ---- weather pieces ----------------------------------------------------------
function headerGlance(wx) {
  return col(
    { alignItems: "flex-end" },
    row(
      { alignItems: "center" },
      img(iconDataUri(wx.kind), 92, 97),
      txt({ fontSize: 66, fontWeight: 600, lineHeight: 1, color: INK, marginLeft: 2 }, `${wx.tempC}°`)
    ),
    txt({ fontSize: 19, fontWeight: 500, color: MUTE, marginTop: 2 }, `Feels ${wx.feelsC}°  ·  ${wx.place}`)
  );
}

function sunTimes(wx) {
  const item = (lab, val, color) =>
    row(
      { alignItems: "baseline", marginLeft: 28 },
      label(lab, { marginRight: 8 }),
      txt({ fontSize: 18, fontWeight: 600, color }, val)
    );
  return row({ alignItems: "baseline" }, item("Sunrise", wx.sunrise, INK), item("Sunset", wx.sunset, BLUE));
}

function sevenDay(wx) {
  return row(
    { justifyContent: "space-between", marginTop: 12 },
    ...wx.week.map((d) =>
      col(
        { alignItems: "center", width: 152 },
        label(d.dow, { letterSpacing: 1 }),
        img(iconDataUri(d.kind), 52, 55, { marginTop: 4, marginBottom: 4 }),
        row(
          { alignItems: "baseline" },
          txt({ fontSize: 20, fontWeight: 600, color: INK }, `${d.hi}°`),
          txt({ fontSize: 16, fontWeight: 400, color: MUTE, marginLeft: 6 }, `${d.lo}°`)
        )
      )
    )
  );
}

// ---- photo -------------------------------------------------------------------
function photo(p) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='360' height='250' viewBox='0 0 360 250'>` +
    `<rect width='360' height='250' fill='#FFFFFF'/>` +
    `<circle cx='285' cy='62' r='26' fill='#E0AE00'/>` +
    `<polygon points='0,250 120,128 205,250' fill='#1F8A4C'/>` +
    `<polygon points='140,250 250,96 360,250' fill='#2156C0'/>` +
    `</svg>`;
  const uri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return col(
    { width: 360, flexShrink: 0 },
    col(
      { border: `1px solid ${INK}`, overflow: "hidden" },
      img(uri, 358, 248, { objectFit: "cover" })
    ),
    txt({ fontSize: 15, fontWeight: 400, fontStyle: "italic", color: MUTE, marginTop: 8 }, p.caption)
  );
}

// ---- main tree ---------------------------------------------------------------
export function renderTree(data) {
  const { weather: wx, calendar: cal, stocks, notes, photo: pho } = data;

  return col(
    {
      width: W, height: H, backgroundColor: "#FFFFFF",
      paddingTop: 40, paddingBottom: 40, paddingLeft: 46, paddingRight: 46,
      fontFamily: FONT, color: INK,
    },

    // HEADER
    row(
      { justifyContent: "space-between", alignItems: "flex-start", height: 150 },
      col(
        {},
        row(
          { alignItems: "flex-end" },
          txt({ fontSize: 116, fontWeight: 700, letterSpacing: -3, lineHeight: 0.85, color: INK }, data.clock),
          txt({ fontSize: 30, fontWeight: 600, color: MUTE, marginLeft: 10, marginBottom: 16 }, data.meridiem)
        ),
        txt({ fontSize: 30, fontWeight: 500, color: INK, marginTop: 8 }, `${data.dateLong}, ${data.dateSub}`)
      ),
      headerGlance(wx)
    ),

    hr({ marginTop: 6 }),

    // WEATHER (no header)
    col(
      {},
      row({ justifyContent: "flex-end" }, sunTimes(wx)),
      img(graphDataUri(wx.hours, 1108, 176), 1108, 176, { marginTop: 2 }),
      sevenDay(wx)
    ),

    hr(),

    // CALENDAR (no header; informative month/list labels kept)
    row(
      {},
      col(
        { width: 470 },
        label(cal.monthLabel, { marginBottom: 8 }),
        monthGrid(cal)
      ),
      col(
        { flexGrow: 1, marginLeft: 34 },
        label("Next 7 days", { marginBottom: 8 }),
        next7(cal)
      )
    ),

    hr(),

    // TODAY AGENDA
    col(
      {},
      label("Today", { marginBottom: 10 }),
      col(
        {},
        ...cal.todayEvents.map((e) =>
          row(
            { alignItems: "center", paddingTop: 13, paddingBottom: 13 },
            txt({ fontSize: 25, fontWeight: 600, width: 120, color: RED }, e.time),
            txt({ fontSize: 25, fontWeight: 500, color: INK, flexGrow: 1 }, e.title),
            txt({ fontSize: 19, fontWeight: 400, color: MUTE }, e.who)
          )
        )
      )
    ),

    hr(),

    // BOTTOM RAIL
    row(
      { flexGrow: 1 },

      photo(pho),

      vr({ marginLeft: 24, marginRight: 24 }),

      // MARKETS (no header)
      col(
        { width: 300 },
        ...stocks.map((s) =>
          row(
            {
              alignItems: "center", justifyContent: "space-between",
              paddingTop: 10, paddingBottom: 10,
            },
            txt({ fontSize: 23, fontWeight: 600, width: 78, color: INK }, s.sym),
            txt({ fontSize: 21, fontWeight: 400, color: INK, flexGrow: 1, justifyContent: "flex-end" }, s.price),
            txt(
              { fontSize: 19, fontWeight: 600, width: 92, justifyContent: "flex-end", color: s.up ? GREEN : RED },
              `${s.up ? "+" : "−"}${Math.abs(s.pct)}%`
            )
          )
        )
      ),

      vr({ marginLeft: 24, marginRight: 24 }),

      // NOTES (header kept)
      col(
        { width: 350 },
        label("Notes", { marginBottom: 10 }),
        col(
          {},
          ...notes.map((n) =>
            row(
              { alignItems: "baseline", paddingTop: 7, paddingBottom: 7 },
              txt({ fontSize: 19, fontWeight: 600, width: 70, flexShrink: 0, color: INK }, n.who),
              txt({ fontSize: 19, fontWeight: 400, color: INK, flexGrow: 1, minWidth: 0, marginLeft: 8 }, n.text)
            )
          )
        )
      )
    )
  );
}
