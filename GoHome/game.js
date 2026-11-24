(function () {
  "use strict";

  const LEVEL_SECONDS = 30;
  const LANE_POS = [0.2, 0.5, 0.8];
  const BEST_KEY = "gohome.metro.best.v1";
  const SOUND_KEY = "gohome.metro.sound.v1";

  const startScreen = document.getElementById("startScreen");
  const gameScreen = document.getElementById("gameScreen");
  const endScreen = document.getElementById("endScreen");
  const startBtn = document.getElementById("startBtn");
  const againBtn = document.getElementById("againBtn");
  const nextBtn = document.getElementById("nextBtn");
  const soundBtn = document.getElementById("soundBtn");
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const progressFill = document.getElementById("progressFill");
  const timeLeftEl = document.getElementById("timeLeft");
  const heartEls = [...document.querySelectorAll("#heartRow span")];
  const foodCountEl = document.getElementById("foodCount");
  const fatFill = document.getElementById("fatFill");
  const fatText = document.getElementById("fatText");
  const fatRow = document.querySelector(".fat-row");
  const hitFlash = document.getElementById("hitFlash");
  const laneHint = document.getElementById("laneHint");
  const bestLine = document.getElementById("bestLine");

  const endTag = document.getElementById("endTag");
  const endTitle = document.getElementById("endTitle");
  const endHero = document.getElementById("endHero");
  const endText = document.getElementById("endText");
  const starRow = document.getElementById("starRow");
  const statFood = document.getElementById("statFood");
  const statFat = document.getElementById("statFat");
  const statHearts = document.getElementById("statHearts");

  /* ---------- 素材 ---------- */
  function loadImg(src) {
    const img = new Image();
    img.src = src;
    return img;
  }

  const heroStage = [
    loadImg("assets/hero/fat-1.png"),
    loadImg("assets/hero/fat-2.png"),
    loadImg("assets/hero/fat-3.png")
  ];
  const FOODS = [
    { key: "jianbing", name: "煎饼果子", weight: 8, points: 12, src: "assets/icons/jianbing.png" },
    { key: "huoshao", name: "驴肉火烧", weight: 13, points: 18, src: "assets/icons/huoshao.png" },
    { key: "milktea", name: "奶茶", weight: 10, points: 14, src: "assets/icons/milktea.png" },
    { key: "noodles", name: "泡面", weight: 17, points: 24, src: "assets/icons/noodles.png" },
    { key: "tanghulu", name: "糖葫芦", weight: 6, points: 9, src: "assets/icons/tanghulu.png" }
  ].map(f => ({ ...f, img: loadImg(f.src) }));

  /* ---------- 音频 ---------- */
  let audioCtx = null;
  let soundOn = localStorage.getItem(SOUND_KEY) !== "off";
  let bgmTimer = 0;
  let bgmStep = 0;
  let bgmNext = 0;

  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    return audioCtx;
  }

  function beep(freq, type, dur, vol, when) {
    if (!soundOn) return;
    const ac = ensureAudio();
    if (!ac) return;
    const t = when || ac.currentTime;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function sfxEat(steal) {
    beep(steal ? 1040 : 860, "square", 0.06, 0.13);
    beep(steal ? 1320 : 1120, "square", 0.07, 0.11, audioCtx ? audioCtx.currentTime + 0.055 : 0);
  }
  function sfxHit() {
    beep(130, "sawtooth", 0.16, 0.12);
    beep(90, "triangle", 0.22, 0.08);
  }
  function sfxBurp() {
    const ac = audioCtx;
    if (!ac) return;
    beep(110, "sine", 0.35, 0.11, ac.currentTime + 0.02);
    beep(78, "triangle", 0.3, 0.07, ac.currentTime + 0.2);
  }
  function sfxWin() {
    const ac = ensureAudio();
    const t = ac ? ac.currentTime : 0;
    [660, 880, 1320].forEach((f, i) => beep(f, "square", 0.18, 0.1, t + i * 0.12));
  }

  function startBgm() {
    stopBgm();
    if (!soundOn) return;
    const ac = ensureAudio();
    if (!ac) return;
    const notes = [55, 57, 60, 64, 60, 57, 55, 52];
    bgmStep = 0;
    bgmNext = ac.currentTime + 0.2;
    bgmTimer = setInterval(() => {
      if (!soundOn || !audioCtx) return;
      while (bgmNext < audioCtx.currentTime + 0.8) {
        const midi = notes[bgmStep % notes.length];
        beep(440 * Math.pow(2, (midi - 69) / 12), "triangle", 0.42, 0.028, bgmNext);
        if (bgmStep % 2 === 0) {
          beep(440 * Math.pow(2, (midi - 12 - 69) / 12), "sine", 0.5, 0.018, bgmNext);
        }
        bgmStep += 1;
        bgmNext += 0.5;
      }
    }, 250);
  }
  function stopBgm() {
    clearInterval(bgmTimer);
    bgmTimer = 0;
  }

  /* ---------- 画布 ---------- */
  let W = 390, H = 560;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = rect.width;
    H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);

  /* ---------- 游戏状态 ---------- */
  const state = {
    running: false,
    paused: false,
    elapsed: 0,
    hearts: 3,
    fat: 0,
    eaten: 0,
    score: 0,
    lane: 1,
    px: 0,
    targetX: 0,
    invuln: 0,
    obstacleTimer: 0,
    foodTimer: 0,
    obstacles: [],
    foods: [],
    pops: [],
    shake: 0,
    lastFrame: 0
  };

  function laneX(i) {
    return W * LANE_POS[i];
  }
  const playerY = () => H - 94;

  function reset() {
    state.running = false;
    state.paused = false;
    state.elapsed = 0;
    state.hearts = 3;
    state.fat = 0;
    state.eaten = 0;
    state.score = 0;
    state.lane = 1;
    state.px = laneX(1);
    state.targetX = state.px;
    state.invuln = 0;
    state.obstacleTimer = 0.55;
    state.foodTimer = 0.9;
    state.obstacles = [];
    state.foods = [];
    state.pops = [];
    state.shake = 0;
    state.lastFrame = 0;
    updateHud();
  }

  function updateHud() {
    const t = Math.max(0, Math.ceil(LEVEL_SECONDS - state.elapsed));
    timeLeftEl.textContent = t + "s";
    progressFill.style.transform = "scaleX(" + Math.min(1, state.elapsed / LEVEL_SECONDS).toFixed(3) + ")";
    heartEls.forEach((el, i) => el.classList.toggle("off", i >= state.hearts));
    foodCountEl.textContent = "🍜 " + state.eaten;
    const fat = Math.min(100, state.fat);
    fatFill.style.width = fat.toFixed(1) + "%";
    fatText.textContent = fat < 30 ? "正常" : fat < 58 ? "微胖" : fat < 78 ? "有点沉" : fat < 94 ? "快走不动" : "撑住了";
    fatRow.classList.toggle("danger", fat >= 78);
  }

  function setLane(i) {
    if (!state.running) return;
    state.lane = i;
    state.targetX = laneX(i);
    laneHint.classList.add("fade");
    beep(520, "triangle", 0.04, 0.035);
  }

  function addPop(text, x, y, color) {
    state.pops.push({ text, x, y, color: color || "#ffe286", life: 1.1, max: 1.1 });
  }

  function spawnObstacles() {
    const p = state.elapsed / LEVEL_SECONDS;
    const count = Math.random() < 0.3 + p * 0.18 ? 2 : 1;
    const lanes = [0, 1, 2].sort(() => Math.random() - 0.5).slice(0, count);
    const speed = 145 + p * 82;
    lanes.forEach(lane => {
      const luggage = Math.random() < 0.22;
      state.obstacles.push({
        lane,
        x: laneX(lane),
        y: -58,
        speed,
        luggage,
        coat: ["#3f6f8f", "#7b5a86", "#8a6a43", "#37695f", "#a45b58"][Math.floor(Math.random() * 5)],
        hit: false
      });
    });
  }

  function spawnFood() {
    const def = FOODS[Math.floor(Math.random() * FOODS.length)];
    const steal = Math.random() < 0.34;
    const lane = Math.floor(Math.random() * 3);
    state.foods.push({
      def,
      steal,
      lane,
      x: laneX(lane),
      y: -46,
      speed: 145 + (state.elapsed / LEVEL_SECONDS) * 82,
      taken: false,
      wobble: Math.random() * Math.PI * 2
    });
  }

  function hitPlayer(obs) {
    if (state.invuln > 0 || !state.running) return;
    obs.hit = true;
    state.hearts -= 1;
    state.invuln = 1.25;
    state.shake = 0.35;
    sfxHit();
    hitFlash.classList.add("on");
    setTimeout(() => hitFlash.classList.remove("on"), 180);
    updateHud();
    if (state.hearts <= 0) finish("hearts");
  }

  function eatFood(food) {
    food.taken = true;
    const def = food.def;
    const gain = Math.round(def.points * (food.steal ? 1.8 : 1));
    state.eaten += 1;
    state.score += gain;
    state.fat = Math.min(100, state.fat + def.weight * (food.steal ? 1.15 : 1));
    addPop((food.steal ? "抢到" : "吃了") + def.name + " +" + gain, food.x, food.y, food.steal ? "#ffb0a2" : "#ffe286");
    addPop("+" + Math.round(def.weight) + " 斤", food.x, food.y + 24, "#ff9d72");
    sfxEat(food.steal);
    if (state.fat >= 100) {
      updateHud();
      finish("fat");
      return;
    }
    if (state.fat >= 40 && state.fat - def.weight < 40) sfxBurp();
    updateHud();
  }

  function update(dt) {
    if (!state.running) return;
    dt = Math.min(dt, 0.05);

    state.elapsed += dt;
    if (state.elapsed >= LEVEL_SECONDS) {
      finish("win");
      return;
    }

    if (state.invuln > 0) state.invuln -= dt;
    if (state.shake > 0) state.shake -= dt;

    const follow = 1 - Math.exp(-dt * (15 - state.fat * 0.07));
    state.px += (state.targetX - state.px) * follow;

    state.obstacleTimer -= dt;
    if (state.obstacleTimer <= 0) {
      spawnObstacles();
      const p = state.elapsed / LEVEL_SECONDS;
      state.obstacleTimer = (0.92 - p * 0.3) * (0.88 + Math.random() * 0.3);
    }

    state.foodTimer -= dt;
    if (state.foodTimer <= 0) {
      spawnFood();
      state.foodTimer = 1.25 + Math.random() * 1.05;
    }

    const py = playerY();
    const p = state.elapsed / LEVEL_SECONDS;

    state.obstacles.forEach(o => {
      o.y += o.speed * dt;
      const dx = Math.abs(o.x - state.px);
      const dy = Math.abs(o.y - py);
      const laneW = W / 3;
      if (!o.hit && dx < laneW * 0.42 && dy < 46) hitPlayer(o);
    });
    state.obstacles = state.obstacles.filter(o => o.y < H + 90 && !o.hit);

    state.foods.forEach(f => {
      f.y += f.speed * dt;
      const dx = Math.abs(f.x - state.px);
      const dy = Math.abs(f.y - py + 6);
      if (!f.taken && dx < W / 3 * 0.42 && dy < 40) eatFood(f);
    });
    state.foods = state.foods.filter(f => f.y < H + 70 && !f.taken);

    state.pops.forEach(o => {
      o.y -= 42 * dt;
      o.life -= dt;
    });
    state.pops = state.pops.filter(o => o.life > 0);

    updateHud();
  }

  /* ---------- 绘制 ---------- */
  function drawBackground() {
    const scroll = state.elapsed * (145 + (state.elapsed / LEVEL_SECONDS) * 40);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#15544a");
    g.addColorStop(0.55, "#0f3d35");
    g.addColorStop(1, "#082821");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // 地面砖缝
    ctx.strokeStyle = "rgba(190,230,205,.09)";
    ctx.lineWidth = 1;
    const tile = 74;
    const off = scroll % tile;
    for (let y = -tile + off; y < H + tile; y += tile) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // 三条通道
    const laneW = W / 3;
    ctx.fillStyle = "rgba(255,255,255,.028)";
    ctx.fillRect(0, 0, laneW, H);
    ctx.fillRect(laneW * 2, 0, laneW, H);

    ctx.save();
    ctx.setLineDash([18, 16]);
    ctx.lineDashOffset = -scroll * 0.7;
    ctx.strokeStyle = "rgba(255,214,120,.32)";
    ctx.lineWidth = 3;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(laneW * i, 0);
      ctx.lineTo(laneW * i, H);
      ctx.stroke();
    }
    ctx.restore();

    // 两侧站台柱子
    ctx.fillStyle = "rgba(5,24,20,.55)";
    ctx.fillRect(0, 0, 8, H);
    ctx.fillRect(W - 8, 0, 8, H);

    // 顶部站牌
    const boardW = Math.min(W - 34, 330);
    const boardH = 38;
    const bx = (W - boardW) / 2;
    ctx.save();
    ctx.fillStyle = "rgba(255,247,227,.94)";
    roundRect(bx, 46, boardW, boardH, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(10,35,29,.85)";
    ctx.lineWidth = 3;
    roundRect(bx, 46, boardW, boardH, 10);
    ctx.stroke();
    ctx.fillStyle = "#133a31";
    ctx.font = "900 12px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("苏州地铁", bx + 12, 66);
    ctx.fillStyle = "#d6761f";
    ctx.fillText("→ 苏州北站", bx + boardW - 92, 66);
    // 小站灯
    ctx.fillStyle = "#ffca5c";
    ctx.beginPath();
    ctx.arc(bx + boardW - 14, 65, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 立柱广告，制造纵深感
    for (let i = 0; i < 2; i++) {
      const y = ((scroll * 0.6 + i * 360) % (H + 360)) - 180;
      ctx.fillStyle = "rgba(140,196,170,.18)";
      ctx.fillRect(i === 0 ? 18 : W - 38, y, 20, 90);
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawObstacle(o) {
    const y = o.y;
    ctx.save();
    ctx.translate(o.x, y);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#10241f";
    ctx.lineJoin = "round";

    ctx.fillStyle = "rgba(0,0,0,.25)";
    ctx.beginPath();
    ctx.ellipse(0, 24, 20, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    if (o.luggage) {
      ctx.fillStyle = "#b47744";
      roundRect(-14, -30, 28, 48, 7);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#10241f";
      ctx.beginPath();
      ctx.moveTo(-6, -30);
      ctx.lineTo(-6, -40);
      ctx.lineTo(6, -40);
      ctx.lineTo(6, -30);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.2)";
      ctx.fillRect(-9, -24, 5, 26);
    } else {
      // 赶路乘客（俯视）
      ctx.fillStyle = o.coat;
      roundRect(-17, -15, 34, 38, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#e8b48b";
      ctx.beginPath();
      ctx.arc(0, -22, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#2a211c";
      ctx.beginPath();
      ctx.arc(0, -25, 10, Math.PI, 0);
      ctx.fill();

      // 手机
      if (o.coat !== "#8a6a43") {
        ctx.fillStyle = "#d6e5ea";
        roundRect(12, -10, 7, 12, 2);
        ctx.fill();
        ctx.strokeStyle = "#10241f";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawFood(f) {
    const bob = Math.sin(state.elapsed * 5 + f.wobble) * 3;
    const y = f.y + bob;
    ctx.save();
    ctx.translate(f.x, y);

    ctx.fillStyle = "rgba(0,0,0,.22)";
    ctx.beginPath();
    ctx.ellipse(0, 27, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    if (f.steal) {
      ctx.fillStyle = "rgba(255,220,140,.18)";
      ctx.beginPath();
      ctx.arc(0, 0, 31, 0, Math.PI * 2);
      ctx.fill();
    }

    const img = f.def.img;
    if (img.complete && img.naturalWidth) {
      const h = 46, w = h * (img.naturalWidth / img.naturalHeight);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
    } else {
      ctx.fillStyle = "#ffd36e";
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
    }

    if (f.steal) {
      ctx.fillStyle = "#d84a3e";
      roundRect(-17, -36, 34, 16, 8);
      ctx.fill();
      ctx.strokeStyle = "#6e231d";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#fff4e2";
      ctx.font = "900 10px 'PingFang SC','Microsoft YaHei',sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("抢来的", 0, -27);
    }
    ctx.restore();
  }

  function drawHero() {
    const stage = state.fat < 34 ? 0 : state.fat < 72 ? 1 : 2;
    const img = heroStage[stage];
    const fatScale = 1 + state.fat * 0.0032;
    const h = 112 * fatScale;
    const w = img.naturalWidth ? h * (img.naturalWidth / img.naturalHeight) : h * 0.58;
    const bob = Math.sin(state.elapsed * (stage === 2 ? 6 : 10)) * (stage === 2 ? 2 : 4);
    const py = playerY() + bob;

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.3)";
    ctx.beginPath();
    ctx.ellipse(state.px, playerY() + 40, w * 0.34, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    if (state.invuln > 0 && Math.floor(state.invuln * 12) % 2 === 0) ctx.globalAlpha = 0.42;
    if (img.complete && img.naturalWidth) {
      ctx.drawImage(img, state.px - w / 2, py - h + 36, w, h);
    } else {
      ctx.fillStyle = "#8ac4df";
      roundRect(state.px - w / 2, py - h + 36, w, h, 18);
      ctx.fill();
    }
    ctx.restore();

    if (stage === 2) {
      // 胖到冒汗
      ctx.font = "700 14px 'PingFang SC',sans-serif";
      ctx.fillStyle = "rgba(205,242,255,.8)";
      ctx.textAlign = "center";
      ctx.fillText("…", state.px + w * 0.45, py - h + 24);
    }
  }

  function drawPops() {
    state.pops.forEach(o => {
      const a = Math.min(1, o.life / 0.45);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = "900 13px 'PingFang SC','Microsoft YaHei',sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(6,25,21,.75)";
      ctx.strokeText(o.text, o.x, o.y);
      ctx.fillStyle = o.color;
      ctx.fillText(o.text, o.x, o.y);
      ctx.restore();
    });
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (state.shake > 0) {
      const s = Math.sin(state.shake * 40) * 5;
      ctx.translate(s, Math.cos(state.shake * 33) * 3);
    }
    drawBackground();
    state.foods.forEach(drawFood);
    state.obstacles.forEach(drawObstacle);
    drawHero();
    drawPops();
    ctx.restore();
  }

  let rafId = 0;
  function loop(t) {
    if (!state.lastFrame) state.lastFrame = t;
    const dt = (t - state.lastFrame) / 1000;
    state.lastFrame = t;
    if (state.running) update(dt);
    render();
    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);

  /* ---------- 流程 ---------- */
  function startGame() {
    const ac = ensureAudio();
    if (ac && ac.state === "suspended") ac.resume().catch(() => {});
    startScreen.classList.add("hidden");
    endScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    requestAnimationFrame(() => {
      resize();
      reset();
      state.running = true;
      startBgm();
      laneHint.classList.remove("fade");
      setTimeout(() => laneHint.classList.add("fade"), 2600);
    });
  }

  function starHtml(n) {
    return [0, 1, 2].map(i => '<span class="' + (i < n ? "" : "dim") + '">★</span>').join("");
  }

  function finish(reason) {
    if (!state.running) return;
    state.running = false;
    stopBgm();
    const fat = Math.round(state.fat);
    let stars = 0;
    let title = "";
    let text = "";
    let heroSrc = "assets/hero/fat-3.png";

    if (reason === "win") {
      stars = fat <= 35 && state.hearts === 3 ? 3 : fat < 70 ? 2 : 1;
      title = "赶上了！";
      text = "车门在身后合上。一路吃了 " + state.eaten + " 口，体重到 " + fat + "%，好在还是赶上了。";
      heroSrc = fat < 40 ? "assets/hero/stand-5.png" : fat < 80 ? "assets/hero/fat-2.png" : "assets/hero/fat-3.png";
      sfxWin();
    } else if (reason === "fat") {
      title = "吃太饱，走不动了";
      text = "肚子卡在闸机口，行李箱还在，下一班车已经开走了。少吃两口，真的。";
      heroSrc = "assets/hero/fat-3.png";
    } else {
      title = "被挤下站台了";
      text = "早高峰的人潮太猛，冲了三次都没挤上车。先缓缓，再来一趟。";
      heroSrc = "assets/hero/stand-3.png";
    }

    endTag.textContent = reason === "win" ? "第一程 · 地铁 · 完成" : "第一程 · 地铁 · 失败";
    const stop1 = document.getElementById("endStop1");
    stop1.classList.toggle("active", reason === "win");
    stop1.querySelector("span").textContent = reason === "win" ? "完成" : "未完成";
    endTitle.textContent = title;
    endText.textContent = text;
    endHero.src = heroSrc;
    starRow.innerHTML = starHtml(stars);
    statFood.textContent = state.eaten;
    statFat.textContent = fat + "%";
    statHearts.textContent = Math.max(0, state.hearts);

    const best = Math.max(Number(localStorage.getItem(BEST_KEY) || 0), state.score);
    localStorage.setItem(BEST_KEY, String(best));
    updateBestLine();

    gameScreen.classList.add("hidden");
    endScreen.classList.remove("hidden");
  }

  function updateBestLine() {
    const best = Number(localStorage.getItem(BEST_KEY) || 0);
    bestLine.textContent = best > 0 ? "本程最高分：" + best + " 分" : "";
  }

  /* ---------- 输入 ---------- */
  canvas.addEventListener("pointerdown", ev => {
    if (!state.running) return;
    const rect = canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) / rect.width;
    setLane(x < 0.34 ? 0 : x > 0.66 ? 2 : 1);
  });

  document.querySelectorAll(".lane-buttons button").forEach(btn => {
    btn.addEventListener("click", () => setLane(Number(btn.dataset.lane)));
  });

  const KEY_LANES = { ArrowLeft: 0, ArrowUp: 1, ArrowRight: 2, a: 0, s: 1, d: 2, "1": 0, "2": 1, "3": 2 };
  window.addEventListener("keydown", ev => {
    if (!state.running) return;
    const lane = KEY_LANES[ev.key] !== undefined ? KEY_LANES[ev.key] : KEY_LANES[ev.key.toLowerCase()];
    if (lane !== undefined) {
      ev.preventDefault();
      setLane(lane);
    }
  });

  document.addEventListener("pointerdown", () => {
    if (soundOn) ensureAudio();
  }, { passive: true });

  startBtn.addEventListener("click", startGame);
  againBtn.addEventListener("click", startGame);
  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    localStorage.setItem(SOUND_KEY, soundOn ? "on" : "off");
    soundBtn.textContent = soundOn ? "🔊" : "🔇";
    if (soundOn) {
      ensureAudio();
      beep(760, "triangle", 0.07, 0.08);
      if (state.running) startBgm();
    } else {
      stopBgm();
    }
  });

  soundBtn.textContent = soundOn ? "🔊" : "🔇";
  updateBestLine();
  resize();
})();
