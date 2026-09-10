// ---- Config: stages, blur, points ----
const stages = [
  { blur: 20, points: 5 },
  { blur: 12, points: 4 },
  { blur: 8,  points: 3 },
  { blur: 4,  points: 2 },
  { blur: 1,  points: 1 },
  { blur: 0,  points: 1 }
];

const TOTAL_ROUNDS = 5;
const START_DATE = new Date('2026-09-10T00:00:00');

// Shared Data
let allPokemonList = [];
let pokemonCount = 0;
let teaserInterval = null;

// Daily Game State
let selectedDate = new Date();
let currentStage = 0;
let round = 1;
let totalScore = 0;
let correctCount = 0;
let answer = null;
let dailyPokemonQueue = [];

// Unlimited Game State
let unlimitedMode = 'normal'; // 'normal' or 'shiny'
let unlimitedRound = 1;
let unlimitedTotalScore = 0;
let unlimitedCurrentStage = 0;
let unlimitedAnswer = null;

// DOM Elements - Navigation & Modes
const dailyViewEl = document.getElementById('daily-view');
const unlimitedViewEl = document.getElementById('unlimited-view');
const modeDailyBtn = document.getElementById('mode-daily-btn');
const modeUnlimitedBtn = document.getElementById('mode-unlimited-btn');

// DOM Elements - Daily Game
const imageEl = document.getElementById('pokemon-image');
const imageOverlayEl = document.getElementById('image-loading-overlay');
const stageLabelEl = document.getElementById('stage-label');
const roundLabelEl = document.getElementById('round-label');
const puzzleDateLabelEl = document.getElementById('puzzle-date-label');
const startScreenEl = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const searchWrapperEl = document.getElementById('search-wrapper');
const buttonsEl = document.getElementById('buttons');
const inputEl = document.getElementById('guess-input');
const suggestionsEl = document.getElementById('suggestions');
const skipBtn = document.getElementById('skip-btn');
const nextBtn = document.getElementById('next-btn');
const resultEl = document.getElementById('result-message');
const gameOverPanel = document.getElementById('game-over-panel');
const finalScoreText = document.getElementById('final-score-text');
const statsLine = document.getElementById('stats-line');
const shareBtn = document.getElementById('share-btn');
const statPlayed = document.getElementById('stat-played');
const statAvg = document.getElementById('stat-avg');

// DOM Elements - Unlimited Game
const unlimitedNormalBtn = document.getElementById('unlimited-normal-btn');
const unlimitedShinyBtn = document.getElementById('unlimited-shiny-btn');
const unlimitedModeTitle = document.getElementById('unlimited-mode-title');
const unlimitedImageEl = document.getElementById('unlimited-pokemon-image');
const unlimitedImageOverlay = document.getElementById('unlimited-image-overlay');
const unlimitedRoundLabel = document.getElementById('unlimited-round-label');
const unlimitedStageLabel = document.getElementById('unlimited-stage-label');
const unlimitedStartScreen = document.getElementById('unlimited-start-screen');
const unlimitedStartBtn = document.getElementById('unlimited-start-btn');
const unlimitedSearchWrapper = document.getElementById('unlimited-search-wrapper');
const unlimitedButtons = document.getElementById('unlimited-buttons');
const unlimitedInputEl = document.getElementById('unlimited-guess-input');
const unlimitedSuggestionsEl = document.getElementById('unlimited-suggestions');
const unlimitedSkipBtn = document.getElementById('unlimited-skip-btn');
const unlimitedNextBtn = document.getElementById('unlimited-next-btn');
const unlimitedResultEl = document.getElementById('unlimited-result-message');
const unlimitedGameOverPanel = document.getElementById('unlimited-game-over-panel');
const unlimitedFinalScoreText = document.getElementById('unlimited-final-score-text');
const playAgainBtn = document.getElementById('play-again-btn');

