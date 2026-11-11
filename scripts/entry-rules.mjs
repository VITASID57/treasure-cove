// What a valid entry looks like. Kept apart from file and network work so it can be tested on its own.

export const KINDS = ['town-plugin', 'remote-mcp', 'web-app', 'self-host', 'adapter'];
export const RATINGS = ['all', 'adult'];
const ORIGINS = ['original', 'repost'];
const ID = /^[a-z0-9][a-z0-9-]{1,47}$/u;
const DATE = /^\d{4}-\d{2}-\d{2}$/u;
const SHA = /^[a-f0-9]{64}$/u;

const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
const https = (value) => { try { return new URL(value).protocol === 'https:'; } catch { return false; } };

/** `owner/repo` for GitHub links, otherwise the bare host and path; used to spot the same work listed twice. */
export function sourceKey(url) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/u, '').replace(/\.git$/u, '').replace(/\/+$/u, '').toLowerCase();
    if (parsed.hostname.toLowerCase() === 'github.com') return `github:${path.split('/').slice(1, 3).join('/')}`;
    return `${parsed.hostname.toLowerCase()}${path}`;
  } catch { return ''; }
}

/** Every problem with one entry, as plain sentences; an empty list means it is fine. */
export function entryProblems(entry, folder) {
  const problems = [];
  const need = (ok, message) => { if (!ok) problems.push(message); };
  need(typeof entry === 'object' && entry !== null && !Array.isArray(entry), 'entry.json 不是一个对象');
  if (problems.length) return problems;
  need(ID.test(entry.id ?? ''), 'id 只能用小写字母、数字和 -');
  need(entry.id === folder, `id 要和文件夹名 ${folder} 一致`);
  need(text(entry.name, 40), 'name 必填，不超过 40 字');
  need(text(entry.summary, 80), 'summary 必填，不超过 80 字');
  need(entry.highlights === undefined || (Array.isArray(entry.highlights) && entry.highlights.length <= 5
    && entry.highlights.every((item) => text(item, 60))), 'highlights 最多 5 条，每条不超过 60 字');
  need(KINDS.includes(entry.kind), `kind 只能是 ${KINDS.join(' / ')}`);
  need(RATINGS.includes(entry.rating), 'rating 只能是 all 或 adult');
  need(text(entry.author?.name, 40) && (entry.author.url === undefined || https(entry.author.url)), 'author.name 必填；author.url 要是 https');
  need(entry.submitter === undefined || text(entry.submitter, 40), 'submitter 不超过 40 字');
  need(ORIGINS.includes(entry.origin), 'origin 只能是 original 或 repost');
  need(https(entry.source), 'source 必填，要是 https 地址');
  need(text(entry.license, 60), 'license 必填；原作没写许可就填 none');
  need(text(entry.version, 30), 'version 必填');
  need(typeof entry.updated === 'string' && DATE.test(entry.updated), 'updated 要写成 YYYY-MM-DD');
  need(entry.tags === undefined || (Array.isArray(entry.tags) && entry.tags.length <= 6 && entry.tags.every((tag) => text(tag, 12))),
    'tags 最多 6 个，每个不超过 12 字');
  need(entry.screenshot === undefined || (typeof entry.screenshot === 'string' && /^[\w.-]+\.(png|jpe?g|webp)$/u.test(entry.screenshot)),
    'screenshot 要是同一文件夹里的图片文件名');
  need(!(entry.rating === 'adult' && entry.screenshot), '深水区作品不放截图');
  if (entry.kind === 'adapter') need(https(entry.adapts), '适配包要写 adapts：被适配的原作地址');
  const install = entry.install ?? {};
  need(typeof entry.install === 'object' && entry.install !== null, 'install 必填');
  const packageOk = install.package === undefined
    || (https(install.package) || /^[\w.-]+\.mimi-app\.json$/u.test(install.package));
  need(packageOk, 'install.package 要是 https 地址，或文件夹里的 .mimi-app.json 文件名');
  need(install.package === undefined || SHA.test(install.sha256 ?? ''), '写了 install.package 就要写 install.sha256（64 位小写十六进制）');
  for (const key of ['mcpUrl', 'webUrl', 'guide']) need(install[key] === undefined || https(install[key]), `install.${key} 要是 https 地址`);
  const has = { 'town-plugin': install.package, 'remote-mcp': install.mcpUrl, 'web-app': install.webUrl, 'self-host': install.guide,
    adapter: install.package ?? install.mcpUrl ?? install.webUrl ?? install.guide };
  need(Boolean(has[entry.kind]), `kind 是 ${entry.kind} 时，install 里缺少对应的地址`);
  if (entry.license === 'none') need(!(install.package && !https(install.package)), '原作没写许可时，不能把作品文件放进百宝湾');
  return problems;
}

/** Problems across all entries: the same source listed twice (adapters may share a source with the original). */
export function duplicateProblems(entries) {
  const seen = new Map(); const problems = [];
  for (const entry of entries) {
    if (entry.kind === 'adapter') continue;
    const key = sourceKey(entry.source);
    if (!key) continue;
    if (seen.has(key)) problems.push(`${entry.id}：和 ${seen.get(key)} 是同一个来源（${key}），已经收录过了`);
    else seen.set(key, entry.id);
  }
  return problems;
}
