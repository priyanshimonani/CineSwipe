/**
 * src/ml/updateUserVector.js
 *
 * Phase 2.2C — Swipe-Based User Vector Updates
 *
 * Updates the session user preference vector dynamically based on swipe action:
 *  - RIGHT: user likes movie -> moves user vector toward the movie vector.
 *  - LEFT:  user dislikes movie -> reduces user preference for features present in movie.
 *  - UP:    user has not seen movie -> leaves user vector unchanged.
 *
 * Client-side only. Non-mutating. Exactly 20 dimensions.
 */

import { FEATURE_ORDER } from './vectorize.js';

const VECTOR_DIMENSIONS = FEATURE_ORDER.length; // 20
const DEFAULT_LEARNING_RATE = 0.2;

/**
 * Updates a 20-dimensional user preference vector based on a swipe action.
 *
 * Formulas:
 *  - RIGHT: newUser[i] = user[i] + lr * (movie[i] - user[i])
 *  - LEFT:  newUser[i] = user[i] - lr * movie[i]  (clamped to [0, 1])
 *  - UP:    newUser[i] = user[i] (returns a new copy, unchanged)
 *
 * @param {number[]} userVector  - Current 20-dimensional user preference vector
 * @param {number[]} movieVector - 20-dimensional movie feature vector
 * @param {string}   action      - Swipe action: 'right' | 'left' | 'up'
 * @param {number}   [learningRate=0.2] - Learning rate parameter in [0, 1]
 * @returns {number[]} New 20-dimensional array of numbers in [0, 1]
 */
export function updateUserVector(
  userVector,
  movieVector,
  action,
  learningRate = DEFAULT_LEARNING_RATE
) {
  // Normalize and clamp learning rate to [0, 1]
  let lr = learningRate;
  if (
    lr === undefined ||
    lr === null ||
    typeof lr !== 'number' ||
    !Number.isFinite(lr) ||
    Number.isNaN(lr)
  ) {
    lr = DEFAULT_LEARNING_RATE;
  } else {
    lr = Math.min(1, Math.max(0, lr));
  }

  // Normalize action
  const normalizedAction =
    typeof action === 'string' ? action.trim().toLowerCase() : '';

  const isUserArray = Array.isArray(userVector);
  const isMovieArray = Array.isArray(movieVector);

  const result = new Array(VECTOR_DIMENSIONS);

  for (let i = 0; i < VECTOR_DIMENSIONS; i++) {
    const rawUser = isUserArray ? userVector[i] : 0;
    const rawMovie = isMovieArray ? movieVector[i] : 0;

    const userVal =
      typeof rawUser === 'number' && Number.isFinite(rawUser) && !Number.isNaN(rawUser)
        ? Math.min(1, Math.max(0, rawUser))
        : 0;

    const movieVal =
      typeof rawMovie === 'number' && Number.isFinite(rawMovie) && !Number.isNaN(rawMovie)
        ? Math.min(1, Math.max(0, rawMovie))
        : 0;

    if (normalizedAction === 'right') {
      // Move user preference toward movie feature
      const rawNew = userVal + lr * (movieVal - userVal);
      result[i] = Math.round(Math.min(1, Math.max(0, rawNew)) * 1e6) / 1e6;
    } else if (normalizedAction === 'left') {
      // Reduce user preference for features present in rejected movie
      const rawNew = userVal - lr * movieVal;
      result[i] = Math.round(Math.min(1, Math.max(0, rawNew)) * 1e6) / 1e6;
    } else {
      // 'up' or unknown action: keep existing value unchanged
      result[i] = userVal;
    }
  }

  return result;
}