// ---- Header Mode Navigation ----
function setupModeNavigation() {
  modeDailyBtn.addEventListener('click', () => {
    modeDailyBtn.classList.add('active');
    modeUnlimitedBtn.classList.remove('active');

    unlimitedViewEl.classList.add('hidden');
    dailyViewEl.classList.remove('hidden');

    resetUnlimitedToStartScreen();

    if (!startScreenEl.classList.contains('hidden') && !teaserInterval) {
      startTeaserCarousel(imageEl, false);
    }
  });

  modeUnlimitedBtn.addEventListener('click', () => {
    modeUnlimitedBtn.classList.add('active');
    modeDailyBtn.classList.remove('active');

    clearInterval(teaserInterval);
    teaserInterval = null;

    dailyViewEl.classList.add('hidden');
    unlimitedViewEl.classList.remove('hidden');

    resetUnlimitedToStartScreen();
    startTeaserCarousel(unlimitedImageEl, unlimitedMode === 'shiny');
  });

  // Unlimited sub-navigation
  unlimitedNormalBtn.addEventListener('click', () => {
    if (unlimitedMode === 'normal') return;
    unlimitedMode = 'normal';
    unlimitedNormalBtn.classList.add('active');
    unlimitedShinyBtn.classList.remove('active');
    unlimitedModeTitle.textContent = 'Unlimited — Normal Mode';

    resetUnlimitedToStartScreen();
    startTeaserCarousel(unlimitedImageEl, false);
  });

  unlimitedShinyBtn.addEventListener('click', () => {
    if (unlimitedMode === 'shiny') return;
    unlimitedMode = 'shiny';
    unlimitedShinyBtn.classList.add('active');
    unlimitedNormalBtn.classList.remove('active');
    unlimitedModeTitle.textContent = 'Unlimited — Shiny Mode';

    resetUnlimitedToStartScreen();
    startTeaserCarousel(unlimitedImageEl, true);
  });
}

// ---- Name Formatter Helper ----
function formatPokemonName(rawName) {
  return rawName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ---- Storage Helpers ----
function getStoredStats() {
  const defaultStats = { gamesPlayed: 0, totalPoints: 0 };
  const saved = localStorage.getItem('pokeblur-stats');
  return saved ? JSON.parse(saved) : defaultStats;
}

function saveStats(stats) {
  localStorage.setItem('pokeblur-stats', JSON.stringify(stats));
}

function updatePersistentStats(finalScore) {
  const stats = getStoredStats();
  stats.gamesPlayed += 1;
  stats.totalPoints += finalScore;
  saveStats(stats);
  return stats;
}

// ---- Seeded PRNG Helpers ----
function getSeedString(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 8, t | 30);
    return ((t ^ t >>> 19) >>> 0) / 4294967296;
  };
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  }
  return hash;
}

// ---- Date & Puzzle Counter ----
function setupPuzzleHeader() {
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  const dateStr = selectedDate.toLocaleDateString('en-US', options);

  const timeDiff = selectedDate.getTime() - START_DATE.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
  const puzzleNum = Math.max(1, daysDiff + 1);

  if (puzzleDateLabelEl) {
    puzzleDateLabelEl.textContent = `${dateStr} — Puzzle #${puzzleNum}`;
  }
}

// ---- Load Master Pokémon List ----
async function loadPokemonList() {
  const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025');
  const data = await res.json();
  
  allPokemonList = data.results.map((item, idx) => ({
    id: idx + 1,
    rawName: item.name,
    displayName: formatPokemonName(item.name),
    url: item.url
  }));

  pokemonCount = allPokemonList.length;
  generateDailyPokemonQueue();
}

function generateDailyPokemonQueue() {
  const seedStr = getSeedString(selectedDate);
  const seedNum = hashString(seedStr);
  const rng = mulberry32(seedNum);

  const chosenIndices = new Set();
  while (chosenIndices.size < TOTAL_ROUNDS) {
    const idx = Math.floor(rng() * pokemonCount);
    chosenIndices.add(idx);
  }

  dailyPokemonQueue = Array.from(chosenIndices);
}

