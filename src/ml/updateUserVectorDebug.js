/**
 * src/ml/updateUserVectorDebug.js
 *
 * Phase 2.2C — Verification and Debug Suite for updateUserVector
 *
 * Runs standalone via Node: `node src/ml/updateUserVectorDebug.js`
 */

import { FEATURE_ORDER } from './vectorize.js';
import { updateUserVector } from './updateUserVector.js';

export function runUpdateUserVectorTests() {
  console.log('===========================================================');
  console.log('CineSwipe ML — Phase 2.2C Swipe Vector Updates Test Suite');
  console.log('===========================================================\n');

  let passedTests = 0;
  let totalTests = 7;
  const errors = [];

  // --------------------------------------------------------------------------
  // Test 1 — RIGHT
  // --------------------------------------------------------------------------
  console.log('--- Test 1: RIGHT Swipe ---');
  const userVec1 = [0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0];
  const movieVec1 = [0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0.5, 0, 0, 0, 0.6, 1, 1, 0, 0];
  const origUser1 = [...userVec1];
  const origMovie1 = [...movieVec1];

  const updatedRight = updateUserVector(userVec1, movieVec1, 'right', 0.2);

  const test1Errors = [];
  if (updatedRight.length !== 20) test1Errors.push(`Expected 20 dimensions, got ${updatedRight.length}`);
  if (updatedRight.some((v) => typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1)) {
    test1Errors.push('Values must be finite numbers in [0, 1]');
  }

  // Key feature checks
  const getVal = (vec, feat) => vec[FEATURE_ORDER.indexOf(feat)];
  const checksRight = [
    { feat: 'mystery', expected: 0.8 },
    { feat: 'thriller', expected: 1 },
    { feat: 'drama', expected: 0.2 },
    { feat: 'horror', expected: 0.2 },
    { feat: 'melancholic', expected: 0.1 },
    { feat: 'thoughtProvoking', expected: 0.12 },
    { feat: 'intense', expected: 0.2 },
    { feat: 'dark', expected: 1 },
  ];

  checksRight.forEach(({ feat, expected }) => {
    const actual = getVal(updatedRight, feat);
    if (Math.abs(actual - expected) > 1e-5) {
      test1Errors.push(`Feature "${feat}" expected ${expected}, got ${actual}`);
    }
  });

  if (test1Errors.length === 0) {
    console.log('PASS: RIGHT update correctly pulls user preferences toward liked movie.');
    console.log('  mystery: 1 ->', getVal(updatedRight, 'mystery'));
    console.log('  thriller: 1 ->', getVal(updatedRight, 'thriller'));
    console.log('  drama: 0 ->', getVal(updatedRight, 'drama'));
    console.log('  horror: 0 ->', getVal(updatedRight, 'horror'));
    console.log('  melancholic: 0 ->', getVal(updatedRight, 'melancholic'));
    console.log('  thoughtProvoking: 0 ->', getVal(updatedRight, 'thoughtProvoking'));
    console.log('  intense: 0 ->', getVal(updatedRight, 'intense'));
    console.log('  dark: 1 ->', getVal(updatedRight, 'dark'));
    passedTests++;
  } else {
    console.error('FAIL: Test 1 (RIGHT):', test1Errors);
    errors.push(...test1Errors);
  }

  // --------------------------------------------------------------------------
  // Test 2 — LEFT
  // --------------------------------------------------------------------------
  console.log('\n--- Test 2: LEFT Swipe ---');
  const userVec2 = [0, 0, 0.5, 0.7, 0, 0.8, 0, 0, 0, 0.6, 0, 0.4, 0, 0, 0.3, 0.5, 0.7, 0.2, 0, 0];
  const movieVec2 = [0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0.5, 0, 0, 0, 0.6, 1, 1, 0, 0];

  const updatedLeft = updateUserVector(userVec2, movieVec2, 'left', 0.2);

  const test2Errors = [];
  if (updatedLeft.length !== 20) test2Errors.push(`Expected 20 dimensions, got ${updatedLeft.length}`);
  if (updatedLeft.some((v) => typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1)) {
    test2Errors.push('Values must be finite numbers in [0, 1]');
  }

  const checksLeft = [
    { feat: 'crime', expected: 0.3 },
    { feat: 'drama', expected: 0.5 },
    { feat: 'horror', expected: 0.6 },
    { feat: 'thriller', expected: 0.4 },
    { feat: 'melancholic', expected: 0.3 },
    { feat: 'feelGood', expected: 0.3 }, // movie feature = 0, remains unchanged
    { feat: 'thoughtProvoking', expected: 0.38 },
    { feat: 'intense', expected: 0.5 },
    { feat: 'dark', expected: 0 },
  ];

  checksLeft.forEach(({ feat, expected }) => {
    const actual = getVal(updatedLeft, feat);
    if (Math.abs(actual - expected) > 1e-5) {
      test2Errors.push(`Feature "${feat}" expected ${expected}, got ${actual}`);
    }
  });

  if (test2Errors.length === 0) {
    console.log('PASS: LEFT update correctly reduces preference for rejected movie features.');
    console.log('  crime: 0.5 ->', getVal(updatedLeft, 'crime'));
    console.log('  drama: 0.7 ->', getVal(updatedLeft, 'drama'));
    console.log('  horror: 0.8 ->', getVal(updatedLeft, 'horror'));
    console.log('  thriller: 0.6 ->', getVal(updatedLeft, 'thriller'));
    console.log('  melancholic: 0.4 ->', getVal(updatedLeft, 'melancholic'));
    console.log('  feelGood: 0.3 ->', getVal(updatedLeft, 'feelGood'), '(unchanged as movie feature = 0)');
    console.log('  thoughtProvoking: 0.5 ->', getVal(updatedLeft, 'thoughtProvoking'));
    console.log('  intense: 0.7 ->', getVal(updatedLeft, 'intense'));
    console.log('  dark: 0.2 ->', getVal(updatedLeft, 'dark'));
    passedTests++;
  } else {
    console.error('FAIL: Test 2 (LEFT):', test2Errors);
    errors.push(...test2Errors);
  }

  // --------------------------------------------------------------------------
  // Test 3 — UP
  // --------------------------------------------------------------------------
  console.log('\n--- Test 3: UP Swipe ---');
  const userVec3 = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const movieVec3 = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

  const updatedUp = updateUserVector(userVec3, movieVec3, 'up', 0.2);

  const test3Errors = [];
  if (updatedUp === userVec3) {
    test3Errors.push('UP must return a new array instance, not the same reference');
  }
  for (let i = 0; i < 20; i++) {
    if (updatedUp[i] !== userVec3[i]) {
      test3Errors.push(`Index ${i} value mismatch: ${updatedUp[i]} !== ${userVec3[i]}`);
    }
  }

  if (test3Errors.length === 0) {
    console.log('PASS: UP returns an unchanged new array instance (preference unchanged).');
    passedTests++;
  } else {
    console.error('FAIL: Test 3 (UP):', test3Errors);
    errors.push(...test3Errors);
  }

  // --------------------------------------------------------------------------
  // Test 4 — Unknown Action
  // --------------------------------------------------------------------------
  console.log('\n--- Test 4: Unknown Action ---');
  const updatedUnknown = updateUserVector(userVec3, movieVec3, 'something-invalid', 0.2);

  const test4Errors = [];
  if (updatedUnknown.length !== 20) test4Errors.push('Expected 20 dimensions');
  for (let i = 0; i < 20; i++) {
    if (updatedUnknown[i] !== userVec3[i]) {
      test4Errors.push(`Index ${i} should be unchanged for unknown action`);
    }
  }

  if (test4Errors.length === 0) {
    console.log('PASS: Unknown action leaves vector values unchanged without throwing.');
    passedTests++;
  } else {
    console.error('FAIL: Test 4 (Unknown Action):', test4Errors);
    errors.push(...test4Errors);
  }

  // --------------------------------------------------------------------------
  // Test 5 — Missing / Null Inputs
  // --------------------------------------------------------------------------
  console.log('\n--- Test 5: Missing / Null Inputs ---');
  const test5Errors = [];

  const safeCases = [
    { name: 'null userVector', fn: () => updateUserVector(null, movieVec1, 'right') },
    { name: 'null movieVector', fn: () => updateUserVector(userVec1, null, 'right') },
    { name: 'undefined both', fn: () => updateUserVector(undefined, undefined, 'right') },
    { name: 'unknown action with null', fn: () => updateUserVector(userVec1, movieVec1, 'unknown') },
    { name: 'non-finite LR', fn: () => updateUserVector(userVec1, movieVec1, 'right', NaN) },
    { name: 'negative LR', fn: () => updateUserVector(userVec1, movieVec1, 'right', -0.5) },
  ];

  safeCases.forEach(({ name, fn }) => {
    try {
      const res = fn();
      if (!Array.isArray(res) || res.length !== 20) {
        test5Errors.push(`${name}: returned invalid array or length != 20`);
      }
      if (res.some((v) => typeof v !== 'number' || !Number.isFinite(v))) {
        test5Errors.push(`${name}: produced non-finite values`);
      }
    } catch (err) {
      test5Errors.push(`${name}: threw error ${err.message}`);
    }
  });

  if (test5Errors.length === 0) {
    console.log('PASS: All missing/null/undefined edge cases handled safely with 20 finite numbers.');
    passedTests++;
  } else {
    console.error('FAIL: Test 5 (Missing/Null Inputs):', test5Errors);
    errors.push(...test5Errors);
  }

  // --------------------------------------------------------------------------
  // Test 6 — Clamping
  // --------------------------------------------------------------------------
  console.log('\n--- Test 6: Clamping Bounds ---');
  const test6Errors = [];

  // LEFT swipe where user - lr * movie < 0
  const clampUnderVec = updateUserVector([0.1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 'left', 0.5);
  if (clampUnderVec[0] !== 0) {
    test6Errors.push(`Negative value was not clamped to 0. Got: ${clampUnderVec[0]}`);
  }

  // RIGHT swipe where user + lr * (movie - user) > 1 (e.g. if user is 1.2 and movie is 1)
  const clampOverVec = updateUserVector([1.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 'right', 1.0);
  if (clampOverVec[0] !== 1.0) {
    test6Errors.push(`Value was not clamped to 1. Got: ${clampOverVec[0]}`);
  }

  if (test6Errors.length === 0) {
    console.log('PASS: Values strictly clamped to [0, 1] range in all arithmetic boundary conditions.');
    passedTests++;
  } else {
    console.error('FAIL: Test 6 (Clamping):', test6Errors);
    errors.push(...test6Errors);
  }

  // --------------------------------------------------------------------------
  // Test 7 — Immutability
  // --------------------------------------------------------------------------
  console.log('\n--- Test 7: Immutability ---');
  const test7Errors = [];

  const uTest = [0.2, 0.4, 0.6, 0.8, 1.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const mTest = [0.5, 0.5, 0.5, 0.5, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const uSnapshot = [...uTest];
  const mSnapshot = [...mTest];

  updateUserVector(uTest, mTest, 'right', 0.2);
  updateUserVector(uTest, mTest, 'left', 0.2);
  updateUserVector(uTest, mTest, 'up', 0.2);

  for (let i = 0; i < 20; i++) {
    if (uTest[i] !== uSnapshot[i]) test7Errors.push(`userVector was mutated at index ${i}`);
    if (mTest[i] !== mSnapshot[i]) test7Errors.push(`movieVector was mutated at index ${i}`);
  }

  if (test7Errors.length === 0) {
    console.log('PASS: userVector and movieVector remain completely unmutated across all operations.');
    passedTests++;
  } else {
    console.error('FAIL: Test 7 (Immutability):', test7Errors);
    errors.push(...test7Errors);
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
    errors,
    sampleVectors: {
      test1Right: updatedRight,
      test2Left: updatedLeft,
      test3Up: updatedUp,
    },
  };
}

// Auto-run when executed directly via Node
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.endsWith('updateUserVectorDebug.js')) {
  const result = runUpdateUserVectorTests();
  if (!result.success) {
    process.exit(1);
  }
}
