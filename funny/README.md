# 自留地 · funny

私人图文小说欣赏站。奶油绿 + 手账拼贴 + 梦境感，纯静态、零依赖，适配手机。
**只有站长（你）能发布内容，访客只可浏览，没有投稿、评论、登录。**

线上地址：https://kyuu789.github.io/funny/

---

## 文件结构

```
funny/
├── index.html            首页（slogan + 精选图片 + 最新小说）
├── gallery.html          图片集（瀑布流 + 点击全屏灯箱）
├── novels.html           小说集（卡片列表）
├── novel.html            阅读页（novel.html?id=n1）
├── about.html            关于
├── assets/
│   ├── css/style.css     全部样式（配色变量在文件顶部 :root）
│   ├── js/app.js         渲染 / 灯箱 / 滚动动画
│   ├── js/data.js        内容数据 ← 唯一发布入口
│   ├── images/           图片（已转 WebP）
│   └── favicon.svg
└── README.md
```

---

## 发布一条图片

1. 把图片放进 `assets/images/`，**先压成 WebP**（长边 ≤1600px，质量 80）：

```bash
# 单张
convert 原图.png -resize '1600x1600>' -strip -quality 82 assets/images/名字.webp
# 批量
for f in *.png *.jpg; do n="${f%.*}"; convert "$f" -resize '1600x1600>' -strip -quality 82 "assets/images/$n.webp"; done
```

2. 打开 `assets/js/data.js`，在 `window.SITE_IMAGES` 数组最前面加一条（越靠前越显眼，首页只展示前 3 张）：

```js
{
  src: "assets/images/名字.webp",
  title: "雾里的森林",
  cap: "一句你会想留下的话。",
  date: "2026.11.26"
}
```

3. 提交推送：

```bash
git add funny && git commit -m "新增图片：名字" && git push
```

Pages 大约 20–60 秒后更新。

---

## 发布一篇小说

在 `assets/js/data.js` 的 `window.SITE_NOVELS` 数组最前面加一条。正文用段落数组，一段一个字符串，不要带 HTML 标签：

```js
{
  id: "n4",                       // 唯一 id，阅读页地址就是 novel.html?id=n4
  tag: "短篇 · 梦境",              // 卡片顶部的小字分类
  title: "标题",
  date: "2026.11.27",
  words: "约 600 字",
  excerpt: "列表页展示的一小段开头。",
  body: [
    "第一段。",
    "第二段。"
  ]
}
```

---

## 配色（改主题只动这里）

`assets/css/style.css` 顶部：

| 变量 | 色值 | 用途 |
| --- | --- | --- |
| `--cream-green` | `#D8E6D0` | 主色，按钮 / 强调 |
| `--paper` | `#F8F7F2` | 卡片奶白 |
| `--deep` | `#161F1B` | 暗调森林底 |
| `--gold` | `#C9B98A` | 烫金细线、小字 |
| `--pink` `--blue` | `#EBD3D6` `#CBD9E0` | 云霞粉 / 空气蓝（胶带用） |

字体：标题走 `--serif`（宋体族），正文走 `--sans`（系统无衬线）。没有外链字体，国内打开不用等。

---

## 存储占用参考

5 张 WebP 合计约 **460 KB**，整个站点目录 **≈550 KB**。
GitHub Pages：单站 1 GB、每月 100 GB 流量 → 目前用掉不到 0.05 %。
