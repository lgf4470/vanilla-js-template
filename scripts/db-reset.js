/**
 * scripts/db-reset.js — 重建本地数据库（`just db:reset`）
 * 仅支持 SQLite 本地文件；先删库文件（含 WAL/SHM），再迁移 + 种子。
 * 路径统一走 SQLITE_PATH（与 server/db/index.js 一致），兼容旧 DB_PATH 写法。
 */

import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveDb } from '../server/db/resolver.js';
import { ensureMigrated } from '../server/db/migrate.js';

async function main() {
  const path = process.env.SQLITE_PATH || process.env.DB_PATH || './sqlite.db';
  if (resolveDb(process.env).driver !== 'sqlite') {
    throw new Error('db:reset 仅支持本地 SQLite（DB_DRIVER=sqlite）');
  }
  for (const suffix of ['', '-wal', '-shm']) {
    const file = resolve(path + suffix);
    if (existsSync(file)) rmSync(file);
  }
  console.log(`[db:reset] 已删除 ${path}`);

  const { driver, db } = resolveDb({ ...process.env, SQLITE_PATH: path });
  const applied = await ensureMigrated(db);
  console.log(`[db:reset] ${driver} 迁移完成: ${applied.join(', ') || '无新迁移'}`);
  if (db && typeof db.close === 'function') db.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('[db:reset] 失败:', err.message);
  process.exit(1);
});
