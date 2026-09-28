---
name: "网页文章规范化排版"
description: "对网页富文本编辑器（UEditor 等）中的文章做规范化排版：正文 22px、行距 1.5、图片居中、中文宋体、英文/罗马数字 Times New Roman、图标题居中于图片下方。Invoke when 用户要求给网页/后台文章排版、统一字体行距、调整图片与图标题。"
---

# 网页文章规范化排版（Web Article Typesetting）

通过外部 Chrome 自动化，对网页后台富文本编辑器里的文章统一排版：字号、行距、中英文字体、图片对齐、图标题位置。

## 何时使用

- 用户要求对**网页/后台编辑器**中的文章做排版、统一格式
- 需要统一：正文 22px、行距 1.5、图片居中、中文宋体、英文/罗马数字 Times New Roman、图标题居中于图片下方
- 典型场景：高校/企业 CMS 后台（多为 UEditor）发布文章前规范化

## 前置条件

1. 用户已在本地 Chrome 中**打开目标编辑器页面**并登录。
2. 先加载并遵循 `TRAE-browseruse-external` 技能：所有浏览器操作通过 `run_mcp(server_name="integrated_code_mode", tool_name="Exec")` 内的 `await tools.external_browser_*` 调用。
3. 首次连接：`await tools.browser_connect_plugin({})`；若 `connected:false` 再 `browser_setup_plugin`。

## 工作流程

### 1. 定位编辑器（关键，别想当然）

编辑器常见两种形态，实例名不固定（UEditor 默认 `editor`，实际可能是 `ueditorInstant0`）：

- **在顶层页面**：`window.UE.instants`
- **在 iframe 内**：如 `<iframe class="iframe-content">`，需进入 `iframe.contentWindow` 再找 `UE.instants`

用 `references/format.js` 的 `findUEditor()` 自动遍历顶层 + 所有同源 iframe，返回 `{ win, name, ed }`。找到后：

```js
var ed = r.ed;
var html = ed.getContent();        // 读
ed.setContent(newHtml);            // 写回
```

> 编辑器正文 DOM 在 `ed.body`（UEditor 提供），校验时用它而不是 `document`。

### 2. 修改前先备份

把 `ed.getContent()` 结果写入本地文件（如 `article_backup_<时间戳>.html`）再动手，出问题可回滚。

### 3. 应用排版规则

用 `references/format.js` 的 `formatArticle(html, opts)` 做 DOM 层改写，规则如下：

| 项目 | 规则 |
|---|---|
| 字号 | 所有段落/文本 `font-size: 22px` |
| 行距 | `line-height: 1.5` |
| 正文段落 | `text-align: justify` + 首行缩进 2 字符（`text-indent: 2em`） |
| 居中段落（图片/图标题） | `text-align: center` + `text-indent: 0` |
| 中文字体 | `font-family: 宋体, SimSun` |
| 英文/数字/罗马数字 | `font-family: 'Times New Roman', serif` |
| 混排段落容器 | `font-family: "Times New Roman", SimSun, serif` |
| 图片 | 所在 `<p>` 居中；`max-width:100%; height:auto`；按原布局一行一张或一行两张 |
| 图标题 | 紧跟图片下方的 `<p>` 居中、不缩进，格式 `图N 说明文字` |

**混排字体必须按字符拆分**：一个段落里中文与英文混排时，要遍历文本节点、按字符归类，把连续的中文包进 `font-family: 宋体` 的 `<span>`，连续的英文/数字包进 `font-family: 'Times New Roman'` 的 `<span>`。仅靠父容器设字体**不够**——编辑器工具栏的字体下拉框显示的是"光标/选中文字"所在 span 的字体，中文若不在宋体 span 内，下拉框会显示成 Times New Roman，用户会认为没生效。

**图标题合并**：若用户把并排的两张图合并成一张，原有两个标题要保留两个编号、居中排一行，用全角空格 `　` 分隔，例如：

```
图2 张林帅副教授主持分会场　图3 闫鑫同学作学术报告
```

### 4. 回写与验证

1. `ed.setContent(newHtml)` 写回。
2. 用 DOM 校验（**优先于截图**）：遍历 `ed.body` 的 `<p>`，检查 `getComputedStyle(p).textAlign`、图片宽度与所在段落对齐；图标题用 `/^图\s*\d/` 匹配文本确认存在且居中。
3. `external_browser_take_screenshot` 常因 Bridge 超时失败，**不要依赖截图**，以 DOM 读取为准；确需截图时失败就直接改用 DOM 校验。

## 常见坑

- **编辑器在 iframe 里**：顶层找不到 `UE`，必须下钻 iframe（同源才能访问 `contentDocument`）。
- **实例名不确定**：不要写死 `UE.getEditor('editor')`，用 `UE.instants` 取第一个实例。
- **字体下拉框显示**：中文必须包在宋体 span 内（见上）。
- **`&nbsp;` 与全角空格**：判断文本前先归一化 `\u00a0`/空白，避免正则失配。
- **引号转义**：style 内 `'Times New Roman'` 的引号在拼 HTML 字符串时注意转义（`&quot;` 或统一单引号）。
- **不要用 xlrd/openpyxl 之类重写富文本**：那是表格场景；这里是编辑器 DOM，直接改 `ed` 内容。

## 参考文件

- `references/format.js`：`findUEditor()` 定位编辑器 + `formatArticle()` 规范化排版的可复用实现，改 `opts` 参数即可复用到其它站点。
