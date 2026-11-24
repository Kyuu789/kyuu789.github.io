(function () {
  "use strict";

  const LEGS = [
    {
      id: "hsr",
      name: "第二程 · 高铁",
      short: "高铁",
      route: "苏州北 → 邯郸东",
      broadcast: "G1571 次列车正在检票，07 车厢请往站台中部走。",
      icon: "assets/icons/hsr.webp",
      hero: "assets/hero/stand-2.webp",
      tag: "第二程 · 高铁",
      endTitle: "到邯郸东了",
      endText: "车窗外已经换成华北平原。高铁这一程顺下来了，真正的折腾才刚开始。",
      next: "下一程 · 接驳车",
      questions: [
        {
          q: "距离检票截止还有 3 分钟，你先做什么？",
          scene: "你一手拖箱子，一手攥着身份证，站厅里全是人。",
          options: [
            { t: "先买杯奶茶垫垫肚子", ok: false, note: "奶茶还没拿到，检票口先停止检票了。" },
            { t: "直奔检票口排队", ok: true, note: "先上车再说，吃的可以路上再想。" },
            { t: "找个插座给手机充电", ok: false, note: "电没充多少，车倒是一分钟不等人。" }
          ]
        },
        {
          q: "车票写着 07 车 12A，你往哪边走？",
          scene: "站台上车头车尾全是人，指示牌一闪一闪。",
          options: [
            { t: "跟着“07 车厢”指示牌走", ok: true, note: "先认车厢号，再找座位，稳。" },
            { t: "先去 09 车厢碰碰运气", ok: false, note: "走反了，拖着箱子从车尾跑到车头。" },
            { t: "先去餐车看看有什么吃的", ok: false, note: "车还没开，餐车也没开门。" }
          ]
        },
        {
          q: "靠窗座位被一位大叔占了，他说就坐一会儿。",
          scene: "你的箱子还没放上行李架，车已经快开了。",
          options: [
            { t: "出示车票，礼貌请他让座", ok: true, note: "对号入座，谁都挑不出毛病。" },
            { t: "算了，站着也行", ok: false, note: "五个小时站到邯郸，腿都不是自己的了。" },
            { t: "直接把他的包扔到过道", ok: false, note: "座位没要回来，先吵了一架。" }
          ]
        }
      ]
    },
    {
      id: "bus",
      name: "第三程 · 接驳车",
      short: "接驳车",
      route: "邯郸东站 → 汽车客运站",
      broadcast: "客运站直通车即将发车，请到 3 号口排队。",
      icon: "assets/icons/bus.webp",
      hero: "assets/hero/stand-4.webp",
      tag: "第三程 · 接驳车",
      endTitle: "挤上接驳车了",
      endText: "从高铁站到汽车站，包还没放稳就得下车。下一段是真正的大巴。",
      next: "下一程 · 乡村摆渡车",
      questions: [
        {
          q: "出站口三个人同时朝你招手，你上哪辆？",
          scene: "“北广场网约车！”“南广场便宜走！”“客运站直通车！”",
          options: [
            { t: "上北广场的网约车", ok: false, note: "司机说要拼满才走，等了二十分钟。" },
            { t: "上南广场的便宜黑车", ok: false, note: "半路加价，不给钱就把你放在高架下。" },
            { t: "按指示牌坐客运站直通车", ok: true, note: "正规接驳车，直达客运站，不绕路。" }
          ]
        },
        {
          q: "司机说前面堵，建议绕小路，再加 50 块。",
          scene: "导航上主线一片红，小路一片灰。",
          options: [
            { t: "按导航走，堵就堵", ok: true, note: "慢是慢点，至少路线是明的。" },
            { t: "加钱走小路抄近道", ok: false, note: "小路越走越偏，最后还是绕回主线。" },
            { t: "马上下车换一辆", ok: false, note: "这一带打不到车，箱子拖得手都酸了。" }
          ]
        },
        {
          q: "到站广播听不清，怎么确认没下错？",
          scene: "车停在一个陌生的站前广场，招牌被树挡住了。",
          options: [
            { t: "看站牌：邯郸汽车客运总站", ok: true, note: "站牌对上了，进站买票。" },
            { t: "跟着人群一起下", ok: false, note: "人群去的是公交站，不是客运站。" },
            { t: "问旁边卖煎饼的阿姨", ok: false, note: "阿姨手一指，指到了反方向。" }
          ]
        }
      ]
    },
    {
      id: "van",
      name: "第四程 · 乡村摆渡车",
      short: "摆渡车",
      route: "县城 → 村口",
      broadcast: "乡村摆渡车末班 18:40，过时不候。",
      icon: "assets/icons/van.webp",
      hero: "assets/hero/stand-6.webp",
      tag: "第四程 · 乡村摆渡车",
      endTitle: "摆渡车到村口了",
      endText: "白色面包车颠了一路，终于停在村口小卖部。剩下的路，只能靠腿。",
      next: "最后一段 · 步行进村",
      questions: [
        {
          q: "县城车站外，最后一班摆渡车还有 5 分钟开。",
          scene: "三辆白色面包车停在路边，车头都贴着不同的村名。",
          options: [
            { t: "先问清楚哪辆去自己村", ok: true, note: "司机说第三辆，差点就上了反方向的车。" },
            { t: "哪辆先开就上哪辆", ok: false, note: "上错车，一路坐到了隔壁村。" },
            { t: "先买瓶水再说", ok: false, note: "水买回来，末班车已经开走了。" }
          ]
        },
        {
          q: "行李要捆到车顶，师傅递给你一根绳。",
          scene: "车顶已经堆了年货、纸箱和一袋面粉。",
          options: [
            { t: "把箱子绑紧，再拽两下确认", ok: true, note: "一路颠簸，箱子纹丝不动。" },
            { t: "塞进怀里抱着", ok: false, note: "车一颠，箱子差点砸到脚。" },
            { t: "不绑了，反正路不远", ok: false, note: "过一个坑，箱子从车顶滑了下来。" }
          ]
        },
        {
          q: "车停在村口小卖部，天已经黑透。",
          scene: "外面没有路灯，只有小卖部的灯泡亮着。",
          options: [
            { t: "先确认是自家村口再下车", ok: true, note: "看到小卖部的招牌，才拖箱子下车。" },
            { t: "跟着别人一起下", ok: false, note: "别人是邻村的，你被拉到了更远的地方。" },
            { t: "车没停稳就往下跳", ok: false, note: "脚下一滑，箱子先摔进了泥里。" }
          ]
        }
      ]
    },
    {
      id: "walk",
      name: "第五程 · 步行进村",
      short: "步行",
      route: "村口 → 家",
      broadcast: "村口到家还有 800 米，最后一段别摔了。",
      icon: "assets/icons/walk.webp",
      hero: "assets/hero/stand-1.webp",
      tag: "第五程 · 步行进村",
      endTitle: "到家了",
      endText: "院门虚掩着，屋里的灯亮着。妈妈在灶台前回头，第一句还是“怎么又瘦了”。",
      next: "进家门",
      questions: [
        {
          q: "下车后还有 800 米土路，一辆黑车说 50 块送到家门口。",
          scene: "村里已经能看见灯，路边的狗开始叫。",
          options: [
            { t: "自己拖箱子走进去", ok: true, note: "800 米，轮子响一路，但总算看见了院门。" },
            { t: "花 50 块坐黑车", ok: false, note: "黑车只送到巷口，钱也不退。" },
            { t: "等一辆顺路的电动三轮", ok: false, note: "等了十分钟，一辆也没有。" }
          ]
        },
        {
          q: "前面的土路被雪水泡出一个大坑。",
          scene: "坑边全是泥，旁边的麦地也被踩得稀烂。",
          options: [
            { t: "绕开坑，沿着硬地边走", ok: true, note: "多走几步，鞋和箱子都保住了。" },
            { t: "踩着木板直接过去", ok: false, note: "木板一滑，连人带箱子摔进泥里。" },
            { t: "闭眼跳过去", ok: false, note: "跳是跳过去了，鞋留在坑里。" }
          ]
        },
        {
          q: "一条土狗突然从院墙后面冲出来。",
          scene: "狗在叫，你拖着箱子，后面就是村口。",
          options: [
            { t: "站住不动，慢慢绕开", ok: true, note: "狗叫了两声，看你没跑，自己回去了。" },
            { t: "撒腿就跑", ok: false, note: "你越跑它越追，箱子差点被拽翻。" },
            { t: "抬脚吓唬它", ok: false, note: "狗没吓退，倒把旁边看门的大爷招来了。" }
          ]
        }
      ]
    }
  ];

  const LEG_SECONDS = 9;
  const SOUND_KEY = "gohome.journey.sound";

  const jStart = document.getElementById("jStart");
  const jGame = document.getElementById("jGame");
  const jLegEnd = document.getElementById("jLegEnd");
  const jFinal = document.getElementById("jFinal");
  const jFail = document.getElementById("jFail");
  const jStartBtn = document.getElementById("jStartBtn");
  const jBestLine = document.getElementById("jBestLine");
  const jSoundBtn = document.getElementById("jSoundBtn");
  const legIcon = document.getElementById("legIcon");
  const legName = document.getElementById("legName");
  const legRoute = document.getElementById("legRoute");
  const miniRoute = document.getElementById("miniRoute");
  const jHeartsEls = [...document.querySelectorAll("#jHearts span")];
  const jScore = document.getElementById("jScore");
  const qLegTag = document.getElementById("qLegTag");
  const qIndex = document.getElementById("qIndex");
  const qText = document.getElementById("qText");
  const qScene = document.getElementById("qScene");
  const optionsEl = document.getElementById("options");
  const timerFill = document.getElementById("timerFill");
  const jHero = document.getElementById("jHero");
  const broadcastEl = document.getElementById("broadcast");
  const ghostIcon = document.getElementById("ghostIcon");
  const answerFlash = document.getElementById("answerFlash");

  const legTag = document.getElementById("legTag");
  const legEndIcon = document.getElementById("legEndIcon");
  const legEndTitle = document.getElementById("legEndTitle");
  const legEndText = document.getElementById("legEndText");
  const legStars = document.getElementById("legStars");
  const legRight = document.getElementById("legRight");
  const legMiss = document.getElementById("legMiss");
  const legHearts = document.getElementById("legHearts");
  const nextLegBtn = document.getElementById("nextLegBtn");

  const finalTag = document.getElementById("finalTag");
  const finalTitle = document.getElementById("finalTitle");
  const finalHero = document.getElementById("finalHero");
  const finalText = document.getElementById("finalText");
  const finalStars = document.getElementById("finalStars");
  const finalRight = document.getElementById("finalRight");
  const finalMiss = document.getElementById("finalMiss");
  const againJourney = document.getElementById("againJourney");
  const backMetro = document.getElementById("backMetro");

  const failTag = document.getElementById("failTag");
  const failTitle = document.getElementById("failTitle");
  const failHero = document.getElementById("failHero");
  const failText = document.getElementById("failText");
  const retryLeg = document.getElementById("retryLeg");
  const backStart = document.getElementById("backStart");

  const state = {
    legIndex: 0,
    qIndex: 0,
    hearts: 3,
    right: 0,
    miss: 0,
    totalRight: 0,
    totalMiss: 0,
    timer: LEG_SECONDS,
    timerId: 0,
    locked: true,
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
  const sfxGood = () => { beep(880, "square", 0.08, 0.1); beep(1180, "square", 0.08, 0.08, 0.07); };
  const sfxBad = () => { beep(140, "sawtooth", 0.16, 0.1); };
  const sfxWin = () => { [660, 880, 1120, 1320].forEach((f, i) => beep(f, "square", 0.16, 0.09, i * 0.1)); };

  function show(screen) {
    [jStart, jGame, jLegEnd, jFinal, jFail].forEach(s => s.classList.add("hidden"));
    screen.classList.remove("hidden");
  }

  function currentLeg() { return LEGS[state.legIndex]; }

  function updateMiniRoute() {
    [...miniRoute.children].forEach((el, i) => {
      el.className = "mini-stop";
      if (i <= state.legIndex) el.classList.add("done");
      if (i === state.legIndex + 1) el.classList.add("current");
    });
  }

  function updateHud() {
    jHeartsEls.forEach((el, i) => el.classList.toggle("off", i >= state.hearts));
    jScore.textContent = "换乘 " + state.legIndex + "/4";
  }

  function startJourney() {
    ensureAudio();
    state.legIndex = 0;
    state.totalRight = 0;
    state.totalMiss = 0;
    show(jGame);
    loadLeg();
  }

  function loadLeg() {
    const leg = currentLeg();
    state.qIndex = 0;
    state.hearts = 3;
    state.right = 0;
    state.miss = 0;
    state.locked = false;
    legIcon.src = leg.icon;
    legEndIcon.src = leg.icon;
    legName.textContent = leg.name;
    legRoute.textContent = leg.route;
    jHero.src = leg.hero;
    ghostIcon.src = leg.icon;
    broadcastEl.textContent = leg.broadcast;
    updateMiniRoute();
    renderQuestion();
  }

  function renderQuestion() {
    const leg = currentLeg();
    const q = leg.questions[state.qIndex];
    qLegTag.textContent = leg.short;
    qIndex.textContent = "第 " + (state.qIndex + 1) + " / 3 题";
    qText.textContent = q.q;
    qScene.textContent = q.scene;
    jScore.textContent = "换乘 " + state.legIndex + "/4";
    updateHud();

    optionsEl.innerHTML = "";
    q.options.forEach((opt, idx) => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.type = "button";
      btn.innerHTML = "<b>" + String.fromCharCode(65 + idx) + "</b><span>" + opt.t + "</span>";
      btn.addEventListener("click", () => answer(idx, btn));
      optionsEl.appendChild(btn);
    });

    state.timer = LEG_SECONDS;
    timerFill.style.transform = "scaleX(1)";
    clearInterval(state.timerId);
    state.timerId = setInterval(() => {
      if (state.locked) return;
      state.timer -= 0.1;
      const pct = Math.max(0, state.timer / LEG_SECONDS);
      timerFill.style.transform = "scaleX(" + pct.toFixed(3) + ")";
      if (state.timer <= 0) {
        clearInterval(state.timerId);
        timeoutAnswer();
      }
    }, 100);
  }

  function markOptions(selected, answerIdx) {
    const buttons = [...optionsEl.querySelectorAll(".option-btn")];
    buttons.forEach((b, i) => {
      b.disabled = true;
      if (i === answerIdx) b.classList.add("correct");
      if (i === selected && i !== answerIdx) b.classList.add("wrong");
    });
  }

  function reply(text, good) {
    answerFlash.textContent = text;
    answerFlash.style.background = good ? "rgba(22,92,67,.94)" : "rgba(120,37,31,.94)";
    answerFlash.classList.add("show");
    jHero.classList.remove("react-good", "react-bad");
    void jHero.offsetWidth;
    jHero.classList.add(good ? "react-good" : "react-bad");
    setTimeout(() => answerFlash.classList.remove("show"), 950);
  }

  function answer(selected, btn) {
    if (state.locked) return;
    state.locked = true;
    clearInterval(state.timerId);
    const q = currentLeg().questions[state.qIndex];
    const correct = q.options.findIndex(o => o.ok);
    const picked = q.options[selected];
    markOptions(selected, correct);

    if (picked.ok) {
      state.right += 1;
      state.totalRight += 1;
      sfxGood();
      reply("选对了 · " + picked.note, true);
    } else {
      state.hearts -= 1;
      state.miss += 1;
      state.totalMiss += 1;
      sfxBad();
      reply("被坑了 · " + picked.note, false);
    }
    updateHud();
    setTimeout(advance, 1250);
  }

  function timeoutAnswer() {
    if (state.locked) return;
    state.locked = true;
    const q = currentLeg().questions[state.qIndex];
    const correct = q.options.findIndex(o => o.ok);
    state.hearts -= 1;
    state.miss += 1;
    state.totalMiss += 1;
    markOptions(-1, correct);
    sfxBad();
    reply("超时了 · " + q.options[correct].note, false);
    updateHud();
    setTimeout(advance, 1250);
  }

  function advance() {
    if (state.hearts <= 0) {
      failLeg();
      return;
    }
    state.qIndex += 1;
    if (state.qIndex >= 3) {
      endLeg();
    } else {
      state.locked = false;
      renderQuestion();
    }
  }

  function endLeg() {
    const leg = currentLeg();
    const stars = state.hearts === 3 ? 3 : state.hearts === 2 ? 2 : 1;
    legTag.textContent = leg.tag + " · 完成";
    legEndTitle.textContent = leg.endTitle;
    legEndText.textContent = leg.endText;
    legStars.innerHTML = [0, 1, 2].map(i => '<span class="' + (i < stars ? "" : "dim") + '">★</span>').join("");
    legRight.textContent = state.right;
    legMiss.textContent = state.miss;
    legHearts.textContent = state.hearts;
    nextLegBtn.textContent = leg.next;
    nextLegBtn.disabled = false;
    sfxWin();
    show(jLegEnd);
  }

  function nextLeg() {
    if (state.legIndex < 3) {
      state.legIndex += 1;
      show(jGame);
      loadLeg();
    } else {
      showFinal();
    }
  }

  function showFinal() {
    finalTag.textContent = "全程完成 · 苏州 → 邯郸 → 村口";
    finalTitle.textContent = "妈，我回来了";
    const metroFat = localStorage.getItem("gohome.metro.fat");
    const metroEaten = localStorage.getItem("gohome.metro.eaten");
    let foodLine = "";
    if (metroFat !== null && metroEaten !== null) {
      foodLine = " 第一程还吃掉 " + metroEaten + " 口，体重到 " + metroFat + "%，居然没卡在闸机口。";
    }
    finalText.textContent = "五次换乘，一路躲开了人潮、绕路、黑车和村口的狗。" + foodLine + " 院里的灯还亮着，锅里的水已经开了。";
    finalHero.src = "assets/hero/stand-5.webp";
    const total = state.totalRight;
    const misses = state.totalMiss;
    const starCount = misses === 0 ? 5 : misses <= 2 ? 4 : misses <= 4 ? 3 : 2;
    finalStars.innerHTML = [0, 1, 2, 3, 4].map(i => '<span class="' + (i < starCount ? "" : "dim") + '">★</span>').join("");
    finalRight.textContent = total;
    finalMiss.textContent = misses;
    localStorage.setItem("gohome.journey.done", "1");
    sfxWin();
    show(jFinal);
  }

  function failLeg() {
    const leg = currentLeg();
    failTag.textContent = leg.tag + " · 失败";
    failTitle.textContent = "又被坑了";
    failHero.src = "assets/hero/stand-3.webp";
    failText.textContent = "体力耗尽，这一程没走通。站台上的广播又响了一遍，重走这一段吧。";
    show(jFail);
  }

  function retryCurrentLeg() {
    show(jGame);
    loadLeg();
  }

  jStartBtn.addEventListener("click", startJourney);
  nextLegBtn.addEventListener("click", nextLeg);
  retryLeg.addEventListener("click", retryCurrentLeg);
  backStart.addEventListener("click", () => show(jStart));
  againJourney.addEventListener("click", startJourney);
  backMetro.addEventListener("click", () => { window.location.href = "index.html"; });
  jSoundBtn.addEventListener("click", () => {
    state.soundOn = !state.soundOn;
    localStorage.setItem(SOUND_KEY, state.soundOn ? "on" : "off");
    jSoundBtn.textContent = state.soundOn ? "🔊" : "🔇";
  const metroBest = localStorage.getItem("gohome.metro.best.v1");
  jBestLine.textContent = metroBest
    ? "第一程地铁最高分 " + metroBest + " · 后半程四程等你"
    : "第一程地铁已就位 · 后半程四程等你";
    if (state.soundOn) { ensureAudio(); beep(760, "triangle", 0.07, 0.08); }
  });

  jSoundBtn.textContent = state.soundOn ? "🔊" : "🔇";
  const metroBest = localStorage.getItem("gohome.metro.best.v1");
  jBestLine.textContent = metroBest
    ? "第一程地铁最高分 " + metroBest + " · 后半程四程等你"
    : "第一程地铁已就位 · 后半程四程等你";
  document.addEventListener("pointerdown", () => { if (state.soundOn) ensureAudio(); }, { passive: true });

  // 兼容跳关：journey.html?leg=2 直接从第三程开始（用于调试）
  const params = new URLSearchParams(location.search);
  const jump = Number(params.get("leg"));
  if (jump >= 1 && jump <= 4) {
    state.legIndex = jump - 1;
    show(jGame);
    loadLeg();
  }
})();
