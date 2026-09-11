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

// Generation Base ID Ranges (IDs 1 to 1025)
const GEN_RANGES = {
  1: [1, 151],
  2: [152, 251],
  3: [252, 386],
  4: [387, 493],
  5: [494, 649],
  6: [650, 721],
  7: [722, 809],
  8: [810, 905],
  9: [906, 1025]
};

// Map Regional Names to their actual debut Generation
const REGIONAL_GEN_MAP = {
  'alola': 7,
  'galar': 8,
  'hisui': 8,
  'paldea': 9
};

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
let selectedGenerations = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);

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
const genFilterContainer = document.getElementById('gen-filter-container');

// ==========================================
// 1. TAB NAVIGATION & MODE SETUP
// ==========================================
function switchTab(activeBtn, activeView) {
  document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
  
  ['daily-view', 'unlimited-view', 'reverse-view'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  if (activeBtn) activeBtn.classList.add('active');
  if (activeView) activeView.classList.remove('hidden');
}

function setupModeNavigation() {
  modeDailyBtn.addEventListener('click', function() {
    switchTab(this, dailyViewEl);

    resetUnlimitedToStartScreen();

    if (!startScreenEl.classList.contains('hidden') && !teaserInterval) {
      startTeaserCarousel(imageEl, false);
    }
  });

  modeUnlimitedBtn.addEventListener('click', function() {
    switchTab(this, unlimitedViewEl);

    clearInterval(teaserInterval);
    teaserInterval = null;

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

// ---- Smart Generation Toggle Logic ----
function setupGenButtons() {
  const genBtns = document.querySelectorAll('.gen-btn:not(#gen-all-btn)');
  const allBtn = document.getElementById('gen-all-btn');

  function syncUI() {
    genBtns.forEach(btn => {
      const g = parseInt(btn.getAttribute('data-gen'), 10);
      if (selectedGenerations.has(g)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (selectedGenerations.size === 9) {
      allBtn.classList.add('active');
    } else {
      allBtn.classList.remove('active');
    }
  }

  genBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const genNum = parseInt(btn.getAttribute('data-gen'), 10);

      if (selectedGenerations.size === 9) {
        selectedGenerations = new Set([genNum]);
      } else {
        if (selectedGenerations.has(genNum)) {
          if (selectedGenerations.size > 1) {
            selectedGenerations.delete(genNum);
          }
        } else {
          selectedGenerations.add(genNum);
        }
      }
      syncUI();
    });
  });

  allBtn.addEventListener('click', () => {
    selectedGenerations = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    syncUI();
  });

  syncUI();
}

// ---- Helper Functions ----
function formatPokemonName(rawName) {
  return rawName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

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

function getReverseHighScore() {
  const saved = localStorage.getItem('pokeblur-reverse-highscore');
  return saved ? parseInt(saved, 10) : 0;
}

function updateReverseHighScore(score) {
  const currentBest = getReverseHighScore();
  if (score > currentBest) {
    localStorage.setItem('pokeblur-reverse-highscore', score.toString());
    return score;
  }
  return currentBest;
}

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
  const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=10275');
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
    const idx = Math.floor(rng() * 1025);
    chosenIndices.add(idx);
  }

  dailyPokemonQueue = Array.from(chosenIndices);
}

// ---- Fetch Pokémon Logic ----
async function fetchPokemonByQueueIndex(roundIdx) {
  const index = dailyPokemonQueue[roundIdx];
  const pokemon = allPokemonList[index];
  
  try {
    const res = await fetch(pokemon.url);
    if (!res.ok) throw new Error('Fetch failed');
    const data = await res.json();
    const artwork = data.sprites?.other?.['official-artwork']?.front_default || data.sprites?.front_default;
    
    if (artwork) {
      return { rawName: pokemon.rawName, displayName: pokemon.displayName, image: artwork };
    }
  } catch (e) {
    // Fallback
  }
  return fetchRandomPokemonWithArtwork(false);
}

function isPokemonInSelectedGens(pokemon, pokemonData = null) {
  const rawName = pokemon.rawName.toLowerCase();

  if (rawName.startsWith('pikachu-') && !rawName.includes('gmax')) {
    const isCostumeOrCap = 
      rawName.includes('cap') || 
      rawName.includes('cosplay') || 
      rawName.includes('star') || 
      rawName.includes('belle') || 
      rawName.includes('phd') || 
      rawName.includes('libre');
      
    if (isCostumeOrCap) {
      return false;
    }
  }

  let gen = null;

  for (const [region, targetGen] of Object.entries(REGIONAL_GEN_MAP)) {
    if (rawName.includes(`-${region}`)) {
      gen = targetGen;
      break;
    }
  }

  if (gen === null) {
    let baseId = pokemon.id;
    if (baseId > 1025 && pokemonData?.species?.url) {
      const parts = pokemonData.species.url.split('/').filter(Boolean);
      baseId = parseInt(parts[parts.length - 1], 10);
    }

    for (const [g, [min, max]] of Object.entries(GEN_RANGES)) {
      if (baseId >= min && baseId <= max) {
        gen = parseInt(g, 10);
        break;
      }
    }
  }

  return selectedGenerations.has(gen);
}

async function fetchRandomPokemonWithArtwork(isShiny = false) {
  while (true) {
    const index = Math.floor(Math.random() * pokemonCount);
    const pokemon = allPokemonList[index];
    
    const res = await fetch(pokemon.url);
    if (!res.ok) continue;
    const data = await res.json();
    
    if (!isPokemonInSelectedGens(pokemon, data)) continue;

    const artwork = isShiny 
      ? (data.sprites?.other?.['official-artwork']?.front_shiny || data.sprites?.front_shiny)
      : (data.sprites?.other?.['official-artwork']?.front_default || data.sprites?.front_default);

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
    targetImgEl.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${isShiny ? 'shiny/' : ''}${randomId}.png`;
  };

  cycleImage();
  teaserInterval = setInterval(cycleImage, 1500);
}

// ==========================================
// 2. DAILY GAME LOGIC
// ==========================================
startBtn.addEventListener('click', async () => {
  clearInterval(teaserInterval);
  teaserInterval = null;
  startScreenEl.classList.add('hidden');
  searchWrapperEl.classList.remove('hidden');
  buttonsEl.classList.remove('hidden');

  await loadNewPokemon();
});

async function loadNewPokemon(isRestoring = false) {
  imageOverlayEl.classList.add('visible');

  const data = await fetchPokemonByQueueIndex(round - 1);
  answer = { rawName: data.rawName, displayName: data.displayName, image: data.image };

  await preloadImage(answer.image);

  if (!isRestoring) currentStage = 0;

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
    playWrongSound();
    nextStage(`Wrong guess — it's not ${guessedPkmn.displayName}.`);
  }
}

skipBtn.addEventListener('click', () => {
  playWrongSound();
  nextStage('Skipped.');
});

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
    const stats = updatePersistentStats(totalScore);
    showGameOverPanel(stats);
  } else {
    nextBtn.classList.remove('hidden');
    saveDailyProgress(false, true);
  }
}

