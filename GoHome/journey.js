(function () {
  "use strict";

  const LEGS = [
    {
      id: "hsr",
      name: "第二程 · 高铁检票",
      route: "苏州北 → 邯郸东",
      icon: "assets/icons/hsr.webp",
      bg: "assets/scenes/hsr-gate.webp",
      bgPos: "center 38%",
      endBg: "assets/scenes/hsr-interior.webp",
      tag: "第二程 · 高铁检票 · 完成",
      endTitle: "检票进站了",
      endText: "连刷五道闸机，票面记得住、位置也跟得上。你拖着箱子冲进站台，车厢里已经有人在放行李了。",
      next: "下一程 · 拼车",
      failText: "连着排错闸机，车票刷不过去。广播已经在催这班车了。"
    },
    {
      id: "bus",
      name: "第三程 · 邯郸东拼车",
      route: "邯郸东站 → 县城",
      icon: "assets/icons/bus.webp",
      bg: "assets/scenes/handan-station.webp",
      bgPos: "center 45%",
      endBg: "assets/scenes/handan-station.webp",
      tag: "第三程 · 拼车砍价 · 完成",
      endTitle: "30 块谈拢，挤上车",
      endText: "司机嘟囔着“真会砍”，还是把你和箱子塞进了后座。车里一股暖风声。",
      next: "下一程 · 乡村摆渡车",
      failText: "连着被宰、被绕路，司机一脚油门走了。天黑前是到不了县城了。"
    },
    {
      id: "van",
      name: "第四程 · 山路摆渡",
      route: "县城 → 村口",
      icon: "assets/icons/van.webp",
      bg: "assets/scenes/mountain-road.webp",
      bgPos: "18% center",
      endBg: "assets/scenes/mountain-road.webp",
      tag: "第四程 · 山路摆渡 · 完成",
      endTitle: "山路没翻车",
      endText: "面包车在盘山路上拐了十几个弯，箱子总算没从车顶滑下去。",
      next: "最后一程 · 夜路进村",
      failText: "箱子在弯道上翻倒，司机只能停车重新捆。天已经黑透了。"
    },
    {
      id: "walk",
      name: "第五程 · 村口夜路",
      route: "村口 → 家",
      icon: "assets/icons/walk.webp",
      bg: "assets/scenes/village-night-road.webp",
      bgPos: "center -210px",
      endBg: "assets/scenes/village-night-road.webp",
      tag: "第五程 · 夜路进村 · 完成",
      endTitle: "到家了",
      endText: "院门虚掩着，屋里的灯亮着。妈妈在灶台前回头，第一句还是“怎么又瘦了”。",
      next: "进家门",
      failText: "狗越追越近，你拖着箱子跑岔了路。村口的灯还在远处。"
    }
  ];

  const LEG_SECONDS = 5;
  const SOUND_KEY = "gohome.journey.sound";

  const $ = id => document.getElementById(id);
  const jStart = $("jStart"), jGame = $("jGame"), jLegEnd = $("jLegEnd"), jFinal = $("jFinal"), jFail = $("jFail");
  const scenePhoto = $("scenePhoto"), legIcon = $("legIcon"), legName = $("legName"), legRoute = $("legRoute");
  const miniRoute = $("miniRoute"), jHearts = $("jHearts").children;
  const timerNum = $("timerNum"), timerFill = $("timerFill");
  const missionKicker = $("missionKicker"), missionTitle = $("missionTitle"), missionDesc = $("missionDesc");
  const roundTag = $("roundTag"), stageArea = $("stageArea"), feedback = $("feedback");
  const dangerFlash = $("dangerFlash"), jGameEl = $("jGame");
  const jSoundBtn = $("jSoundBtn");

  const legTag = $("legTag"), legEndIcon = $("legEndIcon"), legEndTitle = $("legEndTitle"), legEndText = $("legEndText");
  const legStars = $("legStars"), legMiss = $("legMiss"), legHearts = $("legHearts"), legTime = $("legTime"), nextLegBtn = $("nextLegBtn");
  const finalText = $("finalText"), finalStars = $("finalStars"), finalMiss = $("finalMiss");
  const failTag = $("failTag"), failTitle = $("failTitle"), failHero = $("failHero"), failText = $("failText");
  const retryLeg = $("retryLeg"), backStart = $("backStart");

  const state = {
    leg: 0,
    hearts: 3,
    miss: 0,
    totalMiss: 0,
    token: 0,
    timerId: 0,
    timerTotal: 0,
    timerLeft: 0,
    legStart: 0,
    round: 0,
    score: 0,
    soundOn: localStorage.getItem(SOUND_KEY) !== "off"
  };

  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    return audioCtx;
  }
  function beep(freq, type, dur, vol, delay) {
    if (!state.soundOn) return;
    const ac = ensureAudio();
    if (!ac) return;
    const t = ac.currentTime + (delay || 0);
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }
  const sfxGood = () => { beep(900, "square", 0.07, 0.1); beep(1220, "square", 0.08, 0.08, 0.06); };
  const sfxBad = () => { beep(150, "sawtooth", 0.18, 0.12); };
  const sfxWin = () => [620, 880, 1120, 1320].forEach((f, i) => beep(f, "square", 0.16, 0.09, i * 0.09));
  const sfxDog = () => { beep(180, "sawtooth", 0.1, 0.12); beep(120, "sawtooth", 0.14, 0.1, 0.1); };

  function show(screen) {
    [jStart, jGame, jLegEnd, jFinal, jFail].forEach(s => s.classList.add("hidden"));
    screen.classList.remove("hidden");
    screen.scrollTop = 0;
  }

  function leg() { return LEGS[state.leg]; }

  const sceneImages = {};
  function getScene(src) {
    if (!sceneImages[src]) {
      const img = new Image();
      img.src = src;
      sceneImages[src] = img;
    }
    return sceneImages[src];
  }
  function whenSceneReady(src, cb) {
    const img = getScene(src);
    let done = false;
    const go = () => { if (!done) { done = true; cb(); } };
    if (img.complete && img.naturalWidth) { go(); return; }
    img.addEventListener("load", go, { once: true });
    img.addEventListener("error", go, { once: true });
    setTimeout(go, 1800);
  }

  function updateMiniRoute() {
    [...miniRoute.children].forEach((el, i) => {
      el.className = "mini-stop";
      if (i <= state.leg) el.classList.add("done");
      if (i === state.leg + 1) el.classList.add("current");
    });
  }

  function updateHearts() {
    [...jHearts].forEach((el, i) => el.classList.toggle("off", i >= state.hearts));
  }

  function cancelStage() {
    state.token += 1;
    cancelAnimationFrame(state.timerId);
    state.timerId = 0;
  }

  function startTimer(seconds, onEnd) {
    cancelAnimationFrame(state.timerId);
    const token = state.token;
    state.timerTotal = seconds;
    state.timerLeft = seconds;
    const endAt = performance.now() + seconds * 1000;
    function frame(now) {
      if (token !== state.token) return;
      const left = Math.max(0, (endAt - now) / 1000);
      state.timerLeft = left;
      timerNum.textContent = left.toFixed(1).padStart(4, "0") + "s";
      timerFill.style.transform = "scaleX(" + (left / seconds).toFixed(4) + ")";
      if (left <= 0) {
        state.timerId = 0;
        onEnd();
        return;
      }
      state.timerId = requestAnimationFrame(frame);
    }
    state.timerId = requestAnimationFrame(frame);
  }

  function stopTimer() {
    cancelAnimationFrame(state.timerId);
    state.timerId = 0;
  }

  function setMission(kicker, title, desc, tag) {
    missionKicker.textContent = kicker;
    missionTitle.textContent = title;
    missionDesc.textContent = desc;
    roundTag.textContent = tag || "";
  }

  function hit(reason) {
    state.hearts -= 1;
    state.miss += 1;
    state.totalMiss += 1;
    updateHearts();
    sfxBad();
    feedback.textContent = reason || "被拦住了，掉一格体力";
    dangerFlash.classList.add("on");
    jGameEl.classList.add("shake");
    setTimeout(() => {
      dangerFlash.classList.remove("on");
      jGameEl.classList.remove("shake");
    }, 260);
    if (state.hearts <= 0) {
      failStage();
      return false;
    }
    return true;
  }

  function startJourney() {
    ensureAudio();
    state.leg = 0;
    state.totalMiss = 0;
    state.score = 0;
    show(jGame);
    loadLeg();
  }

  function loadLeg() {
    const l = leg();
    cancelStage();
    state.hearts = 3;
    state.miss = 0;
    state.round = 0;
    state.score = 0;
    state.legStart = performance.now();
    updateHearts();
    legIcon.src = l.icon;
    legName.textContent = l.name;
    legRoute.textContent = l.route;
    scenePhoto.style.backgroundImage = "url('" + l.bg + "')";
    scenePhoto.style.backgroundPosition = l.bgPos || "center";
    updateMiniRoute();
    setMission(l.name, "正在进站…", "等这一程的实景加载出来，计时才开始。", "");
    stageArea.innerHTML = '<div class="loading-scene">正在加载实景…</div>';
    feedback.textContent = "别急，站台已经在加载了。";
    const token = state.token;
    whenSceneReady(l.bg, () => {
      if (token === state.token) startStage();
    });
  }

  function startStage() {
    const l = leg();
    if (l.id === "hsr") stageHSR();
    else if (l.id === "bus") stageBus();
    else if (l.id === "van") stageBalance();
    else stageChase();
  }

  /* ---------- 第二程：高铁检票 ---------- */
  function stageHSR() {
    const rounds = 5;
    if (state.round >= rounds) return winLeg();
    const labels = ["14A", "15A", "16A", "17A", "18A", "19A"];
    const target = Math.floor(Math.random() * labels.length);
    const seconds = state.round < 2 ? 4.4 : 3.8;
    setMission(
      "第二程 · 高铁检票",
      "记住票面，找对闸机",
      "票面只亮 1 秒就被手挡住，闸机还会换位。记住口号，再点正确的闸机。",
      "第 " + (state.round + 1) + " / " + rounds + " 次"
    );
    stageArea.innerHTML =
      '<div class="ticket-stub"><div><small>G1571 · 苏州北 → 邯郸东</small><b>07 车 12A · 二等座</b></div><div class="ticket-gate" id="ticketGate">' + labels[target] + '</div></div>' +
      '<div class="gate-grid gate-grid-6">' +
      labels.map((x, i) => '<button class="gate-btn" data-i="' + i + '"><i></i><strong>' + x + '</strong><span>自动检票闸机</span></button>').join("") +
      '</div>';
    feedback.textContent = "盯住票面，只有 1 秒。";
    const hideTimer = setTimeout(() => {
      const gate = document.getElementById("ticketGate");
      if (!gate) return;
      gate.textContent = "??";
      gate.classList.add("memo");
      feedback.textContent = "票面挡住了，靠刚才的记忆。";
    }, 1000);
    const shuffleTimer = setTimeout(() => {
      const grid = stageArea.querySelector(".gate-grid");
      if (!grid) return;
      const order = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
      [...grid.children].forEach((el, i) => { el.style.order = order[i]; });
      feedback.textContent = "前面的人一挤，闸机换位了。";
    }, 1600);
    startTimer(seconds, () => {
      clearTimeout(hideTimer);
      clearTimeout(shuffleTimer);
      [...stageArea.querySelectorAll(".gate-btn")].forEach(b => b.disabled = true);
      feedback.textContent = "超时了，队尾重新排。";
      if (hit("犹豫太久，闸机口关了，掉一格体力")) setTimeout(stageHSR, 650);
    });
    [...stageArea.querySelectorAll(".gate-btn")].forEach(btn => {
      btn.addEventListener("click", () => {
        clearTimeout(hideTimer);
        clearTimeout(shuffleTimer);
        stopTimer();
        const picked = Number(btn.dataset.i);
        [...stageArea.querySelectorAll(".gate-btn")].forEach(b => b.disabled = true);
        if (picked === target) {
          btn.classList.add("right");
          sfxGood();
          feedback.textContent = "嘀——闸机开了，往站台走。";
          state.round += 1;
          if (state.round >= rounds) setTimeout(winLeg, 550);
          else setTimeout(stageHSR, 650);
        } else {
          btn.classList.add("wrong");
          const rightBtn = stageArea.querySelector('.gate-btn[data-i="' + target + '"]');
          if (rightBtn) rightBtn.classList.add("right");
          const gate = document.getElementById("ticketGate");
          if (gate) { gate.textContent = labels[target]; gate.classList.remove("memo"); }
          if (hit("排错队了，车票没刷上，掉一格体力")) setTimeout(stageHSR, 800);
        }
      });
    });
  }

  /* ---------- 第三程：邯郸东拼车砍价 ---------- */
  function stageBus() {
    const rounds = 3;
    if (state.round >= rounds) return winLeg();
    let price = 50 + 10 * Math.floor(Math.random() * 4);
    let patience = 6;
    const plate = "冀 D · " + (8700 + Math.floor(Math.random() * 180));
    setMission(
      "第三程 · 邯郸东拼车",
      "砍到 30 块再上车",
      "司机开价都虚高。每砍一次降 10 块、掉一格耐心；砍到 30 就成交，砍到 20 司机会翻脸。",
      "第 " + (state.round + 1) + " / " + rounds + " 辆"
    );
    stageArea.innerHTML =
      '<div class="haggle-wrap">' +
      '<div class="driver-line"><div class="plate">' + plate + '</div><img class="haggle-van" src="assets/icons/van.webp" alt="" /><div class="quote-box"><small>司机开价</small><b><span id="hagglePrice">' + price + '</span> 元</b></div></div>' +
      '<div class="patience-row"><span>司机耐心</span><div class="patience-dots" id="patienceDots">' + new Array(patience).fill("<i></i>").join("") + '</div></div>' +
      '<div class="haggle-btns"><button id="cutPrice">砍 10 块</button><button id="dealRide">30 就上车</button></div>' +
      '</div>';
    feedback.textContent = "司机说“县城 " + price + "，少一分不走”。";
    const cutBtn = $("cutPrice"), dealBtn = $("dealRide");
    function paint() {
      $("hagglePrice").textContent = price;
      $("patienceDots").innerHTML = new Array(Math.max(patience, 0)).fill("<i></i>").join("");
      const q = stageArea.querySelector(".quote-box");
      q.classList.remove("pop"); void q.offsetWidth; q.classList.add("pop");
    }
    function lose(msg) {
      stopTimer();
      cutBtn.disabled = true;
      dealBtn.disabled = true;
      if (hit(msg)) setTimeout(stageBus, 800);
    }
    function next() {
      state.round += 1;
      if (state.round >= rounds) setTimeout(winLeg, 550);
      else setTimeout(stageBus, 650);
    }
    startTimer(8, () => {
      cutBtn.disabled = true;
      dealBtn.disabled = true;
      feedback.textContent = "你还在磨价，司机已经踩油门了。";
      if (hit("等太久，司机开走了，掉一格体力")) setTimeout(stageBus, 650);
    });
    cutBtn.addEventListener("click", () => {
      if (price <= 20) return;
      price -= 10;
      patience -= 1;
      sfxGood();
      paint();
      if (price === 30) {
        feedback.textContent = "30 了。别砍了，再砍就翻脸。";
      } else if (price < 30) {
        feedback.textContent = "砍到 20，司机觉得你找茬。";
        lose("砍太狠，司机翻脸走了，掉一格体力");
      } else if (patience <= 0) {
        feedback.textContent = "司机没耐心了，伸手要关门。";
        lose("把司机磨烦了，他直接走了，掉一格体力");
      } else {
        feedback.textContent = "又降 10 块，司机脸色沉了一点。";
      }
    });
    dealBtn.addEventListener("click", () => {
      stopTimer();
      cutBtn.disabled = true;
      dealBtn.disabled = true;
      if (price === 30) {
        sfxGood();
        feedback.textContent = "30 成交，上车。";
        next();
      } else if (price > 30) {
        lose("这个价还是被宰了，掉一格体力");
      } else {
        lose("20 块太离谱，司机不拉，掉一格体力");
      }
    });
  }

  /* ---------- 第四程：山路稳住行李 ---------- */
  function stageBalance() {
    const need = 6;
    state.round = 0;
    setMission("第四程 · 山路摆渡", "弯道上，把行李压住", "车身往哪边倾，就往反方向压。连续稳住 6 次，别让箱子翻下车顶。", "稳住 0 / 6");
    stageArea.innerHTML =
      '<div class="balance-wrap">' +
      '<div class="balance-scene" id="balanceScene"><img class="van" src="assets/icons/van.webp" alt="" /></div>' +
      '<div class="tilt-words"><span>← 往左压</span><span id="balanceCount">稳住 0 / 6</span><span>往右压 →</span></div>' +
      '<div class="balance-btns"><button data-dir="0">往左压住</button><button data-dir="1">往右压住</button></div>' +
      '</div>';
    const scene = $("balanceScene");
    let tilt = Math.random() < 0.5 ? 0 : 1;
    function newTilt() {
      tilt = Math.random() < 0.5 ? 0 : 1;
      scene.classList.remove("tilt-left", "tilt-right");
      scene.classList.add(tilt === 0 ? "tilt-left" : "tilt-right");
      feedback.textContent = tilt === 0 ? "车身向左倾，箱子往左滑了！" : "车身向右倾，箱子往右滑了！";
    }
    newTilt();
    startTimer(16, () => {
      feedback.textContent = "弯道太多，箱子还是翻了。";
      failStage("箱子翻下车顶，司机停了车。");
    });
    [...stageArea.querySelectorAll(".balance-btns button")].forEach(btn => {
      btn.addEventListener("click", () => {
        const dir = Number(btn.dataset.dir);
        const should = 1 - tilt;
        if (dir === should) {
          state.round += 1;
          sfxGood();
          $("balanceCount").textContent = "稳住 " + state.round + " / 6";
          feedback.textContent = "压住了，箱子没滑。";
          if (state.round >= need) { stopTimer(); setTimeout(winLeg, 450); return; }
          newTilt();
        } else {
          if (hit("压反了，箱子晃了一下，掉一格体力")) newTilt();
        }
      });
    });
  }

  /* ---------- 第五程：村口夜路躲狗 ---------- */
  function stageChase() {
    const need = 6;
    state.round = 0;
    setMission("第五程 · 村口夜路", "狗追来了，往反方向躲", "狗从哪边扑，就往另一边闪。连续躲开 6 次，别在最后一段被追上。", "躲开 0 / 6");
    stageArea.innerHTML =
      '<div class="chase-wrap">' +
      '<div class="chase-top"><img class="dog-avatar" src="assets/scenes/village-dog.webp" alt="土狗" /><div class="chase-copy"><b id="chaseTitle">狗从右边冲过来</b><small id="chaseSub">往左躲，别往狗嘴里送。</small></div></div>' +
      '<div class="chase-track"><i id="chaseFill"></i></div>' +
      '<div class="chase-btns"><button data-dir="0">← 往左躲</button><button data-dir="1">往右躲 →</button></div>' +
      '</div>';
    function newChase() {
      const side = Math.random() < 0.5 ? 0 : 1; // 0=狗在左，需往右
      state.chaseNeed = side;
      $("chaseTitle").textContent = side === 0 ? "狗从左边扑过来" : "狗从右边冲过来";
      $("chaseSub").textContent = side === 0 ? "往右躲，别往狗嘴里送。" : "往左躲，别往狗嘴里送。";
      feedback.textContent = side === 0 ? "左边有狗影！" : "右边有狗影！";
      startTimer(2.4, () => {
        sfxDog();
        if (hit("慢了一步，狗追上来了，掉一格体力")) newChase();
      });
    }
    newChase();
    [...stageArea.querySelectorAll(".chase-btns button")].forEach(btn => {
      btn.addEventListener("click", () => {
        stopTimer();
        const dir = Number(btn.dataset.dir);
        if (dir === 1 - state.chaseNeed) {
          state.round += 1;
          sfxGood();
          $("chaseFill").style.width = (state.round / need * 100) + "%";
          feedback.textContent = "躲开了，继续往院灯跑。";
          if (state.round >= need) { cancelStage(); setTimeout(winLeg, 450); return; }
          newChase();
        } else {
          sfxDog();
          if (hit("躲反了，狗扑到脚边，掉一格体力")) newChase();
        }
      });
    });
  }

  /* ---------- 结算 ---------- */
  function winLeg() {
    cancelStage();
    stopTimer();
    const l = leg();
    const stars = state.hearts === 3 ? 3 : state.hearts === 2 ? 2 : 1;
    const secs = Math.max(1, Math.round((performance.now() - state.legStart) / 1000));
    state.score += stars;
    legTag.textContent = l.tag;
    legEndIcon.src = l.icon;
    legEndTitle.textContent = l.endTitle;
    legEndText.textContent = l.endText;
    legStars.innerHTML = [0, 1, 2].map(i => '<span class="' + (i < stars ? "" : "dim") + '">★</span>').join("");
    legMiss.textContent = state.miss;
    legHearts.textContent = state.hearts;
    legTime.textContent = secs + "s";
    nextLegBtn.textContent = l.next;
    if (l.endBg) {
      jLegEnd.style.background = "linear-gradient(180deg,rgba(8,31,26,.52),rgba(6,24,20,.9)),url('" + l.endBg + "') center/cover";
    }
    sfxWin();
    show(jLegEnd);
  }

  function failStage(message) {
    cancelStage();
    stopTimer();
    const l = leg();
    failTag.textContent = l.id === "hsr" ? "第二程 · 高铁检票 · 失败" : l.id === "bus" ? "第三程 · 拼车砍价 · 失败" : l.id === "van" ? "第四程 · 山路摆渡 · 失败" : "第五程 · 夜路进村 · 失败";
    failTitle.textContent = "又被拦住了";
    failHero.src = "assets/hero/stand-3.webp";
    failText.textContent = message || l.failText;
    jFail.style.background = "linear-gradient(180deg,rgba(10,28,23,.62),rgba(5,18,15,.92)),url('" + l.bg + "') " + (l.bgPos || "center") + "/cover";
    show(jFail);
  }

  function nextLeg() {
    if (state.leg < 3) {
      state.leg += 1;
      show(jGame);
      loadLeg();
    } else {
      showFinal();
    }
  }

  function showFinal() {
    cancelStage();
    const fat = localStorage.getItem("gohome.metro.fat");
    const eaten = localStorage.getItem("gohome.metro.eaten");
    let foodLine = "";
    if (fat !== null && eaten !== null) {
      foodLine = " 第一程还吃掉 " + eaten + " 口，体重到 " + fat + "%，居然没卡在闸机口。";
    }
    finalText.textContent = "检票、砍价、山路、夜路，四程都闯过来了。" + foodLine + " 院里的灯还亮着，锅里的水已经开了。";
    finalMiss.textContent = state.totalMiss;
    const stars = state.totalMiss === 0 ? 5 : state.totalMiss <= 2 ? 4 : state.totalMiss <= 4 ? 3 : 2;
    finalStars.innerHTML = [0, 1, 2, 3, 4].map(i => '<span class="' + (i < stars ? "" : "dim") + '">★</span>').join("");
    sfxWin();
    show(jFinal);
  }

  /* ---------- 事件 ---------- */
  $("jStartBtn").addEventListener("click", startJourney);
  nextLegBtn.addEventListener("click", nextLeg);
  retryLeg.addEventListener("click", () => { show(jGame); loadLeg(); });
  backStart.addEventListener("click", () => show(jStart));
  $("againJourney").addEventListener("click", startJourney);
  $("backMetro").addEventListener("click", () => { window.location.href = "index.html"; });
  jSoundBtn.addEventListener("click", () => {
    state.soundOn = !state.soundOn;
    localStorage.setItem(SOUND_KEY, state.soundOn ? "on" : "off");
    jSoundBtn.textContent = state.soundOn ? "🔊" : "🔇";
    if (state.soundOn) { ensureAudio(); beep(780, "triangle", 0.07, 0.08); }
  });
  jSoundBtn.textContent = state.soundOn ? "🔊" : "🔇";

  const creditsModal = $("creditsModal");
  $("creditBtn").addEventListener("click", () => creditsModal.classList.remove("hidden"));
  $("creditClose").addEventListener("click", () => creditsModal.classList.add("hidden"));
  creditsModal.addEventListener("click", e => { if (e.target === creditsModal) creditsModal.classList.add("hidden"); });

  document.addEventListener("pointerdown", () => { if (state.soundOn) ensureAudio(); }, { passive: true });

  [...new Set(LEGS.flatMap(l => [l.bg, l.endBg]).filter(Boolean))].forEach(getScene);

  const bootLeg = Number(new URLSearchParams(location.search).get("leg"));
  if (bootLeg >= 2 && bootLeg <= 5) {
    state.leg = bootLeg - 2;
    show(jGame);
    loadLeg();
  }
})();
