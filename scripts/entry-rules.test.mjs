import assert from 'node:assert/strict';
import test from 'node:test';
import { duplicateProblems, entryProblems, sourceKey } from './entry-rules.mjs';

const good = {
  id: 'demo', name: '示例', summary: '一句话', kind: 'remote-mcp', rating: 'all', author: { name: '作者' },
  origin: 'original', source: 'https://github.com/Someone/Demo.git', license: 'MIT', version: '1.0.0',
  install: { mcpUrl: 'https://mcp.example.com/mcp' }, updated: '2026-11-12',
};

test('a complete entry passes', () => assert.deepEqual(entryProblems(good, 'demo'), []));

test('a self-hosted entry can offer web, MCP and plugin guides on one card', () => {
  const install = { guide: 'https://example.com/deploy', webGuide: 'https://example.com/web',
    mcpGuide: 'https://example.com/mcp', pluginGuide: 'https://example.com/plugin',
    package: 'demo.mimi-app.json', sha256: 'a'.repeat(64) };
  const entry = { ...good, kind: 'self-host', install };
  assert.deepEqual(entryProblems(entry, 'demo'), []);
  assert.match(entryProblems({ ...entry, install: { ...install, mcpGuide: 'http://example.com' } }, 'demo').join(), /mcpGuide/u);
  assert.match(entryProblems({ ...entry, install: { ...install, package: undefined } }, 'demo').join(), /提供插件包/u);
});

test('kind-specific install fields are required', () => {
  assert.match(entryProblems({ ...good, kind: 'town-plugin' }, 'demo').join(), /install 里缺少/u);
  assert.match(entryProblems({ ...good, kind: 'town-plugin', install: { package: 'x.mimi-app.json' } }, 'demo').join(), /sha256/u);
  assert.match(entryProblems({ ...good, kind: 'adapter' }, 'demo').join(), /adapts/u);
});

test('adult entries never carry screenshots, and links must be https', () => {
  assert.match(entryProblems({ ...good, rating: 'adult', screenshot: 'a.png' }, 'demo').join(), /深水区/u);
  assert.match(entryProblems({ ...good, install: { mcpUrl: 'http://mcp.example.com' } }, 'demo').join(), /https/u);
});

test('the same GitHub repository is spotted however it is written, adapters excepted', () => {
  assert.equal(sourceKey('https://github.com/Someone/Demo.git/'), 'github:someone/demo');
  const twice = [good, { ...good, id: 'demo-2', source: 'https://github.com/someone/demo' }];
  assert.equal(duplicateProblems(twice).length, 1);
  assert.equal(duplicateProblems([good, { ...twice[1], kind: 'adapter', adapts: good.source }]).length, 0);
});
