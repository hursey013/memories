import assert from 'node:assert/strict';
import test from 'node:test';

const { selectFromBursts } = await import('../src/burst.js');

const toPhoto = (id, time, weight) => ({
  id,
  time,
  weight,
  additional: { person: [] },
});

test('selectFromBursts groups near-duplicates and picks highest weight', () => {
  const candidates = [
    toPhoto('a1', 1000, 5),
    toPhoto('a2', 1002, 6),
    toPhoto('b1', 2000, 7),
  ];

  const { chosen, burst, bursts } = selectFromBursts(candidates, { windowSec: 5 });
  assert.equal(bursts.length, 2);
  assert.equal(bursts[0].length, 2);
  assert.equal(burst.length, 1);
  assert.equal(chosen.id, 'b1');
});

test('selectFromBursts returns null when no candidates provided', () => {
  const result = selectFromBursts([], { windowSec: 5 });
  assert.equal(result.chosen, null);
  assert.equal(result.burst.length, 0);
});
