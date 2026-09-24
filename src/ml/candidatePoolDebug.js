/**
 * src/ml/candidatePoolDebug.js
 *
 * Phase 2.3A - Candidate Pool Manager verification
 *
 * Runs standalone via Node: `node src/ml/candidatePoolDebug.js`
 */

import assert from 'node:assert/strict';
import { createCandidatePool } from './candidatePool.js';

const A = { id: 'A', title: 'Movie A' };
const B = { id: 'B', title: 'Movie B' };
const C = { id: 'C', title: 'Movie C' };
const D = { id: 'D', title: 'Movie D' };

export function runCandidatePoolTests() {
  let passedTests = 0;
  const totalTests = 8;

  const check = (name, test) => {
    test();
    passedTests++;
    console.log(`PASS: ${name}`);
  };

  check('initialization', () => {
    const pool = createCandidatePool([A, B, C]);
    assert.equal(pool.size(), 3);
    assert.equal(pool.isEmpty(), false);
    assert.deepEqual(pool.getAvailable(), [A, B, C]);
  });

  check('consume and availability state', () => {
    const pool = createCandidatePool([A, B, C]);
    pool.consume('B');
    assert.equal(pool.size(), 2);
    assert.deepEqual(pool.getAvailable(), [A, C]);
    assert.equal(pool.hasMovie('B'), true);
    assert.equal(pool.hasAvailableMovie('B'), false);
  });

  check('duplicate prevention', () => {
    const pool = createCandidatePool([A, B, C]);
    pool.consume('B');
    pool.addMovies([B, C, D]);
    assert.deepEqual(pool.getAvailable(), [A, C, D]);
  });

  check('repeated consume', () => {
    const pool = createCandidatePool([A, B, C]);
    pool.consume('B');
    pool.consume('B');
    pool.consume('B');
    assert.equal(pool.size(), 2);
    assert.equal(pool.hasAvailableMovie('B'), false);
  });

  check('empty pool', () => {
    const pool = createCandidatePool([A]);
    pool.consume('A');
    assert.equal(pool.size(), 0);
    assert.equal(pool.isEmpty(), true);
    assert.deepEqual(pool.getAvailable(), []);
  });

  check('re-add after consumption', () => {
    const pool = createCandidatePool([A, B]);
    pool.consume('A');
    pool.addMovies([A, C]);
    assert.deepEqual(pool.getAvailable(), [B, C]);
  });

  check('invalid input', () => {
    assert.doesNotThrow(() => createCandidatePool(null));
    assert.doesNotThrow(() => createCandidatePool(undefined));
    assert.doesNotThrow(() => createCandidatePool([]));

    const pool = createCandidatePool([]);
    assert.doesNotThrow(() => pool.addMovies(null));
    assert.doesNotThrow(() => pool.addMovies(undefined));
    assert.doesNotThrow(() => pool.addMovies([null, undefined, {}, { title: 'No ID' }, A]));
    assert.deepEqual(pool.getAvailable(), [A]);
  });

  check('immutability and safe available copies', () => {
    const initialMovies = [A, B, C];
    const originalOrder = initialMovies.slice();
    const pool = createCandidatePool(initialMovies);
    const available = pool.getAvailable();
    available.pop();

    assert.deepEqual(initialMovies, originalOrder);
    assert.deepEqual(pool.getAvailable(), [A, B, C]);
    assert.equal(Object.prototype.hasOwnProperty.call(A, 'consumed'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(A, 'seen'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(A, 'used'), false);
  });

  console.log(`\nCandidate pool tests: ${passedTests}/${totalTests} passed.`);
  return passedTests === totalTests;
}

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('candidatePoolDebug.js')) {
  runCandidatePoolTests();
}