// ---- Fetch Specific Pokémon Artwork ----
async function fetchPokemonByQueueIndex(roundIdx) {
  const index = dailyPokemonQueue[roundIdx];
  const pokemon = allPokemonList[index];
  
  const res = await fetch(pokemon.url);
  const data = await res.json();
  const artwork = data.sprites.other?.['official-artwork']?.front_default;
  
  if (artwork) {
    return { rawName: pokemon.rawName, displayName: pokemon.displayName, image: artwork };
  } else {
    return fetchRandomPokemonWithArtwork(false);
  }
}

async function fetchRandomPokemonWithArtwork(isShiny = false) {
  while (true) {
    const index = Math.floor(Math.random() * pokemonCount);
    const pokemon = allPokemonList[index];
    const res = await fetch(pokemon.url);
    if (!res.ok) continue;
    const data = await res.json();
    
    const artwork = isShiny 
      ? data.sprites.other?.['official-artwork']?.front_shiny 
      : data.sprites.other?.['official-artwork']?.front_default;

    if (artwork) {
      return { rawName: pokemon.rawName, displayName: pokemon.displayName, image: artwork };
    }
  }
}

function preloadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

// ---- Teaser Carousel ----
function startTeaserCarousel(targetImgEl, isShiny = false) {
  clearInterval(teaserInterval);
  teaserInterval = null;
  targetImgEl.style.filter = 'blur(12px)';
  
  const cycleImage = () => {
    const randomId = Math.floor(Math.random() * 898) + 1;
    const path = isShiny ? 'shiny' : 'official-artwork';
    targetImgEl.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${isShiny ? 'shiny/' : ''}${randomId}.png`;
  };

  cycleImage();
  teaserInterval = setInterval(cycleImage, 1500);
}

// ---- Start Daily Game Action ----
startBtn.addEventListener('click', async () => {
  clearInterval(teaserInterval);
  teaserInterval = null;
  startScreenEl.classList.add('hidden');
  searchWrapperEl.classList.remove('hidden');
  buttonsEl.classList.remove('hidden');

  await loadNewPokemon();
});

// ---- Load New Round Pokémon (Daily) ----
async function loadNewPokemon(isRestoring = false) {
  imageOverlayEl.classList.add('visible');

  const data = await fetchPokemonByQueueIndex(round - 1);

  answer = { rawName: data.rawName, displayName: data.displayName, image: data.image };

  await preloadImage(answer.image);

  // Only reset stage to 0 if we are NOT restoring mid-round progress
  if (!isRestoring) {
    currentStage = 0;
  }

  imageEl.src = answer.image;
  applyStage(true);
  updateRoundLabel();

  imageOverlayEl.classList.remove('visible');

  resultEl.textContent = '';
  inputEl.disabled = false;
  inputEl.value = '';
  skipBtn.disabled = false;
  nextBtn.classList.add('hidden');
}

function applyStage(instant = false) {
  const stage = stages[currentStage];
  if (instant) {
    imageEl.style.transition = 'none';
    imageEl.style.filter = `blur(${stage.blur}px)`;
    void imageEl.offsetHeight;
    imageEl.style.transition = 'filter 0.4s ease';
  } else {
    imageEl.style.filter = `blur(${stage.blur}px)`;
  }
  stageLabelEl.textContent = `Stage ${currentStage + 1} — Guess for ${stage.points} points`;
}

function updateRoundLabel() {
  roundLabelEl.textContent = `Round ${round} / ${TOTAL_ROUNDS} — Score: ${totalScore}`;
}

// Autocomplete Daily
inputEl.addEventListener('input', () => {
  setupAutocomplete(inputEl, suggestionsEl, handleGuess);
});

function setupAutocomplete(inputField, suggestionsContainer, selectHandler) {
  const query = inputField.value.toLowerCase().trim();
  suggestionsContainer.innerHTML = '';

  if (query === '') return;

  const matches = allPokemonList
    .filter(p => p.displayName.toLowerCase().includes(query) || p.rawName.toLowerCase().includes(query))
    .sort((a, b) => {
      const aStarts = a.displayName.toLowerCase().startsWith(query) ? 0 : 1;
      const bStarts = b.displayName.toLowerCase().startsWith(query) ? 0 : 1;
      return aStarts - bStarts;
    })
    .slice(0, 8);

  if (matches.length === 0) {
    suggestionsContainer.innerHTML = '<div class="suggestion-item">No Pokémon found</div>';
    return;
  }

  matches.forEach(pkmn => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.textContent = pkmn.displayName;
    item.addEventListener('click', () => selectHandler(pkmn));
    suggestionsContainer.appendChild(item);
  });
}

function handleGuess(guessedPkmn) {
  suggestionsEl.innerHTML = '';
  inputEl.value = '';

  if (guessedPkmn.rawName === answer.rawName) {
    const points = stages[currentStage].points;
    totalScore += points;
    correctCount++;
    imageEl.style.filter = 'blur(0px)';
    resultEl.textContent = `Correct! It's ${answer.displayName} — scored ${points} pts!`;
    launchConfetti();
    playCorrectSound();
    endRound();
  } else {
    nextStage(`Wrong guess — it's not ${guessedPkmn.displayName}.`);
  }
}

