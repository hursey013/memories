import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

process.env.SENT_DIR = './cache/test-sent';

const { makeDayKey, markSent, wasSent, clearSentForDay } = await import('../src/sent.js');

test('makeDayKey zero pads month and day', () => {
  const key = makeDayKey(3, 7);
  assert.equal(key, '03-07');
});

test('markSent stores ISO timestamp and derived day when photo provided', () => {
  const map = {};
  const photoDate = new Date('2020-09-18T12:34:56Z');
  markSent(map, 'photo-1', { whenISO: '2024-09-18T10:00:00Z', photoDate });

  assert.ok(map['photo-1']);
  assert.equal(map['photo-1'].when, '2024-09-18T10:00:00Z');
  assert.equal(map['photo-1'].photoDateISO, photoDate.toISOString());
  assert.equal(map['photo-1'].photoTimestamp, photoDate.getTime());
});

test('wasSent returns true only for stored ids', () => {
  const map = { existing: { when: '2024-01-01T00:00:00Z' } };
  assert.equal(wasSent(map, 'existing'), true);
  assert.equal(wasSent(map, 'missing'), false);
});

test('markSent handles missing photo metadata gracefully', () => {
  const map = {};
  markSent(map, 'plain-id');
  assert.ok(map['plain-id']);
  assert.equal(map['plain-id'].photoDateISO, null);
  assert.equal(map['plain-id'].photoTimestamp, null);
});

test('clearSentForDay removes existing cache shard', async () => {
  const dayKey = makeDayKey(9, 18);
  const sentDir = path.join(process.cwd(), process.env.SENT_DIR);
  await fs.mkdir(sentDir, { recursive: true });
  const filePath = path.join(sentDir, `${dayKey}.json`);
  await fs.writeFile(filePath, JSON.stringify({ foo: 'bar' }));

  const removed = await clearSentForDay(dayKey);
  assert.equal(removed, true);
  let exists = true;
  try {
    await fs.access(filePath);
  } catch {
    exists = false;
  }
  assert.equal(exists, false, 'expected cache shard to be deleted');

  await fs.rm(sentDir, { recursive: true, force: true });
});