function showGameOverPanel(stats) {
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
  saveDailyProgress(false, false);
  await loadNewPokemon();
  setTimeout(() => { nextBtn.disabled = false; }, 500);
});

// ==========================================
// 3. UNLIMITED MODE LOGIC
// ==========================================
function resetUnlimitedToStartScreen() {
  clearInterval(teaserInterval);
  teaserInterval = null;

  unlimitedStartScreen.classList.remove('hidden');
  genFilterContainer.classList.remove('hidden');
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
  genFilterContainer.classList.add('hidden');
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
    playWrongSound();
    nextUnlimitedStage(`Wrong guess — it's not ${guessedPkmn.displayName}.`);
  }
}

unlimitedSkipBtn.addEventListener('click', () => {
  playWrongSound();
  nextUnlimitedStage('Skipped.');
});

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
// 4. REVERSE MODE LOGIC
// ==========================================
const reverseState = {
  currentRound: 1,
  maxRounds: 5,
  totalScore: 0,
  highScore: 0,
  targetPokemon: null,
  targetDetails: null,
  revealedHints: new Set(),
  mustFlipHint: false,
  currentWorth: 0,
  roundActive: false
};

const reverseElements = {
  view: document.getElementById('reverse-view'),
  navBtn: document.getElementById('mode-reverse-btn'),
  roundLabel: document.getElementById('reverse-round-label'),
  rewardBox: document.getElementById('reverse-reward-box'),
  currentValue: document.getElementById('reverse-current-value'),
  startScreen: document.getElementById('reverse-start-screen'),
  startBtn: document.getElementById('reverse-start-btn'),
  highScoreDisplay: document.getElementById('reverse-high-score-display'),
  gamePlay: document.getElementById('reverse-game-play'),
  hintTiles: document.querySelectorAll('#reverse-game-play .hint-tile'),
  statusMsg: document.getElementById('reverse-status-msg'),
  searchWrapper: document.getElementById('reverse-search-wrapper'),
  guessInput: document.getElementById('reverse-guess-input'),
  suggestions: document.getElementById('reverse-suggestions'),
  skipBtn: document.getElementById('reverse-skip-btn'),
  nextBtn: document.getElementById('reverse-next-btn'),
  resultMsg: document.getElementById('reverse-result-message'),
  gameOverPanel: document.getElementById('reverse-game-over-panel'),
  finalScoreText: document.getElementById('reverse-final-score-text'),
  finalHighScoreText: document.getElementById('reverse-final-highscore-text'),
  playAgainBtn: document.getElementById('reverse-play-again-btn')
};

