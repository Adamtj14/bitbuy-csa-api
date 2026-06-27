// "Blueprint" — technical drafting schematic. Blueprint-blue ground, light line art,
// graph-paper grid, drafted panels with FIG labels and a title block.

import { pageShell, MONO_CSS, icon, graphSvg, monthWeeks, esc } from "./_common.js";

const BG = "#0E3A77";
const LINE = "#DCE8FF";
const CYAN = "#88E6FF";

function monthGrid(cal) {
  const dows = ["S", "M", "T", "W", "T", "F", "S"];
  let cells = dows.map((d) => `<div class="dow">${d}</div>`).join("");
  for (const wk of monthWeeks(cal.year, cal.month)) {
    for (const d of wk) {
      if (d === null) { cells += `<div class="c"></div>`; continue; }
      if (d === cal.today) { cells += `<div class="c"><span class="today">${d}</span></div>`; continue; }
      const ev = cal.eventDays.includes(d);
      cells += `<div class="c"><span class="${ev ? "ev" : ""}">${d}</span></div>`;
    }
  }
  return `<div class="mgrid">${cells}</div>`;
}

export function html(data) {
  const { weather: wx, calendar: cal, stocks, notes } = data;
  const COND = { clear: "CLEAR", partly: "PARTLY CLOUDY", cloudy: "CLOUDY", overcast: "OVERCAST", rain: "RAIN", snow: "SNOW", thunder: "STORMS", fog: "FOG", wind: "WINDY" };

  const sevenDay = wx.week.map((d) => `<div class="d7"><div class="d7d">${d.dow.toUpperCase()}</div><span class="wi">${icon(d.kind, 44)}</span><div class="d7t">${d.hi}/${d.lo}</div></div>`).join("");
  const agenda = cal.todayEvents.map((e, i) => `<div class="trow"><span class="no">${String(i + 1).padStart(2, "0")}</span><span class="tt">${e.time.toUpperCase()}</span><span class="tl">${esc(e.title).toUpperCase()}</span><span class="tw">${esc(e.who).toUpperCase()}</span></div>`).join("");
  const markets = stocks.map((s) => `<div class="mrow"><span>${s.sym}</span><span class="dots"></span><b>${s.up ? "+" : "−"}${Math.abs(s.pct)}%</b></div>`).join("");
  const noteRows = notes.map((n) => `<div class="note"><span class="cy">${esc(n.who).toUpperCase()}</span> — ${esc(n.text)}</div>`).join("");

  const css = `
  body{background:${BG}}
  .bp{position:relative;width:1200px;height:1600px;background:${BG};color:${LINE};font-family:'IBM Plex Mono',monospace;
    background-image:
      repeating-linear-gradient(0deg,rgba(220,232,255,.10) 0 1px,transparent 1px 40px),
      repeating-linear-gradient(90deg,rgba(220,232,255,.10) 0 1px,transparent 1px 40px),
      repeating-linear-gradient(0deg,rgba(220,232,255,.16) 0 1px,transparent 1px 200px),
      repeating-linear-gradient(90deg,rgba(220,232,255,.16) 0 1px,transparent 1px 200px)}
  .frame{position:absolute;inset:24px;border:2px solid ${LINE};padding:26px;display:flex;flex-direction:column}
  .tt-head{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1.5px solid ${LINE};padding-bottom:14px}
  .tt-head .ttl{font-size:30px;font-weight:700;letter-spacing:4px}
  .tt-head .meta{font-size:14px;letter-spacing:2px;color:${CYAN}}

  .panel{position:relative;border:1.5px solid ${LINE};margin-top:26px;padding:24px 22px 20px}
  .tag{position:absolute;top:-12px;left:18px;background:${BG};padding:0 10px;font-size:14px;letter-spacing:3px;color:${CYAN}}
  .cols{display:flex;gap:26px}.cols>.panel{flex:1;margin-top:26px}

  .chrono{display:flex;align-items:flex-end;justify-content:space-between}
  .clock{font-size:118px;font-weight:700;letter-spacing:-2px;line-height:.9}
  .clock .mer{font-size:30px;letter-spacing:2px}
  .cdate{font-size:20px;letter-spacing:3px;text-align:right;color:${CYAN}}

  .atmo{display:flex;gap:22px}
  .now{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:210px;border-right:1.5px dashed rgba(220,232,255,.5);padding-right:18px}
  .wi{filter:brightness(0) invert(1)}
  .now .t{font-size:78px;font-weight:700;line-height:1}.now .c{font-size:16px;letter-spacing:2px;margin-top:4px}
  .now .s{font-size:14px;color:${CYAN};margin-top:8px;letter-spacing:1px}
  .plot{flex:1}
  .seven{display:flex;justify-content:space-between;margin-top:14px;border-top:1.5px dashed rgba(220,232,255,.5);padding-top:14px}
  .d7{display:flex;flex-direction:column;align-items:center;flex:1}.d7 .wi{width:44px;height:44px}
  .d7d{font-size:13px;letter-spacing:1px}.d7t{font-size:18px;font-weight:700;margin-top:2px}

  .trow{display:flex;align-items:baseline;gap:16px;padding:11px 0;border-bottom:1px dotted rgba(220,232,255,.5);font-size:21px}
  .no{color:${CYAN};font-size:15px}.tt{font-weight:700;width:108px}.tl{flex:1;letter-spacing:1px}.tw{color:${CYAN};font-size:15px}

  .mgrid{display:grid;grid-template-columns:repeat(7,1fr);text-align:center}
  .dow{font-size:13px;color:${CYAN};padding-bottom:6px}
  .c{height:42px;display:flex;align-items:center;justify-content:center;font-size:19px}
  .c .ev{text-decoration:underline}
  .c .today{border:2px solid ${LINE};color:#fff;width:36px;height:36px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:rgba(136,230,255,.18)}

  .note{font-size:18px;padding:7px 0;border-bottom:1px dotted rgba(220,232,255,.35)}.cy{color:${CYAN};font-weight:700}
  .mrow{display:flex;align-items:baseline;font-size:21px;padding:8px 0}.mrow .dots{flex:1;border-bottom:1px dotted rgba(220,232,255,.5);margin:0 10px}

  .titleblock{margin-top:auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;border:1.5px solid ${LINE}}
  .tb{border-left:1.5px solid ${LINE};padding:10px 14px;font-size:14px;letter-spacing:1px}
  .tb:first-child{border-left:none}.tb .k{color:${CYAN};font-size:11px;letter-spacing:2px;display:block;margin-bottom:2px}
  `;

  const body = `<div class="bp"><div class="frame">
    <div class="tt-head"><div class="ttl">FAMILY OPERATIONS DASHBOARD</div><div class="meta">DWG&nbsp;No.&nbsp;HOME-001&nbsp;&nbsp;|&nbsp;&nbsp;REV.&nbsp;C</div></div>

    <div class="panel"><span class="tag">FIG.1 — CHRONOMETER</span>
      <div class="chrono"><div class="clock">2:32<span class="mer">${data.meridiem}</span></div><div class="cdate">${data.dateLong.toUpperCase()}<br>${data.dateSub.toUpperCase()}</div></div>
    </div>

    <div class="panel"><span class="tag">FIG.2 — ATMOSPHERIC CONDITIONS</span>
      <div class="atmo">
        <div class="now"><span class="wi">${icon(wx.kind, 70)}</span><div class="t">${wx.tempC}°</div><div class="c">${COND[wx.kind] || ""}</div><div class="s">FEELS ${wx.feelsC}° · ↑${wx.sunrise} ↓${wx.sunset}</div></div>
        <div class="plot">${graphSvg(wx.hours, { w: 720, h: 150, temp: CYAN, precip: "#5fa8ff", ink: LINE, labelColor: LINE })}</div>
      </div>
      <div class="seven">${sevenDay}</div>
    </div>

    <div class="cols">
      <div class="panel"><span class="tag">FIG.3 — TODAY'S SCHEDULE</span>${agenda}</div>
      <div class="panel"><span class="tag">FIG.4 — ${cal.monthLabel.toUpperCase()}</span>${monthGrid(cal)}</div>
    </div>

    <div class="cols">
      <div class="panel"><span class="tag">FIG.5 — NOTICES</span>${noteRows}</div>
      <div class="panel"><span class="tag">FIG.6 — MARKETS</span>${markets}</div>
    </div>

    <div class="titleblock">
      <div class="tb"><span class="k">PROJECT</span>The Adam Household</div>
      <div class="tb"><span class="k">SCALE</span>1:1</div>
      <div class="tb"><span class="k">SHEET</span>1 OF 1</div>
      <div class="tb"><span class="k">DATE</span>${data.dateSub.toUpperCase()}</div>
    </div>
  </div></div>`;

  return pageShell({ title: "blueprint", css, body, fonts: MONO_CSS });
}
