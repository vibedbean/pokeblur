// Versus View Tab Switcher & Hash Router
document.addEventListener('DOMContentLoaded', () => {
  const vsBtn = document.getElementById('mode-versus-btn');
  const vsView = document.getElementById('versus-view');

  if (!vsBtn || !vsView) return;

  const tabToHash = {
    'mode-daily-btn': '#daily',
    'mode-unlimited-btn': '#unlimited',
    'mode-reverse-btn': '#reverse',
    'mode-versus-btn': '#versus'
  };

  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const targetHash = tabToHash[e.currentTarget.id];
      if (targetHash) {
        window.location.hash = targetHash;
      }
    });
  });

  function syncViewWithHash() {
    const hash = window.location.hash.toLowerCase() || '#daily';

    if (hash === '#versus' || hash.startsWith('#versus/')) {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      vsBtn.classList.add('active');

      document.querySelectorAll('.main-content > div').forEach(div => {
        if (div !== vsView) div.classList.add('hidden');
      });
      vsView.classList.remove('hidden');
    } else {
      vsView.classList.add('hidden');

      let targetBtn;
      if (hash === '#reverse') {
        targetBtn = document.getElementById('mode-reverse-btn');
      } else if (hash === '#unlimited') {
        targetBtn = document.getElementById('mode-unlimited-btn');
      } else {
        targetBtn = document.getElementById('mode-daily-btn');
      }

      if (!targetBtn) return;

      if (!targetBtn.classList.contains('active')) {
        targetBtn.click();
      } else {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        targetBtn.classList.add('active');
      }
    }
  }

  window.addEventListener('hashchange', syncViewWithHash);
  syncViewWithHash();
});

// ==========================================
// VERSUS MODE — 4-PLAYER REAL-TIME MULTIPLAYER (PeerJS)
// ==========================================
let vsPeer = null;
let vsIsHost = false;
let vsHostConn = null;
let vsClients = [];
let vsPlayers = {};
let vsRoomCode = null;

const VS_REVEAL_MODES = ['Classic Blur', 'Pixelation', 'Tile Reveal', 'Silhouette', 'Zoom Out', 'Scramble'];
const VS_REVEAL_DURATION = 25000;
const VS_MAX_POINTS = 100;
const VS_MIN_POINTS = 20;
const VS_WRONG_PENALTY_MS = 2000;
const VS_SHINY_CHANCE = 0.2;
const VS_MAX_PLAYERS = 4;
const VS_AUTO_ADVANCE_MS = 3000;

let vsNumRounds = 5;
let vsRound = 0;
let vsCurrentRevealMode = 'Classic Blur';
let vsAnswer = null;
let vsIsShinyRound = false;
let vsRoundStartTime = 0;
let vsAnimFrame = null;
let vsRoundLocked = false;
let vsGuessLocked = false;
let vsPenaltyTimer = null;
let vsPixelBuffer = null;
let vsTileOrder = null;
let vsScrambleOffsets = null;
let vsScaledSprite = null;   // pre-scaled 280x280 copy of the current artwork

let vsAutoAdvanceTimer = null;
let vsCountdownInterval = null;

// Audio
let vsAudioCtx = null;
function getVsAudioCtx() {
  if (!vsAudioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    vsAudioCtx = new AC();
  }
  if (vsAudioCtx.state === 'suspended') vsAudioCtx.resume();
  return vsAudioCtx;
}
function playVsTone(freq, duration, type = 'sine', volume = 0.12, delay = 0) {
  try {
    const ctx = getVsAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t = ctx.currentTime + delay;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  } catch (e) { /* audio not available */ }
}

