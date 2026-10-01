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
let dailyHistory = [];          // per-round { rawName, displayName, image, points } so today's Pokémon can be viewed again after finishing
let lastRoundPoints = 0;
let dailyReviewRound = TOTAL_ROUNDS;
let dailyCountdownTimer = null;

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
const statStreak = document.getElementById('stat-streak');
const streakBestEl = document.getElementById('streak-best');
const gameOverCloseBtn = document.getElementById('game-over-close');
const dailyReviewEl = document.getElementById('daily-review');
const dailyReviewNameEl = document.getElementById('daily-review-name');
const dailyReviewPointsEl = document.getElementById('daily-review-points');
const dailyReviewChips = document.querySelectorAll('#daily-review-chips .review-chip');
const dailyReviewResultsBtn = document.getElementById('daily-review-results-btn');

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

// DOM Elements - Timed Mode
const timedViewEl = document.getElementById('timed-view');
const modeTimedBtn = document.getElementById('mode-timed-btn');
const timedSetupContainer = document.getElementById('timed-setup-container');
const timedDurationButtons = document.querySelectorAll('#timed-duration-grid .gen-btn');
const timedCustomWrapper = document.getElementById('timed-custom-wrapper');
const timedCustomInput = document.getElementById('timed-custom-input');
const timedGenFilterContainer = document.getElementById('timed-gen-filter-container');
const timedStatsLabel = document.getElementById('timed-stats-label');
const timedStageLabel = document.getElementById('timed-stage-label');
const timedCountdownEl = document.getElementById('timed-countdown');
const timedImageEl = document.getElementById('timed-pokemon-image');
const timedImageOverlay = document.getElementById('timed-image-overlay');
const timedStartScreen = document.getElementById('timed-start-screen');
const timedStartBtn = document.getElementById('timed-start-btn');
const timedSearchWrapper = document.getElementById('timed-search-wrapper');
const timedButtons = document.getElementById('timed-buttons');
const timedInputEl = document.getElementById('timed-guess-input');
const timedSuggestionsEl = document.getElementById('timed-suggestions');
const timedSkipBtn = document.getElementById('timed-skip-btn');
const timedResultEl = document.getElementById('timed-result-message');
const timedGameOverPanel = document.getElementById('timed-game-over-panel');
const timedFinalScoreText = document.getElementById('timed-final-score-text');
const timedPlayAgainBtn = document.getElementById('timed-play-again-btn');
const timedFinalBestText = document.getElementById('timed-final-best-text');
const timedHighScoreCard = document.getElementById('timed-highscore-card');
const timedHsScoreEl = document.getElementById('timed-hs-score');
const timedHsSettingEl = document.getElementById('timed-hs-setting');
const timedHsDetailEl = document.getElementById('timed-hs-detail');
const timedRecordsEl = document.getElementById('timed-records');
const timedRecordsListEl = document.getElementById('timed-records-list');

// Timed Mode State
let timedDuration = 30;       // seconds, chosen on the setup screen
let timedTimeLeft = 0;
let timedInterval = null;
let timedActive = false;      // true from Start until time runs out
let timedScore = 0;
let timedCorrectCount = 0;
let timedCurrentStage = 0;
let timedAnswer = null;
let timedRunDuration = 30;
let timedRunGens = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
let timedRoundLocked = false; // true during the short pause between Pokémon (input stays enabled so it keeps focus / the phone keyboard stays open)

// ==========================================
// 1. TAB NAVIGATION & MODE SETUP
// ==========================================
function switchTab(activeBtn, activeView) {
  document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
  
  ['daily-view', 'unlimited-view', 'timed-view', 'reverse-view'].forEach(id => {
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

  modeTimedBtn.addEventListener('click', function() {
    switchTab(this, timedViewEl);

    clearInterval(teaserInterval);
    teaserInterval = null;

    resumeTimedTimerIfNeeded();
    if (!timedActive && !teaserInterval) {
      startTeaserCarousel(timedImageEl, false);
    }
  });

  // Unlimited sub-navigation
  unlimitedNormalBtn.addEventListener('click', () => {
    if (unlimitedMode === 'normal') return;
    unlimitedMode = 'normal';
    unlimitedNormalBtn.classList.add('active');
    unlimitedShinyBtn.classList.remove('active');
    unlimitedModeTitle.textContent = 'Unlimited - Normal Mode';

    resetUnlimitedToStartScreen();
    startTeaserCarousel(unlimitedImageEl, false);
  });

  unlimitedShinyBtn.addEventListener('click', () => {
    if (unlimitedMode === 'shiny') return;
    unlimitedMode = 'shiny';
    unlimitedShinyBtn.classList.add('active');
    unlimitedNormalBtn.classList.remove('active');
    unlimitedModeTitle.textContent = 'Unlimited - Shiny Mode';

    resetUnlimitedToStartScreen();
    startTeaserCarousel(unlimitedImageEl, true);
  });
}

// ---- Smart Generation Toggle Logic ----
// Callable once per gen-filter UI instance (Unlimited's and Timed Mode's each
// have their own buttons) - all instances stay in sync since they share the
// same underlying selectedGenerations set.
const genFilterSyncFns = [];

function syncAllGenFilterUIs() {
  genFilterSyncFns.forEach(fn => fn());
  showTimedHighScoreLabel(); // the Timed Mode record shown depends on the generation filter
}

function setupGenButtons(containerEl) {
  const genBtns = containerEl.querySelectorAll('.gen-btn:not(.all-btn)');
  const allBtn = containerEl.querySelector('.gen-btn.all-btn');

  function syncUI() {
    genBtns.forEach(btn => {
      const g = parseInt(btn.getAttribute('data-gen'), 10);
      btn.classList.toggle('active', selectedGenerations.has(g));
    });
    allBtn.classList.toggle('active', selectedGenerations.size === 9);
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
      syncAllGenFilterUIs();
    });
  });

  allBtn.addEventListener('click', () => {
    selectedGenerations = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    syncAllGenFilterUIs();
  });

  genFilterSyncFns.push(syncUI);
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

