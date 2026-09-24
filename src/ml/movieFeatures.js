/**
 * src/ml/movieFeatures.js
 *
 * Phase 2.1 — Deterministic movie feature extraction.
 *
 * Converts a CineSwipe internal movie object into a numerical feature
 * vector that the recommendation engine will eventually use to model
 * user taste.
 *
 * IMPORTANT:
 *  - Values are heuristic, NOT ground-truth labels.
 *  - Every feature is clamped to [0, 1].
 *  - Rating is intentionally excluded from the taste vector.
 *  - Mood/theme values are derived from genre combinations and overview
 *    keyword signals — easy to tune without touching anything else.
 *
 * Data flow:
 *   TMDB movie → internal CineSwipe movie → extractMovieFeatures(movie) → movie.features
 */

// ─── Genre feature keys ───────────────────────────────────────────────────────
// Each maps 1:1 to a genre slug used in our internal movie.genres array.

const GENRE_KEYS = [
  'action',
  'comedy',
  'crime',
  'drama',
  'fantasy',
  'horror',
  'mystery',
  'romance',
  'sciFi',
  'thriller',
  'music',
];

// ─── Mood/theme feature keys ──────────────────────────────────────────────────
// These are our own application-level concepts (NOT TMDB genres).

const MOOD_KEYS = [
  'melancholic',
  'nostalgic',
  'romantic',
  'feelGood',
  'thoughtProvoking',
  'intense',
  'dark',
  'relaxing',
  'comingOfAge',
];

// ─── Keyword signal groups ────────────────────────────────────────────────────
// Each group is a list of lowercase substrings to search for in the overview.
// Tune these freely — they are the only text-matching heuristic we use.

const KEYWORD_GROUPS = {
  melancholic: [
    'loss', 'grief', 'lonely', 'loneliness', 'sad', 'sorrow', 'struggle',
    'isolation', 'despair', 'heartbreak', 'tragedy', 'tragic', 'mourning',
    'depression', 'depressed', 'regret', 'broken',
  ],
  nostalgic: [
    'memory', 'memories', 'past', 'childhood', 'youth', 'old', 'return',
    'remember', 'reminisce', 'decade', 'era', 'vintage', 'hometown',
  ],
  romantic: [
    'love', 'romance', 'relationship', 'couple', 'affair', 'heart',
    'passion', 'lover', 'together', 'soulmate', 'wedding', 'date',
  ],
  feelGood: [
    'uplifting', 'inspiring', 'hope', 'hopeful', 'joy', 'happy',
    'happiness', 'triumph', 'redemption', 'celebrate', 'friendship',
    'overcome', 'feel-good',
  ],
  thoughtProvoking: [
    'identity', 'existence', 'reality', 'meaning', 'psychological',
    'consciousness', 'morality', 'philosophy', 'society', 'dystopia',
    'truth', 'illusion', 'perception', 'question', 'complexity',
  ],
  intense: [
    'obsession', 'danger', 'survival', 'competition', 'revenge', 'fight',
    'battle', 'war', 'conflict', 'threat', 'terror', 'chase', 'violence',
    'explosive', 'action-packed', 'adrenaline', 'crisis',
  ],
  dark: [
    'murder', 'death', 'crime', 'dark', 'serial killer', 'killer',
    'sinister', 'evil', 'corrupt', 'horror', 'nightmare', 'bloodshed',
    'brutal', 'disturbing', 'macabre',
  ],
  relaxing: [
    'peaceful', 'gentle', 'quiet', 'slow', 'serene', 'beautiful',
    'journey', 'discover', 'travel', 'nature', 'simple', 'charming',
    'warm', 'cozy',
  ],
  comingOfAge: [
    'teen', 'teenager', 'teenager', 'young', 'school', 'high school',
    'college', 'university', 'growing up', 'youth', 'adolescent',
    'puberty', 'first love', 'coming of age', 'graduation',
  ],
};

// ─── Genre → mood contribution table ─────────────────────────────────────────
// Specifies how a movie's genre membership boosts particular mood features.
// Values represent the maximum contribution from this genre alone.
// They are additive across genres and then clamped to [0, 1].

