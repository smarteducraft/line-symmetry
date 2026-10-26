/* 대칭 마법사 - 웹캠/마우스/터치로 배우는 선대칭, 2026 */
(() => {
  'use strict';
  const $ = (sel, root = document) => root.querySelector(sel);
  const screen = $('#screen');
  const modalRoot = $('#modalRoot');
  const video = $('#cameraVideo');
  const STORAGE_KEY = 'symmetry-wizard-settings-v1';
  const LEVELS = {
    easy: { label: '쉬움', tolerance: 34, dwell: 750 },
    normal: { label: '보통', tolerance: 22, dwell: 950 },
    hard: { label: '어려움', tolerance: 14, dwell: 1200 }
  };
  const stageNames = ['거울 마법 훈련', '사라진 대응점 찾기', '대칭도형 완성'];
  const stageLabels = ['대칭적인 위치', '대응점', '선대칭도형'];
  const explanations = [
    '대칭축을 기준으로 양쪽 점은 같은 높이에 있고, 축에서 같은 거리만큼 떨어져 있어요.',
    '대응점을 연결한 선분은 대칭축과 수직이며, 대칭축에 의해 똑같이 나뉘어요.',
    '선대칭도형을 대칭축을 따라 접으면 양쪽이 정확히 겹쳐요.'
  ];
  // 단계 × 난이도 각각 20문항. 동일한 시험에서 중복 출제하지 않는다.
  const BANK_SIZE = 20;
  const QUESTIONS_PER_STAGE = 5;
  const TITLES = [
    '반짝이는 별', '달빛 거울', '쌍둥이 마법', '하늘의 별', '고요한 별빛',
    '푸른 유성', '신비한 보석', '환상의 거울', '행운의 별', '새벽빛',
    '은하수 별', '보랏빛 마법', '무지개빛', '비밀의 빛', '꿈의 거울',
    '별자리 여행', '수호의 별', '숨은 별빛', '빛나는 길', '최후의 마법'
  ];
  // 세 번째 단계는 이름만 바꾼 동일 도형이 아니라 20개의 서로 다른 반쪽 윤곽을 사용한다.
  // widths: 대칭축(500)에서 왼쪽 외곽선까지의 거리, 세로 방향 0~1의 9개 기준점.
  const SHAPES = [
    { name:'꿈꾸는 나비', emoji:'🦋', color:'#caa4ff', widths:[0,100,216,109,49,173,135,75,0] },
    { name:'신비한 나무', emoji:'🌲', color:'#85e6bc', widths:[0,42,127,80,187,122,211,88,0] },
    { name:'별빛 로켓', emoji:'🚀', color:'#91d9ff', widths:[0,74,88,128,128,175,192,60,0] },
    { name:'빛나는 하트', emoji:'💜', color:'#f3a6db', widths:[0,92,186,209,184,131,80,42,0] },
    { name:'황금 왕관', emoji:'👑', color:'#ffe2a5', widths:[0,62,165,78,192,140,214,176,0] },
    { name:'하늘을 나는 연', emoji:'🪁', color:'#93d5ff', widths:[0,86,154,206,181,125,60,30,0] },
    { name:'반짝이는 보석', emoji:'💎', color:'#9deaf5', widths:[0,70,193,214,178,134,65,28,0] },
    { name:'마법의 성', emoji:'🏰', color:'#c7afff', widths:[0,98,98,173,173,201,201,125,0] },
    { name:'솜사탕 구름', emoji:'☁️', color:'#c5d4ff', widths:[0,128,161,112,208,177,148,96,0] },
    { name:'귀여운 눈사람', emoji:'⛄', color:'#b1e9ff', widths:[0,44,91,87,49,135,193,155,0] },
    { name:'달콤한 사탕', emoji:'🍬', color:'#ffc5db', widths:[0,156,82,171,102,170,82,151,0] },
    { name:'종소리 마법', emoji:'🔔', color:'#ffe39a', widths:[0,38,63,116,168,195,204,85,0] },
    { name:'승리의 트로피', emoji:'🏆', color:'#f8d6a0', widths:[0,112,194,157,79,75,105,147,0] },
    { name:'하늘 풍선', emoji:'🎈', color:'#feaecd', widths:[0,83,165,184,177,124,54,25,0] },
    { name:'빛나는 꽃', emoji:'🌸', color:'#f0bcfc', widths:[0,85,182,97,224,104,177,82,0] },
    { name:'마법의 방패', emoji:'🛡️', color:'#96bfff', widths:[0,161,184,180,157,128,89,41,0] },
    { name:'별나라 우주선', emoji:'🛸', color:'#b0f1ec', widths:[0,31,75,143,218,218,114,45,0] },
    { name:'고양이 얼굴', emoji:'🐱', color:'#ffcfb6', widths:[0,125,174,111,161,185,134,79,0] },
    { name:'행운의 네잎클로버', emoji:'🍀', color:'#a3f6b9', widths:[0,127,194,91,186,95,187,70,0] },
    { name:'별 모양 마법진', emoji:'⭐', color:'#ffeab1', widths:[0,89,196,74,197,76,203,89,0] }
  ];
  const DIFFICULTY_INDEX = { easy: 0, normal: 1, hard: 2 };

  function interpolateWidth(widths, t) {
    const pos = t * (widths.length - 1);
    const i = Math.min(widths.length - 2, Math.floor(pos));
    return widths[i] + (widths[i + 1] - widths[i]) * (pos - i);
  }
  function createProblemBank() {
    const bank = {};
    Object.entries(DIFFICULTY_INDEX).forEach(([difficulty, d]) => {
      // 쉬움/보통/어려움 모두 별개 좌표를 갖고, 단계별로 20개의 고유 문항을 제공한다.
      const pointsFor = stage => Array.from({ length: BANK_SIZE }, (_, i) => {
        const distance = [112 + (i * 31 + stage * 17) % 89,
          90 + (i * 37 + stage * 23) % 143,
          65 + (i * 43 + stage * 29) % 187][d];
        const y = 143 + (i * 83 + stage * 49 + d * 31) % 320;
        return {
          id: `${difficulty}-s${stage}-${String(i + 1).padStart(2, '0')}`,
          name: `${TITLES[i]} ${stage === 1 ? '거울별' : '대응점'}`,
          x: 500 - distance, y
        };
      });
      const positions = [
        [0.24, 0.50, 0.76],
        [0.19, 0.39, 0.61, 0.81],
        [0.14, 0.28, 0.42, 0.58, 0.72, 0.86]
      ][d];
      const silhouettes = SHAPES.map((shape, i) => {
        const topY = 130 + (i * 11 + d * 5) % 36;
        const bottomY = 466 + (i * 7 + d * 13) % 34;
        const factor = [0.77, 0.94, 1.09][d];
        const pts = positions.map(t => [
          Math.round(500 - interpolateWidth(shape.widths, t) * factor),
          Math.round(topY + (bottomY - topY) * t)
        ]);
        return {
          id: `${difficulty}-s3-${String(i + 1).padStart(2, '0')}`,
          name: shape.name, emoji: shape.emoji, color: shape.color,
          top: [500, topY], bottom: [500, bottomY], points: pts
        };
      });
      bank[difficulty] = [pointsFor(1), pointsFor(2), silhouettes];
    });
    return bank;
  }
  const PROBLEM_BANK = createProblemBank();

  function drawRandomPuzzles(pool, count = QUESTIONS_PER_STAGE) {
    const shuffled = pool.slice();
    // crypto가 지원되는 경우 OS 난수를 사용해 Fisher-Yates 셔플 수행.
    for (let i = shuffled.length - 1; i > 0; i--) {
      let j;
      if (globalThis.crypto?.getRandomValues) {
        const ceiling = 0x100000000 - (0x100000000 % (i + 1));
        const sample = new Uint32Array(1);
        do { crypto.getRandomValues(sample); } while (sample[0] >= ceiling);
        j = sample[0] % (i + 1);
      } else j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
  }

  function storedSettings() {
    const defaults = { difficulty: 'normal', sound: true, dwellScale: 1 };
    try {
      const v = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (v && typeof v === 'object') return { ...defaults, ...v, difficulty: LEVELS[v.difficulty] ? v.difficulty : 'normal' };
    } catch (_) { /* 저장 공간 사용 불가 */ }
    return defaults;
  }
  const state = {
    screen: 'home', mode: 'mouse', paused: false, modal: '', stage: 1, puzzle: 0,
    scores: [[], [], []], sessionPuzzles: [[], [], []], studentName: '', hints: 0, wrongs: 0, hintLevel: 0,
    solved: 0, rawHands: [], pointers: [], mouseInput: null, mouseActive: false,
    dwellSince: 0, dwellFraction: 0, inside: false, feedback: '',
    lastFeedback: '', cameraReady: false, detectedCount: 0, cameraStatus: '',
    settings: storedSettings(), lastSeenAt: 0, manualSelected: false, revealSolved: false, finishTimer: null,
    reviewReady: false, uiHoverTarget: null, uiDwellSince: 0, uiDwellFraction: 0,
    uiGestureArmed: true, uiReleasedAt: 0, uiLastSelectAt: 0, lastHandFrameAt: 0
  };
  let cameraStream = null;
  let landmarker = null;
  let cameraInitToken = 0;
  let lastInferTime = 0;
  let frameCount = 0;
  let lastStatusUi = 0;
  let toastTimeout = null;
  let audioContext = null;
  let userGestureAudio = false;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const mirror = ([x, y]) => [1000 - x, y];
  const pointString = (p) => `${p[0]},${p[1]}`;
  const stagePuzzles = () => state.sessionPuzzles[state.stage - 1];
  const puzzle = () => stagePuzzles()[state.puzzle];
  const currentLevel = () => LEVELS[state.settings.difficulty];
  const durationRequired = () => currentLevel().dwell * state.settings.dwellScale;
  const tol = () => currentLevel().tolerance;
  const progressTotal = () => stagePuzzles().length;
  const stageScores = () => state.scores[state.stage - 1];
  const average = (scores) => scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const completedScore = () => average(state.scores.flat());
  const totalHints = () => state.scores.flat().length;
  const modeText = () => state.mode === 'camera' ? '📷 웹캠 손동작' : '🖱️ 마우스·터치';
  const isModal = () => !!modalRoot.firstElementChild;
  const screenTitle = (s) => s === 1 ? '양손으로 거울별을 맞춰요' : s === 2 ? '사라진 점을 찾아요' : '도형에 마법을 완성해요';

  function playNote(freq = 560, duration = .11, type = 'sine', volume = .035) {
    if (!state.settings.sound || !userGestureAudio) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
      const o = audioContext.createOscillator(); const g = audioContext.createGain();
      o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(volume, audioContext.currentTime);
      g.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
      o.connect(g).connect(audioContext.destination); o.start(); o.stop(audioContext.currentTime + duration);
    } catch (_) { /* 오디오가 없는 환경에서도 게임 지속 */ }
  }
  function successSound() { playNote(523, .14); setTimeout(() => playNote(659, .17), 90); setTimeout(() => playNote(784, .23), 185); }
  function toast(message) {
    const el = $('#toast'); el.textContent = message; el.classList.add('visible');
    clearTimeout(toastTimeout); toastTimeout = setTimeout(() => el.classList.remove('visible'), 2800);
  }
  function setModeIndicator() { $('#modeIndicator').textContent = state.screen === 'home' ? '✦ 반짝이는 수학 모험' : modeText(); }
  function switchScreen(name, html) {
    state.screen = name;
    screen.innerHTML = html;
    document.body.dataset.screen = name;
    // 게임 정보를 헤더 한 줄에만 표시합니다. 다른 화면에서는 이전 정보를 제거합니다.
    const headerInfo = $('#headerGameInfo');
    if (headerInfo && name !== 'game') headerInfo.innerHTML = '';
    setModeIndicator();
    window.scrollTo({ top: 0, behavior: 'instant' });
    attachPreview();
  }
  function closeModal() { modalRoot.innerHTML = ''; state.modal = ''; state.paused = state.reviewReady; clearUiHover(); }
  function openModal(type, html, wide = false) {
    state.modal = type; state.paused = true; state.dwellSince = 0; state.dwellFraction = 0; clearUiHover();
    modalRoot.innerHTML = `<div class="modal-backdrop" role="presentation"><section role="dialog" aria-modal="true" aria-label="대칭 마법사 창" class="modal ${wide ? 'wide' : ''}">${html}</section></div>`;
    $('.modal button')?.focus({ preventScroll: true });
  }
  function home() {
    clearTimeout(state.finishTimer);state.finishTimer=null;
    closeModal(); state.paused = false; state.reviewReady = false; state.mouseActive = false;
    stopCamera();
    switchScreen('home', `
      <section class="hero"><div class="hero-copy">
        <span class="pill">✧ 초등 5학년 수학 · 합동과 대칭</span>
        <h1><span class="gradient-text">손끝으로 만드는</span><br>대칭의 마법! <span aria-hidden="true">✦</span></h1>
        <p class="hero-lead">두 손을 펼치면 마법이 시작돼요. <strong>거울별을 맞추고, 사라진 대응점을 찾고, 반쪽 도형을 완성</strong>해 보세요. 몸으로 익히는 재미있는 수학 모험!</p>
        <div class="hero-actions"><button class="btn btn-primary" data-action="select-camera">📷 손동작으로 시작하기 <span aria-hidden="true">→</span></button><button class="btn btn-secondary" data-action="select-mouse">🖱️ 마우스·터치로 체험</button></div>
        <div class="hero-notice"><span>●</span> 로그인 없이 바로 시작 · 영상은 기기에서만 처리</div>
      </div><div class="hero-art"><div class="art-card"><span class="art-tag">✦ 선대칭의 마법을 깨워라!</span>
        <svg class="art-svg" viewBox="0 0 520 460" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="대칭축 양쪽에 펼쳐진 마법의 나비">
        <defs><linearGradient id="wingL" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#68dbf7"/><stop offset="1" stop-color="#a797fb"/></linearGradient><linearGradient id="wingR" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f5b8ff"/><stop offset="1" stop-color="#a68eff"/></linearGradient><filter id="shine"><feGaussianBlur stdDeviation="9"/></filter></defs>
        <circle cx="260" cy="224" r="155" fill="#907bff" opacity=".10"/><circle cx="260" cy="224" r="113" fill="none" stroke="#8b91e4" stroke-dasharray="3 10" opacity=".4"/>
        <path d="M260 95V350" stroke="#ffe3a6" stroke-width="2" stroke-dasharray="6 8"/>
        <g opacity=".18" filter="url(#shine)"><path d="M250 208Q95 32 80 145Q62 228 222 258Q110 260 132 345Q189 385 255 270Z" fill="#92e2ff"/><path d="M270 208Q425 32 440 145Q458 228 298 258Q410 260 388 345Q331 385 265 270Z" fill="#d6b4ff"/></g>
        <path d="M255 204C197 130 121 100 105 151C90 202 160 239 246 259C178 259 130 294 153 330C173 365 225 316 255 267Z" fill="url(#wingL)" stroke="#ddfaff" stroke-width="3"/>
        <path d="M265 204C323 130 399 100 415 151C430 202 360 239 274 259C342 259 390 294 367 330C347 365 295 316 265 267Z" fill="url(#wingR)" stroke="#faf1ff" stroke-width="3"/>
        <path d="M259 198Q255 160 237 145M261 198Q266 160 283 145" fill="none" stroke="#ffe6b4" stroke-width="3" stroke-linecap="round"/><ellipse cx="260" cy="255" rx="11" ry="70" fill="#f8d7ff"/><circle cx="260" cy="196" r="15" fill="#ffe3a6"/>
        <path d="M167 194Q202 203 222 236M353 194Q318 203 298 236" stroke="#ffffff70" stroke-width="6" fill="none" stroke-linecap="round"/>
        <circle cx="165" cy="185" r="20" fill="#fff" opacity=".29"/><circle cx="355" cy="185" r="20" fill="#fff" opacity=".29"/><circle cx="165" cy="185" r="10" fill="#e3fff9"/><circle cx="355" cy="185" r="10" fill="#fff7e3"/>
        <g fill="#ffecaf"><path d="M68 84l5 13 13 5-13 5-5 13-5-13-13-5 13-5z"/><path d="M447 78l4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/><path d="M455 310l5 12 12 5-12 5-5 12-5-12-12-5 12-5z"/><circle cx="85" cy="297" r="4"/><circle cx="420" cy="365" r="5"/></g>
        </svg><div class="floating-label"><span class="fl-icon">✓</span><span><strong>마법이 완성되었어요!</strong><small>대칭축을 기준으로 양쪽이 딱 맞아요.</small></span></div>
      </div></div></section>
      <div class="section-heading"><h2>세 가지 마법 훈련</h2><p>난이도별 20문제 중 단계마다 무작위 5문제를 풀어요.</p></div>
      <section class="feature-grid" aria-label="학습 단계"><div class="feature-card"><div class="feature-icon">🪞</div><h3>1단계 · 거울 마법</h3><p>대칭축 양쪽의 별을 맞춰 대칭적인 위치를 알아봐요.</p></div><div class="feature-card"><div class="feature-icon">✨</div><h3>2단계 · 대응점 찾기</h3><p>사라진 대응점을 찾아 축과의 거리, 높이를 살펴봐요.</p></div><div class="feature-card"><div class="feature-icon">🦋</div><h3>3단계 · 도형 완성</h3><p>다양한 도형의 반쪽을 완성해 대칭 마법사가 돼요!</p></div></section>
    `);
  }
  function chooseMode(mode) {
    userGestureAudio = true;
    closeModal();
    state.mode = mode;
    state.cameraStatus = mode === 'camera' ? '카메라 연결 버튼을 눌러 주세요.' : '마우스 또는 손가락으로 목표를 움직여 보세요.';
    if (mode !== 'camera') stopCamera();
    setup();
  }
  function setup() {
    switchScreen('setup', `
      <section class="setup-layout"><div class="setup-copy"><span class="eyebrow">STEP 00 · 마법 준비하기</span><h1>좋아요! 먼저<br>마법 도구를 준비해요.</h1>
      <p>${state.mode === 'camera' ? '웹캠을 연결한 뒤 카메라에 손을 보여주세요. 손끝의 움직임이 화면 속 마법으로 바뀝니다.' : '마우스를 움직이거나 손가락으로 화면을 터치해 보세요. 1단계에서는 하나의 포인터에 반대쪽 거울 포인터가 자동으로 나타나요.'}</p>
      <div class="step-row"><span class="step-number">1</span><div><strong>${state.mode === 'camera' ? '카메라 연결하기' : '포인터 움직이기'}</strong><small>${state.mode === 'camera' ? '카메라 권한 허용 후 양손이 보이게 해주세요.' : '게임판 오른쪽에서 포인터를 움직여 보세요.'}</small></div></div>
      <div class="step-row"><span class="step-number">2</span><div><strong>목표 위치에서 잠시 멈추기</strong><small>목표에 머무르면 둥근 진행 표시가 차오르며 선택돼요.</small></div></div>
      <div class="step-row"><span class="step-number">3</span><div><strong>세 가지 미션 도전하기</strong><small>쉬움 · 보통 · 어려움 중 난이도를 선택할 수 있어요.</small></div></div>
      </div><div class="setup-card"><div class="cam-screen" id="camScreen"><div class="camera-video-surface" id="setupVideoSlot"><div class="camera-finger-overlay" id="setupFingerOverlay" aria-hidden="true"><span class="camera-finger-dot" id="setupFinger0"><b>1</b></span><span class="camera-finger-dot" id="setupFinger1"><b>2</b></span></div></div>
      <div class="cam-placeholder" id="camPlaceholder"><span class="cam-icon">${state.mode === 'camera' ? '📷' : '🖱️'}</span><span>${state.mode === 'camera' ? '카메라 연결 후 두 손의 인식 상태를 확인해요' : '마우스·터치 조작이 준비되었어요!'}</span></div>
      <div class="cam-info"><span class="cam-label" id="camPreviewLabel">${state.mode === 'camera' ? '● 카메라 연결 전' : '● 대체 조작 모드'}</span><span class="cam-dots" id="camDots"><i></i><i></i></span></div></div>
      <div class="setup-note">${state.mode === 'camera' ? '💡 이 화면에서는 <strong>카메라 영상 위의 색 원이 검지 끝과 겹치는지</strong> 확인하세요. 카메라에서 약 60~100cm 떨어져 두 손이 모두 보이게 해주세요. 게임을 시작하면 미리보기는 자동으로 숨겨집니다. 영상은 저장하지 않아요.' : '💡 웹캠 없이도 모든 게임을 완료할 수 있어요. 마우스는 이동만 해도 되고, 터치는 화면을 누른 채 움직여 보세요.'}</div>
      <p class="setup-status" id="setupStatus" role="status">${state.cameraStatus}</p>
      <div class="setup-actions">${state.mode === 'camera' ? '<button class="btn btn-cyan" id="connectCamera" data-action="connect-camera">📷 카메라 연결</button>' : ''}<button class="btn btn-primary" data-action="start-game">✦ 마법 훈련 시작 →</button></div>
      <div class="setup-mode-switch">${state.mode === 'camera' ? '카메라가 잘 안 되나요? <button data-action="select-mouse">마우스·터치로 전환</button>' : '웹캠이 준비되어 있나요? <button data-action="select-camera">손동작 인식으로 전환</button>'}</div>
      </div></section>
    `);
  }
  function attachPreview() {
    // 준비 화면에서만 원본 영상(거울 반전)을 표시합니다. 게임 중에는 표시하지 않습니다.
    const slot = $('#setupVideoSlot');
    const visible = state.screen === 'setup' && state.mode === 'camera' && state.cameraReady && !!slot;
    if (visible) {
      slot.prepend(video);
      video.style.display = 'block';
    } else {
      document.body.appendChild(video);
      video.style.display = 'none';
    }
    const overlay = $('#setupFingerOverlay');
    if (overlay) overlay.style.display = visible ? 'block' : 'none';
    const ph = $('#camPlaceholder');
    if (ph) {
      ph.style.display = visible ? 'none' : 'flex';
      const msg = ph.querySelector('span:last-child');
      if (msg && state.mode === 'camera') msg.textContent = state.cameraReady
        ? '화면을 준비하고 있어요.' : '연결 후 검지 끝의 위치를 확인해요.';
    }
    const label = $('#camPreviewLabel');
    if (label) label.textContent = visible ? '● 카메라 미리보기 · 검지 끝 표시' : state.cameraReady ? '● 인식 준비 완료' : '● 연결 대기';
    if (!visible) clearSetupFingerMarkers();
  }
  function clearSetupFingerMarkers() {
    for (let i=0;i<2;i++) {
      const dot=$(`#setupFinger${i}`);
      if (dot) dot.classList.remove('on');
    }
  }
  function updateSetupFingerMarkers() {
    if (state.screen!=='setup' || state.mode!=='camera' || !state.cameraReady) return;
    const slot=$('#setupVideoSlot');
    if (!slot || !video.videoWidth || !video.videoHeight) {clearSetupFingerMarkers();return;}
    // video는 object-fit:contain, transform:scaleX(-1). 레터박스 영역까지 고려하여
    // MediaPipe 정규화 손끝 좌표(uiX/uiY)를 영상 표시 위치에 정확하게 겹칩니다.
    const w=slot.clientWidth, h=slot.clientHeight;
    if (!w || !h) return;
    const scale=Math.min(w/video.videoWidth,h/video.videoHeight);
    const shownW=video.videoWidth*scale, shownH=video.videoHeight*scale;
    const offsetX=(w-shownW)/2, offsetY=(h-shownH)/2;
    for(let i=0;i<2;i++) {
      const dot=$(`#setupFinger${i}`), hand=state.rawHands[i];
      if(!dot)continue;
      if(!hand) { dot.classList.remove('on'); continue; }
      dot.style.left=`${offsetX+hand.uiX*shownW}px`;
      dot.style.top=`${offsetY+hand.uiY*shownH}px`;
      dot.classList.add('on');
    }
  }
  function stopCamera() {
    cameraInitToken += 1;
    if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null; state.cameraReady = false; state.rawHands = []; state.detectedCount = 0; state.lastHandFrameAt = 0; clearUiHover(); clearSetupFingerMarkers();
    video.pause(); video.srcObject = null; document.body.appendChild(video); video.style.display = 'none';
    attachPreview();
  }
  async function startCamera() {
    if (state.cameraReady) return;
    userGestureAudio = true;
    const token = ++cameraInitToken;
    const btn = $('#connectCamera'); if (btn) { btn.disabled = true; btn.textContent = '⏳ 연결 중...'; }
    state.cameraStatus = '카메라를 연결하고 손 인식 모델을 준비하고 있어요...'; updateSetupStatus();
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('이 브라우저에서는 카메라를 사용할 수 없어요. HTTPS 환경인지 확인해 주세요.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } } });
      if (token !== cameraInitToken) { stream.getTracks().forEach(t => t.stop()); return; }
      cameraStream = stream; video.srcObject = stream; await video.play();
      if (!landmarker) {
        const { HandLandmarker, FilesetResolver } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/vision_bundle.mjs');
        if (token !== cameraInitToken) return;
        const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm');
        if (token !== cameraInitToken) return;
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', delegate: 'CPU' },
          runningMode: 'VIDEO', numHands: 2, minHandDetectionConfidence: .55, minHandPresenceConfidence: .55, minTrackingConfidence: .55
        });
      }
      if (token !== cameraInitToken) { stopCamera(); return; }
      state.cameraReady = true;
      state.cameraStatus = '연결 성공! 영상 위의 원형 표시가 검지 끝과 일치하는지 확인하세요.';
      attachPreview(); updateSetupStatus(); toast('카메라 연결 성공! 손을 움직여 보세요.');
      if (btn) { btn.disabled = false; btn.textContent = '✓ 연결 완료'; }
    } catch (err) {
      if (token !== cameraInitToken) return;
      const reason = err?.name === 'NotAllowedError' ? '카메라 사용이 거부되었어요. 주소창의 카메라 권한을 확인해 주세요.' : err?.name === 'NotFoundError' ? '사용할 수 있는 카메라를 찾지 못했어요.' : (err?.message || '카메라 연결에 실패했어요.');
      stopCamera(); state.cameraStatus = reason + ' 아래에서 마우스·터치 모드를 사용할 수 있어요.';
      updateSetupStatus(); toast('카메라 연결에 실패했어요.');
      const retry = $('#connectCamera'); if (retry) { retry.disabled = false; retry.textContent = '↻ 다시 연결'; }
    }
  }
  function updateSetupStatus() {
    const s = $('#setupStatus'); if (s) s.textContent = state.cameraStatus;
    const dots = $('#camDots'); if (dots) dots.innerHTML = `<i class="${state.detectedCount > 0 ? 'on' : ''}"></i><i class="${state.detectedCount > 1 ? 'on' : ''}"></i>`;
  }
  function startStage(stage = 1) {
    clearTimeout(state.finishTimer); state.finishTimer = null;
    closeModal(); state.stage = stage; state.puzzle = 0; state.paused = false;
    state.sessionPuzzles[stage - 1] = drawRandomPuzzles(PROBLEM_BANK[state.settings.difficulty][stage - 1]);
    state.scores[stage - 1] = [];
    resetPuzzleState();
    renderGame();
  }
  function resetPuzzleState() {
    clearTimeout(state.finishTimer); state.finishTimer = null; state.revealSolved = false;
    state.hints = 0; state.wrongs = 0; state.hintLevel = 0; state.solved = 0;
    state.dwellSince = 0; state.dwellFraction = 0; state.inside = false;
    state.mouseInput = null; state.mouseActive = false; state.reviewReady = false; clearUiHover();
    state.feedback = '마법의 점을 찾아보세요!'; state.lastFeedback = '';
  }
  function stageInstruction() {
    if (state.reviewReady && state.stage === 1) return '두 별이 대칭축에서 같은 거리, 같은 높이에 있는지 확인해 보세요. 확인했으면 아래 버튼을 선택해요.';
    if (state.stage === 1) return state.mode === 'camera' ? '양손 검지 끝을 각각 별의 중심에 정확히 맞추고 잠시 유지하세요.' : '오른쪽 별의 중심에 포인터를 맞추면 왼쪽 거울 포인터가 함께 움직여요.';
    if (state.stage === 2) return '오른쪽 대응점 A′의 정확한 위치에 검지 끝을 맞추고 잠시 유지하세요.';
    return `왼쪽 도형의 ${state.solved + 1}번째 점의 대응 위치에 손끝을 정확히 맞추세요.`;
  }
  function renderGame() {
    switchScreen('game', `
      <div class="game-view">
        <div class="game-layout"><div class="game-card">
          <div class="game-hud"><span class="hud-label"><strong id="puzzleTitle">${puzzle().name}</strong><span class="random-pool-info" title="선택한 난이도의 20문제에서 중복 없이 5개를 골랐어요"> · 20문제 중 랜덤 5개</span></span><div class="progress-track" aria-label="단계 진행률"><div class="progress-fill" id="gameProgress" style="width:${state.puzzle / progressTotal() * 100}%"></div></div></div>
          <div class="board-wrap"><svg id="board" class="game-board" viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="손이나 마우스로 대칭 문제를 해결하는 게임판"></svg></div>
          <div class="board-bottom"><span><i class="live-dot" id="liveDot"></i><span id="trackingText">${state.mode === 'camera' ? '손 인식 대기 중' : '마우스·터치 준비됨'}</span></span><span>✦ ${durationRequired()/1000}초 머무르기</span></div>
        </div>
        <aside class="side-stack">
          <div class="side-card feedback-card"><div class="side-tag">✨ 지금 할 일</div><h3 id="instructionTitle">${screenTitle(state.stage)}</h3><p id="missionText">${stageInstruction()}</p>${state.reviewReady ? `<div class="review-controls" id="reviewControls"><div class="review-explain">✓ 대응점끼리 연결한 선분은 대칭축과 수직이며, 축 양쪽의 길이가 같아요.</div><button class="btn btn-primary review-next" data-action="next-puzzle" aria-label="대칭 관계를 확인하고 다음 문제로">${state.puzzle + 1 === progressTotal() ? '✓ 확인하고 단계 마치기 →' : '✓ 확인하고 다음 문제 →'}</button><small>📷 검지 끝을 버튼 위에 약 1초 동안 유지하세요.</small></div>` : `<div class="controls-stack"><button class="btn btn-secondary" data-action="hint">💡 힌트</button><button class="btn btn-secondary" data-action="confirm">✓ 위치 확정</button><button class="btn btn-ghost" data-action="pause">Ⅱ 일시정지</button><button class="btn btn-ghost" data-action="restart">↺ 단계 다시</button></div>`}</div>
          <div class="side-card"><div class="side-tag">🔍 실시간 수학 피드백</div><p class="feedback-text" id="feedbackText">${state.feedback}</p><div class="mini-lesson" id="lessonText">${stageExplanatoryText()}</div></div>
          <div class="side-card"><div class="side-tag">🎮 현재 입력 방식</div><h3>${modeText()}</h3><p>${state.mode === 'camera' ? '검지 끝으로 조작해요. 카메라와 약 60~100cm 거리를 권장해요.' : '포인터를 옮겨 잠시 멈추면 선택돼요.'}</p><button class="btn btn-ghost btn-small switch-button" data-action="switch-input">⇄ 입력 방식 변경</button></div>
        </aside></div></div>
    `);
    // 제목·챕터·문제·점수·난이도를 최상단 메뉴와 동일한 행으로 이동합니다.
    $('#headerGameInfo').innerHTML = `
      <div class="game-top" aria-label="학습 진행 정보">
        <div class="game-title-group"><span class="stage-kicker">CHAPTER ${String(state.stage).padStart(2,'0')} · ${stageLabels[state.stage-1]}</span><h1>${stageNames[state.stage-1]}</h1></div>
        <div class="game-stats"><div class="stat"><small>문제</small><b id="puzzleNumber">${state.puzzle + 1}/${progressTotal()}</b></div><div class="stat"><small>점수</small><b class="gold" id="stageScore">${average(stageScores()) || '—'}</b></div><div class="stat"><small>난이도</small><b>${currentLevel().label}</b></div></div>
      </div>`;
    renderBoard();
    const board = $('#board');
    board.addEventListener('pointermove', movePointer);
    board.addEventListener('pointerdown', e => { if (state.mode === 'mouse') { e.preventDefault(); board.setPointerCapture(e.pointerId); movePointer(e); } });
    board.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') { state.mouseActive = false; state.mouseInput = null; resetDwell(); } });
    board.addEventListener('pointercancel', () => { state.mouseActive = false; resetDwell(); });
    board.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { state.mouseActive = false; state.mouseInput = null; resetDwell(); } });
  }
  function stageExplanatoryText() {
    if (state.stage === 1) return '대칭축에서 같은 거리, 같은 높이! 두 점이 거울에 비친 모습처럼 놓여요.';
    if (state.stage === 2) return '대응점끼리 연결한 선분은 대칭축과 수직으로 만나요.';
    return '대응점을 하나씩 찾으면 완성된 도형을 대칭축으로 접을 수 있어요.';
  }
  function sprite() {
    return `<defs><pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="#a1aedb" stroke-opacity=".095" stroke-width="1"/></pattern><linearGradient id="stageBg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#121b3d"/><stop offset="1" stop-color="#151938"/></linearGradient><filter id="starGlow"><feGaussianBlur stdDeviation="8"/></filter><linearGradient id="halfFill"><stop stop-color="#ac96fa" stop-opacity=".58"/><stop offset="1" stop-color="#66c9f1" stop-opacity=".20"/></linearGradient></defs>
      <rect width="1000" height="620" fill="url(#stageBg)"/><rect width="1000" height="620" fill="url(#grid)"/>
      <circle cx="500" cy="305" r="215" fill="#a79af5" opacity=".032"/><circle cx="500" cy="305" r="290" fill="none" stroke="#b6b2f5" stroke-opacity=".075" stroke-width="2"/>
      ${[[105,90],[905,125],[840,520],[190,510],[80,365],[930,390]].map(([x,y],i)=>`<text x="${x}" y="${y}" fill="#ffdda4" opacity="${.27+i*.04}" font-size="20">✦</text>`).join('')}
      <rect x="494" y="74" width="12" height="476" rx="6" fill="#eacbff" opacity=".11"/><path d="M500 78V546" stroke="#e8d8ff" stroke-width="3" stroke-dasharray="10 12" opacity=".8"/>
      <rect x="444" y="29" width="112" height="35" rx="17" fill="#292957" stroke="#b9a6ff" stroke-opacity=".4"/><text x="500" y="52" fill="#f0dcff" font-size="15" text-anchor="middle" class="svg-label">대칭축</text>`;
  }
  function star(x, y, r = 26, color = '#ffe3a6') {
    const shape = Array.from({length:10},(_,i)=>{const a = -Math.PI/2 + i*Math.PI/5; const rr=i%2===0?r:r*.48;return `${x+Math.cos(a)*rr},${y+Math.sin(a)*rr}`;}).join(' ');
    return `<circle cx="${x}" cy="${y}" r="${r+14}" fill="${color}" opacity=".11" filter="url(#starGlow)"/><polygon points="${shape}" fill="${color}" stroke="#fff9e6" stroke-width="2"/>`;
  }
  function goalHint(p, label = '찾을 위치') { return `<g opacity=".68"><circle cx="${p[0]}" cy="${p[1]}" r="27" fill="none" stroke="#ffd889" stroke-width="3" stroke-dasharray="5 7"/><circle cx="${p[0]}" cy="${p[1]}" r="5" fill="#ffe29a"/><text x="${p[0]}" y="${p[1]-39}" fill="#ffe29a" text-anchor="middle" font-size="16" class="svg-label">${label}</text></g>`; }
  function labelAt(x,y,s,color='#f2f0ff') {return `<text x="${x}" y="${y}" text-anchor="middle" fill="${color}" font-size="19" class="svg-label">${s}</text>`;}
  function renderBoard() {
    const board = $('#board'); if (!board) return;
    const p = puzzle(); let inner = sprite();
    if (state.stage === 1) {
      const left = [p.x,p.y], right = mirror(left);
      inner += `<text x="256" y="93" text-anchor="middle" fill="#bbc7ee" font-size="19" class="svg-label">왼쪽</text><text x="744" y="93" text-anchor="middle" fill="#bbc7ee" font-size="19" class="svg-label">오른쪽</text>`;
      inner += `<line x1="${left[0]}" y1="${left[1]}" x2="${right[0]}" y2="${right[1]}" stroke="#8b8ce5" stroke-width="2" stroke-dasharray="6 9" opacity=".5"/>`;
      inner += star(...left,31,'#aee6ff')+star(...right,31,'#ffdf9b');
      inner += labelAt(left[0],left[1]+68,'별 A','#aee6ff') + labelAt(right[0],right[1]+68,'별 A′','#ffdf9b');
      if (state.revealSolved) {
        const distance=((500-p.x)/50).toFixed(1);
        const ly=p.y<340?p.y+85:p.y-83;
        inner += `<line x1="${left[0]}" y1="${p.y}" x2="500" y2="${p.y}" stroke="#9cf9dd" stroke-width="5" stroke-linecap="round"/>
          <line x1="500" y1="${p.y}" x2="${right[0]}" y2="${p.y}" stroke="#ffe4a3" stroke-width="5" stroke-linecap="round"/>
          <path d="M492 ${p.y-8}h-15v16h15M508 ${p.y-8}h15v16h-15" stroke="#ffffff" stroke-width="2.5" fill="none"/>
          <circle cx="${left[0]}" cy="${p.y}" r="45" fill="none" stroke="#7cffcc" stroke-width="3" stroke-dasharray="7 8"/>
          <circle cx="${right[0]}" cy="${p.y}" r="45" fill="none" stroke="#7cffcc" stroke-width="3" stroke-dasharray="7 8"/>
          ${labelAt((p.x+500)/2,ly,`← ${distance}칸 →`,'#a2ffdc')}
          ${labelAt((right[0]+500)/2,ly,`← ${distance}칸 →`,'#ffe4a3')}
          <rect x="194" y="538" width="612" height="62" rx="18" fill="#1b4c49" stroke="#87ffca" stroke-opacity=".75"/>
          ${labelAt(500,564,'✓ 두 점의 높이가 같아요','#cbffe5')}
          ${labelAt(500,590,'✓ 대칭축에서 같은 거리! 이제 직접 다음 문제를 선택하세요.','#cbffe5')}`;
      } else if (state.mode === 'mouse') inner += labelAt(500,592,'오른쪽 별을 따라가면 왼쪽에 거울 포인터가 나타나요.','#b6c0e7');
    } else if (state.stage === 2) {
      const left = [p.x,p.y], right=mirror(left);
      inner += `<circle cx="${p.x}" cy="${p.y}" r="31" fill="#97e5ff" opacity=".16"/><circle cx="${p.x}" cy="${p.y}" r="13" fill="#9cecff" stroke="#fff" stroke-width="3"/>`;
      inner += labelAt(p.x,p.y-37,'점 A','#adf0ff');
      if (state.revealSolved) {
        const d=((500-p.x)/50).toFixed(1);
        inner += `<path d="M${p.x} ${p.y}H${right[0]}" fill="none" stroke="#ffe29a" stroke-width="4"/>
        <circle cx="${right[0]}" cy="${right[1]}" r="31" fill="#8bffbe" opacity=".18"/>
        <circle cx="${right[0]}" cy="${right[1]}" r="13" fill="#8bffbe" stroke="#fff" stroke-width="3"/>
        <path d="M492 ${p.y-8}h-14v16h14" fill="none" stroke="#fff0c5" stroke-width="2.5"/>
        <path d="M508 ${p.y-8}h14v16h-14" fill="none" stroke="#fff0c5" stroke-width="2.5"/>
        ${labelAt(right[0],right[1]-37,'점 A′','#b3ffce')}
        ${labelAt((p.x+500)/2,p.y+38,`거리 ${d}칸`,'#ffe4a7')}
        ${labelAt((right[0]+500)/2,p.y+38,`거리 ${d}칸`,'#ffe4a7')}
        <rect x="286" y="517" width="428" height="64" rx="20" fill="#17384b" stroke="#83edb5" stroke-opacity=".6"/>
        ${labelAt(500,557,'양쪽 거리 같음!   ✓  수직으로 만나요','#c5ffe4')}`;
      } else {
        inner += labelAt(735,113,'A′의 위치는 어디일까요?','#dad3ff');
        if (state.hintLevel >= 1) inner += `<path d="M${p.x} ${p.y}H${right[0]}" fill="none" stroke="#ffe3a6" stroke-width="2.5" stroke-dasharray="9 7" opacity=".7"/><path d="M500 ${p.y}h14v14" fill="none" stroke="#ffe29a" stroke-width="2.5"/><circle cx="500" cy="${p.y}" r="7" fill="#ffe29a"/>`;
        if (state.hintLevel >= 2) inner += goalHint(right,'점 A′');
        inner += labelAt(500,586,'대칭축에서 같은 거리 · 같은 높이','#bcc8e7');
      }
    } else {
      const verts = [p.top,...p.points,p.bottom];
      const poly = verts.map(pointString).join(' ');
      inner += `<polygon points="${poly}" fill="url(#halfFill)" stroke="${p.color}" stroke-width="5" stroke-linejoin="round"/>`;
      inner += `<text x="214" y="102" fill="#d9d7fa" font-size="19" text-anchor="middle" class="svg-label">원래 도형 ${p.emoji}</text>`;
      inner += `<text x="780" y="102" fill="#d9d7fa" font-size="19" text-anchor="middle" class="svg-label">${state.solved === p.points.length ? '✓ 대칭도형 완성' : '반쪽을 완성해요'}</text>`;
      p.points.forEach((pt,i) => {
        inner += `<circle cx="${pt[0]}" cy="${pt[1]}" r="8" fill="#d9e9ff" stroke="#fff" stroke-width="2"/>${labelAt(pt[0]-21,pt[1]+7,String(i+1),'#d9e9ff')}`;
      });
      inner += `<circle cx="${p.top[0]}" cy="${p.top[1]}" r="6" fill="#fff"/><circle cx="${p.bottom[0]}" cy="${p.bottom[1]}" r="6" fill="#fff"/>`;
      if (state.solved > 0) {
        for(let i=0;i<state.solved;i++){
          const pt=mirror(p.points[i]);
          inner+=`<circle cx="${pt[0]}" cy="${pt[1]}" r="10" fill="#9dffbe" stroke="#fff" stroke-width="3"/>${labelAt(pt[0]+24,pt[1]+7,String(i+1),'#b6ffcd')}`;
        }
      }
      if (state.solved === p.points.length) {
        const complete = [p.top,...p.points.map(mirror),p.bottom];
        inner += `<polygon points="${complete.map(pointString).join(' ')}" fill="#78e3af" fill-opacity=".17" stroke="none"/>
        <polyline class="complete-outline" points="${complete.map(pointString).join(' ')}" fill="none" stroke="#a4ffbb" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
        `;
      } else {
        const currentPt=p.points[state.solved], target=mirror(currentPt);
        inner += `<circle cx="${currentPt[0]}" cy="${currentPt[1]}" r="23" fill="none" stroke="#ffe49e" stroke-width="4" stroke-dasharray="6 7"/>`;
        if (state.hintLevel >= 1) inner += `<path d="M${currentPt[0]} ${currentPt[1]}H${target[0]}" fill="none" stroke="#ffe9af" stroke-width="2" stroke-dasharray="7 7" opacity=".6"/>`;
        if (state.hintLevel >= 2) inner += goalHint(target,'대응점 '+(state.solved+1));
      }
      inner += labelAt(500,590,state.solved===p.points.length?'모든 대응점 연결 완료!':`${state.solved} / ${p.points.length}개 대응점 완성`,'#c1c8ef');
    }
    inner += '<g id="cursorLayer" aria-hidden="true"></g>';
    board.innerHTML = inner;
  }
  function pointFromEvent(evt) {
    const svg = $('#board'); if (!svg) return null;
    const m = svg.getScreenCTM(); if (!m) return null;
    const pt = svg.createSVGPoint(); pt.x=evt.clientX; pt.y=evt.clientY;
    const p = pt.matrixTransform(m.inverse());
    return { x: clamp(p.x,0,1000), y:clamp(p.y,0,620) };
  }
  function movePointer(evt) {
    if (state.mode !== 'mouse' || state.screen !== 'game' || state.paused || isModal()) return;
    if (evt.pointerType === 'touch' && evt.buttons === 0) return;
    const pt = pointFromEvent(evt); if (!pt) return;
    state.mouseInput = pt; state.mouseActive = true;
  }
  function getPointers() {
    if (state.mode === 'mouse') return state.mouseActive && state.mouseInput ? [state.mouseInput] : [];
    if (!state.cameraReady || !state.lastHandFrameAt || performance.now()-state.lastHandFrameAt>250) return [];
    return state.rawHands;
  }
  function getActivePoint() {
    const points = getPointers(); if (!points.length) return null;
    if (state.stage === 1 && state.mode === 'camera') return null;
    if (state.stage === 1) return points[0];
    const target = targetPoint();
    return [...points].sort((a,b)=> Math.hypot(a.x-target.x,a.y-target.y) - Math.hypot(b.x-target.x,b.y-target.y))[0];
  }
  function targetPoint() {
    const p=puzzle();
    if (state.stage === 1) return { x:1000-p.x, y:p.y };
    if (state.stage === 2) return { x:1000-p.x, y:p.y };
    const raw=p.points[state.solved] || p.points.at(-1); return {x:1000-raw[0], y:raw[1]};
  }
  function within(a,b) { return !!a && Math.hypot(a.x-b.x,a.y-b.y) <= tol(); }
  function targetSatisfied() {
    const points = getPointers(); const target=targetPoint();
    if (state.stage === 1 && state.mode === 'camera') {
      if (points.length < 2) return false;
      const sorted=[...points].sort((a,b)=>a.x-b.x);
      const p=puzzle(); return within(sorted[0],{x:p.x,y:p.y}) && within(sorted[1],target);
    }
    return within(getActivePoint(),target);
  }
  function resetDwell() {state.dwellSince=0;state.dwellFraction=0;state.inside=false;}
  function getFeedback() {
    const points=getPointers();
    if (!points.length) return state.mode==='camera' ? '손이 잘 보이도록 카메라 앞에서 움직여 보세요.' : '게임판 위로 마우스를 이동하거나 화면을 터치해 보세요.';
    if (state.stage===1 && state.mode==='camera' && points.length<2) return '1단계는 양손을 모두 보여주세요.';
    if (targetSatisfied()) return '정답 위치예요! 움직이지 말고 유지해요. ✨';
    const active=state.stage===1 && state.mode==='camera' ? [...points].sort((a,b)=>a.x-b.x)[1] : getActivePoint();
    if (!active) return '대칭되는 위치를 찾아보세요.';
    const target=targetPoint();
    if (Math.abs(active.y-target.y)>tol()/1.5) return active.y < target.y ? '조금 아래로 움직여 높이를 맞춰 보세요.' : '조금 위로 움직여 높이를 맞춰 보세요.';
    if (Math.abs(active.x-target.x)>tol()/1.5) return active.x < target.x ? '조금 더 오른쪽으로 움직여 보세요.' : '조금 더 왼쪽으로 움직여 보세요.';
    return '대칭되는 위치를 찾아보세요.';
  }
  function drawPointers() {
    const layer=$('#cursorLayer'); if (!layer || state.screen!=='game') return;
    const points=getPointers(); const active=getActivePoint(); const completion=state.dwellFraction;
    const showPoints = state.stage===1 && state.mode==='mouse' && active ? [{x:1000-active.x,y:active.y,mirror:true},active] : points;
    layer.innerHTML = showPoints.map((p,i)=>{
      const isActive = active===p || (state.stage===1 && state.mode==='mouse' && i===1) || (state.stage===1 && state.mode==='camera');
      const color=p.mirror?'#acb7ff':i===0?'#84f1d2':'#ffdb95';
      const radius=isActive && state.inside ? 31:23;
      const progress = isActive && state.inside ? `<circle r="${radius+7}" cx="0" cy="0" fill="none" stroke="#ffe9a3" stroke-width="6" stroke-linecap="round" stroke-dasharray="${(2*Math.PI*(radius+7)*completion).toFixed(1)} 500" transform="rotate(-90)"/>` : '';
      return `<g transform="translate(${p.x.toFixed(1)},${p.y.toFixed(1)})"><circle r="${radius+8}" fill="${color}" opacity=".13"/><circle r="${radius}" fill="#151c3f" stroke="${color}" stroke-width="4"/><path d="M-9 0H9M0-9V9" stroke="${color}" stroke-width="2.8" stroke-linecap="round"/>${progress}<text x="0" y="-37" text-anchor="middle" font-size="13" fill="#fff" class="svg-label">${p.mirror?'거울':state.mode==='camera'?'손 '+(i+1):'포인터'}</text></g>`;
    }).join('');
  }
  function updateFeedback() {
    const message=getFeedback();
    if (message!==state.lastFeedback) {const el=$('#feedbackText');if(el)el.textContent=message;state.lastFeedback=message;}
    const dot=$('#liveDot');const tx=$('#trackingText');if(dot)dot.classList.toggle('on',getPointers().length>0);
    if(tx)tx.textContent=state.mode==='camera'?`손 ${state.detectedCount}개 인식 중`:'마우스·터치 입력 준비됨';
  }
  // 웹캠 손끝으로 버튼을 터치하는 UI 조작. 영상은 표시하지 않고 정규화된
  // 손끝 좌표를 화면 전체로 투영한다. 정답 판정은 기존 게임판 좌표계로 유지한다.
  const UI_DWELL_MS = 1050;
  function clearUiHover() {
    if (state.uiHoverTarget) state.uiHoverTarget.classList.remove('hand-hover');
    state.uiHoverTarget=null;
    state.uiDwellSince=0;state.uiDwellFraction=0;
    const cursor=$('#handUiCursor');if(cursor)cursor.classList.remove('visible');
  }
  function updateHandUI(ts) {
    const cursor=$('#handUiCursor'); if (!cursor) return;
    if (!state.rawHands.length) {clearUiHover(); state.uiGestureArmed=true; return;}
    // 완료 검토 화면과 모달은 손끝 UI 커서를 항상 보여 준다.
    const activeUi=state.reviewReady || isModal();
    const hands=state.rawHands.map(p=>({x:p.uiX*window.innerWidth,y:p.uiY*window.innerHeight}));
    const availableTarget=btn=>btn && !btn.disabled && btn.getClientRects().length &&
      (isModal() ? !!btn.closest('#modalRoot') : state.reviewReady ? !!btn.closest('.review-controls') : !!btn.closest('.side-stack, .topbar'));
    let candidate=null;
    for(const hand of hands){
      const el=document.elementFromPoint(hand.x,hand.y);
      const btn=el?.closest('[data-action]');
      if(availableTarget(btn) && (!candidate || btn===state.uiHoverTarget)) {
        candidate={hand,btn}; if(btn===state.uiHoverTarget)break;
      }
    }
    if(candidate) {
      // 버튼을 유지하는 동안에는 손가락 포인터가 목표점을 가리지 않도록 별도 표시.
      if(candidate.btn!==state.uiHoverTarget) {
        if(state.uiHoverTarget)state.uiHoverTarget.classList.remove('hand-hover');
        state.uiHoverTarget=candidate.btn;
        state.uiDwellSince=ts;state.uiDwellFraction=0;
      }
      const hand=candidate.hand;
      cursor.style.left=hand.x+'px';cursor.style.top=hand.y+'px';cursor.classList.add('visible');
      if(state.uiGestureArmed && ts-state.uiLastSelectAt>900) {
        state.uiDwellFraction=clamp((ts-state.uiDwellSince)/UI_DWELL_MS,0,1);
        candidate.btn.style.setProperty('--hand-progress',`${Math.round(state.uiDwellFraction*100)}%`);
        candidate.btn.classList.add('hand-hover');
        if(state.uiDwellFraction>=1) {
          state.uiGestureArmed=false;state.uiLastSelectAt=ts;
          state.uiHoverTarget=null;state.uiDwellFraction=0;state.uiDwellSince=0;
          candidate.btn.classList.remove('hand-hover');
          playNote(730,.12);candidate.btn.click();
          // 클릭 후 손을 버튼에서 빼거나 다른 버튼으로 이동해야 재선택 가능.
          return;
        }
      } else {
        state.uiDwellFraction=0;candidate.btn.classList.remove('hand-hover');
      }
      cursor.style.setProperty('--ui-fill', `${state.uiDwellFraction*100}%`);
      state.uiReleasedAt=0;
    } else {
      if(state.uiHoverTarget)state.uiHoverTarget.classList.remove('hand-hover');
      state.uiHoverTarget=null;state.uiDwellSince=0;state.uiDwellFraction=0;
      cursor.style.setProperty('--ui-fill','0%');
      if(!state.uiReleasedAt)state.uiReleasedAt=ts;
      if(ts-state.uiReleasedAt>=300)state.uiGestureArmed=true;
      if(activeUi) {
        cursor.style.left=hands[0].x+'px';cursor.style.top=hands[0].y+'px';cursor.classList.add('visible');
      } else cursor.classList.remove('visible');
    }
  }

  function frame(ts) {
    try {
      if (state.mode==='camera' && cameraStream && state.cameraReady && landmarker && video.readyState>=2 && ts-lastInferTime > 65) {
        lastInferTime=ts;
        const result=landmarker.detectForVideo(video,ts);
        const hands=result.landmarks || [];
        // 검지 끝(랜드마크 8)을 사용한다. 손바닥 중심을 사용하면 실제 손끝을 맞대도
        // 화면 포인터가 떨어져 보이는 문제가 발생한다.
        // 입력 영상의 정규화 좌표를 화면의 같은 좌표계로 변환한다(가로 거울 반전).
        const next=hands.map((landmarks,i) => {
          const finger = landmarks[8];
          const handedness = result.handednesses?.[i]?.[0]?.categoryName || `손-${i}`;
          return {
            x:clamp(1-finger.x,0,1)*1000,
            y:clamp(finger.y,0,1)*620,
            handId:handedness,
            uiX: clamp(1-finger.x,0,1), uiY: clamp(finger.y,0,1)
          };
        });
        // 손이 매우 가까워져도 다른 손과 이전 좌표가 섞이지 않도록
        // MediaPipe의 handedness로 대응시킨다. 동일한 분류가 중복된 경우에는
        // 같은 이전 손을 두 번 배정하지 않는 최근접 일대일 매칭을 사용한다.
        const used=new Set();
        for(const p of next) {
          const candidates=state.rawHands.map((prev,i)=>({prev,i,
            score:Math.hypot(prev.x-p.x,prev.y-p.y)+(prev.handId===p.handId?0:140)}))
            .filter(v=>!used.has(v.i)).sort((a,b)=>a.score-b.score);
          const chosen=candidates[0];
          if(chosen && chosen.score<240) {
            used.add(chosen.i);
            p.x=p.x*.72+chosen.prev.x*.28;
            p.y=p.y*.72+chosen.prev.y*.28;
            p.uiX=p.uiX*.72+chosen.prev.uiX*.28;
            p.uiY=p.uiY*.72+chosen.prev.uiY*.28;
          }
        }
        state.rawHands=next; state.detectedCount=next.length; state.lastHandFrameAt=ts;
        updateSetupFingerMarkers();
        if(state.screen==='setup' && ts-lastStatusUi>300){
          state.cameraStatus = next.length===2?'양손 인식 성공! 게임을 시작할 준비가 되었어요.':next.length===1?'한 손을 인식했어요. 양손을 모두 보여주세요.':'카메라 앞에 손을 보여주세요.';
          updateSetupStatus();lastStatusUi=ts;
        }
      }
      // 마지막 감지 프레임이 오래되면 손끝이 멈춘 것으로 오판하지 않도록 초기화합니다.
      if (state.mode === 'camera' && state.cameraReady && state.lastHandFrameAt && ts-state.lastHandFrameAt>250) {
        state.rawHands=[];state.detectedCount=0;clearSetupFingerMarkers();resetDwell();
      }
      if (state.mode === 'camera' && state.cameraReady && state.screen === 'game') updateHandUI(ts);
      else clearUiHover();
      if (state.screen==='game' && !state.paused && !isModal()) {
        const inside=targetSatisfied();
        if (inside) {
          if (!state.inside) state.dwellSince=ts;
          state.inside=true;
          state.dwellFraction=clamp((ts-state.dwellSince)/durationRequired(),0,1);
          if (state.dwellFraction>=1) completeTarget();
        } else if(state.inside||state.dwellSince) resetDwell();
        if (!state.paused) drawPointers();
        if (!state.paused && ts-lastStatusUi > 120) {updateFeedback();lastStatusUi=ts;}
      }
    } catch (e) {
      if (frameCount++%120 === 0) console.warn('대칭 마법사 처리:',e);
    }
    requestAnimationFrame(frame);
  }
  function completeTarget() {
    resetDwell(); playNote(610,.09,'sine');
    if (state.stage===3) {
      state.solved += 1;
      renderBoard();
      if (state.solved < puzzle().points.length) {
        $('#missionText').textContent=stageInstruction();
        toast(`✨ ${state.solved}번째 대응점 완성!`);
        return;
      }
      // 마지막 대응점이 확정되면 모든 점을 선분으로 이어 그린 완성 모습을 보여 준다.
      state.paused=true;
      const feedback=$('#feedbackText');
      if(feedback) feedback.textContent='대응점을 모두 찾았어요! 선분으로 연결해 선대칭도형을 완성했어요.';
      state.finishTimer=setTimeout(() => {state.finishTimer=null;if(state.screen==='game')completePuzzle();},1500);
      return;
    }
    if (state.stage===2) {
      // 정답 대응점, 수직 표식, 대칭축에서의 거리 등을 잠깐 유지하여 볼 수 있게 한다.
      state.revealSolved=true; state.paused=true;
      renderBoard();
      const feedback=$('#feedbackText');
      if(feedback) feedback.textContent='성공! 점 A와 A′는 대칭축에서 같은 거리에 있어요.';
      state.finishTimer=setTimeout(() => {state.finishTimer=null;if(state.screen==='game')completePuzzle();},1500);
      return;
    }
    // 챕터 1: 점수만 기록하고 모달로 가리지 않는다. 학생이 양쪽 거리·수직 관계를
    // 게임판에서 눈으로 확인한 뒤 직접 다음 버튼을 선택해야 진행한다.
    if (state.stage===1) {
      if (state.reviewReady) return;
      state.reviewReady=true; state.revealSolved=true; state.paused=true;
      const score=Math.max(50,100-state.hints*10-state.wrongs*5);
      stageScores().push(score);
      successSound();
      renderGame();
      const el=$('#feedbackText'); if(el) el.textContent='정답! 두 점은 같은 높이에 있고, 대칭축에서의 거리가 같습니다. 그림을 살펴본 뒤 다음 버튼을 선택하세요.';
      const lesson=$('#lessonText'); if(lesson) lesson.textContent='좌우 거리가 같은지 보고, 두 점을 잇는 선분이 대칭축과 수직인지 확인하세요.';
      toast('✨ 대칭 성공! 화면의 두 거리를 확인하고 다음 버튼을 선택하세요.');
      return;
    }
    completePuzzle();
  }
  function completePuzzle() {
    state.paused=true;
    const score=Math.max(50,100-state.hints*10-state.wrongs*5);
    stageScores().push(score);
    successSound();
    openModal('puzzle-success',`<div class="success-modal"><div class="success-symbol">✨</div><h2>마법 성공!</h2><p><strong>${puzzle().name}</strong> 미션을 완성했어요.</p><div class="success-score">+${score}점</div><div class="modal-notice">${state.stage===1?'두 점은 대칭축에서 같은 거리, 같은 높이에 있어요.':state.stage===2?'대응점은 대칭축에 수직인 선 위에서 같은 거리만큼 떨어져 있어요.':'반쪽 도형의 대응점을 차례대로 찾아 완성했어요.'}</div>
      <div class="modal-actions"><button class="btn btn-primary" data-action="next-puzzle">${state.puzzle + 1 === progressTotal()?'단계 마치기 →':'다음 마법 도전 →'}</button></div></div>`);
  }
  function nextPuzzle() {
    clearTimeout(state.finishTimer);state.finishTimer=null;
    closeModal();
    if (state.puzzle+1 < progressTotal()) {state.puzzle++;resetPuzzleState();state.paused=false;renderGame();}
    else completeStage();
  }
  function completeStage() {
    const score=average(stageScores()); const last=state.stage===3;
    openModal('stage-complete',`<div class="success-modal"><div class="success-symbol">${last?'🏆':'🪄'}</div><p class="eyebrow">CHAPTER ${state.stage} COMPLETE</p><h2>${stageNames[state.stage-1]}<br>완료!</h2><div class="success-score">${score}점</div><div class="modal-notice">${explanations[state.stage-1]}</div><div class="chapter-row"><span>완료한 문제 ${progressTotal()}개</span><span>다음 단계 ${last?'최종 결과':state.stage+1+'단계'}</span></div>
       <div class="modal-actions"><button class="btn btn-primary" data-action="${last?'show-result':'next-stage'}">${last?'마법사 인증서 보기 →':'다음 마법 배우기 →'}</button></div></div>`);
  }
  function confirmAttempt() {
    if (state.screen!=='game'||state.paused||isModal()) return;
    // 웹캠은 버튼 클릭 한 번으로 안정적인 유지 시간을 건너뛰지 못하게 합니다.
    // 손끝이 정확한 원형 정답 영역 안에 설정된 시간 동안 머물면 자동 확정됩니다.
    if (state.mode==='camera' && targetSatisfied()) {
      toast('정확한 위치예요! 손가락을 그대로 유지하면 자동 확정돼요.');
      return;
    }
    if (state.mode!=='camera' && targetSatisfied()) {completeTarget();return;}
    const hasInput=getPointers().length>0;
    if (hasInput) state.wrongs++;
    const message=hasInput?'정답 지점에서 조금 벗어났어요. 손끝을 더 정확히 맞추고 잠시 유지해 보세요.':'먼저 손 또는 포인터를 게임판에 보여주세요.';
    playNote(215,.12,'triangle',.02);toast(message);resetDwell();
    const el=$('#feedbackText');if(el)el.textContent=message;state.lastFeedback=message;
  }
  function hint() {
    if (state.screen!=='game'||state.paused||isModal()) return;
    if (state.hintLevel>=2) {toast('모든 힌트를 확인했어요. 이제 대응점을 찾아보세요!');return;}
    state.hints++;state.hintLevel++;
    if(state.stage===1){toast(state.hintLevel===1?'양손이 같은 높이에 있어야 해요.':'양손은 대칭축에서 같은 거리만큼 떨어져야 해요.');}
    else toast(state.hintLevel===1?'점과 대응점을 연결하면 대칭축에 수직이에요.':'정답 근처에 노란 표시가 나타났어요!');
    renderBoard();
  }
  function renderResults() {
    clearTimeout(state.finishTimer);state.finishTimer=null;
    closeModal();state.paused=true;state.mouseActive=false; stopCamera();
    const finalScore=completedScore();const stars=finalScore>=90?3:finalScore>=75?2:1;
    const starText='★'.repeat(stars)+'☆'.repeat(3-stars);
    state.studentName = '';
    switchScreen('results',`<div class="result-view"><div class="certificate"><span class="pill">✦ SYMMETRY WIZARD CERTIFICATE</span><div class="cert-icon">🧙‍♂️</div><h1>대칭 마법사 인증!</h1>
      <div class="certificate-recipient" id="certificateNamePreview" aria-live="polite">이름을 입력하면 인증서에 표시돼요</div>
      <p>거울 마법, 대응점 찾기, 도형 완성까지<br>세 가지 마법 수업을 모두 완수했어요.</p><div class="stars" aria-label="별 ${stars}개 획득">${starText}</div><div class="result-number">${finalScore}<small> / 100점</small></div><p>${finalScore>=90?'완벽해요! 선대칭의 비밀을 멋지게 발견했어요.':finalScore>=75?'정말 잘했어요! 선대칭을 이해하는 마법사가 되었어요.':'끝까지 도전한 멋진 마법사! 다시 도전하며 더 알아봐요.'}</p></div>
      <div class="name-entry"><label for="studentName">✍️ 인증서에 넣을 이름</label><input id="studentName" name="studentName" type="text" maxlength="20" autocomplete="off" spellcheck="false" placeholder="이름을 입력해 주세요" aria-describedby="namePrivacy"/><p id="namePrivacy">입력한 이름은 인증서와 저장 이미지에만 사용되며 서버에 전송·저장되지 않아요.</p></div>
      <div class="result-grid">${stageNames.map((s,i)=>`<div class="result-small"><strong>${i+1}단계 · ${s}</strong><div class="result-score">${average(state.scores[i])}점</div><p class="top-tip">${state.scores[i].length}문제 완료</p></div>`).join('')}</div>
      <div class="result-actions"><button class="btn btn-primary" data-action="download">⬇ 이름이 적힌 인증서 저장</button><button class="btn btn-secondary" data-action="restart-all">↻ 처음부터 다시 도전</button><button class="btn btn-ghost" data-action="home">⌂ 처음 화면</button></div></div>`);
  }
  function saveResultImage() {
    const input = $('#studentName');
    const studentName = (input?.value || '').trim();
    if (!studentName) { toast('인증서에 넣을 이름을 입력해 주세요.'); input?.focus(); return; }
    state.studentName = studentName;
    const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=675;
    const ctx=canvas.getContext('2d');if(!ctx)return;
    const grad=ctx.createLinearGradient(0,0,1200,675);grad.addColorStop(0,'#211e50');grad.addColorStop(1,'#101d37');ctx.fillStyle=grad;ctx.fillRect(0,0,1200,675);
    ctx.strokeStyle='#d7baff';ctx.lineWidth=5;ctx.strokeRect(38,38,1124,599);
    ctx.textAlign='center';ctx.fillStyle='#f9dc96';ctx.font='bold 27px sans-serif';ctx.fillText('✦   SYMMETRY WIZARD   ✦',600,116);
    ctx.fillStyle='#f5efff';ctx.font='bold 67px sans-serif';ctx.fillText('대칭 마법사 인증서',600,205);
    ctx.fillStyle='#f5e5ff';
    let nameFont=47; ctx.font=`bold ${nameFont}px sans-serif`;
    while (ctx.measureText(`${studentName} 학생`).width > 920 && nameFont > 23) { nameFont -= 2; ctx.font=`bold ${nameFont}px sans-serif`; }
    ctx.fillText(`${studentName} 학생`,600,270);
    ctx.fillStyle='#cbd1f1';ctx.font='27px sans-serif';ctx.fillText('거울 마법 · 대응점 찾기 · 대칭도형 완성',600,330);
    const finalScore=completedScore();const stars=finalScore>=90?3:finalScore>=75?2:1;
    ctx.fillStyle='#ffe09b';ctx.font='bold 60px sans-serif';ctx.fillText('★'.repeat(stars)+'☆'.repeat(3-stars),600,407);
    ctx.fillStyle='#fff';ctx.font='bold 56px sans-serif';ctx.fillText(`${finalScore} / 100점`,600,488);
    ctx.fillStyle='#cbd1f1';ctx.font='21px sans-serif';ctx.fillText('대칭의 원리를 발견한 멋진 수학 마법사!',600,567);
    const link=document.createElement('a');link.download=`대칭마법사_인증서_${studentName.replace(/[\\/:*?"<>|]/g, '_').slice(0,20)}.png`;link.href=canvas.toDataURL('image/png');link.click();toast('인증서 이미지를 저장했어요.');
  }
  function openHelp() {
    openModal('help',`<div class="modal-header"><h2>🪄 게임 방법</h2><button class="icon-btn" data-action="close-modal" aria-label="닫기">×</button></div>
      <p>손동작 또는 마우스·터치로 대칭의 원리를 배우는 세 가지 게임을 해요. 선택한 난이도에서 단계마다 20문제 중 5문제가 무작위로 출제되며, 단계 안에서 같은 문제는 반복되지 않아요.</p>
      <div class="modal-notice">📷 웹캠에서는 검지 끝이 포인터입니다. 약 60~100cm 떨어져 양손을 화면 안에 놓으세요. 너무 가까이 있거나 손이 겹쳐 한 손을 가리면 인식이 어려울 수 있어요.</div>
      <h3>1단계 · 거울 마법 훈련</h3><p>웹캠 모드에서는 <strong>두 손</strong>을 양쪽 별에 맞춰요. 마우스·터치 모드에서는 오른쪽 별에 포인터를 가져가면 왼쪽 거울 포인터가 함께 움직여요. 성공하면 <strong>좌우 거리와 수직 관계를 확인한 후</strong> 직접 다음 문제 버튼을 선택해요.</p>
      <h3>2단계 · 사라진 대응점 찾기</h3><p>점 A를 보고 대칭축 반대편에서 같은 높이와 거리에 있는 점 A′를 찾아요.</p>
      <h3>3단계 · 대칭도형 완성</h3><p>왼쪽 도형의 번호를 확인하고 오른쪽에서 대응점을 차례로 찾아요.</p>
      <div class="modal-notice">✨ 정답 위치에 포인터를 잠시 유지하면 자동으로 선택돼요. 웹캠에서는 검지 끝을 화면의 '다음 문제', '다음 단계' 등 버튼 위에 약 1초간 유지해 선택할 수도 있어요. 버튼을 누른 뒤 손을 떼었다가 다시 선택해요.</div>
      <div class="modal-actions"><button class="btn btn-primary" data-action="close-modal">알겠어요!</button></div>`,true);
  }
  function openSettings() {
    const s=state.settings;
    openModal('settings',`<div class="modal-header"><h2>⚙ 마법 설정</h2><button class="icon-btn" data-action="close-modal" aria-label="닫기">×</button></div>
      <div class="setting-row"><label for="difficulty">게임 난이도</label><select id="difficulty"><option value="easy" ${s.difficulty==='easy'?'selected':''}>쉬움</option><option value="normal" ${s.difficulty==='normal'?'selected':''}>보통</option><option value="hard" ${s.difficulty==='hard'?'selected':''}>어려움</option></select></div>
      <div class="setting-row"><label for="dwellScale">선택 유지 시간</label><select id="dwellScale"><option value="0.75" ${s.dwellScale===.75?'selected':''}>빠르게 (×0.75)</option><option value="1" ${s.dwellScale===1?'selected':''}>기본 (×1)</option><option value="1.5" ${s.dwellScale===1.5?'selected':''}>여유롭게 (×1.5)</option><option value="2" ${s.dwellScale===2?'selected':''}>천천히 (×2)</option></select></div>
      <div class="setting-row"><label for="sound">효과음 사용</label><input id="sound" type="checkbox" ${s.sound?'checked':''}/></div>
      <p>난이도별로 각 단계에 20개 문제가 준비되어 있어요. 각 단계에서 5문제가 중복 없이 무작위 출제됩니다. <strong>플레이 중 난이도를 변경하면 처음부터 새로운 문제를 시작합니다.</strong></p>
      <div class="modal-actions"><button class="btn btn-ghost" data-action="reset-settings">초기값</button><button class="btn btn-primary" data-action="save-settings">설정 저장</button></div>`);
  }
  function saveSettings() {
    const previousDifficulty = state.settings.difficulty;
    state.settings={
      difficulty: $('#difficulty').value,
      dwellScale: Number($('#dwellScale').value),
      sound: $('#sound').checked
    };
    try {localStorage.setItem(STORAGE_KEY,JSON.stringify(state.settings));} catch (_) {}
    closeModal();
    if (state.screen === 'game' && previousDifficulty !== state.settings.difficulty) {
      state.scores = [[], [], []];
      state.studentName = '';
      startStage(1);
      toast('난이도를 바꾸어 1단계부터 새 문제 5개를 출제했어요.');
    } else {
      if (state.screen === 'game') renderGame();
      toast('설정이 저장되었어요.');
    }
  }
  function pause() {
    openModal('paused',`<div class="success-modal"><div class="success-symbol">⏸️</div><h2>잠깐 쉬어가기</h2><p>언제든지 다시 이어서 할 수 있어요.</p><div class="modal-actions"><button class="btn btn-primary" data-action="close-modal">▶ 게임 계속하기</button><button class="btn btn-secondary" data-action="restart">↺ 단계 다시</button><button class="btn btn-ghost" data-action="home-confirm">⌂ 처음 화면</button></div></div>`);
  }
  function confirmHome() {
    openModal('home-confirm',`<div class="modal-header"><h2>처음 화면으로 갈까요?</h2></div><p>지금까지 진행한 게임 점수는 초기화돼요.</p><div class="modal-actions"><button class="btn btn-ghost" data-action="close-modal">계속하기</button><button class="btn btn-primary" data-action="home">처음 화면으로</button></div>`);
  }
  function confirmRestart() {
    openModal('restart-confirm',`<div class="modal-header"><h2>이 단계부터 다시 도전할까요?</h2></div><p>현재 단계의 점수는 초기화되지만 이전 단계 점수는 유지돼요.</p><div class="modal-actions"><button class="btn btn-ghost" data-action="close-modal">취소</button><button class="btn btn-primary" data-action="restart-confirmed">다시 시작하기</button></div>`);
  }
  function swapInput() {
    clearTimeout(state.finishTimer);state.finishTimer=null;
    const changed=state.mode==='camera'?'mouse':'camera';closeModal();
    state.mode=changed;if(changed==='mouse')stopCamera();
    state.mouseInput=null;state.mouseActive=false;resetDwell();
    if(changed==='camera'&&!state.cameraReady){setup();}
    else renderGame();
    toast(changed==='mouse'?'마우스·터치 조작으로 바뀌었어요.':'웹캠 손동작 조작으로 바뀌었어요.');
  }
  document.addEventListener('input', e => {
    if (e.target.id !== 'studentName') return;
    const normalized = e.target.value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 20);
    if (e.target.value !== normalized) e.target.value = normalized;
    state.studentName = normalized.trim();
    const preview = $('#certificateNamePreview');
    if (preview) preview.textContent = state.studentName ? `${state.studentName} 학생` : '이름을 입력하면 인증서에 표시돼요';
  });
  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-action]'); if(!btn)return;
    const action=btn.dataset.action;userGestureAudio=true;
    switch(action){
      case 'home': if(state.screen==='game' && !isModal())confirmHome();else home();break;
      case 'home-confirm': confirmHome();break;
      case 'help': openHelp();break;
      case 'settings': openSettings();break;
      case 'close-modal': closeModal();break;
      case 'select-camera': chooseMode('camera');break;
      case 'select-mouse': chooseMode('mouse');break;
      case 'connect-camera': startCamera();break;
      case 'start-game':
        if(state.mode==='camera'&&!state.cameraReady){toast('먼저 카메라를 연결하거나 마우스·터치 모드를 선택해 주세요.');break;}
        state.scores=[[],[],[]];state.studentName='';startStage(1);break;
      case 'hint': hint();break;
      case 'confirm': confirmAttempt();break;
      case 'pause': pause();break;
      case 'restart': confirmRestart();break;
      case 'restart-confirmed': startStage(state.stage);break;
      case 'next-puzzle': nextPuzzle();break;
      case 'next-stage': startStage(state.stage+1);break;
      case 'show-result': renderResults();break;
      case 'restart-all': state.scores=[[],[],[]];state.studentName=''; chooseMode(state.mode);break;
      case 'download': saveResultImage();break;
      case 'switch-input': swapInput();break;
      case 'save-settings': saveSettings();break;
      case 'reset-settings':
        $('#difficulty').value='normal';$('#dwellScale').value='1';$('#sound').checked=true;break;
    }
  });
  document.addEventListener('keydown',e=>{
    if (e.key==='Escape' && isModal() && ['settings','help','paused','home-confirm','restart-confirm'].includes(state.modal))closeModal();
    if (e.code==='Space' && state.screen==='game' && !isModal() && e.target.tagName==='BODY') {e.preventDefault();confirmAttempt();}
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden && state.screen==='game' && !isModal()) {state.paused=true;pause();}
  });
  window.addEventListener('pagehide',()=>stopCamera());
  home();requestAnimationFrame(frame);
  // 테스트 환경에서 게임 판정과 화면 상태를 확인하기 위한 읽기 전용 진단 도우미.
  window.SymmetryWizardDebug = Object.freeze({
    getStatus: () => ({ screen:state.screen,mode:state.mode,difficulty:state.settings.difficulty,stage:state.stage,puzzle:state.puzzle,solved:state.solved,reviewReady:state.reviewReady,modal:state.modal,score:completedScore(),scores:state.scores.map(x=>x.slice()),cameraReady:state.cameraReady,questionIds:state.sessionPuzzles.map(list=>list.map(p=>p.id)) }),
    getBankSummary: () => Object.fromEntries(Object.entries(PROBLEM_BANK).map(([k,stages]) => [k,stages.map(list=>({count:list.length,uniqueIds:new Set(list.map(p=>p.id)).size,uniqueGeometry:new Set(list.map(p=>JSON.stringify({x:p.x,y:p.y,points:p.points}))).size}))])),
    reflect: (x,y,axis=500)=>({x:2*axis-x,y}),
    // 직접 입력 위치는 개발 테스트에서만 사용한다.
  });
})();