// ---- Timed Mode records ----
// One best score per TIME LENGTH *and* GENERATION FILTER, so a Gen 1-only run
// is never compared against an all-generations run (smaller pools are easier).
const TIMED_RECORDS_KEY = 'pokeblur-timed-records';

function timedGenKey(gens) {
  const list = Array.from(gens).sort((a, b) => a - b);
  return list.length === 9 ? 'all' : list.join('-');
}

function timedGenLabel(gens) {
  const list = Array.from(gens).sort((a, b) => a - b);
  if (list.length === 9) return 'All Gens';
  if (list.length === 1) return `Gen ${list[0]}`;
  const contiguous = list.every((g, i) => i === 0 || g === list[i - 1] + 1);
  return contiguous ? `Gens ${list[0]}-${list[list.length - 1]}` : `Gens ${list.join(', ')}`;
}

function formatTimedDuration(sec) {
  if (sec < 60) return `${sec} sec`;
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return r === 0 ? `${m} min` : `${m}m ${r}s`;
}

function getTimedRecords() {
  try {
    return JSON.parse(localStorage.getItem(TIMED_RECORDS_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function timedRecordKey(seconds, gens) {
  return `${seconds}|${timedGenKey(gens)}`;
}

function getTimedRecord(seconds, gens) {
  return getTimedRecords()[timedRecordKey(seconds, gens)] || null; // { score, correct } or null
}

// Returns true if this run set a new best for that time length + filter.
function saveTimedRecord(seconds, gens, score, correct) {
  if (score <= 0) return false;
  const all = getTimedRecords();
  const key = timedRecordKey(seconds, gens);
  const prev = all[key];
  if (prev && score <= prev.score) return false;
  all[key] = { score, correct };
  try { localStorage.setItem(TIMED_RECORDS_KEY, JSON.stringify(all)); } catch (e) {}
  return true;
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
    puzzleDateLabelEl.textContent = `${dateStr} - Puzzle #${puzzleNum}`;
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
    const artwork = data.sprites?.other?.['official-artwork']?.front_default;
    
    if (artwork) {
      return { rawName: pokemon.rawName, displayName: pokemon.displayName, image: artwork };
    }
  } catch (e) {
    // Fallback
  }
  return fetchRandomPokemonWithArtwork(false);
}

// Shared by the answer picker (isPokemonInSelectedGens) AND the autocomplete
// dropdown below - a form excluded from being the answer should never be
// typeable/selectable as a guess either, or it just clutters the search
// results with something that can never actually be correct.
function isExcludedForm(rawNameLower) {
  if (rawNameLower.startsWith('pikachu-') && !rawNameLower.includes('gmax')) {
    const isCostumeOrCap =
      rawNameLower.includes('cap') ||
      rawNameLower.includes('cosplay') ||
      rawNameLower.includes('star') ||
      rawNameLower.includes('belle') ||
      rawNameLower.includes('phd') ||
      rawNameLower.includes('libre');
    if (isCostumeOrCap) return true;
  }

  // Battle-only/cosmetic forms that are visually near-identical to their
  // base form (Totem Pokémon, Busted Mimikyu, Cramorant's Gulping/Gorging
  // forms) - genuinely unfair to guess from an image since they don't look
  // meaningfully different. Mega/Gigantamax/regional forms are untouched
  // by this, since none of those names match here.
  if (
    rawNameLower.includes('-totem') ||
    rawNameLower.includes('-busted') ||
    rawNameLower.includes('-gulping') ||
    rawNameLower.includes('-gorging')
  ) {
    return true;
  }

  // Zygarde's "Power Construct" forms use the exact same artwork as the
  // normal 10% / 50% forms, so there's no way to tell them apart by sight.
  if (rawNameLower.includes('-power-construct')) {
    return true;
  }

  // Minior: every color's "Meteor Form" (the one it's normally in) looks
  // like the same plain grey rock regardless of which color is underneath -
  // there's no way to tell them apart from the image at all.
  if (rawNameLower.startsWith('minior')) {
    return true;
  }

  // Sinistea/Polteageist's "Antique" form is deliberately near-identical to
  // the normal "Phony" form - the whole gimmick is that you can only tell
  // them apart with an in-game inspection, not by looking at the artwork.
  if (rawNameLower.includes('-antique')) {
    return true;
  }

  // Pumpkaboo/Gourgeist size forms (Small/Large/Super) are the same shape
  // and color as the default Average form - only size differs, which a
  // single static image with no scale reference can't convey.
  if (
    (rawNameLower.startsWith('pumpkaboo-') || rawNameLower.startsWith('gourgeist-')) &&
    (rawNameLower.includes('small') || rawNameLower.includes('large') || rawNameLower.includes('super'))
  ) {
    return true;
  }

  return false;
}

function isPokemonInSelectedGens(pokemon, pokemonData = null, gensOverride = null) {
  const rawName = pokemon.rawName.toLowerCase();

  if (isExcludedForm(rawName)) {
    return false;
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

  return (gensOverride || selectedGenerations).has(gen);
}

async function fetchRandomPokemonWithArtwork(isShiny = false, gensOverride = null) {
  // Bounded retry loop with error handling: a bare `while (true)` around an
  // un-caught fetch() means a single dropped request (flaky wifi, PokeAPI
  // rate limit, etc.) throws and kills whatever awaited this - including a
  // live Versus round, with nothing shown to any player. Catching per-attempt
  // and capping attempts keeps a network hiccup from breaking the caller.
  const MAX_ATTEMPTS = 40;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const index = Math.floor(Math.random() * pokemonCount);
    const pokemon = allPokemonList[index];

    try {
      const res = await fetch(pokemon.url);
      if (!res.ok) continue;
      const data = await res.json();

      if (!isPokemonInSelectedGens(pokemon, data, gensOverride)) continue;

      // No fallback to data.sprites.front_default here on purpose: forms
      // that lack real official artwork (Totem, Busted Mimikyu, Minior
      // color variants, etc.) would otherwise fall back to a generic sprite
      // that's often identical or near-identical to the base form's - which
      // is exactly the "looks the same" unfairness. Mega/Gigantamax/
      // regional forms all have real official artwork, so they're unaffected.
      const artwork = isShiny
        ? data.sprites?.other?.['official-artwork']?.front_shiny
        : data.sprites?.other?.['official-artwork']?.front_default;

      if (artwork) {
        return { rawName: pokemon.rawName, displayName: pokemon.displayName, image: artwork };
      }
    } catch (e) {
      // Network hiccup on this attempt - just try a different Pokémon.
      continue;
    }
  }

  throw new Error('Could not find a matching Pokémon after multiple attempts');
}

function preloadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    // Safety timeout: if the image never loads or errors (a stalled
    // connection, rather than an outright failure), don't leave the
    // loading overlay spinning forever - move on after 15s.
    const timer = setTimeout(finish, 15000);
    img.onload = finish;
    img.onerror = finish;
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
  inputEl.focus();
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
  stageLabelEl.textContent = `Stage ${currentStage + 1} - Guess for ${stage.points} points`;
  stageLabelEl.classList.remove('stage-pending');
}

function updateRoundLabel() {
  roundLabelEl.textContent = `Round ${round} / ${TOTAL_ROUNDS} - Score: ${totalScore}`;
}

inputEl.addEventListener('input', () => {
  setupAutocomplete(inputEl, suggestionsEl, handleGuess);
});
attachAutocompleteKeyboardNav(inputEl, suggestionsEl, () => {
  if (!skipBtn.disabled) skipBtn.click();
});

function setupAutocomplete(inputField, suggestionsContainer, selectHandler) {
  const query = inputField.value.toLowerCase().trim();
  suggestionsContainer.innerHTML = '';

  if (query === '') return;

  const matches = allPokemonList
    .filter(p => !isExcludedForm(p.rawName.toLowerCase()))
    .filter(p => p.displayName.toLowerCase().includes(query) || p.rawName.toLowerCase().includes(query))
    .sort((a, b) => {
      const aStarts = a.displayName.toLowerCase().startsWith(query) ? 0 : 1;
      const bStarts = b.displayName.toLowerCase().startsWith(query) ? 0 : 1;
      return aStarts - bStarts;
    })
    .slice(0, 8);

  if (matches.length === 0) {
    suggestionsContainer.innerHTML = '<div class="suggestion-item suggestion-empty">No Pokémon found</div>';
    return;
  }

  matches.forEach(pkmn => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.textContent = pkmn.displayName;
    // Without this, a real mouse click blurs the input (default browser
    // behavior on mousedown against any non-focusable element) BEFORE the
    // click handler even runs - so you'd have to click back into the input
    // to keep typing your next guess. preventDefault() here stops that.
    item.addEventListener('mousedown', (e) => e.preventDefault());
    item.addEventListener('click', () => selectHandler(pkmn));
    suggestionsContainer.appendChild(item);
  });
}

// Lets a text input's autocomplete list be driven from the keyboard:
// ArrowUp/ArrowDown move a highlight through the current suggestions, and
// Enter picks whichever is highlighted (or the top match if you haven't
// pressed an arrow key yet) - so you can type a name and hit Enter without
// reaching for the mouse. Works with any suggestionsContainer built by
// setupAutocomplete() above, since it only needs the rendered .suggestion-item
// elements and their existing click handlers.
function attachAutocompleteKeyboardNav(inputField, suggestionsContainer, onEmptyEnter = null) {
  let activeIndex = -1;

  const getItems = () =>
    Array.from(suggestionsContainer.querySelectorAll('.suggestion-item:not(.suggestion-empty)'));

  const setActive = (items, index) => {
    items.forEach(el => el.classList.remove('active'));
    if (index >= 0 && items[index]) {
      items[index].classList.add('active');
      items[index].scrollIntoView({ block: 'nearest' });
    }
  };

  // A fresh keystroke means a fresh suggestion list - don't carry a
  // highlight position over onto results it was never meant for.
  inputField.addEventListener('input', () => {
    activeIndex = -1;
  });

  inputField.addEventListener('keydown', (e) => {
    // Enter with nothing typed - treat it as "skip this one" if the caller
    // gave us something to call, rather than just doing nothing.
    if (e.key === 'Enter' && inputField.value.trim() === '' && typeof onEmptyEnter === 'function') {
      e.preventDefault();
      e.stopPropagation();
      onEmptyEnter();
      return;
    }

    const items = getItems();
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, items.length - 1);
      setActive(items, activeIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      setActive(items, activeIndex);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Stops this same keypress from also bubbling up to the page-level
      // "Enter clicks Next" listener - without this, submitting a correct
      // guess and advancing to the next Pokémon happened on the same single
      // keypress, skipping right past seeing the unblurred answer.
      e.stopPropagation();
      const target = items[activeIndex] || items[0];
      if (target) target.click();
      activeIndex = -1;
    } else if (e.key === 'Escape') {
      suggestionsContainer.innerHTML = '';
      activeIndex = -1;
    }
  });
}

