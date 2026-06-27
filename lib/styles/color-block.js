// "Color-block" — chunky, app-like: two bold header blocks + colored pill labels
// per section. Embraces the 6-color palette (accepts some dither texture on fills).

import { pageShell, icon, graphSvg, monthWeeks, esc } from "./_common.js";

const RED = "#D11A2A";
const BLUE = "#1E54C8";
const GREEN = "#1F8A4C";
const YELLOW = "#E8B500";
const INK = "#000000";

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

const pill = (text, cls) => `<div class="pillrow"><span class="pill ${cls}">${text}</span></div>`;

export function html(data) {
  const { weather: wx, calendar: cal, stocks, notes, photo } = data;

  const sevenDay = wx.week
    .map((d) => `<div class="d7"><div class="d7d">${d.dow}</div>${icon(d.kind, 52)}<div class="d7t"><b>${d.hi}°</b><span>${d.lo}°</span></div></div>`)
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
  const photoSvg = `<svg viewBox="0 0 360 220" width="360" height="220" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><rect width="360" height="220" fill="#fff"/><circle cx="290" cy="56" r="26" fill="${YELLOW}"/><polygon points="0,220 120,108 205,220" fill="${GREEN}"/><polygon points="140,220 250,80 360,220" fill="${BLUE}"/></svg>`;

  const css = `
  .page{padding:36px;color:${INK}}
  .header{display:flex;gap:20px;height:236px}
  .h-time{flex:1.6;background:${INK};color:#fff;border-radius:28px;padding:34px 40px;display:flex;flex-direction:column;justify-content:center}
  .h-time .clock{font-size:120px;font-weight:700;letter-spacing:-5px;line-height:.84;display:flex;align-items:flex-start}
  .h-time .clock .mer{font-size:30px;font-weight:600;margin:10px 0 0 10px}
  .h-time .date{font-size:26px;font-weight:500;margin-top:14px}
  .h-time .accent{width:80px;height:6px;background:${RED};border-radius:3px;margin-top:14px}
  .h-wx{flex:1;background:${BLUE};color:#fff;border-radius:28px;padding:28px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
  .h-wx .temp{font-size:80px;font-weight:700;line-height:1}
  .h-wx .feels{font-size:19px;font-weight:600;margin-top:2px}
  .h-wx .sun{font-size:16px;font-weight:600;margin-top:12px}

  .sec{margin-top:24px}
  .pillrow{margin-bottom:12px}
  .pill{display:inline-flex;align-items:center;border-radius:999px;padding:8px 20px;font-size:15px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#fff}
  .pill.blue{background:${BLUE}}.pill.green{background:${GREEN}}.pill.red{background:${RED}}
  .pill.black{background:${INK}}.pill.yellow{background:${YELLOW};color:${INK}}

  .d7row{display:flex;justify-content:space-between;margin-top:8px}
  .d7{display:flex;flex-direction:column;align-items:center;flex:1}
  .d7d{font-size:13px;font-weight:700;letter-spacing:1px}
  .d7t{display:flex;align-items:baseline;gap:5px}.d7t b{font-size:20px;font-weight:700}.d7t span{font-size:15px}

  .calrow{display:flex;gap:48px}
  .month{width:430px}
  .mgrid{display:grid;grid-template-columns:repeat(7,1fr)}
  .dow{height:22px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700}
  .c{height:38px;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .c span{font-size:19px;font-weight:500}
  .c .today{background:${RED};color:#fff;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;line-height:1}
  .dot{width:5px;height:5px;border-radius:50%;background:${RED};margin-top:2px}.dot.off{background:transparent}
  .next{flex:1}
  .n7row{display:flex;align-items:baseline;padding:6px 0}
  .n7d{font-size:16px;font-weight:700;width:50px}.n7i{font-size:15px;flex:1}

  .trow{display:flex;align-items:center;padding:9px 0}
  .ttime{font-size:24px;font-weight:700;color:${RED};width:114px}
  .ttitle{font-size:24px;font-weight:600;flex:1}.twho{font-size:18px}

  .rail{display:flex;gap:36px}
  .photo{width:360px}
  .photo .frame{overflow:hidden;height:220px;border-radius:18px}
  .photo .frame svg{width:100%;height:100%;display:block}
  .photo .cap{font-size:14px;font-style:italic;margin-top:8px}
  .col{flex:1}
  .mrow{display:flex;align-items:center;padding:7px 0}
  .msym{font-size:21px;font-weight:700;width:72px}.mprice{font-size:19px;flex:1;text-align:right}
  .mpct{font-size:17px;font-weight:700;width:84px;text-align:right}.mpct.up{color:${GREEN}}.mpct.down{color:${RED}}
  .note{display:flex;align-items:baseline;padding:6px 0}
  .nwho{font-size:18px;font-weight:700;width:64px;flex-shrink:0}.ntext{font-size:18px;margin-left:8px}
  `;

  const body = `<div class="page">
    <div class="header">
      <div class="h-time">
        <div class="clock">2:32<span class="mer">${data.meridiem}</span></div>
        <div class="accent"></div>
        <div class="date">${data.dateLong}, ${data.dateSub}</div>
      </div>
      <div class="h-wx">
        ${icon(wx.kind, 92)}
        <div class="temp">${wx.tempC}°</div>
        <div class="feels">Feels ${wx.feelsC}° · ${wx.place}</div>
        <div class="sun">↑ ${wx.sunrise}&nbsp;&nbsp;↓ ${wx.sunset}</div>
      </div>
    </div>

    <div class="sec">
      ${pill("Weather", "blue")}
      ${graphSvg(wx.hours, { w: 1128, h: 158, temp: RED, precip: BLUE, ink: INK })}
      <div class="d7row">${sevenDay}</div>
    </div>

    <div class="sec">
      ${pill("Calendar", "green")}
      <div class="calrow">
        <div class="month">${monthGrid(cal)}</div>
        <div class="next">${n7}</div>
      </div>
    </div>

    <div class="sec">
      ${pill("Today", "red")}
      ${agenda}
    </div>

    <div class="sec rail">
      <div class="photo"><div class="frame">${photoSvg}</div><div class="cap">${esc(photo.caption)}</div></div>
      <div class="col">${pill("Markets", "black")}${markets}</div>
      <div class="col">${pill("Notes", "yellow")}${noteRows}</div>
    </div>
  </div>`;

  return pageShell({ title: "color-block", css, body });
}
