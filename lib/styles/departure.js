// "Departure board" — airport/train split-flap schedule. The day rendered as
// departures with synthesized statuses, a weather status strip, and a markets ticker.

import { pageShell, MONO_CSS, esc } from "./_common.js";

const AMBER = "#F4B400";
const GREEN = "#36C46B";
const RED = "#FF4D4D";
const COND = { clear: "SUNNY", partly: "PARTLY CLOUDY", cloudy: "CLOUDY", overcast: "OVERCAST", rain: "RAIN", snow: "SNOW", thunder: "STORMS", fog: "FOG", wind: "WINDY" };

function toMin(t) {
  const m = /(\d+):(\d+)\s*([ap])/i.exec(t);
  if (!m) return 0;
  let h = +m[1] % 12;
  if (m[3].toLowerCase() === "p") h += 12;
  return h * 60 + +m[2];
}

function statusFor(t, now) {
  const d = toMin(t) - now;
  if (d < 0) return { label: "DEPARTED", cls: "dep" };
  if (d <= 45) return { label: "BOARDING", cls: "brd" };
  return { label: "ON TIME", cls: "ont" };
}

export function html(data) {
  const { weather: wx, calendar: cal, stocks, notes } = data;
  const now = toMin(`${data.clock}${data.meridiem === "PM" ? "p" : "a"}`);

  const rows = cal.todayEvents
    .map((e) => {
      const s = statusFor(e.time, now);
      return `<div class="row">
        <span class="flap time">${e.time.toUpperCase()}</span>
        <span class="flap dest">${esc(e.title).toUpperCase()}</span>
        <span class="flap who">${esc(e.who).toUpperCase()}</span>
        <span class="flap st ${s.cls}">${s.label}</span>
      </div>`;
    })
    .join("");

  const wxTiles = wx.week
    .map((d) => `<div class="wt"><div class="wtn">${d.dow.toUpperCase()}</div><div class="wth">${d.hi}°</div><div class="wtl">${d.lo}°</div></div>`)
    .join("");

  const later = cal.next7
    .filter((d) => d.items.length)
    .slice(0, 4)
    .map((d) => `<span class="lchip">${d.dow.toUpperCase()} · ${esc(d.items[0]).toUpperCase()}</span>`)
    .join("");

  const ticker = stocks
    .map((s) => `<span class="tk">${s.sym} <b class="${s.up ? "up" : "down"}">${s.up ? "▲" : "▼"}${Math.abs(s.pct)}%</b></span>`)
    .join("<span class=\"sep\">•</span>");

  const noteLine = notes.map((n) => `${esc(n.who).toUpperCase()}: ${esc(n.text).toUpperCase()}`).join("   ✦   ");

  const css = `
  body{background:#000}
  .board{width:1200px;height:1600px;background:#000;color:#fff;font-family:'IBM Plex Mono',monospace;padding:40px 44px;display:flex;flex-direction:column}

  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #2a2c30;padding-bottom:18px}
  .brand{font-size:46px;font-weight:700;letter-spacing:2px;color:${AMBER}}
  .brand small{display:block;font-size:16px;letter-spacing:6px;color:#8a8f98;font-weight:500;margin-top:4px}
  .clock{text-align:right}
  .clock .t{font-size:78px;font-weight:700;line-height:.9;font-variant-numeric:tabular-nums}
  .clock .t .mer{font-size:28px;color:${AMBER};margin-left:6px}
  .clock .d{font-size:18px;letter-spacing:2px;color:#b9bdc4;margin-top:6px}

  .status{display:flex;align-items:center;gap:14px;margin:18px 0 6px;font-size:20px;letter-spacing:1px;color:#e8eaed}
  .status .big{font-size:30px;font-weight:700}
  .status .amber{color:${AMBER}}
  .wstrip{display:flex;gap:8px;margin-left:auto}
  .wt{background:#111317;border:1px solid #24272c;border-radius:6px;padding:8px 12px;text-align:center;min-width:58px}
  .wtn{font-size:12px;color:#8a8f98;letter-spacing:1px}
  .wth{font-size:20px;font-weight:700}.wtl{font-size:14px;color:#9aa0a8}

  .colhead{display:flex;gap:16px;font-size:15px;letter-spacing:3px;color:#7b818b;margin:34px 0 12px}
  .colhead .time{width:172px}.colhead .dest{flex:1}.colhead .who{width:150px}.colhead .st{width:230px;text-align:center}

  .row{display:flex;gap:16px;margin-bottom:18px}
  .flap{position:relative;background:#16181c;border:1px solid #2c2f35;border-radius:7px;padding:26px 18px;font-size:36px;font-weight:600;overflow:hidden}
  .flap::after{content:"";position:absolute;left:0;right:0;top:50%;height:2px;background:rgba(0,0,0,.55)}
  .time{width:172px;color:${AMBER};font-variant-numeric:tabular-nums}
  .dest{flex:1;white-space:nowrap;text-overflow:ellipsis}
  .who{width:150px;color:#cfd3d9}
  .st{width:230px;text-align:center;font-weight:700;letter-spacing:1px}
  .st.dep{color:#7b818b}.st.brd{color:${AMBER}}.st.ont{color:${GREEN}}

  .sec{margin-top:34px;font-size:15px;letter-spacing:3px;color:#7b818b}
  .later{display:flex;flex-wrap:wrap;gap:12px;margin-top:14px}
  .lchip{background:#111317;border:1px solid #24272c;border-radius:6px;padding:16px 18px;font-size:20px;color:#e8eaed}

  .notes{margin-top:24px;background:#111317;border:1px solid #24272c;border-radius:8px;padding:20px 18px;font-size:19px;letter-spacing:1px;color:#d4d8de;white-space:nowrap;overflow:hidden}
  .notes b{color:${AMBER}}

  .ticker{margin-top:auto;border-top:2px solid #2a2c30;padding-top:16px;display:flex;align-items:center;gap:16px;font-size:22px;font-weight:600;white-space:nowrap;overflow:hidden}
  .ticker .lead{color:#000;background:${AMBER};padding:6px 12px;border-radius:5px;font-size:16px;letter-spacing:2px}
  .ticker .up{color:${GREEN}}.ticker .down{color:${RED}}
  .ticker .sep{color:#4a4e55;margin:0 6px}
  `;

  const body = `<div class="board">
    <div class="head">
      <div class="brand">DEPARTURES<small>FAMILY TERMINAL</small></div>
      <div class="clock"><div class="t">2:32<span class="mer">${data.meridiem}</span></div><div class="d">${(data.dateLong + " " + data.dateSub).toUpperCase()}</div></div>
    </div>

    <div class="status">
      <span class="big amber">${wx.tempC}°</span>
      <span>${wx.place.toUpperCase()} · ${COND[wx.kind] || ""} · FEELS ${wx.feelsC}° · ↑${wx.sunrise} ↓${wx.sunset}</span>
      <div class="wstrip">${wxTiles}</div>
    </div>

    <div class="colhead"><span class="time">TIME</span><span class="dest">EVENT</span><span class="who">WHO</span><span class="st">STATUS</span></div>
    ${rows}

    <div class="sec">LATER THIS WEEK</div>
    <div class="later">${later}</div>

    <div class="notes">📌 ${noteLine}</div>

    <div class="ticker"><span class="lead">MARKETS</span>${ticker}</div>
  </div>`;

  return pageShell({ title: "departure", css, body, fonts: MONO_CSS });
}