function handleGuess(guessedPkmn) {
  suggestionsEl.innerHTML = '';
  inputEl.value = '';

  if (guessedPkmn.rawName === answer.rawName) {
    const points = stages[currentStage].points;
    lastRoundPoints = points;
    totalScore += points;
    correctCount++;
    imageEl.style.filter = 'blur(0px)';
    resultEl.textContent = `Correct! It's ${answer.displayName} - scored ${points} pts!`;
    launchConfetti();
    playCorrectSound();
    endRound();
  } else {
    playWrongSound();
    nextStage(`Wrong guess - it's not ${guessedPkmn.displayName}.`);
  }
}

skipBtn.addEventListener('click', () => {
  playWrongSound();
  nextStage('Skipped.');
});

function nextStage(message) {
  if (currentStage >= stages.length - 1) {
    imageEl.style.filter = 'blur(0px)';
    resultEl.textContent = `Out of guesses - it was ${answer.displayName}. 0 points.`;
    lastRoundPoints = 0;
    endRound();
    return;
  }
  currentStage++;
  applyStage();
  resultEl.textContent = message;
  saveDailyProgress(false, false);
  inputEl.focus();
}

function endRound() {
  inputEl.disabled = true;
  skipBtn.disabled = true;
  updateRoundLabel();
  if (answer) {
    dailyHistory[round - 1] = { rawName: answer.rawName, displayName: answer.displayName, image: answer.image, points: lastRoundPoints };
  }

  if (round >= TOTAL_ROUNDS) {
    resultEl.textContent += ` Game over! Final score: ${totalScore} / 25.`;
    nextBtn.classList.add('hidden');
    stageLabelEl.classList.add('stage-pending');
    saveDailyProgress(true, false);
    const stats = updatePersistentStats(totalScore);
    showGameOverPanel(stats);
  } else {
    nextBtn.classList.remove('hidden');
    saveDailyProgress(false, true);
  }
}

