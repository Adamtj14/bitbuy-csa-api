import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchWeather } from './weather.js';
import { fetchNews, parseFeed } from './news.js';
import { fetchScores } from './sports.js';

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetch(body: unknown, contentType = 'application/json') {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(
      new Response(payload, { status: 200, headers: { 'content-type': contentType } }),
    );
}

describe('fetchWeather', () => {
  it('maps the Open-Meteo response, forecast starting tomorrow', async () => {
    mockFetch({
      current: { temperature_2m: 21.4, weather_code: 2 },
      daily: {
        time: ['2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13'],
        temperature_2m_max: [24.2, 24, 22, 26],
        temperature_2m_min: [15.8, 16, 14, 17],
        weather_code: [2, 3, 63, 0],
        precipitation_probability_max: [30, 40, 80, 5],
      },
    });
    const weather = await fetchWeather({ latitude: 43.65, longitude: -79.38 });
    expect(weather.temperature).toBe(21.4);
    expect(weather.high).toBe(24.2);
    expect(weather.precipitationChance).toBe(30);
    expect(weather.daily).toHaveLength(3);
    expect(weather.daily[0]).toEqual({
      date: '2026-07-11',
      high: 24,
      low: 16,
      weatherCode: 3,
    });
  });
});

describe('parseFeed', () => {
  it('parses RSS 2.0 with CDATA titles', () => {
    const items = parseFeed(`<?xml version="1.0"?>
      <rss version="2.0"><channel>
        <title>Sample Wire</title>
        <item><title><![CDATA[Rate cut expected]]></title></item>
        <item><title>Leafs sign goalie</title></item>
      </channel></rss>`);
    expect(items).toEqual([
      { title: 'Rate cut expected', source: 'Sample Wire' },
      { title: 'Leafs sign goalie', source: 'Sample Wire' },
    ]);
  });

  it('parses Atom feeds', () => {
    const items = parseFeed(`<?xml version="1.0"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <title>Atom Wire</title>
        <entry><title>First entry</title></entry>
      </feed>`);
    expect(items).toEqual([{ title: 'First entry', source: 'Atom Wire' }]);
  });
});

describe('fetchNews', () => {
  it('falls back to the next feed when one fails', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('', { status: 500 }))
      .mockResolvedValueOnce(
        new Response(
          '<rss><channel><title>B</title><item><title>Works</title></item></channel></rss>',
          { status: 200 },
        ),
      );
    const items = await fetchNews(['https://a.test/rss', 'https://b.test/rss']);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(items[0]?.title).toBe('Works');
  });

  it('throws when every feed fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 500 }));
    await expect(fetchNews(['https://a.test/rss'])).rejects.toThrow('feed 500');
  });
});

describe('fetchScores', () => {
  it('maps ESPN scoreboard events to games', async () => {
    mockFetch({
      events: [
        {
          status: { type: { state: 'in', shortDetail: '2nd 8:44' } },
          competitions: [
            {
              competitors: [
                { homeAway: 'home', score: '2', team: { abbreviation: 'BOS' } },
                { homeAway: 'away', score: '4', team: { abbreviation: 'TOR' } },
              ],
            },
          ],
        },
        {
          status: { type: { state: 'pre', shortDetail: '7:30 PM ET' } },
          competitions: [
            {
              competitors: [
                { homeAway: 'home', team: { abbreviation: 'EDM' } },
                { homeAway: 'away', team: { abbreviation: 'VAN' } },
              ],
            },
          ],
        },
      ],
    });
    const games = await fetchScores('nhl');
    expect(games).toEqual([
      {
        league: 'nhl',
        home: { abbrev: 'BOS', score: 2 },
        away: { abbrev: 'TOR', score: 4 },
        state: 'live',
        statusText: '2nd 8:44',
      },
      {
        league: 'nhl',
        home: { abbrev: 'EDM', score: 0 },
        away: { abbrev: 'VAN', score: 0 },
        state: 'pre',
        statusText: '7:30 PM ET',
      },
    ]);
  });
});
