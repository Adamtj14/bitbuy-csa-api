// Builds the Satori element tree for the portrait 1200x1600 family dashboard.
// Pure layout from a data object, so live data drops in later unchanged.

import { iconDataUri, codeToKind } from "./icons.js";
import { graphDataUri } from "./graph.js";

export const W = 1200;
export const H = 1600;

const INK = "#000000";
const RED = "#C81E1E";
const BLUE = "#1B53C0";
const GREEN = "#1E8C3A";
const FONT = "DejaVu Sans";

// ---- tiny hyperscript helper -------------------------------------------------
function h(type, props, ...kids) {
  const children = kids
    .flat()
    .filter((c) => c !== null && c !== undefined && c !== false);
  return {
    type,
    props: {
      ...(props || {}),
      children:
        children.length === 0
          ? undefined
          : children.length === 1
          ? children[0]
          : children,
    },
  };
}
const box = (style, ...kids) => h("div", { style: { display: "flex", ...style } }, ...kids);
const col = (style, ...kids) => box({ flexDirection: "column", ...style }, ...kids);
const row = (style, ...kids) => box({ flexDirection: "row", ...style }, ...kids);
const txt = (style, s) => h("div", { style: { display: "flex", ...style } }, String(s));
const img = (src, w, hh, style = {}) =>
  h("img", { src, width: w, height: hh, style: { width: w, height: hh, ...style } });

const card = (style, ...kids) =>
  col(
    {
      border: `3px solid ${INK}`,
      borderRadius: 14,
      padding: 16,
      ...style,
    },
    ...kids
  );

const sectionTitle = (s, right) =>
  row(
    { justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 },
    txt({ fontSize: 22, fontWeight: 700, letterSpacing: 3, color: INK }, s.toUpperCase()),
    right || null
  );

