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
const TARGET_CANDIDATE_COUNT = 10;

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
 * @param {number}   options.pageCount  - Number of sequential pages to fetch
 * @returns {Promise<Object>} Raw TMDB response
 */
async function discoverMovies({
  genreIds = [],
  keywordIds = [],
  page = 1,
  voteAverageGte,
  voteCountGte,
} = {}) {
  const params = new URLSearchParams({
    include_adult: 'false',
    include_video: 'false',
    language: 'en-US',
    sort_by: 'vote_count.desc',
    page: String(page),
  });

  if (voteAverageGte !== undefined) {
    params.set('vote_average.gte', String(voteAverageGte));
  }

  if (voteCountGte !== undefined) {
    params.set('vote_count.gte', String(voteCountGte));
  }

  if (genreIds.length > 0) {
    params.set('with_genres', genreIds.join('|'));
  }

  if (keywordIds.length > 0) {
    params.set('with_keywords', keywordIds.join('|'));
  }

  const url = `${BASE_URL}/discover/movie?${params.toString()}`;

  if (import.meta.env.DEV) {
    console.log('[CineSwipe TMDB] discover request parameters', {
      genreIds: [...genreIds],
      keywordIds: [...keywordIds],
      includeAdult: params.get('include_adult'),
      includeVideo: params.get('include_video'),
      language: params.get('language'),
      sortBy: params.get('sort_by'),
      voteAverageGte: params.get('vote_average.gte'),
      voteCountGte: params.get('vote_count.gte'),
      page: params.get('page'),
    });
    console.log('[CineSwipe TMDB] discover request URL (auth redacted)', url);
  }

  const res = await fetch(url, { headers: headers() });

  if (!res.ok) {
    throw new Error(`TMDB request failed (${res.status})`);
  }

  const data = await res.json();

  if (import.meta.env.DEV) {
    console.log('[CineSwipe TMDB] discover result', {
      page,
      resultCount: Array.isArray(data.results) ? data.results.length : 0,
    });
  }

  return data;
}

async function fetchRetrievalLevel(level, options, startPage = 1, pageCount = 2) {
  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, index) =>
      discoverMovies({ ...options, page: startPage + index })
    )
  );
  const rawResults = pages.flatMap((page) => page.results || []);

  if (import.meta.env.DEV) {
    console.log('[CineSwipe TMDB] candidate retrieval attempt', {
      level,
      resultCount: rawResults.length,
    });
  }

  return rawResults;
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
 * @param {{startPage?: number, pageCount?: number}} options - Page window for this batch
 * @returns {Promise<Object[]>} Array of internal movie objects
 */
export async function fetchMoviePool(
  selectedIds,
  { startPage = 1, pageCount = 2 } = {}
) {
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

  if (import.meta.env.DEV) {
    console.log('[CineSwipe TMDB] selected mood IDs', {
      selectedMoodIds: [...selectedIds],
      genreIds: [...genreIds],
      keywordIds: [...keywordIds],
    });
  }

  const retrievalLevels = [
    {
      name: 'targeted',
      options: { genreIds, keywordIds, voteAverageGte: 6, voteCountGte: 200 },
    },
    {
      name: 'genre-no-keyword',
      options: { genreIds, keywordIds: [], voteAverageGte: 6, voteCountGte: 200 },
    },
    {
      name: 'genre-relaxed-quality',
      options: { genreIds, keywordIds: [], voteAverageGte: 5, voteCountGte: 50 },
    },
    {
      name: 'broad-genre',
      options: { genreIds, keywordIds: [] },
    },
    {
      name: 'broad-discovery',
      options: { genreIds: [], keywordIds: [] },
    },
  ];

  const levelsToTry = genreIds.length > 0
    ? retrievalLevels
    : retrievalLevels.filter(({ name }) => (
      name === 'targeted' ||
      name === 'genre-no-keyword' ||
      name === 'broad-discovery'
    ));

  const pool = [];
  const seen = new Set();

  let retrievalLevel = 'none';
  for (const level of levelsToTry) {
    const rawResults = await fetchRetrievalLevel(
      level.name,
      level.options,
      startPage,
      pageCount
    );
    let addedCount = 0;

    for (const raw of rawResults) {
      const movie = transformMovie(raw);
      if (movie.poster && !seen.has(movie.id)) {
        seen.add(movie.id);
        pool.push(movie);
        addedCount++;
      }
    }

    if (import.meta.env.DEV) {
      console.log('[CineSwipe TMDB] candidate filtering', {
        rawResultCount: rawResults.length,
        candidateCount: pool.length,
        addedCandidateCount: addedCount,
        posterlessOrDuplicateCount: rawResults.length - addedCount,
      });
    }

    retrievalLevel = level.name;
    if (pool.length >= TARGET_CANDIDATE_COUNT) break;
  }

  if (import.meta.env.DEV) {
    console.log('[CineSwipe TMDB] candidate retrieval completed', {
      selectedMoodIds: [...selectedIds],
      retrievalLevel,
      finalCandidateCount: pool.length,
      uniqueCandidateCount: seen.size,
    });
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
