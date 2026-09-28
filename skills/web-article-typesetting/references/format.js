/**
 * format.js — 网页文章规范化排版（可复用）
 *
 * 运行环境：外部 Chrome 页面的 evaluate 上下文
 *   run_mcp(server_name="integrated_code_mode", tool_name="Exec",
 *           args={"code": "const r = await tools.external_browser_evaluate({script: <本文件内容>}); text(JSON.stringify(r));"})
 *
 * 提供三个函数（挂到 window 上）：
 *   findUEditor()               定位页面 / 同源 iframe 中的 UEditor 实例
 *   formatArticle(html, opts)   对文章 HTML 做规范化排版，返回新 HTML
 *   verifyArticle(ed)           读取编辑器 DOM，输出对齐 / 图标题校验报告
 *
 * 典型用法（分两步，避免一次性执行过长）：
 *   // 步骤 A：定位并读内容
 *   var r = findUEditor();
 *   window.__ed = r.ed;
 *   text(JSON.stringify({name: r.name, len: r.ed.getContent().length}));
 *
 *   // 步骤 B：排版并写回
 *   var ed = window.__ed;
 *   var out = formatArticle(ed.getContent(), {});
 *   ed.setContent(out);
 *   text(JSON.stringify(verifyArticle(ed)));
 */
(function (global) {
  'use strict';

  var DEFAULTS = {
    fontSize: '22px',                                  // 正文字号
    lineHeight: '1.5',                                 // 行距
    cjkFont: '宋体, SimSun',                            // 中文
    latinFont: "'Times New Roman', serif",             // 英文 / 数字 / 罗马数字
    baseFont: '"Times New Roman", SimSun, serif',      // 段落容器
    indent: '2em',                                     // 正文首行缩进
    imgMaxWidth: '100%'
  };

  // ---------- 1. 定位 UEditor（顶层 + 同源 iframe，深度 3） ----------
  function findUEditor() {
    function probe(win, depth) {
      try {
        if (win.UE && win.UE.instants) {
          var keys = Object.keys(win.UE.instants);
          if (keys.length) {
            return { win: win, name: keys[0], ed: win.UE.instants[keys[0]] };
          }
        }
      } catch (e) { /* 跨域访问忽略 */ }
      if (depth <= 0 || !win.document) return null;
      var frames = win.document.querySelectorAll('iframe');
      for (var i = 0; i < frames.length; i++) {
        try {
          var hit = probe(frames[i].contentWindow, depth - 1);
          if (hit) return hit;
        } catch (e) { /* 跨域 iframe 跳过 */ }
      }
      return null;
    }
    return probe(global, 3);
  }

  // ---------- 2. 字符分类：CJK 及中文标点 → 宋体；其余 → Times New Roman ----------
  var CJK_RE = /[\u2E80-\u2EFF\u3000-\u303F\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/;
  function isCJK(ch) { return CJK_RE.test(ch); }

  function normalizeSpace(s) {
    return (s || '').replace(/[\s\u00a0]+/g, ' ').trim();
  }

  // ---------- 3. 按中/英把文本节点拆成多个 span ----------
  function splitTextNode(doc, textNode, opts) {
    var text = textNode.nodeValue;
    if (!text) return;
    var frag = doc.createDocumentFragment();
    var buf = '', cur = null;

    function flush() {
      if (!buf) return;
      var span = doc.createElement('span');
      span.setAttribute('style',
        'font-family: ' + (cur ? opts.cjkFont : opts.latinFont) + ';');
      span.appendChild(doc.createTextNode(buf));
      frag.appendChild(span);
      buf = '';
    }

    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (ch === '\n' || ch === '\r' || ch === '\t') { buf += ch; continue; }
      var cjk = isCJK(ch);
      if (cur === null) cur = cjk;
      if (cjk !== cur) { flush(); cur = cjk; }
      buf += ch;
    }
    flush();
    textNode.parentNode.replaceChild(frag, textNode);
  }

  function applyFonts(doc, root, opts) {
    var walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) {
      var tag = n.parentNode && n.parentNode.nodeName;
      if (tag === 'SCRIPT' || tag === 'STYLE') return;
      if (!n.nodeValue || !n.nodeValue.replace(/[\s\u00a0]/g, '')) return;
      splitTextNode(doc, n, opts);
    });
  }

  // ---------- 4. 段落样式 ----------
  function styleParagraph(p, opts, align) {
    p.style.marginTop = '';
    p.style.marginBottom = '';
    p.style.fontSize = opts.fontSize;
    p.style.lineHeight = opts.lineHeight;
    p.style.fontFamily = opts.baseFont;
    p.style.textAlign = align;
    p.style.textIndent = align === 'center' ? '0' : opts.indent;
  }

  // ---------- 5. 主函数：排版 ----------
  function formatArticle(html, opts) {
    opts = Object.assign({}, DEFAULTS, opts || {});
    var doc = new DOMParser().parseFromString('<div id="__root__">' + html + '</div>', 'text/html');
    var root = doc.getElementById('__root__');

    applyFonts(doc, root, opts);

    var blocks = root.querySelectorAll('p');
    for (var i = 0; i < blocks.length; i++) {
      var p = blocks[i];
      var imgs = p.querySelectorAll('img');
      var txt = normalizeSpace(p.textContent);
      var isCaption = /^图\s*\d/.test(txt);

      if (imgs.length || isCaption) {
        // 图片段落 / 图标题：居中、不缩进
        styleParagraph(p, opts, 'center');
        for (var j = 0; j < imgs.length; j++) {
          imgs[j].style.maxWidth = opts.imgMaxWidth;
          imgs[j].style.height = 'auto';
        }
      } else if (!txt) {
        // 空段落：居中、不缩进，保留作间距
        styleParagraph(p, opts, 'center');
      } else {
        // 正文：两端对齐 + 首行缩进
        styleParagraph(p, opts, 'justify');
      }
    }
    return root.innerHTML;
  }

  // ---------- 6. 校验：读回编辑器 DOM 输出报告 ----------
  function verifyArticle(ed) {
    var root = ed.body || (ed.document && ed.document.body);
    if (!root) return { error: 'no editor body' };
    var images = [], captions = [], badParagraphs = [];
    root.querySelectorAll('img').forEach(function (im) {
      var p = im.closest('p');
      images.push({
        src: (im.getAttribute('src') || '').slice(-32),
        paraAlign: p ? getComputedStyle(p).textAlign : '',
        width: Math.round(im.getBoundingClientRect().width)
      });
    });
    root.querySelectorAll('p').forEach(function (p) {
      var t = normalizeSpace(p.textContent);
      if (/^图\s*\d/.test(t)) {
        captions.push({ text: t.slice(0, 60), align: getComputedStyle(p).textAlign });
      } else if (t && getComputedStyle(p).textAlign !== 'justify') {
        badParagraphs.push(t.slice(0, 40));
      }
    });
    return { images: images, captions: captions, nonJustifyParagraphs: badParagraphs };
  }

  global.findUEditor = findUEditor;
  global.formatArticle = formatArticle;
  global.verifyArticle = verifyArticle;

  // 自动执行定位，便于 evaluate 直接看结果
  var hit = findUEditor();
  if (hit) global.__ed = hit.ed;
  return JSON.stringify({
    found: !!hit,
    editorName: hit ? hit.name : null,
    contentLength: hit ? hit.ed.getContent().length : 0
  });
})(typeof window !== 'undefined' ? window : this);
