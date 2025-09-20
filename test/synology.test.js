import assert from 'node:assert/strict';
import test from 'node:test';

const { SynologyClient } = await import('../src/synology.js');
const { config } = await import('../src/config.js');

config.synology.yearsBack = 2;
config.synology.minYear = 2000;

const baseClientOptions = {
  ip: 'synology.lan',
  user: 'user',
  password: 'pass',
  useTeamSpace: false,
};

test('listByMonthDayViaRanges builds expected yearly windows and paginates', async () => {
  const client = new SynologyClient(baseClientOptions);
  const calls = [];
  client.listItems = async ({ time, offset, limit }) => {
    calls.push({ time, offset, limit });
    return { list: [], total: 0 };
  };

  const results = await client.listByMonthDayViaRanges('sid', {
    month: 9,
    day: 18,
  });

  assert.equal(results.length, 0);
  assert.equal(calls.length, 1);
  const [{ time, limit }] = calls;
  assert.equal(limit, 100);
  assert.equal(time.length, 2);
  for (const range of time) {
    assert.ok(range.start_time < range.end_time);
    assert.equal(range.end_time - range.start_time, 86399);
  }
});

test('getThumbnailUrl includes uid and sid', () => {
  const client = new SynologyClient(baseClientOptions);
  const photo = {
    id: '123',
    additional: {
      thumbnail: { cache_key: 'abc_999' },
    },
  };
  const url = client.getThumbnailUrl('mysid', photo);
  assert.match(url, /mysid/);
  assert.match(url, /id=abc/);
  assert.match(url, /Thumbnail\/get/);
});
