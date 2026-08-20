/**
 * scripts/db-migrate.js — 执行数据库迁移（`just db:migrate`）
 * 驱动按 resolver 自动选型：本地开发默认 SQLite（./sqlite.db）。
 * 建表 SQL 唯一来源为 server/db/schema.js，ensureMigrated 幂等。
 */

import { resolveDb } from '../server/db/resolver.js';
import { ensureMigrated } from '../server/db/migrate.js';

async function main() {
  const { driver, db } = resolveDb(process.env);
  const applied = await ensureMigrated(db);
  if (applied.length) {
    console.log(`[db:migrate] ${driver} — 已应用 ${applied.length} 个迁移: ${applied.join(', ')}`);
  } else {
    console.log(`[db:migrate] ${driver} — 已是最新，无需迁移`);
  }
  if (db && typeof db.close === 'function') db.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('[db:migrate] 失败:', err.message);
  process.exit(1);
});
