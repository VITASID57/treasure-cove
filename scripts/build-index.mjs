// node scripts/build-index.mjs [--verify-remote]
// Reads entries/*/entry.json, checks them, and writes site/index.json plus any local packages and screenshots.
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { duplicateProblems, entryProblems, sourceKey } from './entry-rules.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const entriesDir = join(root, 'entries');
const out = join(root, 'site');
const verifyRemote = process.argv.includes('--verify-remote');
const MAX_SCREENSHOT = 300 * 1024;

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function remoteSha(url) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`下载失败（${response.status}）`);
  return sha256(Buffer.from(await response.arrayBuffer()));
}

/** GitHub says whether a repository is a fork; best effort, skipped without network. */
async function forkParent(source) {
  const key = sourceKey(source);
  if (!key.startsWith('github:') || !process.env.GITHUB_TOKEN) return null;
  try {
    const response = await fetch(`https://api.github.com/repos/${key.slice(7)}`, {
      headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json' } });
    const repo = response.ok ? await response.json() : null;
    return repo?.fork && repo.parent?.html_url ? repo.parent.html_url : null;
  } catch { return null; }
}

async function main() {
  const folders = (await readdir(entriesDir, { withFileTypes: true }).catch(() => [])).filter((item) => item.isDirectory());
  const problems = []; const entries = [];
  for (const folder of folders) {
    const dir = join(entriesDir, folder.name);
    let entry;
    try { entry = JSON.parse(await readFile(join(dir, 'entry.json'), 'utf8')); }
    catch { problems.push(`${folder.name}：读不到 entry.json，或格式不是 JSON`); continue; }
    const found = entryProblems(entry, folder.name).map((message) => `${folder.name}：${message}`);
    if (entry?.screenshot) {
      const size = await stat(join(dir, entry.screenshot)).then((info) => info.size).catch(() => -1);
      if (size < 0) found.push(`${folder.name}：找不到截图 ${entry.screenshot}`);
      else if (size > MAX_SCREENSHOT) found.push(`${folder.name}：截图超过 300 KB`);
    }
    const pkg = entry?.install?.package;
    if (pkg && !/^https:/u.test(pkg)) {
      const bytes = await readFile(join(dir, pkg)).catch(() => null);
      if (bytes === null) found.push(`${folder.name}：找不到插件包 ${pkg}`);
      else if (sha256(bytes) !== entry.install.sha256) found.push(`${folder.name}：插件包指纹和 sha256 对不上`);
    } else if (pkg && verifyRemote) {
      try { if (await remoteSha(pkg) !== entry.install.sha256) found.push(`${folder.name}：远程插件包的指纹和 sha256 对不上`); }
      catch (error) { found.push(`${folder.name}：${error.message}`); }
    }
    problems.push(...found);
    if (found.length === 0) entries.push({ entry, dir });
  }
  problems.push(...duplicateProblems(entries.map((item) => item.entry)));
  if (problems.length) {
    console.error(`有 ${problems.length} 个问题：\n- ${problems.join('\n- ')}`);
    process.exitCode = 1; return;
  }
  await rm(join(out, 'files'), { recursive: true, force: true });
  const listed = [];
  for (const { entry, dir } of entries.sort((a, b) => b.entry.updated.localeCompare(a.entry.updated))) {
    const files = join(out, 'files', entry.id); const copy = { ...entry, install: { ...entry.install } };
    if (entry.screenshot) { await mkdir(files, { recursive: true }); await copyFile(join(dir, entry.screenshot), join(files, entry.screenshot));
      copy.screenshot = `files/${entry.id}/${entry.screenshot}`; }
    if (entry.install.package && !/^https:/u.test(entry.install.package)) {
      await mkdir(files, { recursive: true }); await copyFile(join(dir, entry.install.package), join(files, entry.install.package));
      copy.install.package = `files/${entry.id}/${entry.install.package}`;
    }
    const parent = await forkParent(entry.source);
    if (parent) copy.forkOf = parent;
    listed.push(copy);
  }
  await mkdir(out, { recursive: true });
  await writeFile(join(out, 'index.json'), `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), entries: listed }, null, 2)}\n`);
  console.log(`已收录 ${listed.length} 件作品，索引写入 site/index.json`);
}

await main();
