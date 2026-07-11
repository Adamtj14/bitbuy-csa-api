#!/usr/bin/env node
import { setTimeout as delay } from 'node:timers/promises';
import { Grid, toAscii } from '@vestaboard/core';
import {
  BitbuyProvider,
  fetchNews,
  fetchScores,
  fetchWeather,
  MOCK_NEWS,
  MOCK_WEATHER,
  mockGames,
  MockProvider,
  routeQuotes,
  TickerProvider,
  YahooProvider,
} from '@vestaboard/data';
import { BoardClient } from './board.js';
import { fileConfigSource, urlConfigSource } from './config.js';
import { DataHub, DataSources } from './data.js';
import { RotationEngine } from './rotation.js';

interface CliOptions {
  dryRun: boolean;
  configPath: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { dryRun: false, configPath: 'slides.json' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--config' && argv[i + 1]) options.configPath = argv[++i]!;
    else if (arg === '--help') {
      console.log(`vestaboard-agent [--dry-run] [--config slides.json]

Environment:
  BOARD_HOST            board hostname/IP (default vestaboard.local)
  VESTABOARD_LOCAL_KEY  local API key (required unless --dry-run)
  CONFIG_URL            pull config from a URL instead of --config file
  CONFIG_TOKEN          bearer token for CONFIG_URL (agent token)
  CSA_FEED_URL          Bitbuy CSA feed URL for crypto quotes
  MOCK_DATA=1           deterministic fake data for every slide (offline/dev)`);
      process.exit(0);
    }
  }
  return options;
}

function buildSources(log: (m: string) => void): DataSources {
  if (process.env.MOCK_DATA === '1' || process.env.MOCK_QUOTES === '1') {
    const mock = new MockProvider();
    return {
      getQuotes: (specs) => mock.getQuotes(specs),
      getWeather: async () => MOCK_WEATHER,
      getNews: async () => MOCK_NEWS,
      getScores: async (league) => mockGames(league),
    };
  }
  const providers: TickerProvider[] = [];
  if (process.env.CSA_FEED_URL) providers.push(new BitbuyProvider(process.env.CSA_FEED_URL));
  providers.push(new YahooProvider());
  log(`quote providers: ${providers.map((p) => p.name).join(', ')}`);
  return {
    getQuotes: (specs) => routeQuotes(providers, specs),
    getWeather: (config) => fetchWeather(config),
    getNews: (feeds) => fetchNews(feeds),
    getScores: (league) => fetchScores(league),
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const log = (message: string) => console.log(`[${new Date().toISOString()}] ${message}`);

  const getConfig = process.env.CONFIG_URL
    ? urlConfigSource(process.env.CONFIG_URL, process.env.CONFIG_TOKEN)
    : fileConfigSource(options.configPath);

  const hub = new DataHub(buildSources(log), { log });

  let push: (grid: Grid, transition?: string) => Promise<void>;
  if (options.dryRun) {
    push = async (grid, transition) => {
      const label = transition ? ` (transition: ${transition})` : '';
      console.log(`--- would push${label} ---\n${toAscii(grid)}`);
    };
  } else {
    const apiKey = process.env.VESTABOARD_LOCAL_KEY;
    if (!apiKey) {
      console.error('VESTABOARD_LOCAL_KEY is required (or pass --dry-run)');
      process.exit(1);
    }
    const board = new BoardClient({
      host: process.env.BOARD_HOST ?? 'vestaboard.local',
      apiKey,
    });
    push = (grid, transition) =>
      board.postMessage(grid, transition as Parameters<BoardClient['postMessage']>[1]);
  }

  const engine = new RotationEngine({
    getConfig,
    getContext: (slide, now, allSlides) => hub.contextFor(slide, now, allSlides),
    push,
    now: () => new Date(),
    log,
  });

  // Stop the loop, but don't wait out a 30s sleep to actually exit.
  const shutdown = () => {
    engine.stop();
    setTimeout(() => process.exit(0), 500).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await engine.run((ms) => delay(ms));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