// Nav Tab Setup
reverseElements.navBtn.addEventListener('click', function() {
  switchTab(this, reverseElements.view);
  updateReverseHighScoreDisplay();
});

// Action Controls
reverseElements.startBtn.addEventListener('click', startReverseGame);
reverseElements.playAgainBtn.addEventListener('click', startReverseGame);
reverseElements.skipBtn.addEventListener('click', giveUpReverseRound);
reverseElements.nextBtn.addEventListener('click', nextReverseRound);

reverseElements.hintTiles.forEach(tile => {
  tile.addEventListener('click', () => handleHintClick(tile));
});

reverseElements.guessInput.addEventListener('input', handleReverseAutocomplete);

// Close suggestions on outside mousedown
document.addEventListener('mousedown', (e) => {
  if (!reverseElements.searchWrapper?.contains(e.target)) {
    reverseElements.suggestions?.classList.remove('active');
  }
});

function updateReverseHighScoreDisplay() {
  reverseState.highScore = getReverseHighScore();
  if (reverseElements.highScoreDisplay) {
    reverseElements.highScoreDisplay.textContent = `High Score: ${reverseState.highScore.toLocaleString()} pts`;
  }
}

function startReverseGame() {
  reverseState.currentRound = 1;
  reverseState.totalScore = 0;
  reverseState.highScore = getReverseHighScore();

  reverseElements.gameOverPanel.classList.add('hidden');
  reverseElements.startScreen.classList.add('hidden');
  reverseElements.rewardBox.classList.remove('hidden');
  reverseElements.gamePlay.classList.remove('hidden');
  
  setupReverseRound();
}

async function setupReverseRound() {
  reverseState.roundActive = false;
  reverseState.revealedHints.clear();
  reverseState.mustFlipHint = false;
  reverseElements.resultMsg.textContent = '';
  reverseElements.statusMsg.textContent = 'Make a guess or tap a category tile to reveal a hint!';
  reverseElements.statusMsg.style.color = '#dddddd';

  reverseElements.hintTiles.forEach(tile => {
    tile.classList.remove('revealed', 'must-flip');
    tile.disabled = false;
    tile.querySelector('.tile-value').textContent = '???';
  });

  reverseElements.skipBtn.classList.remove('hidden');
  reverseElements.nextBtn.classList.add('hidden');
  reverseElements.guessInput.disabled = false;
  reverseElements.guessInput.value = '';

  const validPool = allPokemonList.filter(p => isPokemonInSelectedGens(p));
  const randomIndex = Math.floor(Math.random() * validPool.length);
  reverseState.targetPokemon = validPool[randomIndex];

  reverseState.targetDetails = await fetchReversePokemonDetails(reverseState.targetPokemon);
  
  reverseState.currentWorth = validPool.length;
  reverseElements.currentValue.textContent = reverseState.currentWorth.toLocaleString();
  reverseState.roundActive = true;
  reverseElements.roundLabel.textContent = `Round ${reverseState.currentRound} / ${reverseState.maxRounds} — Score: ${reverseState.totalScore.toLocaleString()}`;
}

