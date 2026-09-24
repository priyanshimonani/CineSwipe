/**
 * src/ml/cosineSimilarityDebug.js
 *
 * Phase 2.2D — Cosine Similarity Test & Debug Suite
 *
 * Runs standalone via Node: `node src/ml/cosineSimilarityDebug.js`
 */

import { FEATURE_ORDER } from './vectorize.js';
import { cosineSimilarity } from './cosineSimilarity.js';

export function runCosineSimilarityTests() {
  console.log('===========================================================');
  console.log('CineSwipe ML — Phase 2.2D Cosine Similarity Test Suite');
  console.log('===========================================================\n');

  let passedTests = 0;
  const totalTests = 9;
  const errors = [];
  const EPSILON = 1e-6;

  const make20 = (initialValues = []) => {
    const vec = new Array(20).fill(0);
    initialValues.forEach((val, idx) => {
      if (idx < 20) vec[idx] = val;
    });
    return vec;
  };

  // --------------------------------------------------------------------------
  // Test 1 — Identical vectors
  // --------------------------------------------------------------------------
  console.log('--- Test 1: Identical Vectors ---');
  const vecIdenticalA = make20([1, 0, 0, 0]);
  const vecIdenticalB = make20([1, 0, 0, 0]);
  const sim1 = cosineSimilarity(vecIdenticalA, vecIdenticalB);

  if (Math.abs(sim1 - 1.0) < EPSILON) {
    console.log(`PASS: Identical vectors similarity = ${sim1} (expected 1.0)`);
    passedTests++;
  } else {
    console.error(`FAIL: Test 1 expected 1.0, got ${sim1}`);
    errors.push(`Test 1 expected 1.0, got ${sim1}`);
  }

  // --------------------------------------------------------------------------
  // Test 2 — Orthogonal vectors
  // --------------------------------------------------------------------------
  console.log('\n--- Test 2: Orthogonal Vectors ---');
  const vecOrthoA = make20([1, 0, 0, 0]);
  const vecOrthoB = make20([0, 1, 0, 0]);
  const sim2 = cosineSimilarity(vecOrthoA, vecOrthoB);

  if (Math.abs(sim2 - 0.0) < EPSILON) {
    console.log(`PASS: Orthogonal vectors similarity = ${sim2} (expected 0.0)`);
    passedTests++;
  } else {
    console.error(`FAIL: Test 2 expected 0.0, got ${sim2}`);
    errors.push(`Test 2 expected 0.0, got ${sim2}`);
  }

  // --------------------------------------------------------------------------
  // Test 3 — Same direction, different magnitude
  // --------------------------------------------------------------------------
  console.log('\n--- Test 3: Same Direction, Different Magnitude ---');
  const vecScaleA = make20([1, 1, 0, 0]);
  const vecScaleB = make20([0.5, 0.5, 0, 0]);
  const sim3 = cosineSimilarity(vecScaleA, vecScaleB);

  if (Math.abs(sim3 - 1.0) < EPSILON) {
    console.log(`PASS: Same direction vectors similarity = ${sim3} (expected 1.0)`);
    passedTests++;
  } else {
    console.error(`FAIL: Test 3 expected 1.0, got ${sim3}`);
    errors.push(`Test 3 expected 1.0, got ${sim3}`);
  }

  // --------------------------------------------------------------------------
  // Test 4 — Known manual example ([1,0,1,0] and [1,1,0,0])
  // --------------------------------------------------------------------------
  console.log('\n--- Test 4: Known Manual Example ---');
  const vecManualA = [1, 0, 1, 0];
  const vecManualB = [1, 1, 0, 0];
  const sim4 = cosineSimilarity(vecManualA, vecManualB);

  if (Math.abs(sim4 - 0.5) < EPSILON) {
    console.log(`PASS: Manual calculation [1,0,1,0] & [1,1,0,0] similarity = ${sim4} (expected 0.5)`);
    passedTests++;
  } else {
    console.error(`FAIL: Test 4 expected 0.5, got ${sim4}`);
    errors.push(`Test 4 expected 0.5, got ${sim4}`);
  }

  // --------------------------------------------------------------------------
  // Test 5 — Actual CineSwipe vectors
  // --------------------------------------------------------------------------
  console.log('\n--- Test 5: Actual CineSwipe Vectors ---');
  const actualUserVec = [0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0];
  const actualMovieVec = [0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0.5, 0, 0, 0, 0.6, 1, 1, 0, 0];
  const sim5 = cosineSimilarity(actualUserVec, actualMovieVec);

  // Mathematical derivation:
  // dot = 1 (thriller) + 1 (dark) = 2
  // ||user|| = sqrt(1+1+1) = sqrt(3) ≈ 1.7320508
  // ||movie|| = sqrt(1+1+1+0.25+0.36+1+1) = sqrt(5.61) ≈ 2.3685438
  // sim = 2 / (sqrt(3) * sqrt(5.61)) = 2 / sqrt(16.83) ≈ 0.4875149
  const expectedSim5 = 2 / Math.sqrt(3 * 5.61);

  if (Number.isFinite(sim5) && sim5 >= 0 && sim5 <= 1 && Math.abs(sim5 - expectedSim5) < EPSILON) {
    console.log(`PASS: CineSwipe vectors similarity = ${sim5.toFixed(6)} (mathematically expected: ${expectedSim5.toFixed(6)})`);
    console.log(`  Finite: ${Number.isFinite(sim5)}, In [0,1]: ${sim5 >= 0 && sim5 <= 1}`);
    passedTests++;
  } else {
    console.error(`FAIL: Test 5 actual CineSwipe vectors gave ${sim5}, expected ${expectedSim5}`);
    errors.push(`Test 5 failed: ${sim5}`);
  }

  // --------------------------------------------------------------------------
  // Test 6 — Zero vectors
  // --------------------------------------------------------------------------
  console.log('\n--- Test 6: Zero Vectors ---');
  const zeroVector = new Array(20).fill(0);
  const simZeroA = cosineSimilarity(zeroVector, actualUserVec);
  const simZeroB = cosineSimilarity(actualUserVec, zeroVector);
  const simZeroBoth = cosineSimilarity(zeroVector, zeroVector);

  if (simZeroA === 0 && simZeroB === 0 && simZeroBoth === 0) {
    console.log('PASS: Zero vectors safely return 0 without NaN or Infinity.');
    console.log(`  (zero, valid) = ${simZeroA}, (valid, zero) = ${simZeroB}, (zero, zero) = ${simZeroBoth}`);
    passedTests++;
  } else {
    console.error(`FAIL: Test 6 expected 0, got (${simZeroA}, ${simZeroB}, ${simZeroBoth})`);
    errors.push('Test 6 zero vectors failed');
  }

  // --------------------------------------------------------------------------
  // Test 7 — Symmetry
  // --------------------------------------------------------------------------
  console.log('\n--- Test 7: Symmetry ---');
  const pair1 = [actualUserVec, actualMovieVec];
  const pair2 = [vecManualA, vecManualB];
  const pair3 = [make20([0.2, 0.4, 0.8]), make20([0.5, 0.1, 0.9])];

  const sym1 = Math.abs(cosineSimilarity(pair1[0], pair1[1]) - cosineSimilarity(pair1[1], pair1[0])) < EPSILON;
  const sym2 = Math.abs(cosineSimilarity(pair2[0], pair2[1]) - cosineSimilarity(pair2[1], pair2[0])) < EPSILON;
  const sym3 = Math.abs(cosineSimilarity(pair3[0], pair3[1]) - cosineSimilarity(pair3[1], pair3[0])) < EPSILON;

  if (sym1 && sym2 && sym3) {
    console.log('PASS: Cosine similarity is strictly symmetric across all tested pairs.');
    passedTests++;
  } else {
    console.error('FAIL: Test 7 symmetry test failed');
    errors.push('Test 7 symmetry failed');
  }

  // --------------------------------------------------------------------------
  // Test 8 — Immutability
  // --------------------------------------------------------------------------
  console.log('\n--- Test 8: Immutability ---');
  const immUser = [0, 0, 0.5, 0.7, 0, 0.8, 0, 0, 0, 0.6, 0, 0.4, 0, 0, 0.3, 0.5, 0.7, 0.2, 0, 0];
  const immMovie = [0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0.5, 0, 0, 0, 0.6, 1, 1, 0, 0];
  const snapUser = [...immUser];
  const snapMovie = [...immMovie];

  cosineSimilarity(immUser, immMovie);

  let unmutated = true;
  for (let i = 0; i < 20; i++) {
    if (immUser[i] !== snapUser[i] || immMovie[i] !== snapMovie[i]) {
      unmutated = false;
      break;
    }
  }

  if (unmutated) {
    console.log('PASS: Input vectors are completely unchanged after calculating similarity.');
    passedTests++;
  } else {
    console.error('FAIL: Test 8 input vectors were mutated');
    errors.push('Test 8 immutability failed');
  }

  // --------------------------------------------------------------------------
  // Test 9 — Malformed & Boundary Values
  // --------------------------------------------------------------------------
  console.log('\n--- Test 9: Malformed & Boundary Values ---');
  const malformedA = [NaN, Infinity, -Infinity, null, undefined, 'string', 1];
  const malformedB = [1, 2, 3];
  const extraDimA = new Array(30).fill(1);
  const extraDimB = new Array(30).fill(1);

  const safeChecks = [
    { name: 'NaN / Infinity vector', fn: () => cosineSimilarity(malformedA, actualUserVec) },
    { name: 'Null first input', fn: () => cosineSimilarity(null, actualUserVec) },
    { name: 'Undefined second input', fn: () => cosineSimilarity(actualUserVec, undefined) },
    { name: 'Both null', fn: () => cosineSimilarity(null, null) },
    { name: 'Fewer than 20 dims', fn: () => cosineSimilarity(malformedB, [1, 2, 3]) },
    { name: 'More than 20 dims (standardized to 20)', fn: () => cosineSimilarity(extraDimA, extraDimB) },
  ];

  let malformedOk = true;
  safeChecks.forEach(({ name, fn }) => {
    try {
      const res = fn();
      if (typeof res !== 'number' || !Number.isFinite(res) || Number.isNaN(res) || res < 0 || res > 1) {
        errors.push(`${name} produced non-finite or out-of-range value: ${res}`);
        malformedOk = false;
      }
    } catch (err) {
      errors.push(`${name} threw error: ${err.message}`);
      malformedOk = false;
    }
  });

  if (malformedOk) {
    console.log('PASS: All malformed, non-finite, missing, and variable-length inputs handled safely.');
    passedTests++;
  } else {
    console.error('FAIL: Test 9 malformed inputs failed');
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
    actualCineSwipeSimilarity: sim5,
  };
}

// Auto-run when executed directly via Node
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.endsWith('cosineSimilarityDebug.js')) {
  const result = runCosineSimilarityTests();
  if (!result.success) {
    process.exit(1);
  }
}
