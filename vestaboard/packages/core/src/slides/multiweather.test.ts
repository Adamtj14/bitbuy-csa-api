import { describe, expect, it } from 'vitest';
import { toAscii } from '../grid.js';
import { renderMultiWeather } from './multiweather.js';
import { locationKey, MultiWeatherSlideConfig, WeatherData } from '../types.js';

const toronto = { name: 'TORONTO', latitude: 43.65, longitude: -79.38 };
const london = { name: 'LONDON', latitude: 51.5, longitude: -0.13 };

const config: MultiWeatherSlideConfig = {
  type: 'multiweather',
  locations: [toronto, london],
};

const weather = (temperature: number, code: number): WeatherData => ({
  temperature,
  weatherCode: code,
  high: temperature + 3,
  low: temperature - 5,
  daily: [],
});

const byLoc: Record<string, WeatherData> = {
  [locationKey(toronto)]: weather(21, 2),
  [locationKey(london)]: weather(14, 63),
};

describe('renderMultiWeather', () => {
  // toAscii adds a top border, so data rows begin at line index 1.
  it('renders one location per row with its current temp', () => {
    const lines = toAscii(renderMultiWeather(config, byLoc, 'flagship')).split('\n');
    expect(lines[1]).toContain('TORONTO');
    expect(lines[1]).toContain('21°');
    expect(lines[1]).toContain('24°/16°'); // high/low on the flagship
    expect(lines[2]).toContain('LONDON');
    expect(lines[2]).toContain('14°');
  });

  it('converts to Fahrenheit when units are imperial', () => {
    const lines = toAscii(
      renderMultiWeather({ ...config, units: 'imperial' }, byLoc, 'flagship'),
    ).split('\n');
    expect(lines[1]).toContain('70°'); // 21C ≈ 70F
  });

  it('shows a placeholder for a location with no data yet', () => {
    const lines = toAscii(renderMultiWeather(config, {}, 'flagship')).split('\n');
    expect(lines[1]).toContain('TORONTO');
    expect(lines[1]).toContain('...');
  });

  it('drops the high/low column on the Note but keeps temps', () => {
    const grid = renderMultiWeather(config, byLoc, 'note');
    expect(grid).toHaveLength(3);
    expect(grid.every((r) => r.length === 15)).toBe(true);
    expect(toAscii(grid).split('\n')[1]).toContain('21°');
  });

  it('shows a message when no locations are configured', () => {
    const grid = renderMultiWeather({ type: 'multiweather', locations: [] }, byLoc);
    expect(toAscii(grid)).toContain('NO LOCATIONS');
  });
});
