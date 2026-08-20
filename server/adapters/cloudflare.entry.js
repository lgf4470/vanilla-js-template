'use strict';

const { handleRequest } = require('../app');

function isApiPath(pathname) {
  return pathname === '/api' || pathname.startsWith('/api/');
}

async function fetchHandler(request, env) {
  const url = new URL(request.url);
  if (isApiPath(url.pathname)) return handleRequest(request, env);
  if (env && env.ASSETS && typeof env.ASSETS.fetch === 'function') {
    return env.ASSETS.fetch(request);
  }
  return new Response('Not Found', { status: 404 });
}

module.exports = { fetch: fetchHandler };
