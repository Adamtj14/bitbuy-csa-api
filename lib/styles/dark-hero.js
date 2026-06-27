// "Dark hero" — a bold black header block (white time + weather) over a crisp
// light body. Monochrome with a single red accent. Black fills are speckle-free
// on the 6-color panel, so this reads with the most contrast.

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
      if (d === null) { cells += `<div class="cell"></div>`; continue; }
      const today = d === cal.today;
      const ev = cal.eventDays.includes(d) && !today;
      cells += `<div class="cell"><span class="${today ? "today" : ""}">${d}</span>${ev ? '<i class="dot"></i>' : '<i class="dot off"></i>'}</div>`;
    }
  }
  return `<div class="mgrid">${cells}</div>`;
}

export function html(data) {
  const { weather: wx, calendar: cal, stocks, notes, photo } = data;

  const sevenDay = wx.week
    .map((d) => `<div class="d7"><div class="d7d">${d.dow}</div>${icon(d.kind, 56)}<div class="d7t"><b>${d.hi}°</b><span>${d.lo}°</span></div></div>`)
    .join("");

  const n7 = cal.next7
    .map((d) => `<div class="n7row"><span class="n7d">${d.dow}</span><span class="n7i ${d.items[0] ? "" : "muted"}">${d.items[0] ? esc(d.items[0]) : "—"}</span>${d.items.length > 1 ? `<span class="n7more">+${d.items.length - 1}</span>` : ""}</div>`)
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

  const photoSvg = `<svg viewBox="0 0 360 250" width="360" height="250" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><rect width="360" height="250" fill="#fff"/><circle cx="286" cy="60" r="26" fill="#E0AE00"/><polygon points="0,250 120,128 205,250" fill="${GREEN}"/><polygon points="140,250 250,96 360,250" fill="${BLUE}"/></svg>`;

  const css = `
  .hero{height:320px;background:${INK};color:#fff;display:flex;justify-content:space-between;align-items:flex-start;padding:52px 56px 0}
  .clock{font-size:150px;font-weight:700;letter-spacing:-6px;line-height:.9;display:flex;align-items:flex-start}
  .clock .mer{font-size:34px;font-weight:600;margin:14px 0 0 12px}
  .accent{width:96px;height:7px;background:${RED};margin:14px 0 18px;border-radius:4px}
  .date{font-size:31px;font-weight:500}
  .hero-wx{display:flex;flex-direction:column;align-items:flex-end;text-align:right;margin-top:6px}
  .hero-wx .row{display:flex;align-items:center;gap:6px}
  .hero-wx .temp{font-size:104px;font-weight:600;line-height:.9}
  .hero-wx .sub{font-size:21px;font-weight:500;margin-top:10px}
  .hero-wx .sun{font-size:18px;font-weight:600;margin-top:8px;letter-spacing:.5px}
  .hero-wx .sun b{color:#fff}

  .content{padding:22px 56px 40px;color:${INK}}
  .label{font-size:13px;font-weight:600;letter-spacing:2.5px;color:${INK};text-transform:uppercase}
  hr{border:none;border-top:1px solid ${INK};margin:18px 0}

  .d7row{display:flex;justify-content:space-between;margin-top:8px}
  .d7{display:flex;flex-direction:column;align-items:center;width:150px}
  .d7d{font-size:13px;font-weight:600;letter-spacing:1.5px}
  .d7t{display:flex;align-items:baseline;gap:6px;margin-top:2px}
  .d7t b{font-size:21px;font-weight:600}
  .d7t span{font-size:16px}

  .cal{display:flex}
  .month{width:470px}
  .mgrid{display:grid;grid-template-columns:repeat(7,1fr);margin-top:10px}
  .dow{height:26px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600}
  .cell{height:42px;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .cell span{font-size:21px}
  .cell .today{background:${RED};color:#fff;width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600}
  .dot{width:5px;height:5px;border-radius:50%;background:${RED};margin-top:3px}
  .dot.off{background:transparent}
  .next7{flex:1;margin-left:36px}
  .n7row{display:flex;align-items:baseline;padding:9px 0}
  .n7d{font-size:17px;font-weight:600;width:56px}
  .n7i{font-size:16px;flex:1}
  .n7i.muted{opacity:1}
  .n7more{font-size:14px;font-weight:600;color:${RED}}

  .trow{display:flex;align-items:center;padding:10px 0}
  .ttime{font-size:25px;font-weight:600;color:${RED};width:120px}
  .ttitle{font-size:25px;font-weight:500;flex:1}
  .twho{font-size:19px}

  .rail{display:flex;align-items:stretch}
  .vr{width:1px;background:${INK};margin:0 26px}
  .photo{width:360px;display:flex;flex-direction:column}
  .photo .frame{border:1px solid ${INK};overflow:hidden;height:250px}
  .photo .frame svg{width:100%;height:100%;display:block}
  .photo .cap{font-size:15px;font-style:italic;margin-top:8px}
  .markets{width:300px}
  .mrow{display:flex;align-items:center;padding:10px 0}
  .msym{font-size:23px;font-weight:600;width:78px}
  .mprice{font-size:21px;flex:1;text-align:right}
  .mpct{font-size:19px;font-weight:600;width:92px;text-align:right}
  .mpct.up{color:${GREEN}} .mpct.down{color:${RED}}
  .notes{flex:1}
  .notes .label{margin-bottom:8px;display:block}
  .note{display:flex;align-items:baseline;padding:7px 0}
  .nwho{font-size:19px;font-weight:600;width:70px;flex-shrink:0}
  .ntext{font-size:19px;margin-left:8px}
  `;

  const body = `
  <div class="hero">
    <div>
      <div class="clock">2:32<span class="mer">${data.meridiem}</span></div>
      <div class="accent"></div>
      <div class="date">${data.dateLong}, ${data.dateSub}</div>
    </div>
    <div class="hero-wx">
      <div class="row">${icon(wx.kind, 96)}<span class="temp">${wx.tempC}°</span></div>
      <div class="sub">Feels ${wx.feelsC}°  ·  ${wx.place}</div>
      <div class="sun">Sunrise <b>${wx.sunrise}</b>&nbsp;&nbsp;Sunset <b>${wx.sunset}</b></div>
    </div>
  </div>

  <div class="content">
    <div class="weather">
      ${graphSvg(wx.hours, { w: 1088, h: 150, temp: RED, precip: BLUE, ink: INK })}
      <div class="d7row">${sevenDay}</div>
    </div>

    <hr>

    <div class="cal">
      <div class="month"><span class="label">${cal.monthLabel}</span>${monthGrid(cal)}</div>
      <div class="next7"><span class="label">Next 7 Days</span>${n7}</div>
    </div>

    <hr>

    <div class="today"><span class="label">Today</span>${agenda}</div>

    <hr>

    <div class="rail">
      <div class="photo"><div class="frame">${photoSvg}</div><div class="cap">${esc(photo.caption)}</div></div>
      <div class="vr"></div>
      <div class="markets">${markets}</div>
      <div class="vr"></div>
      <div class="notes"><span class="label">Notes</span>${noteRows}</div>
    </div>
  </div>`;

  return pageShell({ title: "dark-hero", css, body });
}
