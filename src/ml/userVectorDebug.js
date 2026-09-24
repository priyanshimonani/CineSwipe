/**
 * src/ml/userVectorDebug.js
 *
 * Phase 2.2B — User preference vector debug and verification runner.
 *
 * Can be run in Node: `node src/ml/userVectorDebug.js`
 */

import { FEATURE_ORDER } from './vectorize.js';
import { createInitialUserVector, debugUserVectorCases } from './userVector.js';

export function runUserVectorTests() {
  console.log('===========================================================');
  console.log('CineSwipe ML — Phase 2.2B User Vector Verification');
  console.log('===========================================================');

  const errors = [];

  // Case 1: ["thriller", "mystery", "dark"]
  const vec1 = createInitialUserVector(['thriller', 'mystery', 'dark']);
  if (vec1.length !== 20) errors.push('Case 1: vector length is not 20');
  if (vec1[FEATURE_ORDER.indexOf('thriller')] !== 1) errors.push('Case 1: thriller != 1');
  if (vec1[FEATURE_ORDER.indexOf('mystery')] !== 1) errors.push('Case 1: mystery != 1');
  if (vec1[FEATURE_ORDER.indexOf('dark')] !== 1) errors.push('Case 1: dark != 1');
  const sum1 = vec1.reduce((a, b) => a + b, 0);
  if (sum1 !== 3) errors.push(`Case 1: sum of vector elements should be 3, got ${sum1}`);

  // Case 2: ["music", "melancholic", "coming-of-age"]
  const vec2 = createInitialUserVector(['music', 'melancholic', 'coming-of-age']);
  if (vec2.length !== 20) errors.push('Case 2: vector length is not 20');
  if (vec2[FEATURE_ORDER.indexOf('music')] !== 1) errors.push('Case 2: music != 1');
  if (vec2[FEATURE_ORDER.indexOf('melancholic')] !== 1) errors.push('Case 2: melancholic != 1');
  if (vec2[FEATURE_ORDER.indexOf('comingOfAge')] !== 1) errors.push('Case 2: comingOfAge != 1');
  const sum2 = vec2.reduce((a, b) => a + b, 0);
  if (sum2 !== 3) errors.push(`Case 2: sum of vector elements should be 3, got ${sum2}`);

  // Case 3: ["horror"]
  const vec3 = createInitialUserVector(['horror']);
  if (vec3.length !== 20) errors.push('Case 3: vector length is not 20');
  if (vec3[FEATURE_ORDER.indexOf('horror')] !== 1) errors.push('Case 3: horror != 1');
  const sum3 = vec3.reduce((a, b) => a + b, 0);
  if (sum3 !== 1) errors.push(`Case 3: sum of vector elements should be 1, got ${sum3}`);

  // Cap / Normalization test: duplicate or overlapping selections
  const dupVec = createInitialUserVector(['horror', 'horror', 'horror']);
  if (dupVec[FEATURE_ORDER.indexOf('horror')] !== 1) {
    errors.push('Normalization test: duplicate selections should be capped at 1');
  }

  // Null / empty / undefined test
  const emptyVec = createInitialUserVector([]);
  if (emptyVec.length !== 20 || emptyVec.some((v) => v !== 0)) {
    errors.push('Empty input test: expected 20 zeros');
  }
  const nullVec = createInitialUserVector(null);
  if (nullVec.length !== 20 || nullVec.some((v) => v !== 0)) {
    errors.push('Null input test: expected 20 zeros');
  }

  // Print summary
  if (errors.length === 0) {
    console.log('\nPASS: All test cases and assertions passed successfully.');
  } else {
    console.error(`\nFAIL: ${errors.length} error(s) found:`);
    errors.forEach((e) => console.error('  ✗', e));
  }

  // Print detailed vector breakdowns
  console.log('\n--- DEMONSTRATION OF REQUIRED CASES ---');
  debugUserVectorCases();

  return {
    success: errors.length === 0,
    errors,
    vectors: {
      case1: vec1,
      case2: vec2,
      case3: vec3,
    },
  };
}

// Auto-run when executed directly via Node
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.endsWith('userVectorDebug.js')) {
  const res = runUserVectorTests();
  if (!res.success) {
    process.exit(1);
  }
}
