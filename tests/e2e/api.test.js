/**
 * tests/e2e/api.test.js
 * 直接驱动迁移后的 Request → Response API，不监听端口。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import serverApp from '../../server/app.js';

const { handleRequest, getOrCreateApp } = serverApp;
const BASE = 'http://nova.test/api';
const testEnv = {
  DB_DRIVER: 'sqlite',
  SQLITE_PATH: ':memory:',
  NODE_ENV: 'test',
  AUTH_PASSWORD: 'template-test-password',
  ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
};

let token = '';

function call(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { accept: 'application/json' };
  if (auth && token) headers['x-auth-token'] = token;
  let payload;
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  return handleRequest(new Request(BASE + path, { method, headers, body: payload }), testEnv);
}

async function json(response) {
  return { status: response.status, body: await response.json().catch(() => null) };
}

test('template API: login gate, settings encryption, API Hub state and logout', async () => {
  const denied = await json(await call('/auth/verify', { auth: false }));
  assert.equal(denied.status, 401);

  const login = await json(
    await call('/auth/login', {
      method: 'POST',
      auth: false,
      body: { password: testEnv.AUTH_PASSWORD, expiry: '24h' },
    })
  );
  assert.equal(login.status, 200);
  assert.ok(login.body.token);
  assert.ok(login.body.expiresAt);
  token = login.body.token;

  const verified = await json(await call('/auth/verify'));
  assert.equal(verified.status, 200);
  assert.equal(verified.body.ok, true);
  assert.equal(verified.body.expiry, '24h');

  const profile = {
    username: 'template-admin',
    email: 'admin@example.com',
    bio: 'Migrated template',
    links: ['', ''],
    avatar: { type: 'initial', value: '' },
  };
  const saved = await json(
    await call('/settings', {
      method: 'PUT',
      body: {
        settings: {
          'settings:activeWorkspace': 'ws-default',
          'settings:profile': JSON.stringify(profile),
        },
      },
    })
  );
  assert.equal(saved.status, 200);
  assert.equal(saved.body.written, 2);

  const app = await getOrCreateApp(testEnv);
  const raw = await app.db.get(
    'SELECT value FROM app_settings WHERE workspace_id = ? AND key = ?',
    ['ws-default', 'settings:profile']
  );
  assert.ok(raw.value.startsWith('enc:v1:'), '敏感设置必须以 AES-GCM 密文落库');
  assert.ok(!raw.value.includes(profile.email), '敏感设置不得明文落库');

  const settings = await json(await call('/settings'));
  assert.equal(settings.status, 200);
  assert.deepEqual(JSON.parse(settings.body['settings:profile']), profile);

  const hub = await json(await call('/hub/state'));
  assert.equal(hub.status, 200, JSON.stringify(hub.body));
  assert.ok(Array.isArray(hub.body.routes));
  assert.ok(hub.body.routes.some((route) => route.path === '/api/settings'));
  assert.equal(hub.body.config.defaults.auth, 'session');

  const loggedOut = await json(await call('/auth/logout', { method: 'POST' }));
  assert.equal(loggedOut.status, 200);
  const afterLogout = await json(await call('/auth/verify'));
  assert.equal(afterLogout.status, 401);
});
