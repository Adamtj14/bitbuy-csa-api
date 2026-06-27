// "Terminal" — a CRT command-line dashboard. Monospace, green-on-black, the day
// printed as command output, with a faux window chrome and blinking cursor.

import { pageShell, MONO_CSS, monthWeeks, esc } from "./_common.js";

const GREEN = "#3BE06B";
const DIM = "#1f8a45";
const AMBER = "#F4B400";
const CYAN = "#56d6d6";
const RED = "#ff5d5d";

export function html(data) {
  const { weather: wx, calendar: cal, stocks, notes } = data;
  const COND = { clear: "clear", partly: "partly cloudy", cloudy: "cloudy", overcast: "overcast", rain: "rain", snow: "snow", thunder: "storms", fog: "fog", wind: "windy" };

  const prompt = `<span class="u">adam</span><span class="at">@</span><span class="h">home</span>:<span class="pa">~</span><span class="d">$</span>`;

  const agenda = cal.todayEvents
    .map((e) => `<div class="ln"><span class="ok">[ ]</span> <span class="am">${e.time.padEnd(7)}</span> ${esc(e.title)} <span class="dim">— ${esc(e.who)}</span></div>`)
    .join("");
  const forecast = wx.week
    .map((d) => `<div class="ln"><span class="cy">${d.dow.padEnd(4)}</span> ${(COND[d.kind] || "").padEnd(15)} <span class="am">${d.hi}°</span>/<span class="dim">${d.lo}°</span></div>`)
    .join("");
  const noteRows = notes.map((n) => `<div class="ln"><span class="dim">&gt;</span> <span class="cy">${esc(n.who)}:</span> ${esc(n.text)}</div>`).join("");
  const ticker = stocks.map((s) => `<span class="${s.up ? "up" : "down"}">${s.sym} ${s.up ? "+" : ""}${s.pct}%</span>`).join("  ");

  // monospace calendar
  const dows = "Su Mo Tu We Th Fr Sa";
  const weeks = monthWeeks(cal.year, cal.month).map((wk) =>
    wk.map((d) => {
      if (d === null) return "  ";
      const s = String(d).padStart(2);
      if (d === cal.today) return `<span class="tdy">${s}</span>`;
      if (cal.eventDays.includes(d)) return `<span class="cy">${s}</span>`;
      return s;
    }).join(" ")
  ).join("\n");

  const css = `
  body{background:#050805}
  .term{width:1200px;height:1600px;background:#070a07;color:${GREEN};font-family:'IBM Plex Mono',monospace;display:flex;flex-direction:column;
    box-shadow:inset 0 0 200px rgba(0,40,0,.6)}
  .bar{display:flex;align-items:center;gap:10px;padding:16px 22px;border-bottom:1px solid #173d17;font-size:16px;color:${DIM}}
  .dotr{width:14px;height:14px;border-radius:50%}.r{background:#ff5f56}.y{background:#ffbd2e}.g{background:#27c93f}
  .title{margin-left:auto;letter-spacing:1px}
  .scan{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,0) 0px,rgba(0,0,0,0) 3px,rgba(0,0,0,.16) 4px)}
  .body{position:relative;flex:1;padding:30px 34px;font-size:24px;line-height:1.5;overflow:hidden}
  .u{color:${GREEN}}.at,.h{color:${CYAN}}.pa{color:${AMBER}}.d{color:#fff;margin:0 8px 0 2px}
  .cmd{color:#fff}
  .ln{white-space:pre-wrap}
  .ok{color:${DIM}}.am{color:${AMBER}}.cy{color:${CYAN}}.dim{color:${DIM}}.up{color:${GREEN}}.down{color:${RED}}
  .sect{margin:8px 0 18px}
  .banner{color:${GREEN};font-size:21px;line-height:1.15;white-space:pre;margin-bottom:6px}
  .big{color:#fff;font-weight:700}
  .cal{white-space:pre;line-height:1.5}
  .tdy{background:${GREEN};color:#070a07;font-weight:700}
  .cursor{display:inline-block;width:14px;height:26px;background:${GREEN};vertical-align:-4px;margin-left:6px}
  `;

  const banner =
`  ___    _              _____ _
 / _ \\  | |            |_   _(_)_ __ ___   ___  ___
| | | | | |   ___ _____  | | | | '_ \` _ \\ / _ \\/ __|
| |_| | | |  |___|_____| | | | | | | | | |  __/\\__ \\
 \\___/  |_|              |_| |_|_| |_| |_|\\___||___/`;

  const body = `<div class="term">
    <div class="bar"><span class="dotr r"></span><span class="dotr y"></span><span class="dotr g"></span><span class="title">family-dashboard — zsh — 1200×1600</span></div>
    <div class="body">
      <div class="scan"></div>
      <div class="banner">${banner}</div>

      <div class="sect"><div class="ln">${prompt} <span class="cmd">date</span></div>
      <div class="ln"><span class="big">${data.clock} ${data.meridiem}</span>  ·  ${data.dateLong}, ${data.dateSub}</div></div>

      <div class="sect"><div class="ln">${prompt} <span class="cmd">weather --now</span></div>
      <div class="ln"><span class="big">${wx.tempC}°C</span> ${COND[wx.kind] || ""}, feels ${wx.feelsC}°  ·  ${wx.place}  ·  <span class="am">↑</span>${wx.sunrise} <span class="cy">↓</span>${wx.sunset}</div>
      ${forecast}</div>

      <div class="sect"><div class="ln">${prompt} <span class="cmd">agenda --today</span></div>
      ${agenda}</div>

      <div class="sect"><div class="ln">${prompt} <span class="cmd">cal</span></div>
      <div class="cal"><span class="dim">${cal.monthLabel}</span>\n${dows}\n${weeks}</div></div>

      <div class="sect"><div class="ln">${prompt} <span class="cmd">notes</span></div>
      ${noteRows}</div>

      <div class="sect"><div class="ln">${prompt} <span class="cmd">markets</span></div>
      <div class="ln">${ticker}</div></div>

      <div class="ln">${prompt}<span class="cursor"></span></div>
    </div>
  </div>`;

  return pageShell({ title: "terminal", css, body, fonts: MONO_CSS });
}
