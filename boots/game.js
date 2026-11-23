(() => {
  'use strict';

  const HOLES = 9;
  const ROUND_SECONDS = 45;
  const BEST_KEY = 'boots.whack.best.v1';
  const SOUND_KEY = 'boots.whack.sound.v1';

  const arena = document.getElementById('arena');
  const scoreEl = document.getElementById('score');
  const comboEl = document.getElementById('combo');
  const comboBox = document.getElementById('comboBox');
  const timeEl = document.getElementById('time');
  const hintEl = document.getElementById('hint');
  const startOverlay = document.getElementById('startOverlay');
  const endOverlay = document.getElementById('endOverlay');
  const startBtn = document.getElementById('startBtn');
  const againBtn = document.getElementById('againBtn');
  const homeBtn = document.getElementById('homeBtn');
  const bestLine = document.getElementById('bestLine');
  const finalScoreEl = document.getElementById('finalScore');
  const hitCountEl = document.getElementById('hitCount');
  const maxComboEl = document.getElementById('maxCombo');
  const bestScoreEl = document.getElementById('bestScore');
  const endCommentEl = document.getElementById('endComment');
  const endTitleEl = document.getElementById('endTitle');
  const soundBtn = document.getElementById('soundBtn');
  const grabber = document.getElementById('grabber');
  const bubble = document.getElementById('bubble');

  const holes = [];
  const timers = new Set();

  let best = Number(localStorage.getItem(BEST_KEY) || 0) || 0;
  let soundOn = localStorage.getItem(SOUND_KEY) !== 'off';
  let bubbleTimer = 0;

  const state = {
    running: false,
    paused: false,
    score: 0,
    combo: 0,
    maxCombo: 0,
    hits: 0,
    timeLeft: ROUND_SECONDS,
    occupied: 0,
    startedAt: 0,
    tickId: 0,
    spawnId: 0,
  };

  /* ---------------- audio ---------------- */
  let audioCtx = null;

  function beep(freq, type, duration, gain, when) {
    if (!soundOn) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const t = (when || audioCtx.currentTime);
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain || 0.08, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(g).connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + duration + 0.02);
    } catch (e) { /* 忽略音频失败 */ }
  }

  function sfxHit(golden) {
    if (golden) {
      beep(880, 'square', 0.09, 0.1);
      beep(1320, 'square', 0.12, 0.09, audioCtx ? audioCtx.currentTime + 0.08 : 0);
    } else {
      beep(560 + Math.min(state.combo, 10) * 28, 'square', 0.07, 0.09);
    }
  }

  function sfxMiss() {
    beep(150, 'sawtooth', 0.18, 0.07);
  }

  /* ---------------- build holes ---------------- */
  for (let i = 0; i < HOLES; i++) {
    const hole = document.createElement('button');
    hole.className = 'hole';
    hole.type = 'button';
    hole.dataset.index = String(i);
    hole.setAttribute('aria-label', '洞口 ' + (i + 1));
    hole.innerHTML =
      '<span class="pit"></span>' +
      '<span class="stage"><img class="boot" alt="" draggable="false" ' +
      'src="assets/boot.png" ' +
      'onerror="this.onerror=null;this.src=\'assets/boot.svg\'"></span>' +
      '<span class="rim"></span>' +
      '<span class="tuft l"></span><span class="tuft r"></span>' +
      '<span class="fx"></span>';
    arena.appendChild(hole);

    holes.push({
      el: hole,
      boot: hole.querySelector('.boot'),
      fx: hole.querySelector('.fx'),
      occupied: false,
      hit: false,
      leaveTimer: 0,
    });
  }

  /* ---------------- helpers ---------------- */
  function later(fn, ms) {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
    return id;
  }

  function clearTimers() {
    timers.forEach((id) => clearTimeout(id));
    timers.clear();
    clearInterval(state.tickId);
    clearTimeout(state.spawnId);
  }

  function react(text, kind) {
    bubble.textContent = text;
    grabber.classList.remove('hit', 'miss');
    void grabber.offsetWidth;
    if (kind) grabber.classList.add(kind);
    clearTimeout(bubbleTimer);
    bubbleTimer = window.setTimeout(() => {
      bubble.textContent = '抢靴子！';
      grabber.classList.remove('hit', 'miss');
    }, 900);
  }

  function updateHud() {
    scoreEl.textContent = String(state.score);
    comboEl.textContent = String(state.combo);
    comboBox.classList.toggle('hot', state.combo >= 5 && state.running);
  }

  function bumpCombo() {
    comboBox.classList.remove('bump');
    void comboBox.offsetWidth;
    comboBox.classList.add('bump');
    later(() => comboBox.classList.remove('bump'), 180);
  }

  function resetHole(h) {
    h.occupied = false;
    h.hit = false;
    h.el.classList.remove('up', 'down', 'hit', 'golden', 'wrong');
  }

  /* ---------------- game flow ---------------- */
  function startGame() {
    clearTimers();
    state.running = true;
    state.paused = false;
    state.score = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.hits = 0;
    state.timeLeft = ROUND_SECONDS;
    state.occupied = 0;
    state.startedAt = performance.now();
    holes.forEach(resetHole);
    updateHud();
    timeEl.textContent = String(ROUND_SECONDS);
    timeEl.style.color = '';
    hintEl.textContent = '靴子可能同时冒出来，点得越快分越高';
    react('开抢！');

    startOverlay.classList.add('hidden');
    endOverlay.classList.add('hidden');

    // 开局先给一只，别让玩家干等
    later(() => spawn(), 260);

    state.tickId = setInterval(() => {
      if (!state.running || state.paused) return;
      state.timeLeft -= 1;
      timeEl.textContent = String(Math.max(0, state.timeLeft));
      if (state.timeLeft <= 5 && state.timeLeft > 0) {
        timeEl.style.color = '#ff8a70';
        beep(320, 'triangle', 0.08, 0.06);
      }
      if (state.timeLeft <= 0) finishGame('time');
    }, 1000);
  }

  function scheduleSpawn(delay) {
    clearTimeout(state.spawnId);
    state.spawnId = window.setTimeout(() => {
      if (!state.running) return;
      if (state.paused) { scheduleSpawn(500); return; }
      const p = progress();
      const count = p < 0.2 ? 1 : (p < 0.55 ? 2 : (Math.random() < 0.4 ? 3 : 2));
      for (let i = 0; i < count; i++) spawn();
      scheduleSpawn(nextDelay());
    }, delay);
  }

  function progress() {
    const elapsed = (performance.now() - state.startedAt) / 1000;
    return Math.min(1, Math.max(0, elapsed / ROUND_SECONDS));
  }

  function nextDelay() {
    const p = progress();
    const base = 880 - p * 470;
    return base + Math.random() * (300 - p * 190);
  }

  function upDuration() {
    const p = progress();
    return 1200 - p * 430 + Math.random() * 170;
  }

  function spawn() {
    if (!state.running || state.paused) return;
    const p = progress();
    const maxActive = p < 0.2 ? 2 : (p < 0.6 ? 4 : 5);
    if (state.occupied >= maxActive) return;

    const free = holes.filter((h) => !h.occupied);
    if (!free.length) return;

    const h = free[Math.floor(Math.random() * free.length)];
    const golden = Math.random() < 0.1;

    h.occupied = true;
    h.hit = false;
    h.el.classList.remove('down', 'hit');
    h.el.classList.toggle('golden', golden);
    // 重置动画：先移除再强制重排
    h.el.classList.remove('up');
    void h.boot.offsetWidth;
    h.el.classList.add('up');

    state.occupied += 1;
    if (golden) beep(1046, 'triangle', 0.09, 0.06);

    h.leaveTimer = later(() => {
      if (!h.occupied || h.hit) return;
      miss(h);
    }, upDuration());
  }

  function miss(h) {
    if (!state.running) return;
    h.occupied = false;
    h.hit = true;
    state.occupied = Math.max(0, state.occupied - 1);
    h.el.classList.add('down');
    h.el.classList.remove('up');
    if (state.combo > 0) {
      state.combo = 0;
      updateHud();
      sfxMiss();
      react('溜了…', 'miss');
      hintEl.textContent = '漏掉了，连击归零';
      later(() => {
        if (hintEl.textContent === '漏掉了，连击归零') {
          hintEl.textContent = '靴子可能同时冒出来，点得越快分越高';
        }
      }, 1400);
    }
    later(() => {
      h.el.classList.remove('down', 'golden');
      h.hit = false;
      h.el.classList.remove('hit');
    }, 240);
  }

  function wrongTap(h) {
    h.el.classList.add('wrong');
    h.fx.textContent = '点错了';
    h.fx.classList.remove('show');
    void h.fx.offsetWidth;
    h.fx.classList.add('show');
    sfxMiss();
    react('点错了！', 'miss');
    finishGame('wrong');
  }

  function whack(h) {
    if (!state.running || state.paused) return;
    if (!h.occupied || h.hit) {
      if (h.el.classList.contains('hit') || h.el.classList.contains('down') || h.el.classList.contains('wrong')) return;
      wrongTap(h);
      return;
    }
    h.hit = true;
    h.occupied = false;
    state.occupied = Math.max(0, state.occupied - 1);
    clearTimeout(h.leaveTimer);

    const golden = h.el.classList.contains('golden');
    const base = golden ? 30 : 10;
    const bonus = Math.min(state.combo, 15) * 2;
    const points = base + bonus;

    state.score += points;
    state.hits += 1;
    state.combo += 1;
    state.maxCombo = Math.max(state.maxCombo, state.combo);

    h.el.classList.remove('up');
    h.el.classList.add('hit');
    h.fx.textContent = '+' + points + (golden ? ' 金靴!' : '');
    h.fx.classList.remove('show');
    void h.fx.offsetWidth;
    h.fx.classList.add('show');

    bumpCombo();
    updateHud();
    sfxHit(golden);
    react('+' + points + (golden ? ' 金靴!' : ' 抢到!'), 'hit');

    if (golden) {
      hintEl.textContent = '金靴 +' + points + ' 分！';
      later(() => { hintEl.textContent = '靴子可能同时冒出来，点得越快分越高'; }, 900);
    }

    later(() => {
      h.el.classList.remove('hit', 'golden');
      h.fx.classList.remove('show');
      h.hit = false;
    }, 320);
  }

  function finishGame(reason) {
    state.running = false;
    clearTimers();
    holes.forEach((h) => {
      h.el.classList.remove('up');
      if (h.occupied) h.el.classList.add('down');
      h.occupied = false;
      h.hit = false;
    });
    state.occupied = 0;

    if (state.score > best) {
      best = state.score;
      localStorage.setItem(BEST_KEY, String(best));
    }

    endTitleEl.textContent = reason === 'wrong' ? '点错了！' : '时间到';
    finalScoreEl.textContent = String(state.score);
    hitCountEl.textContent = String(state.hits);
    maxComboEl.textContent = String(state.maxCombo);
    bestScoreEl.textContent = String(best);
    bestLine.textContent = best ? '历史最佳：' + best + ' 分' : '';

    let comment;
    if (reason === 'wrong') {
      comment = '点到了空洞口，这局直接结束。';
    } else {
      comment = '再试一次，手速还能更快。';
      if (state.score >= 400) comment = '靴子收割机，这手速有点东西。';
      else if (state.score >= 260) comment = '很稳，金靴基本没逃掉。';
      else if (state.score >= 140) comment = '不错，连击再稳一点分数会更高。';
      else if (state.score < 60) comment = '先盯紧洞口，别急着乱点。';
    }
    endCommentEl.textContent = comment;

    endOverlay.classList.remove('hidden');
    beep(660, 'triangle', 0.16, 0.08);
    later(() => beep(880, 'triangle', 0.2, 0.08), 170);
  }

  /* ---------------- input ---------------- */
  arena.addEventListener('pointerdown', (ev) => {
    const target = ev.target.closest('.hole');
    if (!target) return;
    ev.preventDefault();
    const h = holes[Number(target.dataset.index)];
    if (h) whack(h);
  }, { passive: false });

  // 键盘可玩性：数字键 1-9 对应九个洞
  window.addEventListener('keydown', (ev) => {
    const n = Number(ev.key);
    if (n >= 1 && n <= 9) {
      const h = holes[n - 1];
      if (h) whack(h);
    }
  });

  startBtn.addEventListener('click', () => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    startGame();
    scheduleSpawn(nextDelay());
  });

  againBtn.addEventListener('click', () => {
    startGame();
    scheduleSpawn(nextDelay());
  });

  homeBtn.addEventListener('click', () => {
    window.location.href = '../';
  });

  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off');
    soundBtn.textContent = soundOn ? '🔊' : '🔇';
    if (soundOn) beep(720, 'triangle', 0.08, 0.06);
  });

  document.addEventListener('visibilitychange', () => {
    state.paused = document.hidden;
  });

  /* ---------------- boot ---------------- */
  soundBtn.textContent = soundOn ? '🔊' : '🔇';
  bestLine.textContent = best ? '历史最佳：' + best + ' 分' : '';
  scoreEl.textContent = '0';
  timeEl.textContent = String(ROUND_SECONDS);
})();
