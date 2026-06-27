// "Bento" — rounded panels in a varied grid (iOS-widget feel). Black time tile,
// the rest white tiles with crisp black outlines. Restrained, functional color.

import { pageShell, icon, graphSvg, monthWeeks, esc } from "./_common.js";

const RED = "#D11A2A";
const BLUE = "#2156C0";
const GREEN = "#1F8A4C";
const INK = "#111111";

function monthGrid(cal) {
  const dows = ["S", "M", "T", "W", "T", "F", "S"];
  let cells = dows.map((d) => `<div class="dow">${d}</div>`).join("");
  for (const wk of monthWeeks(cal.year, cal.month)) {
    for (const d of wk) {
      if (d === null) { cells += `<div class="c"></div>`; continue; }
      const today = d === cal.today;
      const ev = cal.eventDays.includes(d) && !today;
      cells += `<div class="c"><span class="${today ? "today" : ""}">${d}</span><i class="dot ${ev ? "" : "off"}"></i></div>`;
    }
  }
  return `<div class="mgrid">${cells}</div>`;
}

export function html(data) {
  const { weather: wx, calendar: cal, stocks, notes, photo } = data;

  const sevenDay = wx.week
    .map((d) => `<div class="d7"><div class="d7d">${d.dow}</div>${icon(d.kind, 54)}<div class="d7t"><b>${d.hi}°</b><span>${d.lo}°</span></div></div>`)
    .join("");
  const n7 = cal.next7
    .map((d) => `<div class="n7row"><span class="n7d">${d.dow}</span><span class="n7i">${d.items[0] ? esc(d.items[0]) : "—"}</span>${d.items.length > 1 ? `<span class="n7more">+${d.items.length - 1}</span>` : ""}</div>`)
    .join("");
  const agenda = cal.todayEvents
    .map((e) => `<div class="trow"><span class="ttime">${e.time}</span><span class="ttitle">${esc(e.title)}</span><span class="twho">${esc(e.who)}</span></div>`)
    .join("");
  const markets = stocks
    .map((s) => `<div class="mrow"><span class="msym">${s.sym}</span><span class="mprice">${s.price}</span><span class="mpct ${s.up ? "up" : "down"}">${s.up ? "+" : "−"}${Math.abs(s.pct)}%</span></div>`)
    .join("");
  const noteRows = notes
    .map((n) => `<div class="note"><span class="nwho">${esc(n.who)}</span><span class="ntext">${esc(n.text)}</span></div>`)
    .join("");
  const photoSvg = `<svg viewBox="0 0 560 280" width="560" height="280" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><rect width="560" height="280" fill="#fff"/><circle cx="450" cy="70" r="34" fill="#E0AE00"/><polygon points="0,280 190,140 320,280" fill="${GREEN}"/><polygon points="220,280 380,110 560,280" fill="${BLUE}"/></svg>`;

  const css = `
  .wrap{padding:32px;display:grid;grid-template-columns:repeat(6,1fr);
    grid-template-rows:200px 300px 340px 268px 250px;gap:20px;height:1600px;
    grid-template-areas:
      "time time time time now now"
      "wx wx wx wx wx wx"
      "cal cal cal next next next"
      "today today today photo photo photo"
      "mkts mkts mkts notes notes notes";}
  .panel{border:2px solid ${INK};border-radius:26px;padding:26px;overflow:hidden;background:#fff;color:${INK}}
  .label{font-size:13px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase}

  .time{grid-area:time;background:${INK};color:#fff;display:flex;flex-direction:column;justify-content:center;padding-left:40px}
  .time .clock{font-size:118px;font-weight:700;letter-spacing:-5px;line-height:.86;display:flex;align-items:flex-start}
  .time .clock .mer{font-size:30px;font-weight:600;margin:10px 0 0 10px}
  .time .date{font-size:27px;font-weight:500;margin-top:14px}
  .time .accent{width:84px;height:6px;background:${RED};border-radius:3px;margin-top:16px}

  .now{grid-area:now;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
  .now .temp{font-size:78px;font-weight:600;line-height:1}
  .now .feels{font-size:19px;font-weight:500;margin-top:2px}
  .now .sun{font-size:16px;font-weight:600;margin-top:12px}

  .wx{grid-area:wx;display:flex;flex-direction:column;justify-content:center}
  .d7row{display:flex;justify-content:space-between;margin-top:6px}
  .d7{display:flex;flex-direction:column;align-items:center;flex:1}
  .d7d{font-size:13px;font-weight:600;letter-spacing:1px}
  .d7t{display:flex;align-items:baseline;gap:5px}
  .d7t b{font-size:20px;font-weight:600}.d7t span{font-size:15px}

  .cal{grid-area:cal}
  .mgrid{display:grid;grid-template-columns:repeat(7,1fr);margin-top:12px}
  .dow{height:26px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600}
  .c{height:42px;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .c span{font-size:20px}
  .c .today{background:${RED};color:#fff;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600}
  .dot{width:5px;height:5px;border-radius:50%;background:${RED};margin-top:3px}.dot.off{background:transparent}

  .next{grid-area:next}
  .next .label{margin-bottom:6px;display:block}
  .n7row{display:flex;align-items:baseline;padding:8px 0}
  .n7d{font-size:16px;font-weight:600;width:52px}.n7i{font-size:15px;flex:1}.n7more{font-size:13px;font-weight:600;color:${RED}}

  .today{grid-area:today}
  .today .label{margin-bottom:6px;display:block}
  .trow{display:flex;align-items:center;padding:10px 0}
  .ttime{font-size:23px;font-weight:600;color:${RED};width:108px}
  .ttitle{font-size:23px;font-weight:500;flex:1}.twho{font-size:17px}

  .photo{grid-area:photo;padding:0;position:relative;display:flex}
  .photo svg{width:100%;height:100%;display:block}
  .photo .cap{position:absolute;left:0;right:0;bottom:0;background:${INK};color:#fff;font-size:15px;font-style:italic;padding:8px 16px}

  .mkts{grid-area:mkts}
  .mrow{display:flex;align-items:center;padding:8px 0}
  .msym{font-size:22px;font-weight:600;width:74px}.mprice{font-size:20px;flex:1;text-align:right}
  .mpct{font-size:18px;font-weight:600;width:88px;text-align:right}.mpct.up{color:${GREEN}}.mpct.down{color:${RED}}

  .notes{grid-area:notes}
  .notes .label{margin-bottom:6px;display:block}
  .note{display:flex;align-items:baseline;padding:6px 0}
  .nwho{font-size:18px;font-weight:600;width:66px;flex-shrink:0}.ntext{font-size:18px;margin-left:8px}
  `;

  const body = `<div class="wrap">
    <div class="panel time">
      <div class="clock">2:32<span class="mer">${data.meridiem}</span></div>
      <div class="accent"></div>
      <div class="date">${data.dateLong}, ${data.dateSub}</div>
    </div>
    <div class="panel now">
      ${icon(wx.kind, 96)}
      <div class="temp">${wx.tempC}°</div>
      <div class="feels">Feels ${wx.feelsC}° · ${wx.place}</div>
      <div class="sun">↑ ${wx.sunrise}&nbsp;&nbsp;↓ ${wx.sunset}</div>
    </div>
    <div class="panel wx">
      ${graphSvg(wx.hours, { w: 1080, h: 168, temp: RED, precip: BLUE, ink: INK })}
      <div class="d7row">${sevenDay}</div>
    </div>
    <div class="panel cal"><span class="label">${cal.monthLabel}</span>${monthGrid(cal)}</div>
    <div class="panel next"><span class="label">Next 7 Days</span>${n7}</div>
    <div class="panel today"><span class="label">Today</span>${agenda}</div>
    <div class="panel photo">${photoSvg}<div class="cap">${esc(photo.caption)}</div></div>
    <div class="panel mkts">${markets}</div>
    <div class="panel notes"><span class="label">Notes</span>${noteRows}</div>
  </div>`;

  return pageShell({ title: "bento", css, body });
}
