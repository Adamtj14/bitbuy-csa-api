import type { Game, League } from '@vestaboard/core';

const LEAGUE_PATHS: Record<League, string> = {
  nhl: 'hockey/nhl',
  nba: 'basketball/nba',
  mlb: 'baseball/mlb',
  nfl: 'football/nfl',
};

interface EspnCompetitor {
  homeAway: 'home' | 'away';
  score?: string;
  team?: { abbreviation?: string };
}

interface EspnEvent {
  status?: {
    type?: { state?: string; shortDetail?: string; completed?: boolean };
  };
  competitions?: Array<{ competitors?: EspnCompetitor[] }>;
}

/**
 * Today's scoreboard from ESPN's public site API (keyless).
 */
export async function fetchScores(
  league: League,
  fetchImpl: typeof fetch = fetch,
): Promise<Game[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${LEAGUE_PATHS[league]}/scoreboard`;
  const res = await fetchImpl(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`espn ${league} ${res.status}`);
  const body = (await res.json()) as { events?: EspnEvent[] };
  const games: Game[] = [];
  for (const event of body.events ?? []) {
    const competitors = event.competitions?.[0]?.competitors ?? [];
    const home = competitors.find((c) => c.homeAway === 'home');
    const away = competitors.find((c) => c.homeAway === 'away');
    if (!home?.team?.abbreviation || !away?.team?.abbreviation) continue;
    const espnState = event.status?.type?.state ?? 'pre';
    const state = espnState === 'in' ? 'live' : espnState === 'post' ? 'final' : 'pre';
    games.push({
      league,
      home: { abbrev: home.team.abbreviation, score: Number(home.score ?? 0) },
      away: { abbrev: away.team.abbreviation, score: Number(away.score ?? 0) },
      state,
      statusText: event.status?.type?.shortDetail ?? '',
    });
  }
  return games;
}
