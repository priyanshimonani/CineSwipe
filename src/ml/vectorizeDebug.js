/**
 * src/ml/vectorizeDebug.js
 *
 * Phase 2.2A — Vectorization verification and debug test.
 *
 * Can be run in Node: `node src/ml/vectorizeDebug.js`
 * or in browser DevTools: `import { runVectorizeTests } from './ml/vectorizeDebug.js'; runVectorizeTests();`
 */

import { FEATURE_ORDER, movieToVector } from './vectorize.js';
import { extractMovieFeatures } from './movieFeatures.js';
import { movies } from '../data/movies.js';

export function runVectorizeTests() {
  console.log('====================================================');
  console.log('CineSwipe ML — Phase 2.2A Vectorization Verification');
  console.log('====================================================\n');

  const errors = [];

  // 1. Verify FEATURE_ORDER
  if (!Array.isArray(FEATURE_ORDER) || FEATURE_ORDER.length !== 20) {
    errors.push(`FEATURE_ORDER must be an array of length 20. Found: ${FEATURE_ORDER?.length}`);
  }

  // 2. Test mock movies dataset
  const targetTitles = ['Whiplash', 'Black Swan', 'Sing Street'];
  const loggedVectors = {};

  for (const rawMovie of movies) {
    const movieWithFeatures = {
      ...rawMovie,
      features: extractMovieFeatures(rawMovie),
    };

    const vector = movieToVector(movieWithFeatures);

    // Rule 1: Exactly 20 numbers
    if (!Array.isArray(vector) || vector.length !== 20) {
      errors.push(`[${rawMovie.title}] Vector length is not 20. Got: ${vector?.length}`);
    }

    // Rule 2 & 3: Finite numbers between 0 and 1
    vector.forEach((val, idx) => {
      if (typeof val !== 'number' || !Number.isFinite(val) || Number.isNaN(val)) {
        errors.push(`[${rawMovie.title}] Non-finite value at index ${idx} (${FEATURE_ORDER[idx]}): ${val}`);
      }
      if (val < 0 || val > 1) {
        errors.push(`[${rawMovie.title}] Value out of [0, 1] bounds at index ${idx} (${FEATURE_ORDER[idx]}): ${val}`);
      }
    });

    if (targetTitles.includes(rawMovie.title)) {
      loggedVectors[rawMovie.title] = vector;
    }
  }

  // Rule 4: Two movies use the exact same feature ordering
  // Check that indices map consistently to FEATURE_ORDER
  const movieA = {
    features: {
      genres: { action: 1, drama: 1 },
      moods: { intense: 0.8 },
    },
  };
  const movieB = {
    features: {
      genres: { drama: 1, music: 1 },
      moods: { melancholic: 0.5 },
    },
  };
  const vecA = movieToVector(movieA);
  const vecB = movieToVector(movieB);

  const actionIdx = FEATURE_ORDER.indexOf('action');
  const dramaIdx = FEATURE_ORDER.indexOf('drama');
  const musicIdx = FEATURE_ORDER.indexOf('music');
  const intenseIdx = FEATURE_ORDER.indexOf('intense');
  const melancholicIdx = FEATURE_ORDER.indexOf('melancholic');

  if (vecA[actionIdx] !== 1 || vecB[actionIdx] !== 0) {
    errors.push('Ordering test failed: action index mismatch between movieA and movieB');
  }
  if (vecA[dramaIdx] !== 1 || vecB[dramaIdx] !== 1) {
    errors.push('Ordering test failed: drama index mismatch between movieA and movieB');
  }
  if (vecA[musicIdx] !== 0 || vecB[musicIdx] !== 1) {
    errors.push('Ordering test failed: music index mismatch between movieA and movieB');
  }
  if (vecA[intenseIdx] !== 0.8 || vecB[intenseIdx] !== 0) {
    errors.push('Ordering test failed: intense index mismatch between movieA and movieB');
  }
  if (vecA[melancholicIdx] !== 0 || vecB[melancholicIdx] !== 0.5) {
    errors.push('Ordering test failed: melancholic index mismatch between movieA and movieB');
  }

  // Rule 5: Missing features become 0, undefined/NaN handled gracefully
  const missingTestMovie = {
    features: {
      genres: { action: 1 },
      moods: { intense: NaN, dark: undefined },
    },
  };
  const missingVec = movieToVector(missingTestMovie);
  if (missingVec.length !== 20) {
    errors.push('Missing features test: vector length is not 20');
  }
  if (missingVec[actionIdx] !== 1) {
    errors.push('Missing features test: present genre "action" was not 1');
  }
  if (missingVec[dramaIdx] !== 0) {
    errors.push('Missing features test: missing genre did not become 0');
  }
  if (missingVec[intenseIdx] !== 0) {
    errors.push('Missing features test: NaN mood did not become 0');
  }
  if (missingVec[FEATURE_ORDER.indexOf('dark')] !== 0) {
    errors.push('Missing features test: undefined mood did not become 0');
  }

  const emptyVec = movieToVector({});
  if (emptyVec.length !== 20 || emptyVec.some((v) => v !== 0)) {
    errors.push('Empty object test: did not produce 20 zeros');
  }

  const nullVec = movieToVector(null);
  if (nullVec.length !== 20 || nullVec.some((v) => v !== 0)) {
    errors.push('Null movie test: did not produce 20 zeros');
  }

  // Log Results
  console.log('--- TEST ASSERTIONS ---');
  if (errors.length === 0) {
    console.log('PASS: 1. Every movie produces exactly 20 numbers.');
    console.log('PASS: 2. All values are finite numbers.');
    console.log('PASS: 3. All values are between 0 and 1.');
    console.log('PASS: 4. Two movies use the exact same feature ordering.');
    console.log('PASS: 5. Missing features become 0 (NaN/undefined safely handled).');
    console.log(`PASS: All ${movies.length} dataset movies validated successfully.\n`);
  } else {
    console.error(`FAIL: ${errors.length} error(s) found:`);
    errors.forEach((e) => console.error('  ✗', e));
    console.log('');
  }

  // Log vectors for Whiplash, Black Swan, Sing Street
  console.log('--- EXAMPLE VECTORS ---');
  for (const title of targetTitles) {
    const vec = loggedVectors[title];
    console.log(`\nMovie: "${title}"`);
    console.log('Vector (20 dimensions):');
    console.log(JSON.stringify(vec));
    console.log('Breakdown by feature:');
    FEATURE_ORDER.forEach((feat, i) => {
      console.log(`  [${String(i).padStart(2, ' ')}] ${feat.padEnd(18, ' ')} : ${vec[i]}`);
    });
  }

  return {
    success: errors.length === 0,
    errors,
    vectors: loggedVectors,
  };
}

// Auto-run if executed directly in Node
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.endsWith('vectorizeDebug.js')) {
  const result = runVectorizeTests();
  if (!result.success) {
    process.exit(1);
  }
}
