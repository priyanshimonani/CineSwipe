/**
 * Feature extraction debug/test script — Phase 2.1
 *
 * This is NOT production code and is NOT imported anywhere in the app.
 * Run it in the browser DevTools console by pasting, or adapt to a Node test.
 *
 * Paste the contents of src/ml/movieFeatures.js into the console first,
 * then paste this block to see the output.
 *
 * Alternatively, temporarily add to main.jsx:
 *   import { runFeatureTests } from './ml/featureDebug.js';
 *   runFeatureTests();
 * and remove it after verifying.
 */

import { extractMovieFeatures, debugFeatures } from '../ml/movieFeatures.js';
import { movies } from '../data/movies.js';

export function runFeatureTests() {
  console.group('[CineSwipe ML] Phase 2.1 — Feature extraction test');

  const errors = [];

  for (const movie of movies) {
    const features = extractMovieFeatures(movie);

    // Attach for debugFeatures helper
    const withFeatures = { ...movie, features };

    // ── Validation ───────────────────────────────────────────────
    const allValues = [
      ...Object.values(features.genres),
      ...Object.values(features.moods),
    ];

    for (const val of allValues) {
      if (typeof val !== 'number') {
        errors.push(`${movie.title}: non-numeric feature value: ${val}`);
      }
      if (val < 0 || val > 1) {
        errors.push(`${movie.title}: out-of-range feature value: ${val}`);
      }
    }

    // ── Explicit genre checks ────────────────────────────────────
    for (const genre of (movie.genres || [])) {
      const normalised = genre.toLowerCase();
      const featureKey = normalised === 'sci-fi' ? 'sciFi' : normalised;
      // Only check genres we track in GENRE_KEYS
      if (features.genres[featureKey] !== undefined && features.genres[featureKey] !== 1) {
        errors.push(`${movie.title}: genre '${genre}' should be 1, got ${features.genres[featureKey]}`);
      }
    }

    // ── Debug print ──────────────────────────────────────────────
    debugFeatures(withFeatures);
  }

  // ── Summary ──────────────────────────────────────────────────
  console.group('Validation summary');
  if (errors.length === 0) {
    console.log(`All ${movies.length} movies passed validation.`);
  } else {
    console.error(`${errors.length} validation error(s):`);
    errors.forEach((e) => console.error(' ✗', e));
  }
  console.groupEnd();
  console.groupEnd();

  return errors.length === 0;
}