skipBtn.addEventListener('click', () => nextStage('Skipped.'));

function nextStage(message) {
  if (currentStage >= stages.length - 1) {
    imageEl.style.filter = 'blur(0px)';
    resultEl.textContent = `Out of guesses — it was ${answer.displayName}. 0 points.`;
    endRound();
    return;
  }
  currentStage++;
  applyStage();
  resultEl.textContent = message;
  
  // Lock in the stage penalty immediately so refreshing won't reset the blur!
  saveDailyProgress(false, false);
}

function endRound() {
  inputEl.disabled = true;
  skipBtn.disabled = true;
  updateRoundLabel();

  if (round >= TOTAL_ROUNDS) {
    resultEl.textContent += ` Game over! Final score: ${totalScore} / 25.`;
    nextBtn.classList.add('hidden');
    saveDailyProgress(true, false);
    showGameOverPanel();
  } else {
    nextBtn.classList.remove('hidden');
    saveDailyProgress(false, true); // Mark that this round is completed and waiting for Next
  }
}

function showGameOverPanel() {
  const stats = updatePersistentStats(totalScore);
  const avg = (stats.totalPoints / stats.gamesPlayed).toFixed(1);

  finalScoreText.textContent = `Final Score: ${totalScore} / 25`;
  statsLine.textContent = `You correctly guessed ${correctCount} out of ${TOTAL_ROUNDS} Pokémon!`;
  statPlayed.textContent = stats.gamesPlayed;
  statAvg.textContent = avg;

  gameOverPanel.classList.remove('hidden');
}

shareBtn.addEventListener('click', () => {
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  const dateStr = selectedDate.toLocaleDateString('en-US', options);
  const shareText = `PokeBlur (${dateStr})\nScore: ${totalScore}/25 (${correctCount}/${TOTAL_ROUNDS} correct)`;
  
  navigator.clipboard.writeText(shareText).then(() => {
    const originalText = shareBtn.textContent;
    shareBtn.textContent = 'Copied!';
    setTimeout(() => { shareBtn.textContent = originalText; }, 2000);
  });
});

nextBtn.addEventListener('click', async () => {
  if (round >= TOTAL_ROUNDS) return;
  nextBtn.disabled = true;
  round++;
  saveDailyProgress(false, false); // Save the start of the new round
  await loadNewPokemon();
  setTimeout(() => { nextBtn.disabled = false; }, 500);
});

// ==========================================
// UNLIMITED MODE LOGIC
// ==========================================
function resetUnlimitedToStartScreen() {
  clearInterval(teaserInterval);
  teaserInterval = null;

  unlimitedStartScreen.classList.remove('hidden');
  unlimitedSearchWrapper.classList.add('hidden');
  unlimitedButtons.classList.add('hidden');
  unlimitedGameOverPanel.classList.add('hidden');

  unlimitedRound = 1;
  unlimitedTotalScore = 0;
  unlimitedRoundLabel.textContent = 'Round 1 / 5 — Score: 0';
  unlimitedStageLabel.textContent = 'Stage 1 — Guess for 5 points';
  unlimitedResultEl.textContent = '';
}