// ---- Daily streak (consecutive days with a finished Daily puzzle) ----
// Stored as { current, best, lastDate } where lastDate is the seed string
// (YYYY-MM-DD) of the most recent day you finished. recordDailyStreak() is safe
// to call more than once for the same day: it only changes anything the first
// time, so reloading the page or replaying today never double-counts.
const STREAK_KEY = 'pokeblur-streak';

function getStreakData() {
  try {
    const s = JSON.parse(localStorage.getItem(STREAK_KEY));
    if (s && Number.isFinite(s.current) && Number.isFinite(s.best)) return s;
  } catch (e) {}
  return { current: 0, best: 0, lastDate: null };
}

function recordDailyStreak() {
  const data = getStreakData();
  const today = getSeedString(selectedDate);
  if (data.lastDate === today) return data; // already counted today

  const yesterday = new Date(selectedDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const continued = data.lastDate === getSeedString(yesterday);

  data.current = continued ? data.current + 1 : 1;
  data.best = Math.max(data.best, data.current);
  data.lastDate = today;
  try { localStorage.setItem(STREAK_KEY, JSON.stringify(data)); } catch (e) {}
  return data;
}

function showGameOverPanel(stats) {
  const avg = (stats.totalPoints / stats.gamesPlayed).toFixed(1);

  finalScoreText.textContent = `Final Score: ${totalScore} / 25`;
  statsLine.textContent = `You correctly guessed ${correctCount} out of ${TOTAL_ROUNDS} Pokémon!`;
  statPlayed.textContent = stats.gamesPlayed;
  statAvg.textContent = avg;

  const streak = recordDailyStreak();
  statStreak.textContent = streak.current;
  streakBestEl.textContent = `Best streak: ${streak.best}`;

  dailyReviewEl.classList.add('hidden');
  gameOverPanel.classList.remove('hidden');
  startDailyCountdown();
}

// ---- Daily: see today's Pokémon again after finishing ----
// Today's five Pokémon are saved as each round ends, and (because the daily
// puzzle is seeded from the date) can always be rebuilt from the date alone,
// so this keeps working after a reload or when opening the site in a new tab.
async function getDailyRoundData(roundNum) {
  const cached = dailyHistory[roundNum - 1];
  if (cached && cached.rawName) return cached;
  const data = await fetchPokemonByQueueIndex(roundNum - 1);
  const entry = { rawName: data.rawName, displayName: data.displayName, image: data.image, points: null };
  dailyHistory[roundNum - 1] = entry;
  return entry;
}

function updateReviewChips() {
  dailyReviewChips.forEach(chip => {
    const n = parseInt(chip.getAttribute('data-round'), 10);
    const entry = dailyHistory[n - 1];
    chip.classList.toggle('active', n === dailyReviewRound);
    chip.classList.toggle('hit', !!entry && entry.points > 0);
    chip.classList.toggle('miss', !!entry && entry.points === 0);
  });
}

async function showDailyReview(roundNum) {
  dailyReviewRound = roundNum;
  gameOverPanel.classList.add('hidden');
  searchWrapperEl.classList.add('hidden');   // the game is finished - no input or skip button needed
  buttonsEl.classList.add('hidden');
  dailyReviewEl.classList.remove('hidden');
  resultEl.textContent = '';
  dailyReviewNameEl.textContent = 'Loading...';
  dailyReviewPointsEl.textContent = '';
  updateReviewChips();

  const entry = await getDailyRoundData(roundNum);
  if (dailyReviewRound !== roundNum) return; // another chip was tapped while this loaded

  imageEl.style.filter = 'blur(0px)';
  imageEl.src = entry.image;
  dailyReviewNameEl.textContent = entry.displayName;
  const maxPts = stages[0].points; // best possible score for one Pokémon (guessed at stage 1)
  dailyReviewPointsEl.textContent = entry.points == null
    ? ''
    : (entry.points > 0 ? `${entry.points}/${maxPts}` : `0/${maxPts} - not guessed`);
  updateReviewChips();
}

gameOverCloseBtn.addEventListener('click', () => showDailyReview(TOTAL_ROUNDS));
dailyReviewResultsBtn.addEventListener('click', () => {
  dailyReviewEl.classList.add('hidden');
  gameOverPanel.classList.remove('hidden');
});
dailyReviewChips.forEach(chip => {
  chip.addEventListener('click', () => showDailyReview(parseInt(chip.getAttribute('data-round'), 10)));
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !gameOverPanel.classList.contains('hidden') && !dailyViewEl.classList.contains('hidden')) {
    showDailyReview(TOTAL_ROUNDS);
  }
});

