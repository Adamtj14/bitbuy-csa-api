import { z } from 'zod';
import { BOARD_DIMS } from './grid.js';
import { MIN_FREQUENCY_SECONDS } from './types.js';
import type { BoardConfig } from './types.js';

const exactGrid = (rows: number, cols: number) =>
  z.array(z.array(z.number().int()).length(cols)).length(rows);

// Painter grids may target either hardware model.
const gridSchema = z.union([
  exactGrid(BOARD_DIMS.flagship.rows, BOARD_DIMS.flagship.cols),
  exactGrid(BOARD_DIMS.note.rows, BOARD_DIMS.note.cols),
]);

const symbolSchema = z.object({
  symbol: z.string().min(1),
  market: z.enum(['crypto', 'us', 'tmx']),
});

export const slideConfigSchema = z.discriminatedUnion('type', [
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
  z.object({
    type: z.literal('weather'),
    locationName: z.string().min(1),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    units: z.enum(['metric', 'imperial']).optional(),
    forecastDays: z.number().int().min(0).max(3).optional(),
  }),
  z.object({
    type: z.literal('news'),
    feeds: z.array(z.string().url()).min(1),
    title: z.string().optional(),
  }),
  z.object({
    type: z.literal('sports'),
    league: z.enum(['nhl', 'nba', 'mlb', 'nfl']),
    teams: z.array(z.string()).optional(),
  }),
]);

export const slideSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  enabled: z.boolean(),
  order: z.number().int(),
  config: slideConfigSchema,
  transition: z
    .enum(['column', 'reverse-column', 'edges-to-center', 'row', 'diagonal', 'random'])
    .optional(),
  createdBy: z.string().optional(),
});

export const boardConfigSchema = z.object({
  boardModel: z.enum(['flagship', 'note']).optional(),
  rotation: z.object({
    frequencySeconds: z.number().min(MIN_FREQUENCY_SECONDS),
  }),
  slides: z.array(slideSchema),
});

export function parseBoardConfig(raw: unknown): BoardConfig {
  return boardConfigSchema.parse(raw) as BoardConfig;
}
