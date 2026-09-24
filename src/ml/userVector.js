/**
 * src/ml/userVector.js
 *
 * Phase 2.2B — Creating the initial session user preference vector
 * from the user's selected moods/preferences.
 *
 * Uses the canonical 20-dimensional feature ordering defined in vectorize.js.
 * No external ML libraries used. All logic is client-side.
 */

import { FEATURE_ORDER } from './vectorize.js';

/**
 * Mapping from application selection IDs (moodOptions & genreOptions in moods.js)
 * to canonical FEATURE_ORDER keys.
 */
export const SELECTION_TO_FEATURE_MAP = {
  // Genres
  action: 'action',
  comedy: 'comedy',
  crime: 'crime',
  drama: 'drama',
  fantasy: 'fantasy',
  horror: 'horror',
  mystery: 'mystery',
  romance: 'romance',
  'sci-fi': 'sciFi',
  scifi: 'sciFi',
  sciFi: 'sciFi',
  thriller: 'thriller',
  music: 'music',

  // Moods / Themes
  melancholic: 'melancholic',
  nostalgic: 'nostalgic',
  romantic: 'romantic',
  'feel-good': 'feelGood',
  feelgood: 'feelGood',
  feelGood: 'feelGood',
  thoughtful: 'thoughtProvoking',
  'thought-provoking': 'thoughtProvoking',
  thoughtprovoking: 'thoughtProvoking',
  thoughtProvoking: 'thoughtProvoking',
  intense: 'intense',
  dark: 'dark',
  relaxing: 'relaxing',
  'coming-of-age': 'comingOfAge',
  comingofage: 'comingOfAge',
  comingOfAge: 'comingOfAge',
};

/**
 * Constructs an initial session user preference vector from selected option IDs.
 *
 * Requirements:
 * 1. Creates a 20-dimensional vector following FEATURE_ORDER exactly.
 * 2. Starts every dimension at 0.
 * 3. For every selected option, increases the corresponding feature by 1.0.
 * 4. Keeps all values capped between 0 and 1.
 * 5. Returns a plain JavaScript array of 20 numbers.
 *
 * @param {string[]} selectedMoods - Array of selected option IDs (e.g. ['thriller', 'mystery', 'dark'])
 * @returns {number[]} Plain JavaScript array of 20 numbers
 */
export function createInitialUserVector(selectedMoods) {
  const vector = new Array(FEATURE_ORDER.length).fill(0);

  if (!Array.isArray(selectedMoods)) {
    return vector;
  }

  for (const rawId of selectedMoods) {
    if (typeof rawId !== 'string') continue;
    const normalizedId = rawId.trim().toLowerCase();

    // Map the selection ID to canonical feature name
    const featureName =
      SELECTION_TO_FEATURE_MAP[normalizedId] ||
      (FEATURE_ORDER.includes(rawId) ? rawId : null);

    if (featureName) {
      const idx = FEATURE_ORDER.indexOf(featureName);
      if (idx !== -1) {
        // Genre & mood selections both receive weight = 1.0, capped at 1.0
        vector[idx] = Math.min(1, Math.max(0, vector[idx] + 1.0));
      }
    }
  }

  // Ensure every entry is a finite number in [0, 1]
  return vector.map((val) => (Number.isFinite(val) ? Math.min(1, Math.max(0, val)) : 0));
}

/**
 * Debug function to demonstrate vector creation for specified test cases.
 * Labels each feature index using FEATURE_ORDER.
 * Not displayed in the UI.
 *
 * @returns {Record<string, number[]>} Resulting vectors by case name
 */
export function debugUserVectorCases() {
  const testCases = [
    { name: 'Case 1', input: ['thriller', 'mystery', 'dark'] },
    { name: 'Case 2', input: ['music', 'melancholic', 'coming-of-age'] },
    { name: 'Case 3', input: ['horror'] },
  ];

  const results = {};

  testCases.forEach(({ name, input }) => {
    const vector = createInitialUserVector(input);
    results[name] = vector;

    if (typeof console !== 'undefined') {
      console.log(`\n--- ${name}: ${JSON.stringify(input)} ---`);
      console.log('Vector (20 dimensions):', JSON.stringify(vector));
      FEATURE_ORDER.forEach((feature, idx) => {
        const marker = vector[idx] > 0 ? ' <- ACTIVE' : '';
        console.log(`  [${String(idx).padStart(2, ' ')}] ${feature.padEnd(18, ' ')} : ${vector[idx]}${marker}`);
      });
    }
  });

  return results;
}