// ---- Daily: countdown to the next puzzle (resets at your local midnight) ----
function formatCountdown(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(t / 3600)).padStart(2, '0');
  const m = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
  const sec = String(t % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

function startDailyCountdown() {
  if (dailyCountdownTimer) return;
  const nextPuzzleAt = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 1);

  const tick = () => {
    const remaining = nextPuzzleAt - new Date();
    if (remaining <= 0) {
      clearInterval(dailyCountdownTimer);
      dailyCountdownTimer = null;
      document.querySelectorAll('.daily-countdown').forEach(el => {
        el.textContent = '';
        const btn = document.createElement('button');
        btn.className = 'action-btn';
        btn.textContent = 'New puzzle ready - play now';
        btn.addEventListener('click', () => window.location.reload());
        el.appendChild(btn);
      });
      return;
    }
    document.querySelectorAll('.daily-countdown-time').forEach(el => {
      el.textContent = formatCountdown(remaining);
    });
  };

  tick();
  dailyCountdownTimer = setInterval(tick, 1000);
}

// One coloured square per Pokémon, based on the points scored for it.
function pointsToEmoji(points) {
  if (points == null) return '\u2B1C';   // white square: score unknown (older save)
  if (points >= 4) return '\uD83D\uDFE9'; // green: guessed at stage 1-2
  if (points >= 2) return '\uD83D\uDFE8'; // yellow: stage 3-4
  if (points >= 1) return '\uD83D\uDFE7'; // orange: last-stage guess
  return '\uD83D\uDFE5';                 // red: not guessed
}

function buildShareText() {
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  const dateStr = selectedDate.toLocaleDateString('en-US', options);
  const grid = Array.from({ length: TOTAL_ROUNDS }, (_, i) => {
    const entry = dailyHistory[i];
    return pointsToEmoji(entry ? entry.points : null);
  }).join('');

  const lines = [
    `PokéBlur - ${dateStr}`,
    `${grid} ${totalScore}/${TOTAL_ROUNDS * stages[0].points}`
  ];
  const streak = getStreakData();
  if (streak.current >= 2) lines.push(`\uD83D\uDD25 ${streak.current}-day streak`);
  lines.push('https://vibedbean.github.io/');
  return lines.join('\n');
}

shareBtn.addEventListener('click', () => {
  const originalText = shareBtn.textContent;
  const flash = (msg) => {
    shareBtn.textContent = msg;
    setTimeout(() => { shareBtn.textContent = originalText; }, 2000);
  };
  navigator.clipboard.writeText(buildShareText()).then(
    () => flash('Copied!'),
    () => flash('Copy failed')
  );
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
  unlimitedRoundLabel.textContent = 'Round 1 / 5 - Score: 0';
  unlimitedStageLabel.textContent = 'Stage 1 - Guess for 5 points';
  unlimitedStageLabel.classList.add('stage-pending');
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
  unlimitedInputEl.focus();
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
  unlimitedStageLabel.textContent = `Stage ${unlimitedCurrentStage + 1} - Guess for ${stage.points} points`;
  unlimitedStageLabel.classList.remove('stage-pending');
}

function updateUnlimitedRoundLabel() {
  unlimitedRoundLabel.textContent = `Round ${unlimitedRound} / ${TOTAL_ROUNDS} - Score: ${unlimitedTotalScore}`;
}

unlimitedInputEl.addEventListener('input', () => {
  setupAutocomplete(unlimitedInputEl, unlimitedSuggestionsEl, handleUnlimitedGuess);
});
attachAutocompleteKeyboardNav(unlimitedInputEl, unlimitedSuggestionsEl, () => {
  if (!unlimitedSkipBtn.disabled) unlimitedSkipBtn.click();
});

function handleUnlimitedGuess(guessedPkmn) {
  unlimitedSuggestionsEl.innerHTML = '';
  unlimitedInputEl.value = '';

  if (guessedPkmn.rawName === unlimitedAnswer.rawName) {
    const points = stages[unlimitedCurrentStage].points;
    unlimitedTotalScore += points;
    unlimitedImageEl.style.filter = 'blur(0px)';
    unlimitedResultEl.textContent = `Correct! It's ${unlimitedAnswer.displayName} - scored ${points} pts!`;
    launchConfetti();
    playCorrectSound();
    endUnlimitedRound();
  } else {
    playWrongSound();
    nextUnlimitedStage(`Wrong guess - it's not ${guessedPkmn.displayName}.`);
  }
}

unlimitedSkipBtn.addEventListener('click', () => {
  playWrongSound();
  nextUnlimitedStage('Skipped.');
});

function nextUnlimitedStage(message) {
  if (unlimitedCurrentStage >= stages.length - 1) {
    unlimitedImageEl.style.filter = 'blur(0px)';
    unlimitedResultEl.textContent = `Out of guesses - it was ${unlimitedAnswer.displayName}. 0 points.`;
    endUnlimitedRound();
    return;
  }
  unlimitedCurrentStage++;
  applyUnlimitedStage();
  unlimitedResultEl.textContent = message;
  unlimitedInputEl.focus();
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

// Once you've gotten a round right (or run out of guesses), the guess input
// is disabled and a "Next Pokémon" button appears - pressing Enter here
// clicks it, so you don't have to reach for the mouse. Scoped to both the
// button AND its view being visible, so this can't fire a stale click on a
// button left un-hidden in a tab you've since navigated away from.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;

  if (!dailyViewEl.classList.contains('hidden') &&
      !nextBtn.classList.contains('hidden') && !nextBtn.disabled) {
    nextBtn.click();
  } else if (!unlimitedViewEl.classList.contains('hidden') &&
             !unlimitedNextBtn.classList.contains('hidden') && !unlimitedNextBtn.disabled) {
    unlimitedNextBtn.click();
  }
});

