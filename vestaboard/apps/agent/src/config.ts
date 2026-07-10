import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import {
  BoardConfig,
  COLS,
  MIN_FREQUENCY_SECONDS,
  ROWS,
} from '@vestaboard/core';

const gridSchema = z
  .array(z.array(z.number().int()).length(COLS))
  .length(ROWS);

const symbolSchema = z.object({
  symbol: z.string().min(1),
  market: z.enum(['crypto', 'us', 'tmx']),
});

const slideConfigSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('clock'),
    style: z.enum(['big-digital', 'digital-date', 'word']),
    timeZone: z.string().optional(),
    hour12: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('ticker'),
    symbols: z.array(symbolSchema).min(1),
    title: z.string().optional(),
  }),
  z.object({
    type: z.literal('painter'),
    grid: gridSchema,
  }),
]);

const boardConfigSchema = z.object({
  rotation: z.object({
    frequencySeconds: z.number().min(MIN_FREQUENCY_SECONDS),
  }),
  slides: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string(),
      enabled: z.boolean(),
      order: z.number().int(),
      config: slideConfigSchema,
      transition: z
        .enum(['column', 'reverse-column', 'edges-to-center', 'row', 'diagonal', 'random'])
        .optional(),
    }),
  ),
});

export function parseBoardConfig(raw: unknown): BoardConfig {
  return boardConfigSchema.parse(raw) as BoardConfig;
}

export type ConfigSource = () => Promise<BoardConfig>;

export function fileConfigSource(path: string): ConfigSource {
  return async () => parseBoardConfig(JSON.parse(await readFile(path, 'utf8')));
}

export function urlConfigSource(url: string, fetchImpl: typeof fetch = fetch): ConfigSource {
  return async () => {
    const res = await fetchImpl(url, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`config fetch failed: ${res.status}`);
    return parseBoardConfig(await res.json());
  };
}
