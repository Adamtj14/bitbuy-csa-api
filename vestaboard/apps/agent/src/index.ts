#!/usr/bin/env node
import { setTimeout as delay } from 'node:timers/promises';
import { Grid, toAscii } from '@vestaboard/core';
import {
  BitbuyProvider,
  MockProvider,
  routeQuotes,
  TickerProvider,
  YahooProvider,
} from '@vestaboard/data';
import { BoardClient } from './board.js';
import { fileConfigSource, urlConfigSource } from './config.js';
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
  CSA_FEED_URL          Bitbuy CSA feed URL for crypto quotes
  MOCK_QUOTES=1         use deterministic fake quotes (offline/dev)`);
      process.exit(0);
    }
  }
  return options;
}

function buildProviders(): TickerProvider[] {
  if (process.env.MOCK_QUOTES === '1') return [new MockProvider()];
  const providers: TickerProvider[] = [];
  if (process.env.CSA_FEED_URL) providers.push(new BitbuyProvider(process.env.CSA_FEED_URL));
  providers.push(new YahooProvider());
  return providers;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  const getConfig = process.env.CONFIG_URL
    ? urlConfigSource(process.env.CONFIG_URL)
    : fileConfigSource(options.configPath);

  const providers = buildProviders();

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
    getQuotes: (specs) => routeQuotes(providers, specs),
    push,
    now: () => new Date(),
    log: (message) => console.log(`[${new Date().toISOString()}] ${message}`),
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
