/* ============================================================
 * db/migrate.js — 数据库迁移入口(scripts/db-*.js 使用)
 * ------------------------------------------------------------
 * 建表 SQL 唯一来源是 server/db/schema.js;sqlite 驱动在 init
 * 时自动建表,远程驱动在 initSchema() 中建表。ensureMigrated
 * 幂等(CREATE TABLE IF NOT EXISTS),可反复调用。
 * ============================================================ */
'use strict';

const { SCHEMA } = require('./schema');

async function ensureMigrated(db) {
  const applied = [];
  if (db && typeof db.initSchema === 'function') {
    await db.initSchema(SCHEMA);
    applied.push('schema');
  }
  return applied;
}

module.exports = { ensureMigrated };
