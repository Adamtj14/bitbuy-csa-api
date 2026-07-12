import { blankGrid, BoardModel, dimsOf, Grid } from '../grid.js';
import { encodeLine, writeAt } from '../text.js';
import { locationKey, MultiWeatherSlideConfig, WeatherData } from '../types.js';
import { weatherChip } from './weather.js';

const toF = (c: number) => (c * 9) / 5 + 32;

/**
 * One location per row: condition chip, name, and current temp (plus
 * high/low on the flagship). Weather comes from ctx.weatherByLocation,
 * keyed by "lat,long". Up to `rows` locations.
 *
 *   Y TORONTO        21° 24/16
 *   B LONDON         14° 16/9
 *   * TOKYO          28° 31/24
 */
export function renderMultiWeather(
  config: MultiWeatherSlideConfig,
  weatherByLocation: Record<string, WeatherData> | undefined,
  model: BoardModel = 'flagship',
): Grid {
  const { rows, cols } = dimsOf(model);
  const grid = blankGrid(model);

  if (config.locations.length === 0) {
    grid[Math.floor(rows / 2)] = encodeLine('NO LOCATIONS', 'center', cols);
    return grid;
  }

  const convert = config.units === 'imperial' ? toF : (c: number) => c;
  const deg = (v: number) => `${Math.round(convert(v))}°`;

  config.locations.slice(0, rows).forEach((loc, i) => {
    const row = grid[i]!;
    const weather = weatherByLocation?.[locationKey(loc)];
    const detail = weather
      ? cols >= 22
        ? `${deg(weather.temperature)} ${deg(weather.high)}/${deg(weather.low)}`
        : deg(weather.temperature)
      : '...';
    row[0] = weather ? weatherChip(weather.weatherCode) : 0;
    const nameRoom = Math.max(0, cols - 2 - detail.length - 1);
    writeAt(row, 2, loc.name.slice(0, nameRoom));
    writeAt(row, cols - detail.length, detail);
  });
  return grid;
}
