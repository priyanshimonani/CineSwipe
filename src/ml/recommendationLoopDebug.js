/**
 * src/ml/recommendationLoopDebug.js
 *
 * Phase 2.3B - Recommendation loop integration verification
 *
 * Runs standalone via Node: `node src/ml/recommendationLoopDebug.js`
 */

import assert from 'node:assert/strict';
import { createCandidatePool } from './candidatePool.js';
import { scoreCandidates } from './scoreCandidates.js';
import { updateUserVector } from './updateUserVector.js';
import { createInitialUserVector } from './userVector.js';
import { FEATURE_ORDER } from './vectorize.js';

const indexOf = (feature) => FEATURE_ORDER.indexOf(feature);

function vectorFor(feature, value = 1) {
  const vector = new Array(FEATURE_ORDER.length).fill(0);
  vector[indexOf(feature)] = value;
  return vector;
}

function movie(id, feature) {
  return { id, title: `Movie ${id}`, vector: vectorFor(feature) };
}

function assertFiniteVector(vector) {
  assert.equal(vector.length, FEATURE_ORDER.length);
  assert.equal(vector.every((value) => Number.isFinite(value)), true);
}

export function runRecommendationLoopTests() {
  let passedTests = 0;
  const totalTests = 10;

  const check = (name, test) => {
    test();
    passedTests++;
    console.log(`PASS: ${name}`);
  };

  check('initial user vector creation', () => {
    const vector = createInitialUserVector(['thriller']);
    assert.equal(vector[indexOf('thriller')], 1);
    assertFiniteVector(vector);
  });

  check('initial ranking uses user preferences', () => {
    const vector = createInitialUserVector(['thriller']);
    const ranked = scoreCandidates(vector, [
      movie('comedy', 'comedy'),
      movie('thriller', 'thriller'),
    ]);
    assert.equal(ranked[0].movie.id, 'thriller');
  });

  check('RIGHT updates vector and ranking', () => {
    const initial = createInitialUserVector(['thriller']);
    const updated = updateUserVector(
      initial,
      movie('comedy', 'comedy').vector,
      'right'
    );
    const ranked = scoreCandidates(updated, [
      movie('thriller', 'thriller'),
      movie('comedy', 'comedy'),
    ]);
    assert.equal(updated[indexOf('comedy')], 0.2);
    assert.equal(ranked[0].movie.id, 'thriller');
    assertFiniteVector(updated);
  });

  check('LEFT updates vector and ranking', () => {
    const initial = createInitialUserVector(['thriller']);
    const updated = updateUserVector(
      initial,
      movie('thriller', 'thriller').vector,
      'left'
    );
    const ranked = scoreCandidates(updated, [
      movie('thriller', 'thriller'),
      movie('comedy', 'comedy'),
    ]);
    assert.equal(updated[indexOf('thriller')], 0.8);
    assert.equal(ranked[0].movie.id, 'thriller');
    assertFiniteVector(updated);
  });

  check('UP leaves vector unchanged', () => {
    const initial = createInitialUserVector(['thriller']);
    const updated = updateUserVector(
      initial,
      movie('comedy', 'comedy').vector,
      'up'
    );
    assert.deepEqual(updated, initial);
    assert.notEqual(updated, initial);
  });

  check('consumed movie is removed from candidates', () => {
    const pool = createCandidatePool([movie('A', 'thriller'), movie('B', 'comedy')]);
    pool.consume('A');
    assert.deepEqual(pool.getAvailable().map(({ id }) => id), ['B']);
  });

  check('remaining candidates are re-ranked after a swipe', () => {
    const pool = createCandidatePool([
      movie('A', 'thriller'),
      movie('B', 'comedy'),
      movie('C', 'drama'),
    ]);
    let vector = createInitialUserVector(['thriller']);
    const first = scoreCandidates(vector, pool.getAvailable())[0].movie;
    pool.consume(first.id);
    vector = updateUserVector(vector, first.vector, 'left');
    const next = scoreCandidates(vector, pool.getAvailable())[0].movie;
    assert.equal(first.id, 'A');
    assert.notEqual(next.id, first.id);
  });

  check('same movie cannot be selected twice', () => {
    const pool = createCandidatePool([movie('A', 'thriller'), movie('B', 'comedy')]);
    const first = scoreCandidates(createInitialUserVector(['thriller']), pool.getAvailable())[0].movie;
    pool.consume(first.id);
    const second = scoreCandidates(createInitialUserVector(['thriller']), pool.getAvailable())[0].movie;
    assert.notEqual(first.id, second.id);
  });

  check('empty candidate pool is safe', () => {
    const pool = createCandidatePool([]);
    assert.deepEqual(scoreCandidates(createInitialUserVector(['drama']), pool.getAvailable()), []);
    assert.equal(pool.isEmpty(), true);
  });

  check('loop vectors and scores remain finite', () => {
    const vector = updateUserVector(
      createInitialUserVector(['drama']),
      movie('finite', 'drama').vector,
      'right'
    );
    const ranked = scoreCandidates(vector, [movie('finite', 'drama')]);
    assertFiniteVector(vector);
    assert.equal(ranked.every(({ score }) => Number.isFinite(score)), true);
  });

  console.log(`\nRecommendation loop tests: ${passedTests}/${totalTests} passed.`);
  return passedTests === totalTests;
}

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('recommendationLoopDebug.js')) {
  runRecommendationLoopTests();
}

