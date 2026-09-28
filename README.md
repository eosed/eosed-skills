# eosed-skills

个人自建的技能（Skill）合集。

## 技能列表

| 技能 | 说明 | 依赖 |
| --- | --- | --- |
| [everything-search](./skills/everything-search) | 用 Everything 命令行工具（es.exe）快速搜索本机文件/文件夹，支持按名称、扩展名、路径检索与排序 | Windows + [Everything](https://www.voidtools.com/) 正在运行 |
| [web-article-typesetting](./skills/web-article-typesetting) | 通过外部 Chrome 自动化，对网页富文本编辑器（UEditor 等）中的文章做规范化排版：正文 22px、行距 1.5、图片居中、中文宋体、英文/罗马数字 Times New Roman、图标题居中于图片下方 | Chrome + TRAE 浏览器控制插件 |

## 目录结构

```
.
└── skills/
    ├── everything-search/
    │   ├── SKILL.md
    │   ├── README.md
    │   ├── README_CN.md
    │   └── scripts/search.py
    └── web-article-typesetting/
        ├── SKILL.md
        └── references/format.js
```

## 安装

把需要的技能目录复制到 TRAE 的用户级技能目录：

```
C:\Users\<用户名>\.trae-cn\skills\<技能名>\
```

例如安装「网页文章规范化排版」：

```powershell
Copy-Item -Recurse .\skills\web-article-typesetting "$env:USERPROFILE\.trae-cn\skills\"
```

## 说明

- `everything-search` 源自 [eosed/everything-search-skill](https://github.com/eosed/everything-search-skill)，本仓库为其归集版本。
- 每个技能的具体用法见各自的 `SKILL.md`。
