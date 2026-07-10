import type { WeatherData, WeatherSlideConfig } from '@vestaboard/core';

interface OpenMeteoResponse {
  current?: { temperature_2m: number; weather_code: number };
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
    precipitation_probability_max?: number[];
  };
}

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

/**
 * Current conditions + 4-day forecast from Open-Meteo (free, keyless).
 * Always fetches celsius; unit conversion happens in the renderer.
 */
export async function fetchWeather(
  config: Pick<WeatherSlideConfig, 'latitude' | 'longitude'>,
  fetchImpl: typeof fetch = fetch,
): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(config.latitude),
    longitude: String(config.longitude),
    current: 'temperature_2m,weather_code',
    daily:
      'temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max',
    forecast_days: '4',
    timezone: 'auto',
  });
  const res = await fetchImpl(`${ENDPOINT}?${params}`);
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const body = (await res.json()) as OpenMeteoResponse;
  const daily = body.daily;
  if (!body.current || !daily) throw new Error('open-meteo: malformed response');
  return {
    temperature: body.current.temperature_2m,
    weatherCode: body.current.weather_code,
    high: daily.temperature_2m_max[0] ?? body.current.temperature_2m,
    low: daily.temperature_2m_min[0] ?? body.current.temperature_2m,
    precipitationChance: daily.precipitation_probability_max?.[0],
    // Day 0 is today (shown in the summary rows); forecast starts tomorrow.
    daily: daily.time.slice(1).map((date, i) => ({
      date,
      high: daily.temperature_2m_max[i + 1] ?? 0,
      low: daily.temperature_2m_min[i + 1] ?? 0,
      weatherCode: daily.weather_code[i + 1] ?? 3,
    })),
  };
}
