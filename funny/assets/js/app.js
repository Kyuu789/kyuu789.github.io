/* =========================================================
   自留地 · 交互脚本
   ========================================================= */

(function () {
  "use strict";

  var IMAGES = window.SITE_IMAGES || [];
  var NOVELS = window.SITE_NOVELS || [];
  var PAPER_TAPES = ["tape t1", "tape t2", "tape t3"];

  /* ---------- 工具 ---------- */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  /* ---------- 图片卡片 ---------- */
  function imageCard(item, index, onClick) {
    var card = el("article", "g-card reveal");
    var paper = el("div", "paper");
    var tape = el("div", PAPER_TAPES[index % PAPER_TAPES.length]);
    paper.appendChild(tape);
    var inner = el("div", "paper-inner");
    var shot = el("div", "g-shot");

    var img = new Image();
    img.loading = "lazy";
    img.decoding = "async";
    img.src = item.src;
    img.alt = item.title || "";
    shot.appendChild(img);

    var meta = el("div", "g-meta");
    meta.appendChild(el("div", "g-title", escapeHtml(item.title || "")));
    if (item.cap) meta.appendChild(el("p", "g-cap", escapeHtml(item.cap)));
    meta.appendChild(el("div", "g-date", escapeHtml(item.date || "")));

    inner.appendChild(shot);
    inner.appendChild(meta);
    paper.appendChild(inner);
    card.appendChild(paper);

    if (onClick) {
      card.addEventListener("click", function () { onClick(index); });
    }
    return card;
  }

  /* ---------- 小说卡片 ---------- */
  function novelCard(n) {
    var a = el("a", "n-card reveal");
    a.href = "novel.html?id=" + encodeURIComponent(n.id);
    var paper = el("div", "paper");
    paper.appendChild(el("div", "tape t2"));
    var inner = el("div", "paper-inner");
    inner.appendChild(el("div", "n-tag", escapeHtml(n.tag || "")));
    inner.appendChild(el("h3", "n-title", escapeHtml(n.title || "")));
    inner.appendChild(el("p", "n-exc", escapeHtml(n.excerpt || "")));
    var foot = el("div", "n-foot");
    foot.appendChild(el("span", "", escapeHtml((n.date || "") + " · " + (n.words || ""))));
    foot.appendChild(el("span", "n-more", "阅读全文"));
    inner.appendChild(foot);
    paper.appendChild(inner);
    a.appendChild(paper);
    return a;
  }

  /* ---------- 灯箱 ---------- */
  var lb, lbImg, lbTitle, lbCap, lbIndex = 0, lbItems = [];

  function buildLightbox() {
    lb = el("div", "lightbox");
    lb.innerHTML =
      '<button class="lb-close" aria-label="关闭">✕</button>' +
      '<button class="lb-nav lb-prev" aria-label="上一张">‹</button>' +
      '<button class="lb-nav lb-next" aria-label="下一张">›</button>' +
      '<div class="lb-inner"><img alt=""><div class="lb-cap"><strong></strong><span></span></div></div>';
    document.body.appendChild(lb);
    lbImg = lb.querySelector("img");
    lbTitle = lb.querySelector(".lb-cap strong");
    lbCap = lb.querySelector(".lb-cap span");

    lb.querySelector(".lb-close").addEventListener("click", close);
    lb.querySelector(".lb-prev").addEventListener("click", function (e) { e.stopPropagation(); step(-1); });
    lb.querySelector(".lb-next").addEventListener("click", function (e) { e.stopPropagation(); step(1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });

    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    });
  }

  function openLightbox(items, index) {
    if (!lb) buildLightbox();
    lbItems = items;
    lbIndex = index;
    paint();
    lb.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function paint() {
    var it = lbItems[lbIndex];
    if (!it) return;
    lbImg.src = it.src;
    lbImg.alt = it.title || "";
    lbTitle.textContent = it.title || "";
    lbCap.textContent = (it.cap || "") + (it.date ? "  ·  " + it.date : "");
  }

  function step(d) {
    if (!lbItems.length) return;
    lbIndex = (lbIndex + d + lbItems.length) % lbItems.length;
    paint();
  }

  function close() {
    lb.classList.remove("open");
    document.body.style.overflow = "";
  }

  /* ---------- 渲染 ---------- */
  function mountGallery(selector, items, limit) {
    var host = document.querySelector(selector);
    if (!host) return;
    var shown = limit ? items.slice(0, limit) : items;
    shown.forEach(function (item, i) {
      host.appendChild(imageCard(item, i, function () { openLightbox(shown, i); }));
    });
  }

  function mountNovels(selector, items, limit) {
    var host = document.querySelector(selector);
    if (!host) return;
    var shown = limit ? items.slice(0, limit) : items;
    shown.forEach(function (n) { host.appendChild(novelCard(n)); });
  }

  /* ---------- 阅读页 ---------- */
  function initReader() {
    var host = document.getElementById("reader-host");
    if (!host) return;
    var id = new URLSearchParams(location.search).get("id") || (NOVELS[0] && NOVELS[0].id);
    var n = NOVELS.filter(function (x) { return x.id === id; })[0] || NOVELS[0];
    if (!n) {
      host.innerHTML = '<p style="color:#888">还没有内容。</p>';
      return;
    }
    document.title = n.title + " · 自留地";

    var paras = (n.body || []).map(function (p) { return "<p>" + escapeHtml(p) + "</p>"; }).join("");

    host.innerHTML =
      '<div class="paper reader-paper">' +
        '<div class="tape t1"></div>' +
        '<div class="paper-inner">' +
          '<div class="r-tag">' + escapeHtml(n.tag || "") + '</div>' +
          '<h1 class="r-title">' + escapeHtml(n.title) + '</h1>' +
          '<div class="r-meta">' + escapeHtml(n.date || "") + '  ·  ' + escapeHtml(n.words || "") + '</div>' +
          '<div class="r-rule"></div>' +
          '<div class="r-body">' + paras + '</div>' +
          '<div class="r-end">· 完 ·</div>' +
        '</div>' +
      '</div>';
  }

  /* ---------- 导航高亮 ---------- */
  function initNav() {
    var page = document.body.getAttribute("data-page");
    if (!page) return;
    document.querySelectorAll(".nav-links a").forEach(function (a) {
      if (a.getAttribute("data-nav") === page) a.classList.add("active");
    });
  }

  /* ---------- 滚动出现 ---------- */
  function initReveal() {
    var nodes = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      nodes.forEach(function (n) { n.classList.add("on"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("on");
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    nodes.forEach(function (n, i) {
      n.style.transitionDelay = (Math.min(i, 6) * 60) + "ms";
      io.observe(n);
    });
  }

  /* ---------- 启动 ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    mountGallery("#home-gallery", IMAGES, 3);
    mountNovels("#home-novels", NOVELS, 2);
    mountGallery("#gallery-host", IMAGES, 0);
    mountNovels("#novels-host", NOVELS, 0);
    initReader();
    initReveal();
  });
})();