unlimitedStartBtn.addEventListener('click', async () => {
  clearInterval(teaserInterval);
  teaserInterval = null;

  unlimitedStartScreen.classList.add('hidden');
  unlimitedSearchWrapper.classList.remove('hidden');
  unlimitedButtons.classList.remove('hidden');

  await startUnlimitedGame();
});

async function startUnlimitedGame() {
  unlimitedRound = 1;
  unlimitedTotalScore = 0;
  unlimitedGameOverPanel.classList.add('hidden');
  
  await loadUnlimitedPokemon();
}

async function loadUnlimitedPokemon() {
  unlimitedImageOverlay.classList.add('visible');

  const isShiny = (unlimitedMode === 'shiny');
  const data = await fetchRandomPokemonWithArtwork(isShiny);

  unlimitedAnswer = { rawName: data.rawName, displayName: data.displayName, image: data.image };

  await preloadImage(unlimitedAnswer.image);

  unlimitedCurrentStage = 0;
  unlimitedImageEl.src = unlimitedAnswer.image;
  applyUnlimitedStage(true);
  updateUnlimitedRoundLabel();

  unlimitedImageOverlay.classList.remove('visible');

  unlimitedResultEl.textContent = '';
  unlimitedInputEl.disabled = false;
  unlimitedInputEl.value = '';
  unlimitedSkipBtn.disabled = false;
  unlimitedNextBtn.classList.add('hidden');
}

function applyUnlimitedStage(instant = false) {
  const stage = stages[unlimitedCurrentStage];
  if (instant) {
    unlimitedImageEl.style.transition = 'none';
    unlimitedImageEl.style.filter = `blur(${stage.blur}px)`;
    void unlimitedImageEl.offsetHeight;
    unlimitedImageEl.style.transition = 'filter 0.4s ease';
  } else {
    unlimitedImageEl.style.filter = `blur(${stage.blur}px)`;
  }
  unlimitedStageLabel.textContent = `Stage ${unlimitedCurrentStage + 1} — Guess for ${stage.points} points`;
}

function updateUnlimitedRoundLabel() {
  unlimitedRoundLabel.textContent = `Round ${unlimitedRound} / ${TOTAL_ROUNDS} — Score: ${unlimitedTotalScore}`;
}

unlimitedInputEl.addEventListener('input', () => {
  setupAutocomplete(unlimitedInputEl, unlimitedSuggestionsEl, handleUnlimitedGuess);
});

function handleUnlimitedGuess(guessedPkmn) {
  unlimitedSuggestionsEl.innerHTML = '';
  unlimitedInputEl.value = '';

  if (guessedPkmn.rawName === unlimitedAnswer.rawName) {
    const points = stages[unlimitedCurrentStage].points;
    unlimitedTotalScore += points;
    unlimitedImageEl.style.filter = 'blur(0px)';
    unlimitedResultEl.textContent = `Correct! It's ${unlimitedAnswer.displayName} — scored ${points} pts!`;
    launchConfetti();
    playCorrectSound();
    endUnlimitedRound();
  } else {
    nextUnlimitedStage(`Wrong guess — it's not ${guessedPkmn.displayName}.`);
  }
}

unlimitedSkipBtn.addEventListener('click', () => nextUnlimitedStage('Skipped.'));

function nextUnlimitedStage(message) {
  if (unlimitedCurrentStage >= stages.length - 1) {
    unlimitedImageEl.style.filter = 'blur(0px)';
    unlimitedResultEl.textContent = `Out of guesses — it was ${unlimitedAnswer.displayName}. 0 points.`;
    endUnlimitedRound();
    return;
  }
  unlimitedCurrentStage++;
  applyUnlimitedStage();
  unlimitedResultEl.textContent = message;
}

