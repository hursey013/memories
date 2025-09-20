import assert from 'node:assert/strict';
import test from 'node:test';

const { buildEmailBody } = await import('../src/apprise.js');

test('buildEmailBody escapes html and embeds image when provided', () => {
  const html = buildEmailBody({
    body: 'Hello <World>',
    inlineImageData: 'data:image/jpeg;base64,abc123',
  });
  assert.match(html, /Hello &lt;World&gt;/);
  assert.match(html, /<img src="data:image\/jpeg;base64,abc123"/);
});

test('buildEmailBody provides fallback when both body and image missing', () => {
  const html = buildEmailBody({ body: '', inlineImageData: null });
  assert.equal(html, "<p>Enjoy today’s Memory!</p>");
});
