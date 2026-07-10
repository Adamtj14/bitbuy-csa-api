import { describe, expect, it } from 'vitest';
import { toAscii } from '../grid.js';
import type { WeatherData } from '../types.js';
import { renderWeather, weatherLabel } from './weather.js';

const weather: WeatherData = {
  temperature: 21.4,
  weatherCode: 2,
  high: 24.2,
  low: 15.8,
  precipitationChance: 30,
  daily: [
    { date: '2026-07-11', high: 24, low: 16, weatherCode: 3 },
    { date: '2026-07-12', high: 22, low: 14, weatherCode: 63 },
    { date: '2026-07-13', high: 26, low: 17, weatherCode: 0 },
  ],
};

describe('renderWeather', () => {
  it('renders current conditions and a three-day forecast', () => {
    const grid = renderWeather(
      { type: 'weather', locationName: 'Toronto', latitude: 43.65, longitude: -79.38 },
      weather,
    );
    expect(toAscii(grid)).toMatchInlineSnapshot(`
      "+----------------------+
      |Y TORONTO          21°|
      |PARTLY CLOUDY         |
      |H 24° L 16°  RAIN 30% |
      |W SAT 24°/16°  CLOUDY |
      |B SUN 22°/14°  RAIN   |
      |Y MON 26°/17°  CLEAR  |
      +----------------------+"
    `);
  });

  it('converts to fahrenheit for imperial units', () => {
    const grid = renderWeather(
      {
        type: 'weather',
        locationName: 'Toronto',
        latitude: 43.65,
        longitude: -79.38,
        units: 'imperial',
      },
      weather,
    );
    expect(toAscii(grid)).toContain('71°');
  });

  it('shows a pending message without data', () => {
    const grid = renderWeather(
      { type: 'weather', locationName: 'Toronto', latitude: 43.65, longitude: -79.38 },
      undefined,
    );
    expect(toAscii(grid)).toContain('WEATHER PENDING');
  });

  it('maps WMO codes to labels', () => {
    expect(weatherLabel(0)).toBe('CLEAR');
    expect(weatherLabel(61)).toBe('RAIN');
    expect(weatherLabel(75)).toBe('SNOW');
    expect(weatherLabel(96)).toBe('THUNDERSTORM');
  });
});
