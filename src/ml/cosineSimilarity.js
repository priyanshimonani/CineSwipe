/**
 * src/ml/cosineSimilarity.js
 *
 * Phase 2.2D — Cosine Similarity
 *
 * Measures the alignment between two feature vectors in the canonical
 * 20-dimensional feature space:
 *
 *   similarity(A, B) = (A · B) / (||A|| × ||B||)
 *
 * Returns a value in [0, 1] for non-negative vectors.
 * Returns 0 if either vector is a zero vector.
 * Client-side only. Non-mutating. No external libraries.
 */

import { FEATURE_ORDER } from './vectorize.js';

const DIMENSIONS = FEATURE_ORDER.length; // 20

/**
 * Calculates cosine similarity between two feature vectors in the 20-dimensional space.
 *
 * @param {number[]} vectorA - First vector
 * @param {number[]} vectorB - Second vector
 * @returns {number} Cosine similarity score in [0, 1]
 */
export function cosineSimilarity(vectorA, vectorB) {
  const isA = Array.isArray(vectorA);
  const isB = Array.isArray(vectorB);

  let dotProduct = 0;
  let sumSqA = 0;
  let sumSqB = 0;

  for (let i = 0; i < DIMENSIONS; i++) {
    const rawA = isA ? vectorA[i] : 0;
    const rawB = isB ? vectorB[i] : 0;

    // Sanitize non-numeric, NaN, Infinity, null, undefined
    const valA =
      typeof rawA === 'number' && Number.isFinite(rawA) && !Number.isNaN(rawA)
        ? rawA
        : 0;

    const valB =
      typeof rawB === 'number' && Number.isFinite(rawB) && !Number.isNaN(rawB)
        ? rawB
        : 0;

    dotProduct += valA * valB;
    sumSqA += valA * valA;
    sumSqB += valB * valB;
  }

  // Handle zero vectors safely (avoid division by zero)
  if (sumSqA <= 0 || sumSqB <= 0) {
    return 0;
  }

  const magnitudeA = Math.sqrt(sumSqA);
  const magnitudeB = Math.sqrt(sumSqB);
  const denominator = magnitudeA * magnitudeB;

  if (denominator <= 0 || !Number.isFinite(denominator)) {
    return 0;
  }

  const similarity = dotProduct / denominator;

  if (!Number.isFinite(similarity) || Number.isNaN(similarity)) {
    return 0;
  }

  // Clamp to [0, 1] to guard against floating-point inaccuracies
  return Math.min(1, Math.max(0, similarity));
}
