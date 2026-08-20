/* ============================================================
 * db/index.js — 数据库驱动工厂(零第三方依赖)
 * ------------------------------------------------------------
 * 统一驱动接口:
 *   query(sql, params)  -> 行数组(对象)
 *   run(sql, params)    -> { changes, lastInsertRowid }
 *
 * 通过环境变量 DB_DRIVER 选择驱动(适配器位于 server/db/adapters/):
 *   sqlite  ./sqlite.js  本地 SQLite(node:sqlite 内置,路径 SQLITE_PATH,默认 sqlite.db)
 *   turso   ./turso.js   远程 Turso/libSQL HTTP API(DATABASE_URL + DATABASE_AUTH_TOKEN)
 *   d1      ./d1.js      Cloudflare D1(Worker 内原生 binding;本地走 D1 REST API,
 *                         需要 D1_ACCOUNT_ID / D1_DATABASE_ID / D1_API_TOKEN)
 *
 * 建表语句统一来自 ./schema.js;适配器各自负责参数绑定与行数据形状,
 * 业务代码只依赖本接口。
 * ============================================================ */
'use strict';

const path = require('path');
const { SCHEMA } = require('./schema');

const DRIVERS = { sqlite: 'sqlite', turso: 'turso', d1: 'd1' };

function loadAdapter(env = process.env) {
  const runtimeEnv = env || process.env;
  const explicit = String(runtimeEnv.DB_DRIVER || '').toLowerCase();
  const driver = explicit ||
    (runtimeEnv.DB && typeof runtimeEnv.DB.prepare === 'function'
      ? 'd1'
      : runtimeEnv.DATABASE_URL
        ? 'turso'
        : 'sqlite');
  const file = DRIVERS[driver];
  if (!file) {
    throw new Error(
      '[db] 未知 DB_DRIVER: ' + driver + '(可选: ' + Object.keys(DRIVERS).join(' / ') + ')'
    );
  }
  const mod = require('./adapters/' + file + '.adapter');
  if (!mod || typeof mod.init !== 'function') {
    throw new Error('[db] 驱动 ' + file + ' 未导出 init()');
  }
  return mod;
}

let db = null;

/** 初始化并返回驱动实例(单例) */
function getDb(env = process.env) {
  if (db) return db;
  const runtimeEnv = env || process.env;
  const adapter = loadAdapter(runtimeEnv);
  db = adapter.init({
    schema: SCHEMA,
    env: runtimeEnv,
    dbPath: runtimeEnv.SQLITE_PATH || path.join(process.cwd(), 'sqlite.db'),
  });
  return db;
}

/** 数据库文件路径(sqlite 驱动用;远程驱动返回 null) */
function localDbPath(env = process.env) {
  const runtimeEnv = env || process.env;
  return (runtimeEnv.DB_DRIVER || 'sqlite').toLowerCase() === 'sqlite'
    ? runtimeEnv.SQLITE_PATH || path.join(process.cwd(), 'sqlite.db')
    : null;
}

/** 是否使用本地 sqlite(用于首启提示) */
function isLocalSqlite(env = process.env) {
  const runtimeEnv = env || process.env;
  return (runtimeEnv.DB_DRIVER || 'sqlite').toLowerCase() === 'sqlite';
}

module.exports = { getDb, SCHEMA, localDbPath, isLocalSqlite };
