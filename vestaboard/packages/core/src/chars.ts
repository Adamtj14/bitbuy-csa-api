/**
 * Vestaboard character codes, verified against
 * https://docs.vestaboard.com/docs/characterCodes (July 2026).
 *
 * 0 is blank (flap shows the board's base color). Codes 43, 45, 51, 57,
 * 58 and 61 do not exist on the flagship board. 62 renders as a degree
 * sign (heart on some colorways).
 */

export const BLANK = 0;

export const COLOR = {
  red: 63,
  orange: 64,
  yellow: 65,
  green: 66,
  blue: 67,
  violet: 68,
  white: 69,
  black: 70,
  filled: 71,
} as const;

export type ColorName = keyof typeof COLOR;

export const COLOR_CODES: readonly number[] = Object.values(COLOR);

const PUNCTUATION: Record<string, number> = {
  '!': 37,
  '@': 38,
  '#': 39,
  $: 40,
  '(': 41,
  ')': 42,
  '-': 44,
  '+': 46,
  '&': 47,
  '=': 48,
  ';': 49,
  ':': 50,
  "'": 52,
  '"': 53,
  '%': 54,
  ',': 55,
  '.': 56,
  '/': 59,
  '?': 60,
  '°': 62,
};

/** char -> code for every printable character the board supports. */
export const CHAR_TO_CODE: ReadonlyMap<string, number> = (() => {
  const map = new Map<string, number>();
  map.set(' ', BLANK);
  for (let i = 0; i < 26; i++) {
    map.set(String.fromCharCode(65 + i), 1 + i); // A-Z -> 1-26
  }
  for (let d = 1; d <= 9; d++) {
    map.set(String(d), 26 + d); // 1-9 -> 27-35
  }
  map.set('0', 36);
  for (const [ch, code] of Object.entries(PUNCTUATION)) {
    map.set(ch, code);
  }
  return map;
})();

/** code -> char (color chips map to '' and are handled separately). */
export const CODE_TO_CHAR: ReadonlyMap<number, string> = (() => {
  const map = new Map<number, string>();
  for (const [ch, code] of CHAR_TO_CODE) {
    map.set(code, ch);
  }
  map.set(BLANK, ' ');
  return map;
})();

export function isColorCode(code: number): boolean {
  return code >= COLOR.red && code <= COLOR.filled;
}

export function isValidCode(code: number): boolean {
  return code === BLANK || CODE_TO_CHAR.has(code) || isColorCode(code);
}

/**
 * Encode a single character to its board code. Lowercase letters are
 * uppercased; unsupported characters return BLANK.
 */
export function charToCode(ch: string): number {
  return CHAR_TO_CODE.get(ch.toUpperCase()) ?? BLANK;
}

/** Decode a code to a display character; color chips become '█', unknown '?'. */
export function codeToChar(code: number): string {
  if (isColorCode(code)) return '█';
  return CODE_TO_CHAR.get(code) ?? '?';
}
