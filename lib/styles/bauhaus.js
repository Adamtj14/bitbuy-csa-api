// "Bauhaus / Mondrian" — rigid grid of primary-color blocks separated by thick
// black rules. De Stijl geometry; sharp corners; bold heavy type.

import { pageShell, icon, monthWeeks, esc } from "./_common.js";

const RED = "#E1251B";
const BLUE = "#1352CC";
const YELLOW = "#F5C400";
const INK = "#0a0a0a";

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

  const sevenDay = wx.week.map((d) => `<div class="d7"><div class="d7d">${d.dow}</div>${icon(d.kind, 50)}<div class="d7t">${d.hi}°<span>${d.lo}°</span></div></div>`).join("");
  const agenda = cal.todayEvents.map((e) => `<div class="trow"><span class="tt">${e.time}</span><span class="tl">${esc(e.title)}</span></div>`).join("");
  const markets = stocks.map((s) => `<div class="mrow"><span>${s.sym}</span><b>${s.up ? "▲" : "▼"}${Math.abs(s.pct)}%</b></div>`).join("");
  const noteRows = notes.map((n) => `<div class="note"><b>${esc(n.who)}</b> ${esc(n.text)}</div>`).join("");

  const css = `
  .grid{display:grid;grid-template-columns:repeat(12,1fr);grid-template-rows:330px 176px 1fr 1fr;gap:14px;
    background:${INK};padding:24px;width:1200px;height:1600px}
  .b{overflow:hidden;padding:26px;color:${INK};background:#fff}
  .time{grid-area:1/1/2/8;background:${INK};color:#fff;display:flex;flex-direction:column;justify-content:center}
  .clock{font-family:'Inter';font-weight:900;font-size:138px;letter-spacing:-7px;line-height:.82;display:flex;align-items:flex-start}
  .clock .mer{font-size:32px;margin:8px 0 0 8px}
  .date{font-family:'Inter';font-weight:800;font-size:24px;letter-spacing:4px;margin-top:14px}
  .accent{width:70px;height:14px;background:${RED};margin-top:18px}

  .wblk{grid-area:1/8/2/13;background:${YELLOW};display:flex;flex-direction:column;justify-content:center;position:relative}
  .wblk .ic{position:absolute;top:22px;right:22px}
  .wblk .ic .wic{filter:brightness(0)}
  .wtemp{font-family:'Inter';font-weight:900;font-size:108px;line-height:.85;letter-spacing:-4px}
  .wcond{font-family:'Inter';font-weight:800;font-size:24px;letter-spacing:2px;margin-top:6px}
  .wsun{font-weight:700;font-size:18px;margin-top:14px}

  .seven{grid-area:2/1/3/13;background:#fff;display:flex;align-items:center;justify-content:space-between}
  .d7{display:flex;flex-direction:column;align-items:center;flex:1}
  .d7d{font-family:'Inter';font-weight:800;font-size:14px;letter-spacing:1px}
  .d7t{font-family:'Inter';font-weight:800;font-size:21px;display:flex;align-items:baseline;gap:6px}.d7t span{font-weight:600;font-size:14px}

  .today{grid-area:3/1/4/8;background:#fff}
  .cal{grid-area:3/8/4/13;background:${YELLOW}}
  .notes{grid-area:4/1/5/6;background:${BLUE};color:#fff}
  .mkts{grid-area:4/6/5/13;background:${RED};color:#fff}

  .h{font-family:'Inter';font-weight:900;font-size:30px;letter-spacing:1px;margin-bottom:14px;text-transform:uppercase}
  .trow{display:flex;align-items:baseline;gap:16px;padding:14px 0;border-bottom:3px solid ${INK}}
  .tt{font-family:'Inter';font-weight:900;font-size:28px;width:128px}.tl{font-family:'Inter';font-weight:600;font-size:26px}

  .mgrid{display:grid;grid-template-columns:repeat(7,1fr)}
  .dow{height:24px;display:flex;align-items:center;justify-content:center;font-family:'Inter';font-weight:800;font-size:13px}
  .c{height:46px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Inter';font-weight:700;font-size:19px}
  .c .today{background:${RED};color:#fff;width:40px;height:40px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .dot{width:6px;height:6px;background:${INK};margin-top:2px}

  .note{font-weight:600;font-size:20px;padding:7px 0}.note b{font-weight:900}
  .mrow{display:flex;justify-content:space-between;font-family:'Inter';font-weight:800;font-size:26px;padding:9px 0;border-bottom:3px solid rgba(255,255,255,.4)}
  `;

  const body = `<div class="grid">
    <div class="b time"><div class="clock">2:32<span class="mer">${data.meridiem}</span></div><div class="accent"></div><div class="date">${(data.dateLong + " · " + data.dateSub).toUpperCase()}</div></div>
    <div class="b wblk"><span class="ic">${icon(wx.kind, 84)}</span><div class="wtemp">${wx.tempC}°</div><div class="wcond">${COND[wx.kind] || ""} · FEELS ${wx.feelsC}°</div><div class="wsun">↑ ${wx.sunrise}&nbsp;&nbsp;↓ ${wx.sunset}</div></div>
    <div class="b seven">${sevenDay}</div>
    <div class="b today"><div class="h">Today</div>${agenda}</div>
    <div class="b cal"><div class="h">${cal.monthLabel}</div>${monthGrid(cal)}</div>
    <div class="b notes"><div class="h">Notes</div>${noteRows}</div>
    <div class="b mkts"><div class="h">Markets</div>${markets}</div>
  </div>`;

  return pageShell({ title: "bauhaus", css, body });
}
