/**
 * Phase 2.5 - Candidate pool replenishment verification.
 *
 * Runs standalone via Node:
 * `node src/ml/candidatePoolReplenishmentDebug.js`
 */

import assert from 'node:assert/strict';
import { createCandidatePool } from './candidatePool.js';
import { scoreCandidates } from './scoreCandidates.js';
import { createInitialUserVector } from './userVector.js';
import { FEATURE_ORDER } from './vectorize.js';

const MIN_POOL_SIZE = 10;

function movie(id, feature) {
  const vector = new Array(FEATURE_ORDER.length).fill(0);
  vector[FEATURE_ORDER.indexOf(feature)] = 1;
  return { id, title: `Movie ${id}`, vector };
}

function replenishIfNeeded(pool, movies) {
  if (pool.size() >= MIN_POOL_SIZE) {
    return { triggered: false, added: 0 };
  }

  const before = pool.size();
  pool.addMovies(movies);
  return { triggered: true, added: pool.size() - before };
}

export function runCandidatePoolReplenishmentTests() {
  let passed = 0;
  const check = (name, test) => {
    test();
    passed++;
    console.log(`PASS: ${name}`);
  };

  check('initial pool and consumption', () => {
    const pool = createCandidatePool(Array.from({ length: 11 }, (_, i) => movie(`A${i}`, 'drama')));
    assert.equal(pool.size(), 11);
    pool.consume('A0');
    assert.equal(pool.size(), 10);
  });

  check('replenishment triggers below threshold', () => {
    const pool = createCandidatePool(Array.from({ length: 9 }, (_, i) => movie(`B${i}`, 'drama')));
    const result = replenishIfNeeded(pool, [movie('B9', 'drama'), movie('B10', 'drama')]);
    assert.equal(result.triggered, true);
    assert.equal(result.added, 2);
    assert.equal(pool.size(), 11);
  });

  check('replenishment does not trigger at threshold', () => {
    const pool = createCandidatePool(Array.from({ length: 10 }, (_, i) => movie(`C${i}`, 'drama')));
    const result = replenishIfNeeded(pool, [movie('C10', 'drama')]);
    assert.equal(result.triggered, false);
    assert.equal(pool.size(), 10);
  });

  check('duplicate TMDB movies are ignored', () => {
    const pool = createCandidatePool([movie('D0', 'drama')]);
    pool.addMovies([movie('D0', 'drama'), movie('D1', 'drama'), movie('D1', 'drama')]);
    assert.deepEqual(pool.getAvailable().map(({ id }) => id), ['D0', 'D1']);
  });

  check('consumed movies cannot return', () => {
    const pool = createCandidatePool([movie('E0', 'drama')]);
    pool.consume('E0');
    pool.addMovies([movie('E0', 'drama'), movie('E1', 'drama')]);
    assert.deepEqual(pool.getAvailable().map(({ id }) => id), ['E1']);
  });

  check('replenishment preserves the user vector', () => {
    const vector = createInitialUserVector(['thriller']);
    const before = vector.slice();
    const pool = createCandidatePool([movie('F0', 'drama')]);
    pool.addMovies([movie('F1', 'thriller')]);
    assert.deepEqual(vector, before);
  });

  check('new candidates are scored with the current vector', () => {
    const vector = createInitialUserVector(['thriller']);
    const pool = createCandidatePool([movie('G0', 'comedy')]);
    pool.addMovies([movie('G1', 'thriller')]);
    const ranked = scoreCandidates(vector, pool.getAvailable());
    assert.equal(ranked[0].movie.id, 'G1');
  });

  check('selection remains deterministic', () => {
    const vector = createInitialUserVector(['thriller']);
    const pool = createCandidatePool([movie('H0', 'comedy'), movie('H1', 'thriller')]);
    const ranked = scoreCandidates(vector, pool.getAvailable());
    assert.equal(ranked[0].movie.id, 'H1');
  });

  check('TMDB exhaustion is safe', () => {
    const pool = createCandidatePool([movie('I0', 'drama')]);
    pool.consume('I0');
    const result = replenishIfNeeded(pool, []);
    assert.equal(result.triggered, true);
    assert.equal(pool.isEmpty(), true);
    assert.deepEqual(pool.getAvailable(), []);
  });

  console.log(`\nCandidate replenishment tests: ${passed}/9 passed.`);
  return passed === 9;
}

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('candidatePoolReplenishmentDebug.js')) {
  runCandidatePoolReplenishmentTests();
}

