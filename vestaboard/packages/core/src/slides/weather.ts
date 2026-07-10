import { COLOR } from '../chars.js';
import { blankGrid, COLS, Grid } from '../grid.js';
import { encodeLine, writeAt } from '../text.js';
import type { WeatherData, WeatherSlideConfig } from '../types.js';

/** WMO weather code -> short label. */
export function weatherLabel(code: number): string {
  if (code === 0) return 'CLEAR';
  if (code <= 2) return 'PARTLY CLOUDY';
  if (code === 3) return 'CLOUDY';
  if (code === 45 || code === 48) return 'FOG';
  if (code >= 51 && code <= 57) return 'DRIZZLE';
  if (code >= 61 && code <= 67) return 'RAIN';
  if (code >= 71 && code <= 77) return 'SNOW';
  if (code >= 80 && code <= 82) return 'SHOWERS';
  if (code >= 85 && code <= 86) return 'SNOW SHOWERS';
  if (code >= 95) return 'THUNDERSTORM';
  return 'CLOUDY';
}

function weatherChip(code: number): number {
  if (code <= 2) return COLOR.yellow;
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return COLOR.blue;
  if (code >= 95) return COLOR.violet;
  return COLOR.white;
}


const toF = (c: number) => (c * 9) / 5 + 32;

/**
 *   G TORONTO         21°
 *   PARTLY CLOUDY
 *   H 24° L 16° RAIN 30%
 *   FRI  24°/16° CLOUDY
 *   SAT  22°/14° RAIN
 *   SUN  26°/17° SUNNY
 */
export function renderWeather(config: WeatherSlideConfig, weather?: WeatherData): Grid {
  const grid = blankGrid();
  if (!weather) {
    grid[2] = encodeLine(config.locationName, 'center');
    grid[3] = encodeLine('WEATHER PENDING . . .', 'center');
    return grid;
  }
  const convert = config.units === 'imperial' ? toF : (c: number) => c;
  const deg = (v: number) => `${Math.round(convert(v))}°`;

  const top = grid[0]!;
  top[0] = weatherChip(weather.weatherCode);
  writeAt(top, 2, config.locationName.slice(0, 13));
  const temp = deg(weather.temperature);
  writeAt(top, COLS - temp.length, temp);

  grid[1] = encodeLine(weatherLabel(weather.weatherCode));

  let summary = `H ${deg(weather.high)} L ${deg(weather.low)}`;
  if (weather.precipitationChance !== undefined) {
    summary += `  RAIN ${Math.round(weather.precipitationChance)}%`;
  }
  grid[2] = encodeLine(summary);

  const days = weather.daily.slice(0, Math.min(config.forecastDays ?? 3, 3));
  days.forEach((day, i) => {
    const row = grid[3 + i]!;
    const weekday = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      timeZone: 'UTC',
    })
      .format(new Date(`${day.date}T12:00:00Z`))
      .toUpperCase();
    row[0] = weatherChip(day.weatherCode);
    writeAt(row, 2, weekday);
    writeAt(row, 6, `${deg(day.high)}/${deg(day.low)}`);
    writeAt(row, 15, weatherLabel(day.weatherCode).slice(0, 7));
  });
  return grid;
}