// ---- month grid --------------------------------------------------------------
function monthWeeks(year, month) {
  const first = new Date(year, month, 1).getDay(); // 0=Sun
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
  const cell = (content, style = {}) =>
    box(
      { width: 64, height: 40, alignItems: "center", justifyContent: "center", ...style },
      content
    );

  const headRow = row(
    {},
    ...dows.map((d) =>
      cell(txt({ fontSize: 18, fontWeight: 700, color: INK }, d), { height: 30 })
    )
  );

  const weekRows = weeks.map((wk) =>
    row(
      {},
      ...wk.map((d) => {
        if (d === null) return cell(txt({}, ""));
        const isToday = d === cal.today;
        const hasEvent = cal.eventDays.includes(d);
        if (isToday) {
          return cell(
            box(
              {
                width: 40,
                height: 36,
                borderRadius: 8,
                backgroundColor: RED,
                alignItems: "center",
                justifyContent: "center",
              },
              txt({ fontSize: 22, fontWeight: 700, color: "#FFFFFF" }, d)
            )
          );
        }
        return cell(
          col(
            { alignItems: "center" },
            txt({ fontSize: 22, color: INK }, d),
            hasEvent
              ? box({
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: RED,
                  marginTop: 1,
                })
              : box({ width: 7, height: 7, marginTop: 1 })
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
    { flexGrow: 1, marginLeft: 18 },
    txt({ fontSize: 18, fontWeight: 700, letterSpacing: 2, marginBottom: 6 }, "NEXT 7 DAYS"),
    ...cal.next7.map((d) =>
      row(
        {
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${INK}`,
          paddingTop: 5,
          paddingBottom: 5,
        },
        row(
          { alignItems: "baseline" },
          txt({ fontSize: 18, fontWeight: 700, width: 52, color: INK }, d.dow),
          txt({ fontSize: 16, color: INK }, d.items[0] || "—")
        ),
        d.items.length > 1
          ? txt({ fontSize: 14, color: RED, fontWeight: 700 }, `+${d.items.length - 1}`)
          : txt({}, "")
      )
    )
  );
}

// ---- weather pieces ----------------------------------------------------------
function headerGlance(wx) {
  return row(
    { alignItems: "center" },
    img(iconDataUri(wx.kind), 110, 120),
    col(
      { marginLeft: 6 },
      txt({ fontSize: 70, fontWeight: 700, lineHeight: 1, color: INK }, `${wx.tempC}°`),
      txt({ fontSize: 22, color: INK }, `Feels ${wx.feelsC}°`),
      txt({ fontSize: 20, color: INK }, `${wx.place}`)
    )
  );
}

function sevenDay(wx) {
  return row(
    { justifyContent: "space-between", marginTop: 14 },
    ...wx.week.map((d) =>
      col(
        { alignItems: "center", width: 150 },
        txt({ fontSize: 18, fontWeight: 700, color: INK }, d.dow),
        img(iconDataUri(d.kind), 60, 66),
        row(
          { alignItems: "baseline" },
          txt({ fontSize: 22, fontWeight: 700, color: INK }, `${d.hi}°`),
          txt({ fontSize: 18, color: INK, marginLeft: 6 }, `${d.lo}°`)
        )
      )
    )
  );
}

// ---- photo placeholder -------------------------------------------------------
function photoPlaceholder(cap) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='340' height='240' viewBox='0 0 340 240'>` +
    `<rect width='340' height='240' fill='#FFFFFF'/>` +
    `<circle cx='270' cy='60' r='30' fill='#E8C800' stroke='#000' stroke-width='3'/>` +
    `<polygon points='0,240 110,120 190,240' fill='#1E8C3A' stroke='#000' stroke-width='3'/>` +
    `<polygon points='130,240 240,90 340,240' fill='#1B53C0' stroke='#000' stroke-width='3'/>` +
    `<line x1='0' y1='240' x2='340' y2='240' stroke='#000' stroke-width='4'/>` +
    `</svg>`;
  const uri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return col(
    { width: 360, flexShrink: 0 },
    sectionTitle("Photo"),
    col(
      { flexGrow: 1, border: `3px solid ${INK}`, borderRadius: 12, overflow: "hidden" },
      img(uri, 332, 240, { objectFit: "cover" }),
      row(
        { backgroundColor: INK, padding: 8, justifyContent: "center" },
        txt({ fontSize: 18, color: "#FFFFFF", fontStyle: "italic" }, cap)
      )
    )
  );
}

// ---- main tree ---------------------------------------------------------------
export function renderTree(data) {
  const { weather: wx, calendar: cal, stocks, notes, photo } = data;

  return col(
    {
      width: W,
      height: H,
      backgroundColor: "#FFFFFF",
      padding: 26,
      fontFamily: FONT,
      color: INK,
    },

    // HEADER
    row(
      { justifyContent: "space-between", alignItems: "center", height: 150 },
      col(
        {},
        row(
          { alignItems: "flex-end" },
          txt({ fontSize: 104, fontWeight: 700, lineHeight: 0.9, color: INK }, data.clock),
          txt({ fontSize: 34, fontWeight: 700, marginLeft: 8, marginBottom: 12 }, data.meridiem)
        ),
        txt({ fontSize: 32, fontWeight: 700, marginTop: 2 }, `${data.dateLong}, ${data.dateSub}`)
      ),
      headerGlance(wx)
    ),

    // WEATHER
    card(
      { marginTop: 12, height: 396 },
      sectionTitle(
        "Weather",
        row(
          { alignItems: "center" },
          txt({ fontSize: 20, fontWeight: 700, color: INK }, `↑ ${wx.sunrise}`),
          txt({ fontSize: 20, fontWeight: 700, color: BLUE, marginLeft: 18 }, `↓ ${wx.sunset}`)
        )
      ),
      img(graphDataUri(wx.hours, 1130, 184), 1130, 184),
      sevenDay(wx)
    ),

    // CALENDAR
    card(
      { marginTop: 12, height: 300 },
      sectionTitle("Calendar", txt({ fontSize: 20, fontWeight: 700 }, cal.monthLabel)),
      row({ flexGrow: 1 }, monthGrid(cal), next7(cal))
    ),

    // TODAY AGENDA
    card(
      { marginTop: 12, height: 300 },
      sectionTitle("Today", txt({ fontSize: 20, fontWeight: 700 }, `${cal.todayName}, ${cal.monthLabel.split(" ")[0]} ${cal.today}`)),
      col(
        { flexGrow: 1 },
        ...cal.todayEvents.map((e) =>
          row(
            {
              alignItems: "center",
              borderBottom: `1px solid ${INK}`,
              paddingTop: 8,
              paddingBottom: 8,
            },
            txt({ fontSize: 26, fontWeight: 700, width: 130, color: RED }, e.time),
            txt({ fontSize: 26, color: INK, flexGrow: 1 }, e.title),
            txt({ fontSize: 20, color: INK }, e.who)
          )
        )
      )
    ),

    // BOTTOM RAIL
    row(
      { marginTop: 12, flexGrow: 1 },

      photoPlaceholder(photo.caption),

      // STOCKS
      card(
        { width: 360, flexShrink: 0, marginLeft: 12 },
        sectionTitle("Markets"),
        col(
          { flexGrow: 1 },
          ...stocks.map((s) =>
            row(
              {
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: `1px solid ${INK}`,
                paddingTop: 7,
                paddingBottom: 7,
              },
              txt({ fontSize: 24, fontWeight: 700, width: 84, color: INK }, s.sym),
              txt({ fontSize: 22, color: INK, flexGrow: 1, justifyContent: "flex-end" }, s.price),
              txt(
                { fontSize: 20, fontWeight: 700, width: 96, justifyContent: "flex-end", color: s.up ? GREEN : RED },
                `${s.up ? "▲" : "▼"} ${Math.abs(s.pct)}%`
              )
            )
          )
        )
      ),

      // NOTES
      card(
        { flexGrow: 1, marginLeft: 12 },
        sectionTitle("Notes"),
        col(
          { flexGrow: 1 },
          ...notes.map((n) =>
            row(
              { alignItems: "baseline", paddingTop: 6, paddingBottom: 6 },
              txt({ fontSize: 20, fontWeight: 700, width: 78, flexShrink: 0, color: RED }, n.who),
              txt({ fontSize: 20, color: INK, flexGrow: 1, marginLeft: 6 }, n.text)
            )
          )
        )
      )
    )
  );
}
