/**
 * TMDB API service module.
 *
 * All TMDB requests go through this file so the rest of the app
 * never calls fetch against TMDB directly.
 */
import { attachFeatures } from '../ml/movieFeatures';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Poster size used throughout the app (good balance of quality & speed)
const POSTER_SIZE = '/w500';

/**
 * Mapping from our genre IDs (used in moods.js) to TMDB genre IDs.
 * Only genre-type options have a direct TMDB equivalent.
 * Custom mood-type options (melancholic, nostalgic, etc.) are NOT
 * represented here — they are our own concept, not TMDB's.
 */
const GENRE_ID_MAP = {
  action: 28,
  comedy: 35,
  crime: 80,
  drama: 18,
  fantasy: 14,
  horror: 27,
  music: 10402,
  mystery: 9648,
  romance: 10749,
  'sci-fi': 878,
  thriller: 53,
  // coming-of-age has no exact TMDB genre; map to Drama (18) as the closest fit
  'coming-of-age': 18,
};

/**
 * Mood-to-keyword mapping.
 * TMDB supports keyword filtering; these IDs are well-known TMDB keywords
 * that loosely approximate our custom moods so we can seed an initial pool.
 * This is NOT ML classification — just a rough starting heuristic.
 */
const MOOD_KEYWORD_MAP = {
  melancholic: '3713',      // sadness
  nostalgic: '5565',        // nostalgia
  romantic: '9840',         // romantic
  'feel-good': '9663',      // feel good
  thoughtful: '156217',     // thought-provoking
  intense: '4565',          // suspense
  dark: '10349',            // dark
  relaxing: '273887',       // relaxing (fallback to low-key discovery)
};

// ─── Helpers ─────────────────────────────────────────────────

function headers() {
  return {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json;charset=utf-8',
  };
}

/**
 * Build a full poster URL from a TMDB poster_path.
 * Returns null if path is missing.
 */
export function getPosterUrl(posterPath) {
  if (!posterPath) return null;
  return `${IMAGE_BASE}${POSTER_SIZE}${posterPath}`;
}

// ─── Fetchers ────────────────────────────────────────────────

/**
 * Discover movies from TMDB using optional genre and keyword filters.
 *
 * @param {Object} options
 * @param {number[]} options.genreIds   - TMDB genre IDs to filter by
 * @param {string[]} options.keywordIds - TMDB keyword IDs to filter by
 * @param {number}   options.page       - Page number (default 1)
 * @returns {Promise<Object>} Raw TMDB response
 */
async function discoverMovies({ genreIds = [], keywordIds = [], page = 1 } = {}) {
  const params = new URLSearchParams({
    include_adult: 'false',
    include_video: 'false',
    language: 'en-US',
    sort_by: 'vote_count.desc',
    'vote_average.gte': '6',
    'vote_count.gte': '200',
    page: String(page),
  });

  if (genreIds.length > 0) {
    params.set('with_genres', genreIds.join('|'));
  }

  if (keywordIds.length > 0) {
    params.set('with_keywords', keywordIds.join('|'));
  }

  const url = `${BASE_URL}/discover/movie?${params.toString()}`;
  const res = await fetch(url, { headers: headers() });

  if (!res.ok) {
    throw new Error(`TMDB request failed (${res.status})`);
  }

  return res.json();
}

// ─── Transformation ──────────────────────────────────────────

/**
 * Convert a single TMDB movie result into our internal movie format.
 *
 * Internal format:
 * { id, title, year, rating, overview, genres, moods, poster }
 *
 * @param {Object} tmdbMovie - A movie object from TMDB's results array
 * @returns {Object} Internal movie object
 */
function transformMovie(tmdbMovie) {
  // Reverse-lookup: turn TMDB genre_ids back into our genre slugs
  const reverseGenreMap = {};
  for (const [slug, tmdbId] of Object.entries(GENRE_ID_MAP)) {
    reverseGenreMap[tmdbId] = slug;
  }

  const genres = (tmdbMovie.genre_ids || [])
    .map((gid) => reverseGenreMap[gid])
    .filter(Boolean);

  return {
    id: String(tmdbMovie.id),
    title: tmdbMovie.title,
    year: tmdbMovie.release_date ? new Date(tmdbMovie.release_date).getFullYear() : null,
    rating: tmdbMovie.vote_average ? tmdbMovie.vote_average.toFixed(1) : 'N/A',
    overview: tmdbMovie.overview || '',
    genres,
    moods: [],  // Will be populated by ML in a future phase
    poster: getPosterUrl(tmdbMovie.poster_path),
  };
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Fetch an initial movie pool based on user-selected mood/genre IDs.
 *
 * Separates the selected IDs into TMDB genres (which map directly)
 * and custom moods (which map to keyword IDs as a rough heuristic).
 *
 * Returns movies in our internal format, shuffled, with poster-less
 * entries removed.
 *
 * @param {string[]} selectedIds - Array of mood/genre IDs from MoodSelector
 * @returns {Promise<Object[]>} Array of internal movie objects
 */
export async function fetchMoviePool(selectedIds) {
  // Split selections into TMDB genres vs custom moods
  const genreIds = [];
  const keywordIds = [];

  for (const id of selectedIds) {
    if (GENRE_ID_MAP[id] !== undefined) {
      genreIds.push(GENRE_ID_MAP[id]);
    } else if (MOOD_KEYWORD_MAP[id] !== undefined) {
      keywordIds.push(MOOD_KEYWORD_MAP[id]);
    }
  }

  // Fetch two pages to get a larger pool for randomization
  const [page1, page2] = await Promise.all([
    discoverMovies({ genreIds, keywordIds, page: 1 }),
    discoverMovies({ genreIds, keywordIds, page: 2 }),
  ]);

  const rawResults = [
    ...(page1.results || []),
    ...(page2.results || []),
  ];

  // Transform, filter out poster-less movies, deduplicate
  const seen = new Set();
  const pool = [];

  for (const raw of rawResults) {
    const movie = transformMovie(raw);
    if (movie.poster && !seen.has(movie.id)) {
      seen.add(movie.id);
      pool.push(movie);
    }
  }

  // Shuffle using Fisher-Yates
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Attach ML feature vectors to every movie before returning.
  // Phase 2.1: deterministic heuristic extraction only.
  attachFeatures(pool);

  return pool;
}
