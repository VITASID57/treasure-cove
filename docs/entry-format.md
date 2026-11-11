# 作品说明格式

每件作品一个文件夹：`entries/<作品编号>/entry.json`，可以再放一张截图。作品编号只用小写字母、数字和 `-`，和文件夹名一致。

```json
{
  "id": "lumenkeep",
  "name": "栖光庭",
  "summary": "一句话说清它做什么",
  "highlights": ["要点一", "要点二", "要点三"],
  "kind": "self-host",
  "rating": "all",
  "author": { "name": "作者名", "url": "https://github.com/作者" },
  "origin": "original",
  "source": "https://github.com/owner/repo",
  "license": "MIT",
  "version": "1.0.0",
  "install": { "guide": "https://github.com/owner/repo#readme" },
  "tags": ["聊天", "Telegram"],
  "screenshot": "screenshot.png",
  "updated": "2026-11-12"
}
```

## 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `id` | 是 | 作品编号，和文件夹名一致 |
| `name` | 是 | 名称，不超过 40 字 |
| `summary` | 是 | 一句话介绍，不超过 80 字 |
| `highlights` | 否 | 最多 5 条要点 |
| `kind` | 是 | `town-plugin` 小镇插件包 · `remote-mcp` 远程 MCP · `web-app` 网页小玩意 · `self-host` 需要自己部署 · `adapter` 适配包 |
| `rating` | 是 | `all` 全年龄 · `adult` 深水区 |
| `author` | 是 | 作者名，以及可选的主页链接；转载时写原作者 |
| `submitter` | 否 | 转载或适配时，投稿人／适配者 |
| `origin` | 是 | `original` 原创 · `repost` 转载 |
| `source` | 是 | 作品的源码或主页地址 |
| `adapts` | 适配包必填 | 被适配的原作地址 |
| `license` | 是 | 许可名；原作没写许可就填 `none`（只能放链接，不能打包原作） |
| `version` | 是 | 版本号 |
| `install` | 是 | 见下表 |
| `tags` | 否 | 最多 6 个标签 |
| `screenshot` | 否 | 同一文件夹里的图片文件名，不超过 300 KB；深水区作品不放截图 |
| `updated` | 是 | 最近更新日期，`YYYY-MM-DD` |

## `install`：按类型填写

| 类型 | 需要的字段 |
|---|---|
| `town-plugin` | `package`：插件包的下载地址（建议 GitHub Releases），或文件夹里的文件名；`sha256`：插件包的指纹 |
| `remote-mcp` | `mcpUrl`：MCP 地址 |
| `web-app` | `webUrl`：网页地址 |
| `self-host` | `guide`：部署说明的地址；可以再写 `package` 和 `sha256`，表示部署好以后还能装的小镇插件包 |
| `adapter` | 上面任意一种，外加顶层的 `adapts` |

所有地址都必须是 `https`。

## 自动检查会拦下

- 缺字段、字段格式不对、编号和文件夹名对不上；
- 同一个源码地址被重复收录（适配包除外），按 `owner/repo` 比较，不分大小写，去掉 `.git` 和末尾的 `/`；
- 文件夹里的插件包，指纹和 `sha256` 对不上；
- 深水区作品带了截图。
