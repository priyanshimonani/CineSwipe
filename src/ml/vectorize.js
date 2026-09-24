/**
 * src/ml/vectorize.js
 *
 * Phase 2.2A — Converting movie feature objects into numerical vectors.
 *
 * Defines one canonical feature order across 20 dimensions (11 genres + 9 moods)
 * and converts movie feature objects into dense numerical vectors.
 *
 * No external ML or vector libraries are used.
 */

/**
 * The canonical 20-dimensional feature ordering for CineSwipe.
 * All vectors across the application must adhere strictly to this sequence.
 */
export const FEATURE_ORDER = [
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

const GENRE_FEATURES = new Set([
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
]);

/**
 * Converts a movie object with features into a 20-dimensional numerical vector.
 *
 * Requirements:
 * 1. Reads movie.features.genres.
 * 2. Reads movie.features.moods.
 * 3. Follows canonical feature order exactly.
 * 4. Returns a plain JavaScript array of 20 numbers.
 * 5. Preserves all existing feature values.
 * 6. Never returns undefined or NaN.
 * 7. Uses 0 when a feature is missing.
 *
 * @param {Object} movie - Movie object containing a .features property
 * @returns {number[]} 20-element plain JavaScript array of numbers
 */
export function movieToVector(movie) {
  const genres = movie?.features?.genres || {};
  const moods = movie?.features?.moods || {};

  return FEATURE_ORDER.map((featureName) => {
    let value;

    if (GENRE_FEATURES.has(featureName)) {
      value = genres[featureName];
      // Fallback for sci-fi / sciFi naming variation
      if (value === undefined && featureName === 'sciFi') {
        value = genres['sci-fi'] ?? genres['scifi'];
      }
    } else {
      value = moods[featureName];
      // Fallback for mood naming variations
      if (value === undefined) {
        if (featureName === 'feelGood') {
          value = moods['feel-good'];
        } else if (featureName === 'thoughtProvoking') {
          value = moods['thought-provoking'] ?? moods.thoughtful;
        } else if (featureName === 'comingOfAge') {
          value = moods['coming-of-age'];
        }
      }
    }

    // Default missing, non-numeric, or non-finite values to 0
    if (value === undefined || value === null) {
      return 0;
    }

    const num = Number(value);
    if (!Number.isFinite(num) || Number.isNaN(num)) {
      return 0;
    }

    return num;
  });
}
