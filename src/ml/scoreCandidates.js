/**
 * src/ml/scoreCandidates.js
 *
 * Phase 2.2E — Candidate Scoring and Ranking
 *
 * Scores candidate movies against a user preference vector using cosine similarity
 * and returns ranked candidates in descending score order.
 *
 * Pure function: non-mutating, zero side-effects, client-side only.
 */

import { movieToVector } from './vectorize.js';
import { cosineSimilarity } from './cosineSimilarity.js';

/**
 * Scores and ranks candidate movies against the user's preference vector.
 *
 * @param {number[]} userVector - Current 20-dimensional user preference vector
 * @param {Object[]} movies     - Array of CineSwipe movie objects
 * @returns {Array<{ movie: Object, score: number }>} Candidates sorted by score descending
 */
export function scoreCandidates(userVector, movies) {
  if (!Array.isArray(movies) || movies.length === 0) {
    return [];
  }

  const scored = [];

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    if (!movie || typeof movie !== 'object') continue;

    // Use pre-computed movie.vector if available, else derive via movieToVector
    const movieVector = Array.isArray(movie.vector)
      ? movie.vector
      : movieToVector(movie);

    const score = cosineSimilarity(userVector, movieVector);

    scored.push({
      movie,
      score,
      _originalIndex: i,
    });
  }

  // Stable sort descending by score
  scored.sort((a, b) => {
    const diff = b.score - a.score;
    if (Math.abs(diff) > 1e-12) {
      return diff;
    }
    // Stable tie-breaking: preserve original relative order
    return a._originalIndex - b._originalIndex;
  });

  return scored.map(({ movie, score }) => ({ movie, score }));
}