document.addEventListener('DOMContentLoaded', () => {
  const vsLobbyScreen = document.getElementById('vs-lobby-screen');
  const vsGameplayScreen = document.getElementById('vs-gameplay-screen');
  const vsCreateRoomBtn = document.getElementById('vs-create-room-btn');
  const vsJoinRoomBtn = document.getElementById('vs-join-room-btn');
  const vsRoomIdInput = document.getElementById('vs-room-id-input');
  const vsLobbyStatus = document.getElementById('vs-lobby-status');
  const vsRoomCodeDisplay = document.getElementById('vs-room-code-display');
  const vsCopyCodeBtn = document.getElementById('vs-copy-code-btn');
  const vsMyNameInput = document.getElementById('vs-my-name-input');
  const vsPlayerSlots = document.getElementById('vs-player-slots');
  const vsRoundsSelector = document.getElementById('vs-rounds-selector');
  const vsRoundsValue = document.getElementById('vs-rounds-value');
  const vsRoundsMinus = document.getElementById('vs-rounds-minus');
  const vsRoundsPlus = document.getElementById('vs-rounds-plus');
  const vsStartGameBtn = document.getElementById('vs-start-game-btn');
  const vsLobbyHint = document.getElementById('vs-lobby-hint');
  const vsWaitingMsg = document.getElementById('vs-waiting-msg');

  const vsWheelOverlay = document.getElementById('vs-wheel-overlay');
  const wheelCanvas = document.getElementById('wheel-canvas');
  const wheelResultText = document.getElementById('wheel-result-text');
  const vsShinyBanner = document.getElementById('vs-shiny-banner');

  const vsModeTitle = document.getElementById('vs-mode-title');
  const vsRoundLabel = document.getElementById('vs-round-label');
  const vsRevealCanvas = document.getElementById('vs-reveal-canvas');
  const vsImageOverlay = document.getElementById('vs-image-overlay');
  const vsPokemonImage = document.getElementById('vs-pokemon-image');
  const vsPlayerBars = document.getElementById('vs-player-bars');

  const vsGuessInput = document.getElementById('vs-guess-input');
  const vsSuggestions = document.getElementById('vs-suggestions');
  const vsResultMessage = document.getElementById('vs-result-message');
  const vsRoundOverPanel = document.getElementById('vs-round-over-panel');
  const vsRoundWinnerText = document.getElementById('vs-round-winner-text');
  const vsRoundAnswerText = document.getElementById('vs-round-answer-text');
  const vsWaitingNextMsg = document.getElementById('vs-waiting-next-msg');

  const vsGameOverPanel = document.getElementById('vs-game-over-panel');
  const vsWinnerText = document.getElementById('vs-winner-text');
  const vsFinalStandings = document.getElementById('vs-final-standings');
  const vsPlayAgainBtn = document.getElementById('vs-play-again-btn');
  const vsLeaveRoomBtn = document.getElementById('vs-leave-room-btn');

  if (!vsCreateRoomBtn) return;

  // Safety net: remove the old Next Round button if it's still in the HTML.
  const staleNextBtn = document.getElementById('vs-next-round-btn');
  if (staleNextBtn && staleNextBtn.parentNode) {
    staleNextBtn.parentNode.removeChild(staleNextBtn);
  }

  (function prefillFromHash() {
    const m = window.location.hash.match(/^#versus\/(.+)$/i);
    if (m && m[1]) vsRoomIdInput.value = decodeURIComponent(m[1]);
  })();

  vsRoundsMinus.addEventListener('click', () => {
    vsNumRounds = Math.max(1, vsNumRounds - 1);
    vsRoundsValue.textContent = vsNumRounds;
  });
  vsRoundsPlus.addEventListener('click', () => {
    vsNumRounds = Math.min(15, vsNumRounds + 1);
    vsRoundsValue.textContent = vsNumRounds;
  });

  vsCreateRoomBtn.addEventListener('click', () => {
    vsIsHost = true;
    const roomCode = 'vs-' + Math.random().toString(36).substring(2, 7);
    initVsPeer(roomCode);
  });

  vsJoinRoomBtn.addEventListener('click', () => {
    vsIsHost = false;
    const hostId = vsRoomIdInput.value.trim();
    if (!hostId) return alert('Enter a room code first!');
    initVsPeer(null, hostId);
  });

  function initVsPeer(customId, joinHostId) {
    if (typeof Peer === 'undefined') {
      alert('The multiplayer library failed to load — check your connection and reload the page.');
      return;
    }
    vsPeer = customId ? new Peer(customId) : new Peer();

    vsPeer.on('open', (id) => {
      vsRoomCode = vsIsHost ? id : joinHostId;
      vsLobbyStatus.classList.remove('hidden');
      vsRoomCodeDisplay.textContent = vsRoomCode;
      window.location.hash = `#versus/${vsRoomCode}`;

      if (vsIsHost) {
        vsPlayers = {};
        vsPlayers[id] = { name: 'Host', score: 0, slot: 0 };
        if (vsMyNameInput) vsMyNameInput.value = 'Host';
        vsRoundsSelector.classList.remove('hidden');
        renderVsLobby();
      } else if (joinHostId) {
        vsHostConn = vsPeer.connect(joinHostId, { reliable: true });
        setupVsConnection(vsHostConn);
      }
    });

    vsPeer.on('error', (err) => {
      console.error('PeerJS error:', err);
      if (err.type === 'peer-unavailable') {
        alert("Couldn't find that room — double check the code and try again.");
      } else if (err.type === 'unavailable-id') {
        alert('That room code is already taken — try creating again.');
      } else {
        alert('Connection error: ' + err.type);
      }
    });

    vsPeer.on('connection', (conn) => {
      if (!vsIsHost) return;
      if (vsGameplayScreen && !vsGameplayScreen.classList.contains('hidden')) {
        conn.on('open', () => { conn.send({ type: 'GAME_IN_PROGRESS' }); conn.close(); });
        return;
      }
      if (vsClients.length >= VS_MAX_PLAYERS - 1) {
        conn.on('open', () => { conn.send({ type: 'LOBBY_FULL' }); conn.close(); });
        return;
      }
      vsClients.push(conn);
      setupVsConnection(conn);
    });
  }

  function setupVsConnection(conn) {
    conn.on('open', () => {
      if (!vsIsHost) {
        const defaultName = `Player ${Math.floor(Math.random() * 900 + 100)}`;
        if (vsMyNameInput) vsMyNameInput.value = defaultName;
        conn.send({ type: 'JOIN', peerId: vsPeer.id, name: defaultName });
      }
    });

    conn.on('data', (data) => handleVsNetworkMessage(data, conn));

    conn.on('close', () => {
      if (!vsIsHost) return;
      vsClients = vsClients.filter(c => c !== conn);
      if (conn._vsPeerId && vsPlayers[conn._vsPeerId]) {
        delete vsPlayers[conn._vsPeerId];
        renderVsLobby();
        broadcastVs({ type: 'LOBBY_UPDATE', players: vsPlayers, numRounds: vsNumRounds });
      }
    });
  }

  function broadcastVs(data) {
    vsClients.forEach(c => { if (c.open) c.send(data); });
  }

  function handleVsNetworkMessage(data, conn) {
    switch (data.type) {
      case 'JOIN': {
        if (!vsIsHost) break;
        const usedSlots = new Set(Object.values(vsPlayers).map(p => p.slot));
        let slot = 0;
        while (usedSlots.has(slot) && slot < VS_MAX_PLAYERS) slot++;
        conn._vsPeerId = data.peerId;
        vsPlayers[data.peerId] = { name: data.name || `Player ${slot + 1}`, score: 0, slot };
        renderVsLobby();
        broadcastVs({ type: 'LOBBY_UPDATE', players: vsPlayers, numRounds: vsNumRounds });
        break;
      }

      case 'NAME_UPDATE': {
        if (!vsIsHost) break;
        if (!vsPlayers[data.peerId]) break;

        vsPlayers[data.peerId].name = data.name;
        renderVsLobby();
        broadcastVs({ type: 'LOBBY_UPDATE', players: vsPlayers, numRounds: vsNumRounds });
        break;
      }

      case 'LOBBY_UPDATE':
        vsPlayers = data.players;
        vsNumRounds = data.numRounds;
        renderVsLobby();
        break;

      case 'LOBBY_FULL':
        alert('That room is already full (4/4 players).');
        location.hash = '#versus';
        location.reload();
        break;

      case 'GAME_IN_PROGRESS':
        alert('That game has already started — ask the host for the next room code.');
        location.hash = '#versus';
        location.reload();
        break;

      case 'START_GAME':
        vsNumRounds = data.numRounds;
        vsPlayers = data.players || vsPlayers;
        vsRound = 0;
        vsModeTitle.textContent = 'Choosing Round Mode...';
        vsRoundLabel.textContent = '';
        vsLobbyScreen.classList.add('hidden');
        vsGameplayScreen.classList.remove('hidden');
        vsGameOverPanel.classList.add('hidden');
        vsRoundOverPanel.classList.add('hidden');
        break;

      case 'VS_SPIN_START':
        showVsWheelDuringSpin(data.targetMode);
        break;

      case 'START_ROUND':
        applyStartRound(data);
        break;

      case 'CORRECT_GUESS':
        if (vsIsHost) handleCorrectGuess(data.peerId, data.elapsedMs);
        break;

      case 'ROUND_RESULT':
        applyRoundResult(data);
        break;

      case 'GAME_OVER':
        applyGameOver(data);
        break;
    }
  }

  function renderVsLobby() {
    vsPlayerSlots.innerHTML = '';
    const entries = Object.entries(vsPlayers).map(([id, p]) => ({ id, ...p }));

    for (let i = 0; i < VS_MAX_PLAYERS; i++) {
      const entry = entries.find(p => p.slot === i);
      const div = document.createElement('div');
      div.className = 'vs-slot' + (entry ? ' filled' : ' empty');
      if (entry) {
        const isYou = vsPeer && entry.id === vsPeer.id;
        const roleLabel = entry.slot === 0 ? 'HOST' : 'PLAYER';
        div.innerHTML = `
          <span class="vs-slot-role">${roleLabel}</span>
          <span class="vs-slot-name">${entry.name}${isYou ? ' (You)' : ''}</span>
        `;
      } else {
        div.innerHTML = `<span class="vs-slot-role empty-role">OPEN</span><span class="vs-slot-name">Empty Slot</span>`;
      }
      vsPlayerSlots.appendChild(div);
    }

    const count = entries.length;
    if (vsIsHost) {
      vsStartGameBtn.classList.remove('hidden');
      vsStartGameBtn.disabled = count < 2;
      vsLobbyHint.classList.remove('hidden');
      vsLobbyHint.textContent = count < 2
        ? 'Need at least 2 players to start.'
        : `Ready! ${count} players in the room.`;
      vsWaitingMsg.classList.add('hidden');
    } else {
      vsStartGameBtn.classList.add('hidden');
      vsLobbyHint.classList.add('hidden');
      vsWaitingMsg.classList.remove('hidden');
    }
  }

  function commitMyNameChange() {
    if (!vsMyNameInput || !vsPeer) return;
    const myId = vsPeer.id;
    const newName = vsMyNameInput.value.trim().slice(0, 16);
    if (!newName || !vsPlayers[myId] || vsPlayers[myId].name === newName) {
      if (vsPlayers[myId]) vsMyNameInput.value = vsPlayers[myId].name;
      return;
    }
    vsPlayers[myId].name = newName;
    renderVsLobby();
    if (vsIsHost) {
      broadcastVs({ type: 'LOBBY_UPDATE', players: vsPlayers, numRounds: vsNumRounds });
    } else if (vsHostConn) {
      vsHostConn.send({ type: 'NAME_UPDATE', peerId: myId, name: newName });
    }
  }
  if (vsMyNameInput) {
    vsMyNameInput.addEventListener('change', commitMyNameChange);
    vsMyNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') vsMyNameInput.blur();
    });
  }

  vsCopyCodeBtn.addEventListener('click', async () => {
    const link = `${window.location.origin}${window.location.pathname}#versus/${vsRoomCode}`;
    try {
      await navigator.clipboard.writeText(link);
      vsCopyCodeBtn.textContent = 'Copied!';
      setTimeout(() => { vsCopyCodeBtn.textContent = 'Copy Link'; }, 1500);
    } catch (e) {
      prompt('Copy this invite link:', link);
    }
  });

  vsStartGameBtn.addEventListener('click', () => {
    if (!vsIsHost || Object.keys(vsPlayers).length < 2) return;
    vsRound = 0;
    Object.values(vsPlayers).forEach(p => { p.score = 0; });
    vsModeTitle.textContent = 'Choosing Round Mode...';
    vsRoundLabel.textContent = '';
    broadcastVs({ type: 'START_GAME', numRounds: vsNumRounds, players: vsPlayers });
    vsLobbyScreen.classList.add('hidden');
    vsGameplayScreen.classList.remove('hidden');
    launchVsRound();
  });

  // ---- Round lifecycle (host drives it) ----
  function launchVsRound() {
    clearTimeout(vsAutoAdvanceTimer);
    clearInterval(vsCountdownInterval);
    vsAutoAdvanceTimer = null;
    vsCountdownInterval = null;

    vsRound++;
    const chosenMode = VS_REVEAL_MODES[Math.floor(Math.random() * VS_REVEAL_MODES.length)];
    const isShiny = Math.random() < VS_SHINY_CHANCE;

    broadcastVs({ type: 'VS_SPIN_START', targetMode: chosenMode });

    spinVsWheel(chosenMode, async () => {
      const pkmnData = typeof fetchRandomPokemonWithArtwork === 'function'
        ? await fetchRandomPokemonWithArtwork(isShiny)
        : { rawName:'pikachu', displayName:'Pikachu', image:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png' };

      const payload = {
        type: 'START_ROUND',
        round: vsRound,
        revealMode: chosenMode,
        pokemon: pkmnData,
        isShiny,
        startTime: Date.now() + 600,
        numRounds: vsNumRounds
      };

      broadcastVs(payload);
      applyStartRound(payload);
    });
  }

  // ---- Wheel with pointer, winner highlight, and audio ----
  function spinVsWheel(targetMode, callback) {
    vsWheelOverlay.classList.remove('hidden');

    // Hide the "Next round in X..." message while the wheel is on screen.
    if (vsWaitingNextMsg) vsWaitingNextMsg.classList.add('hidden');

    const ctx = wheelCanvas.getContext('2d');
    const W = 280, R = 120, cx = 140, cy = 140;
    const numSlices = VS_REVEAL_MODES.length;
    const sliceAngle = (2 * Math.PI) / numSlices;
    const colors = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#2ecc71', '#e67e22'];

    const targetIdx = VS_REVEAL_MODES.indexOf(targetMode);
    const fullSpins = 5;
    const targetAngle = (2 * Math.PI) - (targetIdx + 0.5) * sliceAngle;
    const finalAngle = fullSpins * 2 * Math.PI + targetAngle;

    let start = null;
    let spinDone = false;
    let lastTickIdx = 0;
    wheelResultText.textContent = 'Spinning...';

    playVsTone(220, 0.18, 'sawtooth', 0.05);
    playVsTone(440, 0.30, 'sine', 0.04, 0.05);

    function drawWheel(angle) {
      ctx.clearRect(0, 0, W, W);

      for (let i = 0; i < numSlices; i++) {
        const a0 = angle - Math.PI / 2 + i * sliceAngle;
        const a1 = a0 + sliceAngle;

        const isWinner = spinDone && i === targetIdx;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, a0, a1);
        ctx.closePath();
        ctx.fillStyle = isWinner ? '#ffcb05' : colors[i % colors.length];
        ctx.fill();
        ctx.strokeStyle = '#1a262c';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(a0 + sliceAngle / 2);
        ctx.fillStyle = isWinner ? '#1a262c' : '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(VS_REVEAL_MODES[i], R - 10, 0);
        ctx.restore();
      }

      // Pointer triangle at 12 o'clock
      ctx.beginPath();
      ctx.moveTo(cx, cy - R + 4);
      ctx.lineTo(cx - 12, cy - R - 16);
      ctx.lineTo(cx + 12, cy - R - 16);
      ctx.closePath();
      ctx.fillStyle = '#ff4757';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (!spinDone) {
        const tickIdx = Math.floor(angle / sliceAngle);
        if (tickIdx !== lastTickIdx) {
          lastTickIdx = tickIdx;
          playVsTone(1300, 0.022, 'square', 0.035);
        }
      }
    }

    function animate(time) {
      if (!start) start = time;
      const elapsed = time - start;
      if (elapsed < 3000) {
        const progress = elapsed / 3000;
        const easeOut = 1 - Math.pow(1 - progress, 3);
        drawWheel(easeOut * finalAngle);
        requestAnimationFrame(animate);
      } else {
        spinDone = true;
        drawWheel(finalAngle);
        wheelResultText.textContent = `Mode: ${targetMode}!`;

        playVsTone(523.25, 0.14, 'sine', 0.14, 0);
        playVsTone(659.25, 0.14, 'sine', 0.14, 0.10);
        playVsTone(783.99, 0.30, 'sine', 0.16, 0.20);

        setTimeout(() => {
          vsWheelOverlay.classList.add('hidden');
          if (callback) callback();
        }, 1000);
      }
    }
    requestAnimationFrame(animate);
  }

  function showVsWheelDuringSpin(targetMode) {
    spinVsWheel(targetMode, null);
  }

  function applyStartRound(payload) {
    vsWheelOverlay.classList.add('hidden');

    clearTimeout(vsAutoAdvanceTimer);
    clearInterval(vsCountdownInterval);
    vsAutoAdvanceTimer = null;
    vsCountdownInterval = null;

    vsRound = payload.round;
    vsAnswer = payload.pokemon;
    vsIsShinyRound = payload.isShiny;
    vsCurrentRevealMode = payload.revealMode;
    vsRoundStartTime = payload.startTime || Date.now();
    vsRoundLocked = false;
    vsGuessLocked = false;
    vsPixelBuffer = null;
    vsTileOrder = null;
    vsScrambleOffsets = null;
    vsScaledSprite = null;
    vsRevealCanvas.style.filter = 'none'; 

    vsShinyBanner.classList.remove('flash-fade');
    if (vsIsShinyRound) {
      vsShinyBanner.classList.remove('hidden');
      requestAnimationFrame(() => {
        vsShinyBanner.classList.add('flash-fade');
      });
      setTimeout(() => {
        vsShinyBanner.classList.add('hidden');
      }, 1500);
    } else {
      vsShinyBanner.classList.add('hidden');
    }

    vsModeTitle.textContent = `Round ${vsRound} — Reveal Mode: ${vsCurrentRevealMode}`;
    vsRoundLabel.textContent = `Round ${vsRound} / ${vsNumRounds}`;
    clearTimeout(vsPenaltyTimer);
    clearInterval(vsPenaltyTimer);
    vsResultMessage.textContent = '';
    vsRoundOverPanel.classList.add('hidden');
    vsWaitingNextMsg.classList.add('hidden');
    vsGuessInput.value = '';
    vsGuessInput.disabled = false;
    vsGuessInput.focus();

    vsPokemonImage.classList.add('hidden');
    vsRevealCanvas.classList.remove('hidden');
    vsImageOverlay.classList.add('visible');

    renderVsLeaderboard();

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      vsImageOverlay.classList.remove('visible');
      if (!vsRoundLocked) startVsRevealLoop(img);
    };
    img.onerror = () => {
      vsImageOverlay.classList.remove('visible');
      if (!vsRoundLocked) startVsRevealLoop(img);
    };
    img.src = vsAnswer.image;
  }

  function startVsRevealLoop(img) {
    if (vsAnimFrame) cancelAnimationFrame(vsAnimFrame);

    function renderLoop() {
      const now = Date.now();
      const elapsed = Math.min(Math.max(now - vsRoundStartTime, 0), VS_REVEAL_DURATION);
      const progress = elapsed / VS_REVEAL_DURATION;

      if (!vsRoundLocked) {
        try { renderVsCanvas(img, vsCurrentRevealMode, progress); } catch (e) {}
        updateVsRaceBars(progress);
      }

      if (vsRoundLocked) return;

      if (progress < 1.0) {
        vsAnimFrame = requestAnimationFrame(renderLoop);
      } else if (vsIsHost) {
        handleRoundTimeout();
      }
    }
    vsAnimFrame = requestAnimationFrame(renderLoop);
  }

  function renderVsCanvas(img, mode, progress) {
    const ctx = vsRevealCanvas.getContext('2d');
    const w = 280, h = 280;
    ctx.clearRect(0, 0, w, h);

    // --- Classic Blur ---
    // iOS Safari does not support `ctx.filter`, which made the artwork render
    // fully sharp on iPhone. Blur the canvas element via CSS instead — same
    // visual result and works on every browser.
    if (mode === 'Classic Blur') {
      vsRevealCanvas.style.filter = `blur(${(1 - progress) * 20}px)`;
      ctx.drawImage(img, 0, 0, w, h);
      return;
    }

    // Every other mode draws its own masking, so clear any leftover blur
    // (e.g. when the wheel picks Classic Blur one round and Pixelation the next).
    vsRevealCanvas.style.filter = 'none';

    if (mode === 'Pixelation') {
      const factor = 0.02 + progress * 0.98;
      const sw = Math.max(4, Math.floor(w * factor));
      const sh = Math.max(4, Math.floor(h * factor));

      if (!vsPixelBuffer) vsPixelBuffer = document.createElement('canvas');
      vsPixelBuffer.width = sw;
      vsPixelBuffer.height = sh;
      const bctx = vsPixelBuffer.getContext('2d');
      bctx.imageSmoothingEnabled = true;
      bctx.clearRect(0, 0, sw, sh);
      bctx.drawImage(img, 0, 0, sw, sh);

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(vsPixelBuffer, 0, 0, sw, sh, 0, 0, w, h);
      ctx.imageSmoothingEnabled = true;

    } else if (mode === 'Tile Reveal') {
      ctx.drawImage(img, 0, 0, w, h);
      const gridSize = 8;
      const tileSize = w / gridSize;
      const totalTiles = gridSize * gridSize;

      if (!vsTileOrder || vsTileOrder.length !== totalTiles) {
        vsTileOrder = [...Array(totalTiles).keys()];
        for (let i = vsTileOrder.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [vsTileOrder[i], vsTileOrder[j]] = [vsTileOrder[j], vsTileOrder[i]];
        }
      }

      const visibleCount = Math.floor(progress * totalTiles);
      const revealed = new Set(vsTileOrder.slice(0, visibleCount));

      ctx.fillStyle = '#222e35';
      for (let i = 0; i < totalTiles; i++) {
        if (!revealed.has(i)) {
          const tx = (i % gridSize) * tileSize;
          const ty = Math.floor(i / gridSize) * tileSize;
          ctx.fillRect(tx, ty, tileSize, tileSize);
        }
      }

    } else if (mode === 'Silhouette') {
      ctx.drawImage(img, 0, 0, w, h);
      if (progress < 1.0) {
        const imgData = ctx.getImageData(0, 0, w, h);
        for (let i = 0; i < imgData.data.length; i += 4) {
          if (imgData.data[i + 3] > 20) {
            const v = Math.floor(progress * 255);
            imgData.data[i] = Math.min(imgData.data[i], v);
            imgData.data[i + 1] = Math.min(imgData.data[i + 1], v);
            imgData.data[i + 2] = Math.min(imgData.data[i + 2], v);
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

    } else if (mode === 'Zoom Out') {
      const zoom = 4 - 3 * progress;
      const dw = w * zoom;
      const dh = h * zoom;
      const dx = (w - dw) / 2;
      const dy = (h - dh) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.clip();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();

    } else if (mode === 'Scramble') {
      const gridSize = 4;
      const tileSize = w / gridSize;
      const totalTiles = gridSize * gridSize;

      // Pre-scale the artwork to the canvas size ONCE so tile source
      // rectangles line up with the visible canvas.
      if (!vsScaledSprite) {
        vsScaledSprite = document.createElement('canvas');
        vsScaledSprite.width = w;
        vsScaledSprite.height = h;
        const sctx = vsScaledSprite.getContext('2d');
        sctx.imageSmoothingEnabled = true;
        sctx.drawImage(img, 0, 0, w, h);
      }

      if (!vsScrambleOffsets || vsScrambleOffsets.length !== totalTiles) {
        vsScrambleOffsets = [];
        for (let i = 0; i < totalTiles; i++) {
          vsScrambleOffsets.push({
            ox: (Math.random() - 0.5) * 3,
            oy: (Math.random() - 0.5) * 3
          });
        }
      }

      const spread = Math.max(0, 1 - progress * 1.05);

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.clip();
      ctx.imageSmoothingEnabled = true;

      for (let gy = 0; gy < gridSize; gy++) {
        for (let gx = 0; gx < gridSize; gx++) {
          const i = gy * gridSize + gx;
          const off = vsScrambleOffsets[i];
          const dx = gx * tileSize + off.ox * tileSize * spread;
          const dy = gy * tileSize + off.oy * tileSize * spread;
          ctx.drawImage(
            vsScaledSprite,
            gx * tileSize, gy * tileSize, tileSize, tileSize,
            dx, dy, tileSize, tileSize
          );
        }
      }
      ctx.restore();
    }
  }

  function updateVsRaceBars(progress) {
    document.querySelectorAll('.vs-progress-fill:not(.finished)').forEach(el => {
      el.style.width = `${Math.floor(progress * 100)}%`;
    });
  }

  function renderVsLeaderboard() {
    vsPlayerBars.innerHTML = '';
    const sorted = Object.entries(vsPlayers).sort((a, b) => b[1].score - a[1].score);
    sorted.forEach(([id, p]) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'vs-player-bar-wrapper';
      wrapper.dataset.peerId = id;
      const isYou = vsPeer && id === vsPeer.id;
      const roleTag = p.slot === 0 ? '<span class="vs-role-tag">HOST</span> ' : '';
      wrapper.innerHTML = `
        <div class="vs-player-bar-label">
          <span>${roleTag}${p.name}${isYou ? ' (You)' : ''}</span>
          <span>${p.score} pts</span>
        </div>
        <div class="vs-progress-track">
          <div class="vs-progress-fill" style="width: 0%"></div>
        </div>
      `;
      vsPlayerBars.appendChild(wrapper);
    });
  }

  vsGuessInput.addEventListener('input', () => {
    if (typeof setupAutocomplete === 'function') {
      setupAutocomplete(vsGuessInput, vsSuggestions, handleVsGuess);
    }
  });

  function handleVsGuess(guessedPkmn) {
    if (vsGuessLocked || !vsAnswer) return;
    vsSuggestions.innerHTML = '';
    vsGuessInput.value = '';

    if (guessedPkmn.rawName === vsAnswer.rawName) {
      vsGuessLocked = true;
      vsGuessInput.disabled = true;
      const elapsedMs = Date.now() - vsRoundStartTime;
      if (typeof playCorrectSound === 'function') playCorrectSound();
      vsResultMessage.style.color = '#4cd137';
      vsResultMessage.textContent = 'Got it! Confirming...';

      if (vsIsHost) {
        handleCorrectGuess(vsPeer.id, elapsedMs);
      } else if (vsHostConn) {
        vsHostConn.send({ type: 'CORRECT_GUESS', peerId: vsPeer.id, elapsedMs });
      }
    } else {
      if (typeof playWrongSound === 'function') playWrongSound();
      applyVsWrongGuessPenalty(guessedPkmn.displayName);
    }
  }

  function applyVsWrongGuessPenalty(wrongName) {
    vsGuessInput.disabled = true;
    let remaining = Math.ceil(VS_WRONG_PENALTY_MS / 1000);
    vsResultMessage.style.color = '#ff4757';
    vsResultMessage.textContent = `Wrong — not ${wrongName}. Try again in ${remaining}s...`;

    clearInterval(vsPenaltyTimer);
    vsPenaltyTimer = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(vsPenaltyTimer);
        if (!vsGuessLocked) {
          vsGuessInput.disabled = false;
          vsResultMessage.style.color = '#d0d7de';
          vsResultMessage.textContent = 'Back in it — take another guess!';
        }
      } else {
        vsResultMessage.textContent = `Wrong — not ${wrongName}. Try again in ${remaining}s...`;
      }
    }, 1000);
  }

  function handleCorrectGuess(peerId, elapsedMs) {
    if (!vsIsHost || vsRoundLocked) return;
    vsRoundLocked = true;

    const clamped = Math.max(0, Math.min(elapsedMs, VS_REVEAL_DURATION));
    const points = Math.round(VS_MAX_POINTS - (VS_MAX_POINTS - VS_MIN_POINTS) * (clamped / VS_REVEAL_DURATION));
    if (vsPlayers[peerId]) vsPlayers[peerId].score += points;

    const payload = {
      type: 'ROUND_RESULT',
      round: vsRound,
      winnerId: peerId,
      winnerName: vsPlayers[peerId] ? vsPlayers[peerId].name : 'A player',
      points,
      answerDisplayName: vsAnswer.displayName,
      isShiny: vsIsShinyRound,
      players: vsPlayers,
      noWinner: false
    };
    broadcastVs(payload);
    applyRoundResult(payload);
  }

  function handleRoundTimeout() {
    if (!vsIsHost || vsRoundLocked) return;
    vsRoundLocked = true;

    const payload = {
      type: 'ROUND_RESULT',
      round: vsRound,
      winnerId: null,
      winnerName: null,
      points: 0,
      answerDisplayName: vsAnswer.displayName,
      isShiny: vsIsShinyRound,
      players: vsPlayers,
      noWinner: true
    };
    broadcastVs(payload);
    applyRoundResult(payload);
  }

  function applyRoundResult(payload) {
    vsRoundLocked = true;
    vsGuessLocked = true;
    vsPlayers = payload.players;
    clearTimeout(vsPenaltyTimer);
    clearInterval(vsPenaltyTimer);
    clearTimeout(vsAutoAdvanceTimer);
    clearInterval(vsCountdownInterval);
    vsAutoAdvanceTimer = null;
    vsCountdownInterval = null;

    if (vsAnimFrame) cancelAnimationFrame(vsAnimFrame);

    vsGuessInput.disabled = true;
    vsImageOverlay.classList.remove('visible');
    vsRevealCanvas.classList.add('hidden');
    vsRevealCanvas.style.filter = 'none';
    if (vsAnswer) vsPokemonImage.src = vsAnswer.image;
    vsPokemonImage.classList.remove('hidden');

    renderVsLeaderboard();
    if (payload.winnerId) {
      const bar = document.querySelector(`.vs-player-bar-wrapper[data-peer-id="${payload.winnerId}"] .vs-progress-fill`);
      if (bar) { bar.style.width = '100%'; bar.classList.add('finished'); }
    }

    vsRoundOverPanel.classList.remove('hidden');
    if (payload.noWinner) {
      vsRoundWinnerText.textContent = `Time's up! Nobody got it.`;
    } else {
      const isMe = vsPeer && payload.winnerId === vsPeer.id;
      vsRoundWinnerText.textContent = `${isMe ? 'You' : payload.winnerName} got it! +${payload.points} pts`;
      if (isMe && typeof launchConfetti === 'function') launchConfetti();
    }
    vsRoundAnswerText.textContent = `It was ${payload.isShiny ? 'Shiny ' : ''}${payload.answerDisplayName}!`;

    // Clear the in-round header so it doesn't sit there stale.
    vsModeTitle.textContent = 'Round Complete';
    vsRoundLabel.textContent = `Round ${vsRound} / ${vsNumRounds}`;

    // ---- Auto-advance countdown (no button — everyone sees the same msg) ----
    const isLastRound = vsRound >= vsNumRounds;
    let secondsLeft = Math.ceil(VS_AUTO_ADVANCE_MS / 1000);

    vsWaitingNextMsg.classList.remove('hidden');
    const renderCountdown = () => {
      vsWaitingNextMsg.textContent = isLastRound
        ? `Final results in ${secondsLeft}...`
        : `Next round in ${secondsLeft}...`;
    };
    renderCountdown();

    vsCountdownInterval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft > 0) {
        renderCountdown();
      } else {
        clearInterval(vsCountdownInterval);
        vsCountdownInterval = null;
      }
    }, 1000);

    if (vsIsHost) {
      vsAutoAdvanceTimer = setTimeout(() => {
        advanceVsRound();
      }, VS_AUTO_ADVANCE_MS);
    }
  }

  function advanceVsRound() {
    clearTimeout(vsAutoAdvanceTimer);
    clearInterval(vsCountdownInterval);
    vsAutoAdvanceTimer = null;
    vsCountdownInterval = null;

    if (!vsIsHost) return;

    if (vsRound >= vsNumRounds) {
      endVsGame();
    } else {
      launchVsRound();
    }
  }

  function endVsGame() {
    clearTimeout(vsAutoAdvanceTimer);
    clearInterval(vsCountdownInterval);
    vsAutoAdvanceTimer = null;
    vsCountdownInterval = null;

    const entries = Object.entries(vsPlayers);
    const maxScore = Math.max(...entries.map(([, p]) => p.score));
    const winners = entries.filter(([, p]) => p.score === maxScore);
    const payload = {
      type: 'GAME_OVER',
      players: vsPlayers,
      winnerId: winners.length === 1 ? winners[0][0] : null,
      winnerName: winners.length === 1 ? winners[0][1].name : null,
      isTie: winners.length > 1
    };
    broadcastVs(payload);
    applyGameOver(payload);
  }

  function applyGameOver(payload) {
    clearTimeout(vsAutoAdvanceTimer);
    clearInterval(vsCountdownInterval);
    vsAutoAdvanceTimer = null;
    vsCountdownInterval = null;

    vsPlayers = payload.players;
    vsRoundOverPanel.classList.add('hidden');
    vsGameOverPanel.classList.remove('hidden');

    const sorted = Object.entries(vsPlayers).sort((a, b) => b[1].score - a[1].score);
    vsFinalStandings.innerHTML = sorted.map(([id, p], i) => {
      const rank = i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `${i + 1}th`;
      const isYou = vsPeer && id === vsPeer.id;
      return `<div class="vs-standing-row${i === 0 ? ' vs-standing-first' : ''}">
        <span><span class="vs-rank-tag">${rank}</span> ${p.name}${isYou ? ' (You)' : ''}</span>
        <span>${p.score} pts</span>
      </div>`;
    }).join('');

    if (payload.isTie) {
      vsWinnerText.textContent = "It's a tie!";
    } else {
      const isMe = vsPeer && payload.winnerId === vsPeer.id;
      vsWinnerText.textContent = isMe ? 'You win!' : `${payload.winnerName} wins!`;
      if (isMe && typeof launchConfetti === 'function') launchConfetti();
    }

    vsPlayAgainBtn.classList.toggle('hidden', !vsIsHost);
  }

  vsPlayAgainBtn.addEventListener('click', () => {
    if (!vsIsHost) return;
    clearTimeout(vsAutoAdvanceTimer);
    clearInterval(vsCountdownInterval);
    vsAutoAdvanceTimer = null;
    vsCountdownInterval = null;

    vsRound = 0;
    Object.values(vsPlayers).forEach(p => { p.score = 0; });

    // Reset the header immediately so the old game's last round doesn't
    // linger during the first wheel spin of the new game.
    vsModeTitle.textContent = 'Choosing Round Mode...';
    vsRoundLabel.textContent = '';

    vsGameOverPanel.classList.add('hidden');
    broadcastVs({ type: 'START_GAME', numRounds: vsNumRounds, players: vsPlayers });
    launchVsRound();
  });

  vsLeaveRoomBtn.addEventListener('click', () => {
    clearTimeout(vsAutoAdvanceTimer);
    clearInterval(vsCountdownInterval);
    clearTimeout(vsPenaltyTimer);
    if (vsAnimFrame) cancelAnimationFrame(vsAnimFrame);
    location.hash = '#versus';
    location.reload();
  });
});