// ==========================================
// TIMED MODE LOGIC
// Guess as many Pokémon as possible before a chosen time limit runs out.
// Reuses the same stage/blur/points system as Daily & Unlimited.
// ==========================================
// Pre-game card: your best for the currently selected time length + generation filter,
// with a collapsible list of every record you've set.
function showTimedHighScoreLabel() {
  const best = getTimedRecord(timedDuration, selectedGenerations);
  timedHsScoreEl.textContent = best ? best.score : '-';
  timedHsSettingEl.textContent = `${formatTimedDuration(timedDuration)} · ${timedGenLabel(selectedGenerations)}`;
  timedHsDetailEl.textContent = best ? `${best.correct} correct` : 'No score yet - set one!';
  renderTimedRecordsList();
}

function renderTimedRecordsList() {
  const all = getTimedRecords();
  const currentKey = timedRecordKey(timedDuration, selectedGenerations);
  const entries = Object.keys(all).map(key => {
    const [secStr, genKey] = key.split('|');
    const gens = genKey === 'all' ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : genKey.split('-').map(Number);
    return { key, seconds: parseInt(secStr, 10), gens, rec: all[key] };
  }).sort((x, y) => x.seconds - y.seconds || x.key.localeCompare(y.key));

  timedRecordsListEl.innerHTML = '';
  timedRecordsEl.classList.toggle('hidden', entries.length === 0);

  entries.forEach(e => {
    const li = document.createElement('li');
    if (e.key === currentKey) li.className = 'current';
    const left = document.createElement('span');
    left.textContent = `${formatTimedDuration(e.seconds)} · ${timedGenLabel(e.gens)}`;
    const right = document.createElement('strong');
    right.textContent = `${e.rec.score} pts (${e.rec.correct})`;
    li.append(left, right);
    timedRecordsListEl.appendChild(li);
  });
}

function setupTimedMode() {
  timedDurationButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      timedDurationButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const d = btn.getAttribute('data-duration');
      if (d === 'custom') {
        timedCustomWrapper.classList.remove('hidden');
        const val = parseInt(timedCustomInput.value, 10);
        timedDuration = (val >= 10 && val <= 600) ? val : 60;
      } else {
        timedCustomWrapper.classList.add('hidden');
        timedDuration = parseInt(d, 10);
      }
      showTimedHighScoreLabel();
    });
  });

  timedCustomInput.addEventListener('input', () => {
    const val = parseInt(timedCustomInput.value, 10);
    if (val >= 10 && val <= 600) {
      timedDuration = val;
      showTimedHighScoreLabel();
    }
  });

  timedStartBtn.addEventListener('click', startTimedGame);
  timedPlayAgainBtn.addEventListener('click', resetTimedToStartScreen);

  timedInputEl.addEventListener('input', () => {
    if (timedRoundLocked) { timedInputEl.value = ''; timedSuggestionsEl.innerHTML = ''; return; }
    setupAutocomplete(timedInputEl, timedSuggestionsEl, handleTimedGuess);
  });
  attachAutocompleteKeyboardNav(timedInputEl, timedSuggestionsEl, () => {
    if (!timedSkipBtn.disabled) timedSkipBtn.click();
  });

  timedSkipBtn.addEventListener('click', () => {
    if (!timedActive) return;
    playWrongSound();
    nextTimedStage('Skipped.');
  });

  showTimedHighScoreLabel();
}

function resetTimedToStartScreen() {
  pauseTimedTimer();
  clearInterval(teaserInterval);
  teaserInterval = null;

  timedActive = false;
  timedScore = 0;
  timedCorrectCount = 0;
  timedTimeLeft = 0;

  timedSetupContainer.classList.remove('hidden');
  timedStartScreen.classList.remove('hidden');
  timedSearchWrapper.classList.add('hidden');
  timedButtons.classList.add('hidden');
  timedGameOverPanel.classList.add('hidden');
  timedCountdownEl.classList.add('hidden');
  timedCountdownEl.classList.remove('urgent');

  timedHighScoreCard.classList.remove('hidden');
  timedStatsLabel.classList.add('hidden');
  showTimedHighScoreLabel();
  timedStageLabel.classList.add('stage-pending');
  timedStageLabel.textContent = 'Stage 1 - Guess for 5 points';
  timedResultEl.textContent = '';

  startTeaserCarousel(timedImageEl, false);
}

async function startTimedGame() {
  clearInterval(teaserInterval);
  teaserInterval = null;

  timedActive = true;
  timedRoundLocked = false;
  timedRunDuration = timedDuration;           // remembered so the record is saved under the settings this run actually used
  timedRunGens = new Set(selectedGenerations);
  timedScore = 0;
  timedCorrectCount = 0;
  timedTimeLeft = timedDuration;

  timedSetupContainer.classList.add('hidden');
  timedHighScoreCard.classList.add('hidden');
  timedStatsLabel.classList.remove('hidden');
  timedStartScreen.classList.add('hidden');
  timedSearchWrapper.classList.remove('hidden');
  timedButtons.classList.remove('hidden');
  timedGameOverPanel.classList.add('hidden');
  timedCountdownEl.classList.remove('hidden');
  timedCountdownEl.classList.remove('urgent');
  timedCountdownEl.textContent = timedTimeLeft;

  updateTimedStatsLabel();
  await loadTimedPokemon();

  resumeTimedTimerIfNeeded();
}

