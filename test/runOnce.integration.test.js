import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const sentDir = './cache/test-integration';
const envOverrides = {
  NODE_ENV: 'test',
  NAS_IP: 'synology.test',
  USER_ID: 'memories',
  USER_PASSWORD: 'supersecret',
  FOTO_TEAM: 'false',
  FAVORITE_PEOPLE: 'fav',
  IGNORED_PEOPLE: '',
  MIN_YEAR: '2000',
  YEARS_BACK: '0',
  DAY_OFFSET: '0',
  MIN_WEIGHT: '0',
  SENT_DIR: sentDir,
  APPRISE_URL: 'http://apprise.test',
  APPRISE_KEY: '',
  INLINE_EMAIL: 'false',
  TZ: 'UTC',
};

const previousEnv = {};
for (const [key, value] of Object.entries(envOverrides)) {
  previousEnv[key] = process.env[key];
  process.env[key] = value;
}

const originalMathRandom = Math.random;
Math.random = () => 0;

const calls = { synology: [], apprise: [] };
const realFetch = globalThis.fetch;

globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  calls.synology.push({ url, init });

  if (url.includes('auth.cgi') && url.includes('method=login')) {
    return new Response(JSON.stringify({ data: { sid: 'sid123' }, success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('entry.cgi') && url.includes('list_with_filter')) {
    const payload = {
      success: true,
      data: {
        list: [
          {
            id: 'photo-1',
            time: Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 365 * 5,
            additional: {
              person: [{ name: 'Fav' }],
              exif: { Model: 'Camera' },
              thumbnail: { cache_key: 'abc_123' },
            },
          },
        ],
        total: 1,
      },
    };
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('auth.cgi') && url.includes('method=logout')) {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.startsWith('http://apprise.test')) {
    calls.apprise.push({ url, init });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  throw new Error(`Unexpected fetch to ${url}`);
};

const { config } = await import('../src/config.js');
const originalConfig = {
  synology: { ...config.synology },
  apprise: { ...config.apprise },
};
config.synology.sentDir = sentDir;
config.synology.ip = process.env.NAS_IP;
config.apprise.inlineEmail = false;
config.apprise.url = process.env.APPRISE_URL;
config.apprise.key = null;
config.apprise.urls = 'mailto://test@example.com';

const { runOnce } = await import('../src/index.js');

const cachePath = path.join(process.cwd(), sentDir);

await fs.rm(cachePath, { recursive: true, force: true });

await test('runOnce sends apprise payload and records sent photo', async () => {
  try {
    await runOnce();
  } catch (err) {
    console.error('runOnce error', err);
    console.error('Fetch calls', calls);
    throw err;
  }

  assert.equal(calls.apprise.length, 1, 'expected Apprise to be called');
  const body = calls.apprise[0].init.body;
  assert.ok(body instanceof FormData, 'expected Apprise payload to use FormData');
  const fields = {};
  for (const [key, value] of body.entries()) {
    fields[key] = value;
  }
  assert.equal(fields.title.includes('Memories'), true);
  assert.ok(fields.attachment, 'expected attachment URL to be included');

  const files = await fs.readdir(cachePath);
  assert.ok(files.length > 0);
  const firstFile = path.join(cachePath, files[0]);
  const data = JSON.parse(await fs.readFile(firstFile, 'utf-8'));
  const keys = Object.keys(data);
  assert.equal(keys.length, 1, 'expected one sent entry recorded');
});

await fs.rm(cachePath, { recursive: true, force: true });

globalThis.fetch = realFetch;
Math.random = originalMathRandom;
config.synology.sentDir = originalConfig.synology.sentDir;
config.synology.ip = originalConfig.synology.ip;
config.apprise.inlineEmail = originalConfig.apprise.inlineEmail;
config.apprise.url = originalConfig.apprise.url;
config.apprise.key = originalConfig.apprise.key;
config.apprise.urls = originalConfig.apprise.urls;

for (const [key, value] of Object.entries(previousEnv)) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
