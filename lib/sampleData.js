// Mock data for the layout mockup. Shape mirrors what live sources will provide,
// so wiring real data later is a drop-in swap (Open-Meteo / ICS / quotes / notes).

export const sampleData = {
  clock: "2:32",
  meridiem: "PM",
  dateLong: "Saturday",
  dateSub: "June 27, 2026",

  weather: {
    place: "Toronto, ON",
    kind: "clear", // icon key
    tempC: 24,
    feelsC: 26,
    hiC: 26,
    loC: 15,
    sunrise: "6:12",
    sunset: "8:48",
    // Today, every 2h from 06:00 to 22:00
    hours: [
      { h: "6a", t: 16, p: 0 },
      { h: "8a", t: 18, p: 0 },
      { h: "10a", t: 21, p: 0 },
      { h: "12p", t: 24, p: 0 },
      { h: "2p", t: 26, p: 0.2 },
      { h: "4p", t: 26, p: 1.1 },
      { h: "6p", t: 24, p: 2.4 },
      { h: "8p", t: 21, p: 0.6 },
      { h: "10p", t: 18, p: 0 },
    ],
    week: [
      { dow: "Sun", kind: "clear", hi: 25, lo: 14 },
      { dow: "Mon", kind: "partly", hi: 23, lo: 13 },
      { dow: "Tue", kind: "cloudy", hi: 21, lo: 12 },
      { dow: "Wed", kind: "rain", hi: 19, lo: 11 },
      { dow: "Thu", kind: "clear", hi: 24, lo: 13 },
      { dow: "Fri", kind: "clear", hi: 26, lo: 15 },
      { dow: "Sat", kind: "thunder", hi: 22, lo: 14 },
    ],
  },

  calendar: {
    monthLabel: "June 2026",
    year: 2026,
    month: 5, // 0-indexed (June)
    // days of June that have events (for dots)
    eventDays: [3, 9, 14, 19, 21, 27, 28, 30],
    next7: [
      { dow: "Sun", date: 28, items: ["Soccer 9:00a", "BBQ 5:00p"] },
      { dow: "Mon", date: 29, items: ["Dentist 2:00p"] },
      { dow: "Tue", date: 30, items: [] },
      { dow: "Wed", date: 1, items: ["Recital 6:00p"] },
      { dow: "Thu", date: 2, items: ["Trash out"] },
      { dow: "Fri", date: 3, items: ["Movie night"] },
      { dow: "Sat", date: 4, items: ["Cottage trip"] },
    ],
    today: 27,
    todayName: "Saturday",
    todayEvents: [
      { time: "9:00a", title: "Soccer practice", who: "Liam" },
      { time: "12:30p", title: "Lunch with Sam", who: "Mom" },
      { time: "3:00p", title: "Groceries", who: "Dad" },
      { time: "6:00p", title: "Family dinner", who: "All" },
    ],
  },

  stocks: [
    { sym: "BTC", price: "92,140", pct: +1.2, up: true },
    { sym: "ETH", price: "4,980", pct: -0.4, up: false },
    { sym: "AAPL", price: "241.10", pct: +0.8, up: true },
    { sym: "TSLA", price: "402.55", pct: -1.6, up: false },
    { sym: "VFV", price: "152.30", pct: +0.3, up: true },
  ],

  notes: [
    { who: "Mom", text: "Buy milk & eggs" },
    { who: "Dad", text: "Trash out Tuesday night" },
    { who: "Emma", text: "Recital tickets on the fridge!" },
    { who: "Liam", text: "Need cleats for Sunday" },
  ],

  photo: {
    // Placeholder for the mockup; real photos come later.
    caption: "Cottage, summer '25",
  },
};