async function fetchReversePokemonDetails(pokemon) {
  try {
    // Fetch target using rawName/URL to handle regional forms properly
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemon.rawName}`);
    if (!res.ok) throw new Error('Fetch failed');
    const data = await res.json();

    const rawName = (pokemon.rawName || '').toLowerCase();
    
    // Detect Form
    let form = 'Base Form';
    if (rawName.includes('gmax')) form = 'Gigantamax';
    else if (rawName.includes('mega')) form = 'Mega';
    else if (rawName.includes('alola')) form = 'Alolan';
    else if (rawName.includes('galar')) form = 'Galarian';
    else if (rawName.includes('hisui')) form = 'Hisuian';
    else if (rawName.includes('paldea')) form = 'Paldean';

    // Calculate Base Stat Total
    const bst = data.stats.reduce((acc, stat) => acc + stat.base_stat, 0);

    // Get Base Species ID for Generation calculation
    let baseId = data.id;
    if (data.species?.url) {
      const parts = data.species.url.split('/').filter(Boolean);
      baseId = parseInt(parts[parts.length - 1], 10);
    }

    // Determine Generation debut
    let gen = 1;
    for (const [g, [min, max]] of Object.entries(GEN_RANGES)) {
      if (baseId >= min && baseId <= max) {
        gen = parseInt(g, 10);
        break;
      }
    }

    // Check regional form override maps if applicable
    for (const [region, targetGen] of Object.entries(REGIONAL_GEN_MAP)) {
      if (rawName.includes(region)) {
        gen = targetGen;
        break;
      }
    }

    return {
      generation: `Gen ${gen}`,
      primaryType: data.types[0]?.type?.name ? capitalize(data.types[0].type.name) : 'Unknown',
      secondaryType: data.types[1]?.type?.name ? capitalize(data.types[1].type.name) : 'None',
      form: form,
      bst: `${bst} BST`,
      size: `${(data.height / 10).toFixed(1)}m / ${(data.weight / 10).toFixed(1)}kg`
    };
  } catch (err) {
    console.error('Error fetching Reverse Pokemon details:', err);
    return { 
      generation: 'Unknown', 
      primaryType: 'Unknown', 
      secondaryType: 'None', 
      form: 'Base Form', 
      bst: '??? BST', 
      size: '???m / ???kg' 
    };
  }
}

function handleReverseAutocomplete() {
  const query = reverseElements.guessInput.value.toLowerCase().trim();
  reverseElements.suggestions.innerHTML = '';

  if (!query || reverseState.mustFlipHint) {
    reverseElements.suggestions.classList.remove('active');
    return;
  }

  const matches = allPokemonList
    .filter(p => {
      const name = (p.displayName || p.rawName || '').toLowerCase();
      return isPokemonInSelectedGens(p) && name.includes(query);
    })
    .slice(0, 5);

  if (matches.length === 0) {
    reverseElements.suggestions.classList.remove('active');
    return;
  }

  matches.forEach(match => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';

    const pName = match.displayName || match.rawName;
    const pId = match.id;

    const img = document.createElement('img');
    img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pId}.png`;
    img.alt = pName;
    img.className = 'suggestion-sprite';
    item.appendChild(img);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'suggestion-name';
    nameSpan.textContent = pName;
    item.appendChild(nameSpan);

    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      reverseElements.suggestions.classList.remove('active');
      submitReverseGuess(match);
    });

    reverseElements.suggestions.appendChild(item);
  });

  reverseElements.suggestions.classList.add('active');
}

function submitReverseGuess(guessedPokemon) {
  reverseElements.suggestions.classList.remove('active');
  reverseElements.guessInput.value = '';

  const targetName = reverseState.targetPokemon.displayName || reverseState.targetPokemon.rawName;
  const guessedName = guessedPokemon.displayName || guessedPokemon.rawName;

  if (guessedName.toLowerCase() === targetName.toLowerCase()) {
    reverseState.roundActive = false;
    reverseState.totalScore += reverseState.currentWorth;
    updateReverseHighScore(reverseState.totalScore);
    
    reverseElements.resultMsg.textContent = `Correct! It was ${targetName}! Scored +${reverseState.currentWorth.toLocaleString()} pts!`;
    reverseElements.resultMsg.style.color = '#4cd137';
    launchConfetti();
    playCorrectSound();
    revealAllTiles();
    finishReverseRound();
  } else {
    playWrongSound();
    const unrevealedTiles = Array.from(reverseElements.hintTiles).filter(
      tile => !reverseState.revealedHints.has(tile.dataset.category)
    );

    if (unrevealedTiles.length > 0) {
      reverseState.mustFlipHint = true;
      reverseElements.guessInput.disabled = true;
      reverseElements.statusMsg.textContent = 'Incorrect! Pick a category tile to reveal a hint before guessing again.';
      reverseElements.statusMsg.style.color = '#ff4757';
      unrevealedTiles.forEach(tile => tile.classList.add('must-flip'));
    } else {
      reverseElements.statusMsg.textContent = 'Incorrect! All hints are already flipped. Try another guess!';
      reverseElements.statusMsg.style.color = '#ff4757';
    }
  }
}

