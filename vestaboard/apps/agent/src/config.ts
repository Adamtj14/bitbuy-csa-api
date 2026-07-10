import { readFile } from 'node:fs/promises';
import { BoardConfig, parseBoardConfig } from '@vestaboard/core';

export { parseBoardConfig };

export type ConfigSource = () => Promise<BoardConfig>;

export function fileConfigSource(path: string): ConfigSource {
  return async () => parseBoardConfig(JSON.parse(await readFile(path, 'utf8')));
}

export function urlConfigSource(
  url: string,
  token?: string,
  fetchImpl: typeof fetch = fetch,
): ConfigSource {
  return async () => {
    const headers: Record<string, string> = { accept: 'application/json' };
    if (token) headers.authorization = `Bearer ${token}`;
    const res = await fetchImpl(url, { headers });
    if (!res.ok) throw new Error(`config fetch failed: ${res.status}`);
    return parseBoardConfig(await res.json());
  };
}
