import test from 'node:test';
import assert from 'node:assert/strict';
import { endpointURL } from '../src/js/services/http.js';

test('Spaceflight News endpoint retains the v4 API path', () => {
  const url = endpointURL('https://api.spaceflightnewsapi.net/v4', 'articles/');
  assert.equal(url.toString(), 'https://api.spaceflightnewsapi.net/v4/articles/');
});

test('Launch Library endpoint retains the 2.3.0 API path', () => {
  const url = endpointURL('https://ll.thespacedevs.com/2.3.0', 'launches/upcoming/');
  assert.equal(url.toString(), 'https://ll.thespacedevs.com/2.3.0/launches/upcoming/');
});

test('Endpoint builder tolerates leading or trailing slashes', () => {
  const url = endpointURL('https://example.test/api/v1/', '/items/');
  assert.equal(url.toString(), 'https://example.test/api/v1/items/');
});
