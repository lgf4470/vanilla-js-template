/* ============================================================
 * db/resolver.js — 脚本层数据库解析入口
 * ------------------------------------------------------------
 * 业务代码统一走 server/db/index.js 的 getDb();本文件仅为
 * scripts/db-*.js 提供 { driver, db } 形状的薄封装,并做
 * 驱动名归一化(d1-binding / d1-rest → d1)。
 * ============================================================ */
'use strict';

const { getDb } = require('./index');

function resolveDb(env = process.env) {
  const db = getDb(env);
  const raw = db && db.name ? db.name : String((env || process.env).DB_DRIVER || 'sqlite').toLowerCase();
  const driver = raw === 'd1-binding' || raw === 'd1-rest' ? 'd1' : raw;
  return { driver, db };
}

module.exports = { resolveDb };
