// "Editorial" — magazine-style: oversized hero numerals, airy whitespace,
// hairline rules, asymmetry, near-monochrome with a single red accent.

import { pageShell, icon, graphSvg, monthWeeks, esc } from "./_common.js";

const RED = "#D11A2A";
const GREEN = "#1F8A4C";
const BLUE = "#2156C0";
const INK = "#000000";

const COND = {
  clear: "Clear", partly: "Partly cloudy", cloudy: "Cloudy", overcast: "Overcast",
  rain: "Rain", snow: "Snow", thunder: "Thunderstorms", fog: "Fog", wind: "Windy",
};

function monthGrid(cal) {
  const dows = ["S", "M", "T", "W", "T", "F", "S"];
  let cells = dows.map((d) => `<div class="dow">${d}</div>`).join("");
  for (const wk of monthWeeks(cal.year, cal.month)) {
    for (const d of wk) {
      if (d === null) { cells += `<div class="c"></div>`; continue; }
      if (d === cal.today) { cells += `<div class="c"><span class="today">${d}</span></div>`; continue; }
      const ev = cal.eventDays.includes(d);
      cells += `<div class="c"><span>${d}</span><i class="dot ${ev ? "" : "off"}"></i></div>`;
    }
  }
  return `<div class="mgrid">${cells}</div>`;
}

export function html(data) {
  const { weather: wx, calendar: cal, stocks, notes, photo } = data;

  const sevenDay = wx.week
    .map((d) => `<div class="d7"><div class="d7d">${d.dow}</div>${icon(d.kind, 46)}<div class="d7t"><b>${d.hi}°</b><span>${d.lo}°</span></div></div>`)
    .join("");
  const n7 = cal.next7
    .map((d) => `<div class="n7row"><span class="n7d">${d.dow}</span><span class="n7i">${d.items[0] ? esc(d.items[0]) : "—"}</span></div>`)
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
  const photoSvg = `<svg viewBox="0 0 320 210" width="320" height="210" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><rect width="320" height="210" fill="#fff"/><circle cx="255" cy="54" r="24" fill="#E0AE00"/><polygon points="0,210 110,110 185,210" fill="${GREEN}"/><polygon points="125,210 225,82 320,210" fill="${BLUE}"/></svg>`;

  const css = `
  .page{padding:54px 60px;color:${INK}}
  .clock{font-size:158px;font-weight:700;letter-spacing:-7px;line-height:.84;display:flex;align-items:flex-start}
  .clock .mer{font-size:38px;font-weight:600;margin:18px 0 0 12px}
  .date{font-size:22px;font-weight:600;letter-spacing:5px;text-transform:uppercase;margin-top:14px}
  .rule-red{width:120px;height:6px;background:${RED};border-radius:3px;margin:20px 0 6px}
  hr{border:none;border-top:1px solid ${INK};margin:22px 0}
  .label{font-size:13px;font-weight:600;letter-spacing:3px;text-transform:uppercase}

  .whero{display:flex;justify-content:space-between;align-items:flex-end;margin-top:14px}
  .bigtemp{font-size:128px;font-weight:600;line-height:.82}
  .cond{font-size:30px;font-weight:400;margin-top:10px}
  .condsub{font-size:19px;font-weight:500;margin-top:4px}
  .wright{display:flex;flex-direction:column;align-items:flex-end;text-align:right}
  .wright .sun{font-size:16px;font-weight:600;letter-spacing:1px;margin-top:10px}

  .d7row{display:flex;justify-content:space-between;margin-top:14px}
  .d7{display:flex;flex-direction:column;align-items:center;flex:1}
  .d7d{font-size:12px;font-weight:600;letter-spacing:1px}
  .d7t{display:flex;align-items:baseline;gap:5px}.d7t b{font-size:19px;font-weight:600}.d7t span{font-size:14px}

  .agenda{margin-top:4px}
  .trow{display:flex;align-items:baseline;padding:9px 0}
  .ttime{font-size:27px;font-weight:600;color:${RED};width:128px}
  .ttitle{font-size:27px;font-weight:500;flex:1}.twho{font-size:18px}

  .calrow{display:flex;gap:54px;margin-top:4px}
  .month{width:430px}
  .mgrid{display:grid;grid-template-columns:repeat(7,1fr);margin-top:8px}
  .dow{height:22px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600}
  .c{height:36px;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .c span{font-size:19px}
  .c .today{background:${RED};color:#fff;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600;flex-shrink:0;line-height:1}
  .dot{width:4px;height:4px;border-radius:50%;background:${RED};margin-top:2px}.dot.off{background:transparent}
  .next{flex:1}
  .n7row{display:flex;align-items:baseline;padding:6px 0}
  .n7d{font-size:16px;font-weight:600;width:50px}.n7i{font-size:15px;flex:1}

  .rail{display:flex;gap:44px;margin-top:6px}
  .photo{width:320px}
  .photo .frame{overflow:hidden;height:210px}
  .photo .frame svg{width:100%;height:100%;display:block}
  .photo .cap{font-size:14px;font-style:italic;margin-top:7px}
  .col-h{margin-bottom:8px;display:block}
  .markets{width:300px}
  .mrow{display:flex;align-items:center;padding:7px 0}
  .msym{font-size:21px;font-weight:600;width:72px}.mprice{font-size:19px;flex:1;text-align:right}
  .mpct{font-size:17px;font-weight:600;width:84px;text-align:right}.mpct.up{color:${GREEN}}.mpct.down{color:${RED}}
  .notes{flex:1}
  .note{display:flex;align-items:baseline;padding:6px 0}
  .nwho{font-size:18px;font-weight:600;width:64px;flex-shrink:0}.ntext{font-size:18px;margin-left:8px}
  `;

  const body = `<div class="page">
    <div class="clock">2:32<span class="mer">${data.meridiem}</span></div>
    <div class="date">${data.dateLong} · ${data.dateSub}</div>
    <div class="rule-red"></div>

    <div class="whero">
      <div>
        <div class="bigtemp">${wx.tempC}°</div>
        <div class="cond">${COND[wx.kind] || "Weather"}</div>
        <div class="condsub">Feels ${wx.feelsC}° · ${wx.place}</div>
      </div>
      <div class="wright">
        ${icon(wx.kind, 120)}
        <div class="sun">SUNRISE ${wx.sunrise} &nbsp; SUNSET ${wx.sunset}</div>
      </div>
    </div>
    ${graphSvg(wx.hours, { w: 1080, h: 150, temp: RED, precip: INK, ink: INK })}
    <div class="d7row">${sevenDay}</div>

    <hr>

    <span class="label">Today</span>
    <div class="agenda">${agenda}</div>

    <hr>

    <div class="calrow">
      <div class="month"><span class="label">${cal.monthLabel}</span>${monthGrid(cal)}</div>
      <div class="next"><span class="label">Next 7 Days</span>${n7}</div>
    </div>

    <hr>

    <div class="rail">
      <div class="photo"><span class="label col-h">Photo</span><div class="frame">${photoSvg}</div><div class="cap">${esc(photo.caption)}</div></div>
      <div class="markets"><span class="label col-h">Markets</span>${markets}</div>
      <div class="notes"><span class="label col-h">Notes</span>${noteRows}</div>
    </div>
  </div>`;

  return pageShell({ title: "editorial", css, body });
}
