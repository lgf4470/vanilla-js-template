'use strict';

const { getDb, SCHEMA } = require('./db');
const { encrypt, decrypt } = require('./core/security');
const { verifyPassword } = require('./core/auth');
const { createApiHandler } = require('./core/api');

let runtimePromise = null;

function makeNodeRequest(request) {
  const headers = Object.fromEntries(request.headers.entries());
  const listeners = { data: [], end: [], error: [] };
  const nodeRequest = {
    method: request.method,
    headers,
    url: request.url,
    socket: { remoteAddress: headers['x-forwarded-for'] || 'request' },
    on(event, callback) {
      if (listeners[event]) listeners[event].push(callback);
      return nodeRequest;
    },
  };

  // Delay body consumption until the route handler has attached its data/end
  // listeners; otherwise a fast Request can resolve before readBody subscribes.
  setImmediate(() => {
    Promise.resolve(request.text())
      .then((body) => {
        if (body) listeners.data.forEach((callback) => callback(body));
        listeners.end.forEach((callback) => callback());
      })
      .catch((error) => listeners.error.forEach((callback) => callback(error)));
  });

  return nodeRequest;
}

function makeNodeResponse() {
  let status = 200;
  let headers = {};
  let body = '';
  return {
    writeHead(nextStatus, nextHeaders) {
      status = nextStatus;
      headers = { ...headers, ...(nextHeaders || {}) };
      this.statusCode = nextStatus;
      this.headersSent = true;
    },
    end(nextBody) {
      body = nextBody == null ? '' : nextBody;
    },
    statusCode: status,
    headersSent: false,
    toResponse() {
      return new Response(body, { status, headers });
    },
  };
}

async function getRuntime(env = process.env) {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      const db = getDb(env);
      if (typeof db.initSchema === 'function') await db.initSchema(SCHEMA);
      const handler = createApiHandler({
        db,
        encrypt: (value) => encrypt(value, env),
        decrypt: (value) => decrypt(value, env),
        verifyPassword: (password) => verifyPassword(password, env),
      });
      return { db, handler };
    })().catch((error) => {
      runtimePromise = null;
      throw error;
    });
  }
  return runtimePromise;
}

/** 统一平台入口：API Request → Response；静态资源由平台适配器处理。 */
async function handleRequest(request, env = process.env) {
  const { handler } = await getRuntime(env);
  const url = new URL(request.url);
  const nodeRequest = makeNodeRequest(request);
  const nodeResponse = makeNodeResponse();
  await handler(nodeRequest, nodeResponse, url.pathname);
  return nodeResponse.toResponse();
}

async function createApp(env = process.env) {
  const runtime = await getRuntime(env);
  return { ...runtime, env, handleRequest: (request) => handleRequest(request, env) };
}

module.exports = { createApp, getOrCreateApp: createApp, handleRequest };
