// "The Family Times" — a classic black-and-white newspaper front page.
// Playfair Display masthead/headlines, serif body, boxed forecast & almanac.

import { pageShell, SERIF_CSS, monthWeeks, esc, photoDataUri } from "./_common.js";

const INK = "#0a0a0a";
const COND = { clear: "Sunny", partly: "Partly cloudy", cloudy: "Cloudy", overcast: "Overcast", rain: "Rain", snow: "Snow", thunder: "Storms", fog: "Fog", wind: "Windy" };

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
  const { weather: wx, calendar: cal, notes } = data;

  const agenda = cal.todayEvents
    .map((e) => `<div class="ev-row"><span class="ev-t">${e.time}</span><span class="ev-d">${esc(e.title)} <i>(${esc(e.who)})</i></span></div>`)
    .join("");
  const week = cal.next7
    .map((d) => `<div class="wk"><b>${d.dow}</b> ${d.items[0] ? esc(d.items[0]) : "No events"}</div>`)
    .join("");
  const forecast = wx.week
    .map((d) => `<tr><td class="fd">${d.dow}</td><td>${COND[d.kind] || ""}</td><td class="ft">${d.hi}° / ${d.lo}°</td></tr>`)
    .join("");
  const noticeRows = notes.map((n) => `<div class="notice"><b>${esc(n.who)}:</b> ${esc(n.text)}</div>`).join("");

  const real = photoDataUri();
  const photoSvg = real
    ? `<img class="ph" src="${real}">`
    : `<svg viewBox="0 0 520 300" width="520" height="300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><rect width="520" height="300" fill="#fff"/><circle cx="410" cy="70" r="34" fill="#cfcfcf"/><polygon points="0,300 175,150 300,300" fill="#9a9a9a"/><polygon points="200,300 350,120 520,300" fill="#6f6f6f"/></svg>`;

  const css = `
  body{background:#fff}
  .paper{padding:46px 50px;color:${INK};font-family:Georgia,'Liberation Serif',serif}
  .serif{font-family:'Playfair Display',Georgia,serif}

  .rule{border-top:2px solid ${INK}}
  .rule.thin{border-top:1px solid ${INK}}
  .rule.double{border-top:5px double ${INK}}

  .masthead{font-family:'Playfair Display',serif;font-weight:900;font-size:104px;line-height:1;text-align:center;letter-spacing:-1px;margin:10px 0 8px}
  .dateline{display:flex;justify-content:space-between;font-size:15px;letter-spacing:1.5px;text-transform:uppercase;padding:8px 2px}
  .dateline b{font-weight:700}

  .cols{display:grid;grid-template-columns:1.55fr 1fr;gap:0;margin-top:16px}
  .main{padding-right:34px}
  .side{padding-left:34px;border-left:1px solid ${INK}}

  .kicker{font-size:14px;letter-spacing:3px;text-transform:uppercase;text-align:center;border-bottom:1px solid ${INK};border-top:1px solid ${INK};padding:5px 0;margin-bottom:12px;font-weight:700}
  .head{font-family:'Playfair Display',serif;font-weight:800;font-size:52px;line-height:1.02;margin-bottom:6px}
  .byline{font-style:italic;font-size:17px;margin-bottom:12px}

  .lead{font-size:21px;line-height:1.4}
  .lead::first-letter{font-family:'Playfair Display',serif;font-weight:900;font-size:86px;line-height:.7;float:left;margin:8px 12px 0 0}
  .ev-row{display:flex;gap:16px;padding:9px 0;border-bottom:1px solid #c9c9c9;font-size:20px}
  .ev-t{font-weight:700;width:120px;font-variant-numeric:tabular-nums}
  .ev-d i{font-style:italic}

  .photo{margin:18px 0 6px}
  .photo svg,.photo .ph{width:100%;height:300px;display:block;object-fit:cover;filter:grayscale(1) contrast(1.05);border:1px solid ${INK}}
  .cap{font-size:15px;font-style:italic;padding-top:6px;border-bottom:1px solid ${INK};padding-bottom:10px}
  .wk{font-size:18px;padding:6px 0;border-bottom:1px solid #c9c9c9}.wk b{font-weight:700}

  .box{border:2px solid ${INK};padding:16px 16px 14px;margin-bottom:20px}
  .boxhead{font-family:'Playfair Display',serif;font-weight:800;font-size:26px;text-align:center;border-bottom:2px solid ${INK};padding-bottom:8px;margin-bottom:10px}
  .wnow{font-size:19px;text-align:center;margin-bottom:10px}
  .wnow b{font-size:30px;font-family:'Playfair Display',serif}
  table{width:100%;border-collapse:collapse;font-size:17px}
  td{padding:5px 0;border-bottom:1px solid #d6d6d6}
  .fd{font-weight:700;width:54px}.ft{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
  .notice{font-size:18px;padding:6px 0;border-bottom:1px dashed #b9b9b9;line-height:1.3}.notice b{font-weight:700}

  .mgrid{display:grid;grid-template-columns:repeat(7,1fr);text-align:center}
  .dow{font-size:13px;font-weight:700;padding-bottom:4px}
  .c{height:36px;display:flex;align-items:center;justify-content:center;font-size:18px}
  .c .ev{font-weight:700;text-decoration:underline}
  .c .today{background:${INK};color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  `;

  const body = `<div class="paper">
    <div class="rule double"></div>
    <div class="masthead">The Adam Times</div>
    <div class="rule thin"></div>
    <div class="dateline"><span>VOL. MMXXVI · No. 178</span><span><b>${data.dateLong}, ${data.dateSub}</b></span><span>${wx.place} · ${wx.tempC}° ${COND[wx.kind] || ""}</span></div>
    <div class="rule"></div>

    <div class="cols">
      <div class="main">
        <div class="kicker">Today's Schedule</div>
        <div class="head">A Full Saturday: Soccer, Lunch &amp; a Family Dinner</div>
        <div class="byline">From the Household Desk</div>
        <div class="lead">The family faces a busy day ahead, with ${cal.todayEvents.length} appointments on the books from morning to evening. Highlights below.</div>
        <div style="margin-top:12px">${agenda}</div>
        <div class="photo">${photoSvg}<div class="cap">${esc(data.photo.caption)} — from the family archive.</div></div>
        <div class="kicker">The Week Ahead</div>
        ${week}
      </div>

      <div class="side">
        <div class="box">
          <div class="boxhead">Weather</div>
          <div class="wnow"><b>${wx.tempC}°</b> &nbsp;${COND[wx.kind] || ""}, feels ${wx.feelsC}°<br><span style="font-size:15px">Sunrise ${wx.sunrise} · Sunset ${wx.sunset}</span></div>
          <table>${forecast}</table>
        </div>
        <div class="box">
          <div class="boxhead">Family Notices</div>
          ${noticeRows}
        </div>
        <div class="box">
          <div class="boxhead">${cal.monthLabel}</div>
          ${monthGrid(cal)}
        </div>
      </div>
    </div>
  </div>`;

  return pageShell({ title: "family-times", css, body, fonts: SERIF_CSS });
}
