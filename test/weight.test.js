import assert from 'node:assert/strict';
import test from 'node:test';

// Configure weighting inputs before importing module under test
process.env.FAVORITE_PEOPLE = 'alice';
process.env.IGNORED_PEOPLE = 'ignored';
process.env.MIN_WEIGHT = '0';
process.env.REPEAT_PENALTY = '2';
process.env.REPEAT_PENALTY_CAP = '6';

// Keep randomness deterministic for assertions
const originalRandom = Math.random;
Math.random = () => 0;

const { config } = await import('../src/config.js');
const { calculateWeight, sortPhotosByWeight } = await import('../src/weight.js');

test('favorite people receive higher weight', () => {
  const base = {
    time: 1_600_000_000,
    additional: { person: [{ name: 'Alice' }], exif: { Model: 'Camera' } },
  };
  const comparison = {
    time: 1_600_000_000,
    additional: { person: [{ name: 'Bob' }], exif: { Model: 'Camera' } },
  };

  const favoriteScore = calculateWeight(base);
  const regularScore = calculateWeight(comparison);
  assert.ok(
    favoriteScore > regularScore,
    `expected favorite score (${favoriteScore}) to exceed regular score (${regularScore})`
  );
});

test('ignored people are filtered from candidate list', () => {
  const people = [
    { time: 1_600_000_100, additional: { person: [{ name: 'Ignored' }] } },
    { time: 1_600_000_200, additional: { person: [{ name: 'Alice' }], exif: {} } },
  ];
  const result = sortPhotosByWeight(people);
  assert.equal(result.length, 1);
  assert.equal(result[0].additional.person[0].name, 'Alice');
});

test('lack of EXIF incurs penalty', () => {
  const withExif = {
    time: 1_600_000_000,
    additional: { person: [], exif: { Model: 'Camera' } },
  };
  const withoutExif = {
    time: 1_600_000_000,
    additional: { person: [] },
  };
  const withScore = calculateWeight(withExif);
  const withoutScore = calculateWeight(withoutExif);
  assert.ok(
    withScore > withoutScore,
    `expected EXIF photo (${withScore}) to score higher than photo without EXIF (${withoutScore})`
  );
});

test('minWeight filters out photos below the threshold', () => {
  const originalMin = config.synology.minWeight;
  config.synology.minWeight = 3;
  const items = [
    {
      id: 'low',
      time: 1_600_000_100,
      additional: { person: [], exif: {} },
    },
    {
      id: 'fav',
      time: 1_600_000_200,
      additional: { person: [{ name: 'Alice' }], exif: { Model: 'Camera' } },
    },
  ];

  const result = sortPhotosByWeight(items);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'fav');
  config.synology.minWeight = originalMin;
});

test('repeat penalty reduces weight but keeps photo in pool', () => {
  const items = [
    {
      id: 'repeat-photo',
      time: 1_600_000_300,
      additional: {
        person: [{ name: 'Alice' }],
        exif: { Model: 'Camera' },
      },
    },
  ];
  const sentMap = {
    'repeat-photo': { timesSent: 2 },
  };

  const [scored] = sortPhotosByWeight(items, sentMap);
  assert.ok(scored.baseWeight > scored.weight);
  assert.equal(scored.timesSent, 2);
  assert.equal(scored.repeatPenalty, 4); // 2 sends * penalty 2
});

// restore Math.random
Math.random = originalRandom;
