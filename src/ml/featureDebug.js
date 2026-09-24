/**
 * Feature extraction debug/test script — Phase 2.4
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
import { movieToVector } from './vectorize.js';

export function runFeatureTests() {
  console.group('[CineSwipe ML] Phase 2.4 — Feature extraction test');

  const errors = [];

  const expect = (condition, message) => {
    if (!condition) errors.push(message);
  };

  const genreOnly = extractMovieFeatures({ genres: ['music'], overview: '' });
  expect(genreOnly.moods.feelGood === 0, 'Music alone should not imply feelGood.');

  const keywordOnly = extractMovieFeatures({
    genres: [],
    overview: 'A lonely survivor faces grief and loss.',
  });
  expect(keywordOnly.moods.melancholic > 0, 'Melancholic keywords should contribute.');

  const combined = extractMovieFeatures({
    genres: ['horror'],
    overview: 'A sinister killer creates terror and violence.',
  });
  expect(combined.moods.dark > 0.35, 'Combined horror and dark text evidence should be meaningful.');
  expect(combined.moods.dark <= 1, 'Combined evidence must remain bounded.');

  const missingKeywords = extractMovieFeatures({ genres: ['drama'] });
  const missingOverview = extractMovieFeatures({ genres: ['drama'], keywords: null });
  const unknown = extractMovieFeatures({
    genres: ['unknown'],
    overview: '',
    keywords: [{ name: 'unknown keyword' }],
  });
  expect(Object.values(missingKeywords.moods).every(Number.isFinite), 'Missing keywords must remain finite.');
  expect(Object.values(missingOverview.moods).every(Number.isFinite), 'Missing overview must remain finite.');
  expect(Object.values(unknown.moods).every((value) => value === 0), 'Unknown evidence should not create mood values.');

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
      if (!Number.isFinite(val)) {
        errors.push(`${movie.title}: non-finite feature value: ${val}`);
      }
    }

    expect(movieToVector({ features }).length === 20, `${movie.title}: vector must remain 20-dimensional.`);

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

  const examples = ['Whiplash', 'Black Swan', 'Sing Street'];
  console.log('Representative mood values:');
  for (const title of examples) {
    const movie = movies.find((item) => item.title === title);
    const moods = extractMovieFeatures(movie).moods;
    console.log(title, {
      melancholic: moods.melancholic,
      romantic: moods.romantic,
      feelGood: moods.feelGood,
      thoughtProvoking: moods.thoughtProvoking,
      intense: moods.intense,
      dark: moods.dark,
      relaxing: moods.relaxing,
      comingOfAge: moods.comingOfAge,
    });
  }

  console.groupEnd();

  return errors.length === 0;
}

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('featureDebug.js')) {
  runFeatureTests();
}
