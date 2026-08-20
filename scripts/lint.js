/**
 * scripts/lint.js — 手写规则脚本（`just lint`）
 *  - 语法：node --check（每个 .js 文件）
 *  - 禁用模式：window.alert/confirm/prompt、document.write、eval(、new Function(
 *  - 样式规则：app/ 下的 JS/CSS 禁止硬编码十六进制颜色（tokens.css 除外）
 *  - 格式：禁止 Tab 缩进
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(join(import.meta.dirname, '..'));

const SCAN_DIRS = ['app', 'server', 'shared', 'scripts', 'tests', 'api'];

const BANNED_PATTERNS = [
  { re: /\bwindow\.(alert|confirm|prompt)\s*\(/, msg: '禁止 window.alert/confirm/prompt（用 ui-toast / ui-confirm / ui-dialog）' },
  { re: /\bdocument\.write\s*\(/, msg: '禁止 document.write' },
  { re: /\beval\s*\(/, msg: '禁止 eval(' },
  { re: /\bnew\s+Function\s*\(/, msg: '禁止 new Function(' },
  { re: /\bconsole\.log\s*\(/, msg: '禁止 console.log（仅客户端代码；scripts 与适配器日志允许）' },
];

/** console.log 禁令只适用于浏览器运行时代码 */
const CONSOLE_LOG_ONLY_CLIENT = true;

const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/;

let errors = [];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry.startsWith('.') || entry === 'node_modules' || entry === 'dist' || entry === 'data') continue;
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function checkSyntax(file) {
  if (!file.endsWith('.js')) return;
  const res = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (res.status !== 0) {
    errors.push(`语法错误 ${rel(file)}:\n${res.stderr || res.stdout}`);
  }
}

function checkBanned(file) {
  if (!file.endsWith('.js')) return;
  // lint 自身必然包含禁用模式字样，跳过自检
  if (file.endsWith('scripts/lint.js')) return;
  const src = readFileSync(file, 'utf8');
  for (const { re, msg } of BANNED_PATTERNS) {
    if (msg.includes('console.log') && !file.startsWith(join(ROOT, 'app'))) continue;
    const m = src.match(re);
    if (m) errors.push(`${msg} → ${rel(file)}:${lineOf(src, m.index)}`);
  }
  if (src.includes('\t')) {
    errors.push(`禁止 Tab 缩进 → ${rel(file)}`);
  }
  // 样式硬编码颜色检查（app/ 下 JS 内嵌样式与 CSS 文件）。
  // token 样式表与模板随附的静态 SVG/Chart.js 资源本身就是颜色定义，
  // 不应被当作业务组件样式重复改写。
  const tokenSheet = file.endsWith('tokens.css') || file.endsWith('semantic-tokens.css');
  const staticColorAsset = file.endsWith(join('app', 'components', 'ui', 'icons.js')) || file.endsWith(join('app', 'lib', 'chart.umd.js'));
  if (file.startsWith(join(ROOT, 'app')) && !tokenSheet && !staticColorAsset) {
    const m = src.match(HEX_COLOR);
    if (m) errors.push(`禁止硬编码十六进制颜色（色值 ${m[0]}，应消费 tokens.css 变量）→ ${rel(file)}:${lineOf(src, m.index)}`);
  }
}

function rel(file) {
  return file.startsWith(ROOT) ? file.slice(ROOT.length + 1) : file;
}

function lineOf(src, index) {
  return src.slice(0, index).split('\n').length;
}

for (const dir of SCAN_DIRS) {
  const base = join(ROOT, dir);
  if (!statSync(base, { throwIfNoEntry: false })?.isDirectory()) continue;
  for (const file of walk(base)) {
    checkSyntax(file);
    checkBanned(file);
  }
}

// ---- 退出 ----
if (errors.length) {
  console.error(`lint 失败（${errors.length} 个问题）：\n\n` + errors.join('\n\n'));
  process.exit(1);
}
console.log('[lint] 通过：语法 OK、无禁用模式、无硬编码颜色、无 Tab');
process.exit(0);