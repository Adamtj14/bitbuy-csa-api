// "Photo cover" — the family photo fills the screen as an art print; time, weather
// and today's agenda float over it with gradient scrims for legibility.

import { pageShell, icon, esc, photoDataUri } from "./_common.js";

export function html(data) {
  const { weather: wx, calendar: cal, notes } = data;
  const COND = { clear: "Clear", partly: "Partly cloudy", cloudy: "Cloudy", overcast: "Overcast", rain: "Rain", snow: "Snow", thunder: "Storms", fog: "Fog", wind: "Windy" };

  const agenda = cal.todayEvents
    .map((e) => `<div class="ev"><span class="t">${e.time}</span><span class="d">${esc(e.title)}</span><span class="w">${esc(e.who)}</span></div>`)
    .join("");
  // Real photo if assets/photo.* exists, else a drawn scenic placeholder.
  const real = photoDataUri();
  const photo = real ? `<img class="bg" src="${real}">` : `
  <svg class="bg" viewBox="0 0 1200 1600" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f6b65c"/><stop offset="0.45" stop-color="#ef8f6b"/>
        <stop offset="0.75" stop-color="#b86b8f"/><stop offset="1" stop-color="#5b5b8f"/>
      </linearGradient>
      <linearGradient id="lake" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#7b6fa3"/><stop offset="1" stop-color="#3f3f6b"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="1600" fill="url(#sky)"/>
    <circle cx="820" cy="470" r="120" fill="#ffd98a"/>
    <path d="M0 980 L300 720 L520 980 Z" fill="#6f5f86"/>
    <path d="M360 980 L700 640 L1020 980 Z" fill="#5b4f73"/>
    <path d="M820 980 L1080 760 L1200 980 L1200 980 Z" fill="#4c4264"/>
    <rect y="980" width="1200" height="620" fill="url(#lake)"/>
    <circle cx="820" cy="1120" r="120" fill="#e9c179" opacity="0.5"/>
    <path d="M0 980 L300 720 L520 980 Z" transform="translate(0,2 ) scale(1,-1) translate(0,-2560)" fill="#4a4068" opacity="0.35"/>
  </svg>`;

  const css = `
  .cover{position:relative;width:1200px;height:1600px;overflow:hidden;color:#fff;font-family:'Inter',sans-serif}
  .bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .scrim-top{position:absolute;top:0;left:0;right:0;height:460px;background:linear-gradient(180deg,rgba(0,0,0,.55),rgba(0,0,0,0))}
  .scrim-bot{position:absolute;bottom:0;left:0;right:0;height:760px;background:linear-gradient(0deg,rgba(0,0,0,.82),rgba(0,0,0,.2) 60%,rgba(0,0,0,0))}
  .layer{position:absolute;inset:0;z-index:3;padding:58px 60px;display:flex;flex-direction:column}

  .top{display:flex;justify-content:space-between;align-items:flex-start}
  .clock{font-weight:800;font-size:150px;line-height:.82;letter-spacing:-6px;text-shadow:0 2px 18px rgba(0,0,0,.4)}
  .clock .mer{font-size:38px;font-weight:600;margin-left:8px}
  .date{font-size:28px;font-weight:500;margin-top:8px;text-shadow:0 1px 10px rgba(0,0,0,.5)}
  .wx{display:flex;flex-direction:column;align-items:flex-end;text-align:right;text-shadow:0 1px 12px rgba(0,0,0,.5)}
  .wx .row{display:flex;align-items:center;gap:8px}
  .wx-icon{width:84px;height:84px;filter:brightness(0) invert(1) drop-shadow(0 2px 6px rgba(0,0,0,.4))}
  .wx .temp{font-size:92px;font-weight:700;line-height:.9}
  .wx .sub{font-size:20px;font-weight:500;margin-top:6px}

  .spacer{flex:1}

  .week{display:flex;gap:10px;margin-bottom:26px}
  .wd{flex:1;display:flex;flex-direction:column;align-items:center;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);border-radius:16px;padding:12px 0}
  .wdn{font-size:14px;font-weight:600;letter-spacing:1px;opacity:.9}
  .wi{margin:4px 0}.wi .wx{all:unset}
  .wd .wx-i{width:40px;height:40px;filter:brightness(0) invert(1)}
  .wt{font-size:20px;font-weight:700}

  .today-h{font-size:14px;font-weight:700;letter-spacing:4px;text-transform:uppercase;opacity:.95;margin-bottom:10px}
  .ev{display:flex;align-items:baseline;gap:20px;padding:12px 0;border-top:1px solid rgba(255,255,255,.28)}
  .ev:last-child{border-bottom:1px solid rgba(255,255,255,.28)}
  .ev .t{font-size:30px;font-weight:700;width:130px}
  .ev .d{font-size:30px;font-weight:500;flex:1}
  .ev .w{font-size:20px;font-weight:500;opacity:.85}
  .cap{font-size:15px;font-style:italic;opacity:.8;margin-top:16px}
  `;

  // recolor the inline 7-day icons to white by wrapping
  const weekWhite = wx.week
    .map((d) => `<div class="wd"><div class="wdn">${d.dow}</div><span class="wx-i">${icon(d.kind, 40)}</span><div class="wt">${d.hi}°</div></div>`)
    .join("");

  const body = `<div class="cover">
    ${photo}
    <div class="scrim-top"></div>
    <div class="scrim-bot"></div>
    <div class="layer">
      <div class="top">
        <div>
          <div class="clock">2:32<span class="mer">${data.meridiem}</span></div>
          <div class="date">${data.dateLong}, ${data.dateSub}</div>
        </div>
        <div class="wx">
          <div class="row"><span class="wx-icon">${icon(wx.kind, 84)}</span><span class="temp">${wx.tempC}°</span></div>
          <div class="sub">${COND[wx.kind] || ""} · Feels ${wx.feelsC}° · ${wx.place}</div>
        </div>
      </div>

      <div class="spacer"></div>

      <div class="week">${weekWhite}</div>
      <div class="today-h">Today · ${cal.todayName}</div>
      ${agenda}
      <div class="cap">${esc(data.photo.caption)}</div>
    </div>
  </div>`;

  return pageShell({ title: "photo-cover", css, body });
}
