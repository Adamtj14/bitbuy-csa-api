import { describe, expect, it } from 'vitest';
import {
  BLANK,
  charToCode,
  codeToChar,
  COLOR,
  isColorCode,
  isValidCode,
} from './chars.js';

describe('character map', () => {
  it('maps letters, digits and punctuation to documented codes', () => {
    expect(charToCode('A')).toBe(1);
    expect(charToCode('Z')).toBe(26);
    expect(charToCode('a')).toBe(1);
    expect(charToCode('1')).toBe(27);
    expect(charToCode('9')).toBe(35);
    expect(charToCode('0')).toBe(36);
    expect(charToCode('!')).toBe(37);
    expect(charToCode('$')).toBe(40);
    expect(charToCode('°')).toBe(62);
    expect(charToCode(' ')).toBe(BLANK);
  });

  it('returns blank for unsupported characters', () => {
    expect(charToCode('~')).toBe(BLANK);
    expect(charToCode('é')).toBe(BLANK);
  });

  it('round-trips every printable code', () => {
    for (const ch of 'ABCXYZ0123456789!@#$()-+&=;:\'"%,./?°') {
      expect(codeToChar(charToCode(ch))).toBe(ch);
    }
  });

  it('identifies color chips 63-71', () => {
    expect(isColorCode(COLOR.red)).toBe(true);
    expect(isColorCode(COLOR.filled)).toBe(true);
    expect(isColorCode(62)).toBe(false);
    expect(isColorCode(72)).toBe(false);
  });

  it('rejects the codes that do not exist on the board', () => {
    for (const code of [43, 45, 51, 57, 58, 61, 72, -1]) {
      expect(isValidCode(code)).toBe(false);
    }
    expect(isValidCode(0)).toBe(true);
    expect(isValidCode(71)).toBe(true);
  });
});
