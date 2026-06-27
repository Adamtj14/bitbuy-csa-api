// "Risograph poster" — screenprint aesthetic that embraces the 6-color palette:
// big overlapping flat shapes (multiply overprint), oversized type, film grain.

import { pageShell, icon, monthWeeks, esc } from "./_common.js";

const RED = "#E8332A";
const BLUE = "#1E54C8";
const YELLOW = "#F2B600";
const GREEN = "#1E8A4C";
const INK = "#111111";

function monthGrid(cal) {
  const dows = ["S", "M", "T", "W", "T", "F", "S"];
  let cells = dows.map((d) => `<div class="dow">${d}</div>`).join("");
  for (const wk of monthWeeks(cal.year, cal.month)) {
    for (const d of wk) {
      if (d === null) { cells += `<div class="c"></div>`; continue; }
      if (d === cal.today) { cells += `<div class="c"><span class="today">${d}</span></div>`; continue; }
      const ev = cal.eventDays.includes(d);
      cells += `<div class="c"><span>${d}</span>${ev ? '<i class="dot"></i>' : ""}</div>`;
    }
  }
  return `<div class="mgrid">${cells}</div>`;
}

export function html(data) {
  const { weather: wx, calendar: cal, stocks, notes } = data;
  const COND = { clear: "SUNNY", partly: "PARTLY CLOUDY", cloudy: "CLOUDY", overcast: "OVERCAST", rain: "RAIN", snow: "SNOW", thunder: "STORMS", fog: "FOG", wind: "WINDY" };

  const sevenDay = wx.week
    .map((d) => `<div class="d7"><div class="d7d">${d.dow}</div>${icon(d.kind, 56)}<div class="d7t">${d.hi}°<span>${d.lo}°</span></div></div>`)
    .join("");
  const agenda = cal.todayEvents
    .map((e) => `<div class="trow"><span class="tt">${e.time}</span><span class="tl">${esc(e.title)}</span></div>`)
    .join("");
  const ticker = stocks.map((s) => `${s.sym} <b class="${s.up ? "up" : "down"}">${s.up ? "▲" : "▼"}${Math.abs(s.pct)}%</b>`).join("&nbsp;&nbsp;•&nbsp;&nbsp;");
  const noteRows = notes.map((n) => `<div class="note"><b>${esc(n.who)}</b> ${esc(n.text)}</div>`).join("");

  const grain = `<svg class="grain" xmlns="http://www.w3.org/2000/svg"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`;

  const css = `
  .poster{position:relative;width:1200px;height:1600px;overflow:hidden;background:#fff;color:${INK}}
  .blobs{position:absolute;inset:0}
  .blob{position:absolute;border-radius:50%;mix-blend-mode:multiply}
  .grain{position:absolute;inset:0;width:100%;height:100%;mix-blend-mode:multiply;opacity:.14;pointer-events:none}
  .content{position:relative;z-index:3;padding:64px 60px;height:100%;display:flex;flex-direction:column}

  .top{display:flex;justify-content:space-between;align-items:flex-start}
  .clock{font-family:'Inter';font-weight:900;font-size:172px;letter-spacing:-9px;line-height:.8}
  .clock .mer{font-size:44px;margin-left:8px}
  .date{font-family:'Inter';font-weight:800;font-size:26px;letter-spacing:6px;margin-top:8px}
  .wx{display:flex;flex-direction:column;align-items:flex-end;text-align:right;padding-top:10px}
  .temp{font-family:'Inter';font-weight:900;font-size:118px;line-height:1;letter-spacing:-5px;margin-bottom:10px}
  .cond{font-family:'Inter';font-weight:800;font-size:28px;letter-spacing:3px}
  .feels{font-weight:600;font-size:19px;margin-top:6px}

  .seven{display:flex;justify-content:space-between;margin-top:30px;background:${YELLOW};mix-blend-mode:multiply;border-radius:18px;padding:22px 22px}
  .seven .wic{filter:brightness(0)}
  .d7{display:flex;flex-direction:column;align-items:center;flex:1}
  .d7d{font-family:'Inter';font-weight:800;font-size:15px;letter-spacing:1px}
  .d7t{font-family:'Inter';font-weight:800;font-size:22px;display:flex;align-items:baseline;gap:6px}
  .d7t span{font-weight:600;font-size:15px}

  .mid{display:flex;gap:44px;margin-top:44px;flex:1}
  .today{flex:1.25}
  .h{font-family:'Inter';font-weight:900;font-size:38px;letter-spacing:1px;margin-bottom:14px}
  .h.red{color:${RED}} .h.blue{color:${BLUE}}
  .trow{display:flex;align-items:baseline;gap:18px;padding:22px 0;border-bottom:3px solid ${INK}}
  .tt{font-family:'Inter';font-weight:900;font-size:34px;width:148px}
  .tl{font-family:'Inter';font-weight:600;font-size:32px}
  .right{flex:1;display:flex;flex-direction:column}

  .mgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
  .dow{height:28px;display:flex;align-items:center;justify-content:center;font-family:'Inter';font-weight:800;font-size:15px}
  .c{height:56px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:700;font-size:22px}
  .c .today{background:${RED};color:#fff;width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .dot{width:6px;height:6px;border-radius:50%;background:${BLUE};margin-top:3px}

  .notes{margin-top:30px;background:${BLUE};mix-blend-mode:multiply;border-radius:18px;padding:24px 24px;color:#fff}
  .notes .h{color:#fff;font-size:26px;margin-bottom:10px}
  .note{font-weight:600;font-size:21px;padding:6px 0}.note b{font-weight:900}

  .ticker{position:relative;z-index:3;margin-top:auto;background:${INK};color:#fff;border-radius:14px;padding:16px 24px;font-family:'Inter';font-weight:700;font-size:22px;letter-spacing:.5px;white-space:nowrap;overflow:hidden}
  .ticker .up{color:${GREEN}} .ticker .down{color:${RED}}
  `;

  const body = `<div class="poster">
    <div class="blobs">
      <div class="blob" style="width:520px;height:520px;left:-150px;top:-170px;background:${RED}"></div>
      <div class="blob" style="width:300px;height:300px;right:30px;top:24px;background:${YELLOW}"></div>
      <div class="blob" style="width:560px;height:560px;left:-120px;bottom:-220px;background:${BLUE}"></div>
      <div class="blob" style="width:260px;height:260px;right:-80px;bottom:120px;background:${GREEN}"></div>
    </div>
    ${grain}
    <div class="content">
      <div class="top">
        <div>
          <div class="clock">2:32<span class="mer">${data.meridiem}</span></div>
          <div class="date">${(data.dateLong + " · " + data.dateSub).toUpperCase()}</div>
        </div>
        <div class="wx">
          <div class="temp">${wx.tempC}°</div>
          <div class="cond">${COND[wx.kind] || "WEATHER"}</div>
          <div class="feels">FEELS ${wx.feelsC}° · ${wx.place}</div>
        </div>
      </div>

      <div class="seven">${sevenDay}</div>

      <div class="mid">
        <div class="today">
          <div class="h red">TODAY</div>
          ${agenda}
        </div>
        <div class="right">
          <div class="h blue">${cal.monthLabel.toUpperCase()}</div>
          ${monthGrid(cal)}
          <div class="notes"><div class="h">NOTES</div>${noteRows}</div>
        </div>
      </div>

      <div class="ticker">${ticker}</div>
    </div>
  </div>`;

  return pageShell({ title: "riso", css, body });
}
