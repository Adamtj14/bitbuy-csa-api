import { describe, expect, it } from 'vitest';
import { toAscii } from '../grid.js';
import { renderNews } from './news.js';

describe('renderNews', () => {
  it('renders bulleted wrapped headlines under a title', () => {
    const grid = renderNews(
      { type: 'news', title: 'HEADLINES', feeds: ['https://example.test/rss'] },
      [
        { title: 'Rate cut expected this fall' },
        { title: 'Leafs sign goalie' },
      ],
    );
    expect(toAscii(grid)).toMatchInlineSnapshot(`
      "+----------------------+
      |      HEADLINES       |
      |O RATE CUT EXPECTED   |
      |  THIS FALL           |
      |O LEAFS SIGN GOALIE   |
      |                      |
      |                      |
      +----------------------+"
    `);
  });

  it('stops when the board is full', () => {
    const grid = renderNews(
      { type: 'news', feeds: [] },
      Array.from({ length: 12 }, (_, i) => ({ title: `HEADLINE NUMBER ${i}` })),
    );
    expect(grid).toHaveLength(6);
    expect(toAscii(grid)).toContain('HEADLINE NUMBER 5');
  });

  it('shows a pending message without data', () => {
    const grid = renderNews({ type: 'news', feeds: [] }, []);
    expect(toAscii(grid)).toContain('NEWS PENDING');
  });
});
