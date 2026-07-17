/**
 * The zone if the runtime accepts it, else undefined. Time-zone fields in
 * the Studio apply on every keystroke, so renderers see half-typed values
 * like "Amer" — Intl throws on those, which must degrade (fall through to
 * the next zone in the chain), never crash a render or a push tick.
 */
export function safeTimeZone(timeZone?: string): string | undefined {
  if (!timeZone) return undefined;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return timeZone;
  } catch {
    return undefined;
  }
}
