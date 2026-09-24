/**
 * src/ml/scoreCandidatesDebug.js
 *
 * Phase 2.2E — Verification and Debug Suite for scoreCandidates
 *
 * Runs standalone via Node: `node src/ml/scoreCandidatesDebug.js`
 */

import { scoreCandidates } from './scoreCandidates.js';
import { extractMovieFeatures } from './movieFeatures.js';
import { movies } from '../data/movies.js';

export function runScoreCandidatesTests() {
  console.log('===========================================================');
  console.log('CineSwipe ML — Phase 2.2E Candidate Scoring & Ranking Tests');
  console.log('===========================================================\n');

  let passedTests = 0;
  const totalTests = 7;
  const errors = [];
  const EPSILON = 1e-4;

  const makeVec = (initial = []) => {
    const v = new Array(20).fill(0);
    initial.forEach((val, i) => {
      if (i < 20) v[i] = val;
    });
    return v;
  };

  // --------------------------------------------------------------------------
  // Test 1 — Basic ranking & stable tie handling
  // --------------------------------------------------------------------------
  console.log('--- Test 1: Basic Ranking & Stable Tie Handling ---');
  const user1 = makeVec([1]);
  const movieA = { id: 'A', title: 'Movie A', vector: makeVec([1]) };
  const movieB = { id: 'B', title: 'Movie B', vector: makeVec([0, 1]) };
  const movieC = { id: 'C', title: 'Movie C', vector: makeVec([0.8]) };

  const candidates1 = [movieA, movieB, movieC];
  const ranked1 = scoreCandidates(user1, candidates1);

  const test1Errors = [];
  if (ranked1.length !== 3) test1Errors.push(`Expected 3 candidates, got ${ranked1.length}`);
  if (Math.abs(ranked1[0].score - 1.0) > EPSILON || ranked1[0].movie.id !== 'A') {
    test1Errors.push(`Rank 1 should be Movie A with score 1.0, got ${ranked1[0]?.movie?.id} (${ranked1[0]?.score})`);
  }
  if (Math.abs(ranked1[1].score - 1.0) > EPSILON || ranked1[1].movie.id !== 'C') {
    test1Errors.push(`Rank 2 should be Movie C with score 1.0, got ${ranked1[1]?.movie?.id} (${ranked1[1]?.score})`);
  }
  if (Math.abs(ranked1[2].score - 0.0) > EPSILON || ranked1[2].movie.id !== 'B') {
    test1Errors.push(`Rank 3 should be Movie B with score 0.0, got ${ranked1[2]?.movie?.id} (${ranked1[2]?.score})`);
  }

  if (test1Errors.length === 0) {
    console.log('PASS: Correctly ranked [A, C, B] with stable tie preservation for score 1.0:');
    ranked1.forEach((r, idx) => console.log(`  [${idx + 1}] ${r.movie.title} -> ${r.score}`));
    passedTests++;
  } else {
    console.error('FAIL: Test 1:', test1Errors);
    errors.push(...test1Errors);
  }

  // --------------------------------------------------------------------------
  // Test 2 — Different similarity scores
  // --------------------------------------------------------------------------
  console.log('\n--- Test 2: Different Similarity Scores ---');
  const user2 = makeVec([1, 1]);
  const candA2 = { id: 'A', title: 'Movie A', vector: makeVec([1, 1]) };
  const candB2 = { id: 'B', title: 'Movie B', vector: makeVec([1, 0]) };
  const candC2 = { id: 'C', title: 'Movie C', vector: makeVec([0, 0, 1]) };

  const candidates2 = [candC2, candA2, candB2];
  const ranked2 = scoreCandidates(user2, candidates2);

  const test2Errors = [];
  if (ranked2.length !== 3) test2Errors.push(`Expected 3, got ${ranked2.length}`);
  if (ranked2[0].movie.id !== 'A' || Math.abs(ranked2[0].score - 1.0) > EPSILON) {
    test2Errors.push(`Rank 1 expected Movie A (1.0), got ${ranked2[0]?.movie?.id} (${ranked2[0]?.score})`);
  }
  if (ranked2[1].movie.id !== 'B' || Math.abs(ranked2[1].score - 0.7071) > EPSILON) {
    test2Errors.push(`Rank 2 expected Movie B (~0.7071), got ${ranked2[1]?.movie?.id} (${ranked2[1]?.score})`);
  }
  if (ranked2[2].movie.id !== 'C' || Math.abs(ranked2[2].score - 0.0) > EPSILON) {
    test2Errors.push(`Rank 3 expected Movie C (0.0), got ${ranked2[2]?.movie?.id} (${ranked2[2]?.score})`);
  }

  if (test2Errors.length === 0) {
    console.log('PASS: Ranked in correct descending score order:');
    ranked2.forEach((r, idx) => console.log(`  [${idx + 1}] ${r.movie.title} -> ${r.score.toFixed(4)}`));
    passedTests++;
  } else {
    console.error('FAIL: Test 2:', test2Errors);
    errors.push(...test2Errors);
  }

  // --------------------------------------------------------------------------
  // Test 3 — Actual CineSwipe dataset example
  // --------------------------------------------------------------------------
  console.log('\n--- Test 3: Actual CineSwipe Example ---');
  // User with mystery = 1 (idx 6), thriller = 1 (idx 9), dark = 1 (idx 17)
  const user3 = makeVec([0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0]);

  const targetTitles = ['Whiplash', 'Black Swan', 'Sing Street'];
  const testPool = movies
    .filter((m) => targetTitles.includes(m.title))
    .map((m) => ({
      ...m,
      features: extractMovieFeatures(m),
    }));

  const ranked3 = scoreCandidates(user3, testPool);

  const test3Errors = [];
  if (ranked3.length !== 3) test3Errors.push(`Expected 3 movies, got ${ranked3.length}`);

  for (let i = 0; i < ranked3.length; i++) {
    const { movie, score } = ranked3[i];
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 1) {
      test3Errors.push(`Movie "${movie.title}" score out of bounds or non-finite: ${score}`);
    }
    if (i > 0 && ranked3[i - 1].score < score) {
      test3Errors.push(`Candidates not in descending order: ${ranked3[i - 1].score} < ${score}`);
    }
  }

  if (test3Errors.length === 0) {
    console.log('PASS: Scored actual CineSwipe movies and sorted descending:');
    ranked3.forEach((r, idx) => console.log(`  [${idx + 1}] ${r.movie.title.padEnd(16, ' ')} -> score: ${r.score.toFixed(6)}`));
    passedTests++;
  } else {
    console.error('FAIL: Test 3:', test3Errors);
    errors.push(...test3Errors);
  }

  // --------------------------------------------------------------------------
  // Test 4 — Empty candidate list
  // --------------------------------------------------------------------------
  console.log('\n--- Test 4: Empty Candidate List ---');
  const emptyRes = scoreCandidates(user1, []);
  if (Array.isArray(emptyRes) && emptyRes.length === 0) {
    console.log('PASS: Empty candidate array returns [] safely.');
    passedTests++;
  } else {
    console.error('FAIL: Test 4 expected [], got', emptyRes);
    errors.push('Test 4 empty candidate list failed');
  }

  // --------------------------------------------------------------------------
  // Test 5 — Invalid candidate input (null, undefined)
  // --------------------------------------------------------------------------
  console.log('\n--- Test 5: Invalid Candidate Input ---');
  const nullRes = scoreCandidates(user1, null);
  const undefRes = scoreCandidates(user1, undefined);

  if (Array.isArray(nullRes) && nullRes.length === 0 && Array.isArray(undefRes) && undefRes.length === 0) {
    console.log('PASS: null / undefined candidate input returns [] without crashing.');
    passedTests++;
  } else {
    console.error('FAIL: Test 5 expected [], got', { nullRes, undefRes });
    errors.push('Test 5 invalid candidate input failed');
  }

  // --------------------------------------------------------------------------
  // Test 6 — User vector safety
  // --------------------------------------------------------------------------
  console.log('\n--- Test 6: User Vector Safety ---');
  const malformedUserCases = [
    { name: 'null user', u: null },
    { name: 'undefined user', u: undefined },
    { name: 'zero vector', u: new Array(20).fill(0) },
    { name: 'malformed values', u: [NaN, Infinity, -Infinity, null, 'abc'] },
  ];

  let test6Ok = true;
  malformedUserCases.forEach(({ name, u }) => {
    try {
      const res = scoreCandidates(u, candidates1);
      if (!Array.isArray(res) || res.length !== 3) {
        errors.push(`User safety test (${name}) returned invalid array length`);
        test6Ok = false;
      }
      res.forEach(({ score }) => {
        if (typeof score !== 'number' || !Number.isFinite(score) || Number.isNaN(score)) {
          errors.push(`User safety test (${name}) produced non-finite score: ${score}`);
          test6Ok = false;
        }
      });
    } catch (err) {
      errors.push(`User safety test (${name}) threw: ${err.message}`);
      test6Ok = false;
    }
  });

  if (test6Ok) {
    console.log('PASS: null, undefined, zero, and malformed user vectors handled safely with 0 scores.');
    passedTests++;
  } else {
    console.error('FAIL: Test 6 user vector safety failed');
  }

  // --------------------------------------------------------------------------
  // Test 7 — Input immutability
  // --------------------------------------------------------------------------
  console.log('\n--- Test 7: Input Immutability ---');
  const immUser = makeVec([0.2, 0.5, 0.9]);
  const immCandA = { id: 'm1', title: 'M1', vector: makeVec([0.1, 0.4]) };
  const immCandB = { id: 'm2', title: 'M2', vector: makeVec([0.9, 0.8]) };
  const immCandidates = [immCandA, immCandB];

  const snapUser = [...immUser];
  const snapCandidates = [...immCandidates];
  const snapVecA = [...immCandA.vector];
  const snapVecB = [...immCandB.vector];

  scoreCandidates(immUser, immCandidates);

  let unmutated = true;
  for (let i = 0; i < 20; i++) {
    if (immUser[i] !== snapUser[i]) unmutated = false;
  }
  if (immCandidates[0] !== snapCandidates[0] || immCandidates[1] !== snapCandidates[1]) {
    unmutated = false;
  }
  for (let i = 0; i < 20; i++) {
    if (immCandA.vector[i] !== snapVecA[i] || immCandB.vector[i] !== snapVecB[i]) {
      unmutated = false;
    }
  }

  if (unmutated) {
    console.log('PASS: Candidates array, movie objects, and user vector remain completely unmutated.');
    passedTests++;
  } else {
    console.error('FAIL: Test 7 input was mutated');
    errors.push('Test 7 input immutability failed');
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n===========================================================');
  console.log(`TEST SUMMARY: ${passedTests}/${totalTests} tests passed.`);
  console.log('===========================================================');

  return {
    success: errors.length === 0,
    passedTests,
    totalTests,
    actualCineSwipeRanked: ranked3,
  };
}

// Auto-run when executed directly via Node
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.endsWith('scoreCandidatesDebug.js')) {
  const result = runScoreCandidatesTests();
  if (!result.success) {
    process.exit(1);
  }
}