const GENRE_TO_MOOD = {
  action:   { intense: 0.6, dark: 0.2, feelGood: 0.15 },
  comedy:   { feelGood: 0.7, relaxing: 0.3, nostalgic: 0.1 },
  crime:    { dark: 0.6, intense: 0.5, thoughtProvoking: 0.2 },
  drama:    { melancholic: 0.35, thoughtProvoking: 0.4, romantic: 0.1 },
  fantasy:  { relaxing: 0.25, feelGood: 0.2, thoughtProvoking: 0.15 },
  horror:   { dark: 0.75, intense: 0.65 },
  music:    { feelGood: 0.4, relaxing: 0.3, nostalgic: 0.2 },
  mystery:  { dark: 0.35, thoughtProvoking: 0.4, intense: 0.25 },
  romance:  { romantic: 0.8, feelGood: 0.3, nostalgic: 0.15 },
  sciFi:    { thoughtProvoking: 0.5, intense: 0.25, dark: 0.15 },
  'sci-fi': { thoughtProvoking: 0.5, intense: 0.25, dark: 0.15 },
  thriller: { intense: 0.7, dark: 0.4, thoughtProvoking: 0.2 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Clamp a value to [0, 1].
 * @param {number} v
 * @returns {number}
 */
function clamp(v) {
  return Math.min(1, Math.max(0, v));
}

/**
 * Count how many keywords from a group appear in the text.
 * Returns a score in [0, 1] that saturates at `saturateAt` matches.
 *
 * @param {string}   text       - Lowercased overview or combined text
 * @param {string[]} keywords   - Keyword list to test
 * @param {number}   saturateAt - Match count that gives a score of 1.0
 * @returns {number}
 */
function keywordScore(text, keywords, saturateAt = 3) {
  if (!text) return 0;
  let hits = 0;
  for (const kw of keywords) {
    if (text.includes(kw)) hits++;
  }
  return clamp(hits / saturateAt);
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Extract a numerical feature vector from a CineSwipe internal movie object.
 *
 * The returned object has two namespaced sub-objects:
 *   - `genres`  : one key per genre (0 or 1, explicit match)
 *   - `moods`   : one key per mood/theme (0–1, heuristic)
 *
 * Example return value:
 * {
 *   genres: { action: 0, comedy: 0, crime: 0, drama: 1, ... },
 *   moods:  { melancholic: 0.45, nostalgic: 0.1, intense: 0.3, ... }
 * }
 *
 * @param {Object} movie - Internal CineSwipe movie object
 * @param {string[]} movie.genres   - Array of genre slugs (e.g. ['drama', 'thriller'])
 * @param {string}   movie.overview - Plot overview text
 * @returns {{ genres: Object, moods: Object }}
 */
export function extractMovieFeatures(movie) {
  // Normalise genre slugs to lower-case for matching
  const genreSet = new Set((movie.genres || []).map((g) => g.toLowerCase()));

  // ── 1. Genre features (binary) ────────────────────────────────
  const genreFeatures = {};
  for (const key of GENRE_KEYS) {
    const isSciFi = key === 'sciFi';
    const hasGenre = genreSet.has(key.toLowerCase()) || (isSciFi && (genreSet.has('sci-fi') || genreSet.has('scifi')));
    genreFeatures[key] = hasGenre ? 1 : 0;
  }

  // ── 2. Mood features (heuristic) ─────────────────────────────
  // Start with zeros
  const moodAccum = {};
  for (const key of MOOD_KEYS) {
    moodAccum[key] = 0;
  }

  // 2a. Genre-based contributions
  for (const genre of genreSet) {
    const contributions = GENRE_TO_MOOD[genre];
    if (!contributions) continue;
    for (const [moodKey, amount] of Object.entries(contributions)) {
      if (moodAccum[moodKey] !== undefined) {
        moodAccum[moodKey] += amount;
      }
    }
  }

  // 2b. Keyword-based contributions from the overview
  const overviewText = (movie.overview || '').toLowerCase();

  for (const [moodKey, keywords] of Object.entries(KEYWORD_GROUPS)) {
    if (moodAccum[moodKey] !== undefined) {
      const kwBoost = keywordScore(overviewText, keywords, 3) * 0.4;
      moodAccum[moodKey] += kwBoost;
    }
  }

  // 2c. Clamp all mood values to [0, 1]
  const moodFeatures = {};
  for (const [key, val] of Object.entries(moodAccum)) {
    moodFeatures[key] = parseFloat(clamp(val).toFixed(3));
  }

  return {
    genres: genreFeatures,
    moods: moodFeatures,
  };
}

/**
 * Attach feature vectors to every movie in an array (in-place mutation).
 * Convenience helper so the call-site in the API layer stays clean.
 *
 * @param {Object[]} movies - Array of internal CineSwipe movie objects
 * @returns {Object[]} The same array with `.features` set on each item
 */
export function attachFeatures(movies) {
  for (const movie of movies) {
    movie.features = extractMovieFeatures(movie);
  }
  return movies;
}

// ─── Debug helper ─────────────────────────────────────────────────────────────

/**
 * Log a human-readable feature summary for a movie to the console.
 * Call this from the browser DevTools or a temporary debug block.
 * NOT called in production code.
 *
 * @param {Object} movie - Internal movie object (must have .features already set)
 */
export function debugFeatures(movie) {
  if (typeof console === 'undefined') return;

  const f = movie.features;
  if (!f) {
    console.warn('[CineSwipe ML] No features on movie:', movie.title);
    return;
  }

  const activeGenres = Object.entries(f.genres)
    .filter(([, v]) => v === 1)
    .map(([k]) => k)
    .join(', ') || 'none';

  const topMoods = Object.entries(f.moods)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' | ');

  console.group(`[CineSwipe ML] ${movie.title} (${movie.year})`);
  console.log('Genres active :', activeGenres);
  console.log('Top moods     :', topMoods);
  console.log('Full features :', f);
  console.groupEnd();
}
