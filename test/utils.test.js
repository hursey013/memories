import test from 'node:test';
import assert from 'node:assert/strict';

const { photoUID, calculateYearsAgo } = await import('../src/utils.js');

test('photoUID prefers cache key prefix when present', () => {
  const photo = {
    id: '12345',
    additional: { thumbnail: { cache_key: 'abcde_123' } },
  };
  assert.equal(photoUID(photo), 'abcde');
});

test('photoUID falls back to id when cache key missing', () => {
  const photo = { id: 67890 };
  assert.equal(photoUID(photo), '67890');
});

test('calculateYearsAgo adjusts when the anniversary has not passed yet', () => {
  const RealDate = Date;
  globalThis.Date = class extends RealDate {
    constructor(...args) {
      if (args.length === 0) {
        return new RealDate('2024-09-18T12:00:00Z');
      }
      return new RealDate(...args);
    }
  };

  try {
    const years = calculateYearsAgo(new Date('2019-10-01T00:00:00Z'));
    assert.equal(years, 4);
  } finally {
    globalThis.Date = RealDate;
  }
});