function handleHintClick(tile) {
  if (!reverseState.roundActive) return;
  const category = tile.dataset.category;
  if (reverseState.revealedHints.has(category)) return;

  reverseState.revealedHints.add(category);
  tile.classList.add('revealed');
  tile.classList.remove('must-flip');
  tile.querySelector('.tile-value').textContent = reverseState.targetDetails[category];

  recalculatePoolWorth();

  if (reverseState.mustFlipHint) {
    reverseState.mustFlipHint = false;
    reverseElements.hintTiles.forEach(t => t.classList.remove('must-flip'));
    reverseElements.guessInput.disabled = false;
    reverseElements.statusMsg.textContent = 'Hint revealed! You can now guess again.';
    reverseElements.statusMsg.style.color = '#dddddd';
  }
}

function recalculatePoolWorth() {
  const total = allPokemonList.filter(p => isPokemonInSelectedGens(p)).length;
  let count = total;

  if (reverseState.revealedHints.has('generation')) count = Math.ceil(count / 4);
  if (reverseState.revealedHints.has('primaryType')) count = Math.ceil(count / 5);
  if (reverseState.revealedHints.has('secondaryType')) count = Math.ceil(count / 2);
  if (reverseState.revealedHints.has('form')) count = Math.ceil(count / 2.5);
  if (reverseState.revealedHints.has('bst')) count = Math.ceil(count / 3);
  if (reverseState.revealedHints.has('size')) count = Math.ceil(count / 2);

  if (reverseState.revealedHints.size === 6) count = 1;

  reverseState.currentWorth = Math.max(1, count);
  reverseElements.currentValue.textContent = reverseState.currentWorth.toLocaleString();
}

function giveUpReverseRound() {
  reverseState.roundActive = false;
  playWrongSound();
  const targetName = reverseState.targetPokemon.displayName || reverseState.targetPokemon.rawName;
  reverseElements.resultMsg.textContent = `Round skipped. It was ${targetName}.`;
  reverseElements.resultMsg.style.color = '#e1b12c';
  revealAllTiles();
  finishReverseRound();
}

function revealAllTiles() {
  reverseElements.hintTiles.forEach(tile => {
    const cat = tile.dataset.category;
    tile.querySelector('.tile-value').textContent = reverseState.targetDetails[cat];
    tile.classList.add('revealed');
    tile.classList.remove('must-flip');
  });
}

function finishReverseRound() {
  reverseElements.skipBtn.classList.add('hidden');
  reverseElements.nextBtn.classList.remove('hidden');
  reverseElements.roundLabel.textContent = `Round ${reverseState.currentRound} / ${reverseState.maxRounds} — Score: ${reverseState.totalScore.toLocaleString()}`;
}

function nextReverseRound() {
  if (reverseState.currentRound < reverseState.maxRounds) {
    reverseState.currentRound++;
    setupReverseRound();
  } else {
    // Hide playing interface & active round UI elements
    reverseElements.gamePlay.classList.add('hidden');
    reverseElements.rewardBox.classList.add('hidden');
    reverseElements.resultMsg.textContent = ''; 
    
    // Display Game Over Panel
    reverseElements.gameOverPanel.classList.remove('hidden');
    
    // Save & Display High Score
    const finalBest = updateReverseHighScore(reverseState.totalScore);
    reverseElements.finalScoreText.textContent = `Final Score: ${reverseState.totalScore.toLocaleString()} points!`;
    
    if (reverseElements.finalHighScoreText) {
      reverseElements.finalHighScoreText.textContent = `Personal Best: ${finalBest.toLocaleString()} pts`;
    }
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ==========================================
// 5. EFFECTS & INIT
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

  playTone(ctx, 880, ctx.currentTime, 0.15, 'sine');
  playTone(ctx, 1318.5, ctx.currentTime + 0.12, 0.2, 'sine');
}

function playWrongSound() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();

  playTone(ctx, 220, ctx.currentTime, 0.15, 'sawtooth');
  playTone(ctx, 164.81, ctx.currentTime + 0.12, 0.25, 'sawtooth');
}

function playTone(ctx, frequency, startTime, duration, type = 'sine') {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  gainNode.gain.setValueAtTime(0.15, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

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

async function init() {
  setupModeNavigation();
  setupGenButtons();
  setupPuzzleHeader();
  updateReverseHighScoreDisplay();
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
      showGameOverPanel(getStoredStats());
      return;
    }

    startScreenEl.classList.add('hidden');
    searchWrapperEl.classList.remove('hidden');
    buttonsEl.classList.remove('hidden');

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

init();