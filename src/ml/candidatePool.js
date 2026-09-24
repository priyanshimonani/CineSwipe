/**
 * src/ml/candidatePool.js
 *
 * Phase 2.3A - Candidate Pool Manager
 *
 * Keeps fetched movie candidates in insertion order and tracks consumed IDs
 * separately from the movie objects.
 */

function isValidMovieId(movieId) {
  return (
    (typeof movieId === 'string' && movieId.trim().length > 0) ||
    (typeof movieId === 'number' && Number.isFinite(movieId))
  );
}

function isMovieEntry(movie) {
  return movie !== null && typeof movie === 'object' && isValidMovieId(movie.id);
}

/**
 * Creates a pool of available movie candidates.
 *
 * @param {Object[]} initialMovies - Initial movie candidates
 * @returns {{
 *   getAvailable: () => Object[],
 *   hasMovie: (movieId: string|number) => boolean,
 *   hasAvailableMovie: (movieId: string|number) => boolean,
 *   consume: (movieId: string|number) => void,
 *   addMovies: (movies: Object[]) => void,
 *   size: () => number,
 *   isEmpty: () => boolean
 * }}
 */
export function createCandidatePool(initialMovies = []) {
  const availableMovies = [];
  const moviesById = new Map();
  const consumedIds = new Set();

  const addMovies = (movies) => {
    if (!Array.isArray(movies)) return;

    for (const movie of movies) {
      if (!isMovieEntry(movie)) continue;

      const movieId = movie.id;
      if (consumedIds.has(movieId) || moviesById.has(movieId)) continue;

      moviesById.set(movieId, movie);
      availableMovies.push(movie);
    }
  };

  addMovies(initialMovies);

  return {
    getAvailable() {
      return availableMovies.filter((movie) => !consumedIds.has(movie.id));
    },

    hasMovie(movieId) {
      return moviesById.has(movieId) || consumedIds.has(movieId);
    },

    hasAvailableMovie(movieId) {
      return moviesById.has(movieId) && !consumedIds.has(movieId);
    },

    consume(movieId) {
      if (!isValidMovieId(movieId)) return;
      consumedIds.add(movieId);
    },

    addMovies,

    size() {
      let availableCount = 0;
      for (const movie of availableMovies) {
        if (!consumedIds.has(movie.id)) availableCount++;
      }
      return availableCount;
    },

    isEmpty() {
      return this.size() === 0;
    },
  };
}