// Self-pausing: if the Timed tab isn't visible (user switched to another
// mode) the very next tick notices and clears itself, rather than relying
// on every possible navigation path to remember to pause it explicitly.
function timedTick() {
  if (timedViewEl.classList.contains('hidden')) {
    pauseTimedTimer();
    return;
  }
  if (!timedActive) {
    pauseTimedTimer();
    return;
  }

  timedTimeLeft--;
  timedCountdownEl.textContent = Math.max(timedTimeLeft, 0);
  if (timedTimeLeft <= 10) timedCountdownEl.classList.add('urgent');

  if (timedTimeLeft <= 0) {
    endTimedGame();
  }
}

function pauseTimedTimer() {
  if (timedInterval) {
    clearInterval(timedInterval);
    timedInterval = null;
  }
}

function resumeTimedTimerIfNeeded() {
  if (timedActive && timedTimeLeft > 0 && !timedInterval && !timedViewEl.classList.contains('hidden')) {
    timedInterval = setInterval(timedTick, 1000);
  }
}

async function loadTimedPokemon() {
  timedImageOverlay.classList.add('visible');

  const data = await fetchRandomPokemonWithArtwork(false, selectedGenerations);

  // The timer can hit zero while this fetch/preload is in flight - don't
  // resurrect a finished game with a Pokémon that arrives after the fact.
  if (!timedActive) return;

  timedAnswer = { rawName: data.rawName, displayName: data.displayName, image: data.image };
  await preloadImage(timedAnswer.image);
  if (!timedActive) return;

  timedCurrentStage = 0;
  timedImageEl.src = timedAnswer.image;
  applyTimedStage(true);

  timedImageOverlay.classList.remove('visible');
  timedResultEl.textContent = '';
  timedRoundLocked = false;
  timedInputEl.disabled = false;
  timedInputEl.value = '';
  timedSkipBtn.disabled = false;
  timedInputEl.focus(); // straight back into the search bar for the next Pokémon
}

function applyTimedStage(instant = false) {
  const stage = stages[timedCurrentStage];
  if (instant) {
    timedImageEl.style.transition = 'none';
    timedImageEl.style.filter = `blur(${stage.blur}px)`;
    void timedImageEl.offsetHeight;
    timedImageEl.style.transition = 'filter 0.4s ease';
  } else {
    timedImageEl.style.filter = `blur(${stage.blur}px)`;
  }
  timedStageLabel.textContent = `Stage ${timedCurrentStage + 1} - Guess for ${stage.points} points`;
  timedStageLabel.classList.remove('stage-pending');
}

function updateTimedStatsLabel() {
  timedStatsLabel.textContent = `Score: ${timedScore} - Correct: ${timedCorrectCount}`;
}

function handleTimedGuess(guessedPkmn) {
  if (!timedActive || timedRoundLocked) return;
  timedSuggestionsEl.innerHTML = '';
  timedInputEl.value = '';

  if (guessedPkmn.rawName === timedAnswer.rawName) {
    const points = stages[timedCurrentStage].points;
    timedScore += points;
    timedCorrectCount++;
    updateTimedStatsLabel();
    timedImageEl.style.filter = 'blur(0px)';
    timedResultEl.textContent = `Correct! It's ${timedAnswer.displayName} - scored ${points} pts!`;
    launchConfetti();
    playCorrectSound();
    advanceTimedRound();
  } else {
    playWrongSound();
    nextTimedStage(`Wrong guess - it's not ${guessedPkmn.displayName}.`);
  }
}

function nextTimedStage(message) {
  if (!timedActive) return;
  if (timedCurrentStage >= stages.length - 1) {
    timedImageEl.style.filter = 'blur(0px)';
    timedResultEl.textContent = `Out of guesses - it was ${timedAnswer.displayName}. 0 points.`;
    advanceTimedRound();
    return;
  }
  timedCurrentStage++;
  applyTimedStage();
  timedResultEl.textContent = message;
}

// Moves straight to the next Pokémon with no "Next" button - the whole
// point of Timed Mode is a continuous stream against the clock.
function advanceTimedRound() {
  // Lock guesses without disabling the input - disabling it drops focus (and
  // closes the keyboard on phones), which is why you had to click back in.
  timedRoundLocked = true;
  timedSkipBtn.disabled = true;

  setTimeout(async () => {
    if (!timedActive) return;
    await loadTimedPokemon();
  }, 900);
}

function endTimedGame() {
  timedActive = false;
  pauseTimedTimer();

  timedInputEl.disabled = true;
  timedSkipBtn.disabled = true;
  timedSuggestionsEl.innerHTML = '';
  timedSearchWrapper.classList.add('hidden');
  timedButtons.classList.add('hidden');

  timedFinalScoreText.textContent = `Final Score: ${timedScore} (${timedCorrectCount} correct in ${formatTimedDuration(timedRunDuration)})`;
  const isNewBest = saveTimedRecord(timedRunDuration, timedRunGens, timedScore, timedCorrectCount);
  const best = getTimedRecord(timedRunDuration, timedRunGens);
  const settingText = `${formatTimedDuration(timedRunDuration)} · ${timedGenLabel(timedRunGens)}`;
  timedFinalBestText.classList.toggle('new-best', isNewBest);
  timedFinalBestText.textContent = isNewBest
    ? `New high score! (${settingText})`
    : (best ? `Your best (${settingText}): ${best.score} pts` : '');
  timedGameOverPanel.classList.remove('hidden');
}


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
  reverseElements.roundLabel.textContent = `Round ${reverseState.currentRound} / ${reverseState.maxRounds} - Score: ${reverseState.totalScore.toLocaleString()}`;
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