function endUnlimitedRound() {
  unlimitedInputEl.disabled = true;
  unlimitedSkipBtn.disabled = true;
  updateUnlimitedRoundLabel();

  if (unlimitedRound >= TOTAL_ROUNDS) {
    unlimitedResultEl.textContent += ` Game over! Score: ${unlimitedTotalScore} / 25.`;
    unlimitedNextBtn.classList.add('hidden');
    
    unlimitedFinalScoreText.textContent = `Final Score: ${unlimitedTotalScore} / 25`;
    unlimitedGameOverPanel.classList.remove('hidden');
  } else {
    unlimitedNextBtn.classList.remove('hidden');
  }
}

unlimitedNextBtn.addEventListener('click', async () => {
  if (unlimitedRound >= TOTAL_ROUNDS) return;
  unlimitedNextBtn.disabled = true;
  unlimitedRound++;
  await loadUnlimitedPokemon();
  setTimeout(() => { unlimitedNextBtn.disabled = false; }, 500);
});

playAgainBtn.addEventListener('click', () => {
  resetUnlimitedToStartScreen();
  startTeaserCarousel(unlimitedImageEl, unlimitedMode === 'shiny');
});

// ==========================================
// EFFECTS
// ==========================================
function launchConfetti() {
  const colors = ['#e63946', '#f1a208', '#2a9d8f', '#457b9d', '#f4a261', '#8ac926'];
  const pieceCount = 50;

  for (let i = 0; i < pieceCount; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = `${1.2 + Math.random() * 1.2}s`;
    piece.style.animationDelay = `${Math.random() * 0.2}s`;
    document.body.appendChild(piece);

    piece.addEventListener('animationend', () => piece.remove());
  }
}

function playCorrectSound() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();

  playTone(ctx, 880, ctx.currentTime, 0.15);
  playTone(ctx, 1318.5, ctx.currentTime + 0.12, 0.2);
}

function playTone(ctx, frequency, startTime, duration) {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;

  gainNode.gain.setValueAtTime(0.2, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

// Initializer
async function init() {
  setupModeNavigation();
  setupPuzzleHeader();
  await loadPokemonList();

  const savedState = loadDailyProgress();

  if (savedState) {
    round = savedState.round;
    totalScore = savedState.totalScore;
    correctCount = savedState.correctCount;
    currentStage = savedState.currentStage;

    if (savedState.completed) {
      startScreenEl.classList.add('hidden');
      searchWrapperEl.classList.add('hidden');
      buttonsEl.classList.add('hidden');
      imageEl.style.filter = 'blur(0px)';
      showGameOverPanel();
      return;
    }

    startScreenEl.classList.add('hidden');
    searchWrapperEl.classList.remove('hidden');
    buttonsEl.classList.remove('hidden');

    // Pass true to keep saved currentStage and fix loading screen
    await loadNewPokemon(true);

    if (savedState.awaitingNext) {
      imageEl.style.filter = 'blur(0px)';
      inputEl.disabled = true;
      skipBtn.disabled = true;
      nextBtn.classList.remove('hidden');
      resultEl.textContent = `Round ${round} completed! Click Next Round to continue.`;
    }
    return;
  }

  startTeaserCarousel(imageEl, false);
}

// ---- Daily State LocalStorage Keys ----
const DAILY_STORAGE_KEY = 'pokeblur-daily-state';

function getDailyStorageKey() {
  const seedStr = getSeedString(selectedDate);
  return `${DAILY_STORAGE_KEY}-${seedStr}`;
}

function saveDailyProgress(isCompleted = false, awaitingNext = false) {
  const state = {
    date: getSeedString(selectedDate),
    round: round,
    totalScore: totalScore,
    correctCount: correctCount,
    currentStage: currentStage,
    completed: isCompleted,
    awaitingNext: awaitingNext
  };
  localStorage.setItem(getDailyStorageKey(), JSON.stringify(state));
}

function loadDailyProgress() {
  const saved = localStorage.getItem(getDailyStorageKey());
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch (e) {
    return null;
  }
}

init();