// Local type maps for dynamic matching without API lag
const TYPE_POOLS = {
  'Normal': 130, 'Fire': 80, 'Water': 160, 'Grass': 120, 'Electric': 60,
  'Ice': 50, 'Fighting': 60, 'Poison': 75, 'Ground': 75, 'Flying': 110,
  'Psychic': 100, 'Bug': 90, 'Rock': 75, 'Ghost': 65, 'Dragon': 60,
  'Steel': 60, 'Dark': 70, 'Fairy': 65
};

function recalculatePoolWorth() {
  const target = reverseState.targetDetails;
  if (!target) return;

  // Total starting pool based on active generations
  let remainingPoolSize = allPokemonList.filter(p => isPokemonInSelectedGens(p)).length;

  // 1. Filter by Debut Generation
  if (reverseState.revealedHints.has('generation')) {
    const genNum = parseInt(target.generation.replace('Gen ', ''), 10);
    const [min, max] = GEN_RANGES[genNum] || [1, 1025];
    
    // Count exact Pokémon that fall into this generation within selected gens
    remainingPoolSize = allPokemonList.filter(p => {
      if (!isPokemonInSelectedGens(p)) return false;
      return p.id >= min && p.id <= max;
    }).length;
  }

  // 2. Filter by Primary Type
  if (reverseState.revealedHints.has('primaryType')) {
    const typeShare = (TYPE_POOLS[target.primaryType] || 70) / 1025;
    remainingPoolSize = Math.ceil(remainingPoolSize * typeShare);
  }

  // 3. Filter by Secondary Type
  if (reverseState.revealedHints.has('secondaryType')) {
    if (target.secondaryType === 'None') {
      remainingPoolSize = Math.ceil(remainingPoolSize * 0.5); // ~50% of Pokémon are monotype
    } else {
      const secShare = (TYPE_POOLS[target.secondaryType] || 60) / 1025;
      remainingPoolSize = Math.ceil(remainingPoolSize * secShare);
    }
  }

  // 4. Filter by Form
  if (reverseState.revealedHints.has('form')) {
    if (target.form !== 'Base Form') {
      remainingPoolSize = Math.max(1, Math.ceil(remainingPoolSize * 0.08)); // Regional/Special forms are rare
    } else {
      remainingPoolSize = Math.ceil(remainingPoolSize * 0.85);
    }
  }

  // 5. Filter by Base Stat Total (BST range bracket)
  if (reverseState.revealedHints.has('bst')) {
    remainingPoolSize = Math.ceil(remainingPoolSize * 0.25); // ~25% sit in a specific BST tier
  }

  // 6. Filter by Size (Height/Weight bracket)
  if (reverseState.revealedHints.has('size')) {
    remainingPoolSize = Math.ceil(remainingPoolSize * 0.35); // ~35% sit in a specific size bracket
  }

  // Final point assignment based on actual remaining count
  if (reverseState.revealedHints.size === 6) {
    reverseState.currentWorth = 1;
  } else {
    reverseState.currentWorth = Math.max(1, remainingPoolSize);
  }

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
  reverseElements.roundLabel.textContent = `Round ${reverseState.currentRound} / ${reverseState.maxRounds} - Score: ${reverseState.totalScore.toLocaleString()}`;
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

// Single shared AudioContext, reused for every sound effect. Creating a new
// AudioContext per guess (the old behavior) leaks contexts over a long play
// session - browsers cap how many can exist at once, so audio eventually
// degrades or stops. versus.js already does this correctly; this mirrors it.
let gameAudioCtx = null;
function getGameAudioCtx() {
  if (!gameAudioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    gameAudioCtx = new AudioCtx();
  }
  if (gameAudioCtx.state === 'suspended') gameAudioCtx.resume();
  return gameAudioCtx;
}

function playCorrectSound() {
  const ctx = getGameAudioCtx();
  playTone(ctx, 880, ctx.currentTime, 0.15, 'sine');
  playTone(ctx, 1318.5, ctx.currentTime + 0.12, 0.2, 'sine');
}

function playWrongSound() {
  const ctx = getGameAudioCtx();
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
    awaitingNext: awaitingNext,
    history: dailyHistory
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
  setupGenButtons(genFilterContainer);
  setupGenButtons(timedGenFilterContainer);
  setupTimedMode();
  setupPuzzleHeader();
  updateReverseHighScoreDisplay();
  await loadPokemonList();

  const savedState = loadDailyProgress();

  if (savedState) {
    round = savedState.round;
    totalScore = savedState.totalScore;
    correctCount = savedState.correctCount;
    currentStage = savedState.currentStage;
    dailyHistory = Array.isArray(savedState.history) ? savedState.history : [];

    if (savedState.completed) {
      startScreenEl.classList.add('hidden');
      searchWrapperEl.classList.add('hidden');
      buttonsEl.classList.add('hidden');
      imageEl.style.filter = 'blur(0px)';
      updateRoundLabel();
      showGameOverPanel(getStoredStats());
      // Put today's last Pokémon back behind the panel so the image isn't blank after a reload.
      getDailyRoundData(TOTAL_ROUNDS).then(entry => { imageEl.src = entry.image; });
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
// ---- Responsive header offset ----
function syncHeaderOffset() {
  const header = document.querySelector('.top-header');
  if (!header) return;
  document.documentElement.style.setProperty(
    '--header-height',
    `${header.offsetHeight}px`
  );
}

syncHeaderOffset();

window.addEventListener('resize', syncHeaderOffset);
window.addEventListener('orientationchange', syncHeaderOffset);

// Re-measure once webfonts finish loading (font swap can change height)
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(syncHeaderOffset);
}

// Catch any other layout shift (e.g. tabs wrapping differently)
if (window.ResizeObserver) {
  const header = document.querySelector('.top-header');
  if (header) new ResizeObserver(syncHeaderOffset).observe(header);
}

init();