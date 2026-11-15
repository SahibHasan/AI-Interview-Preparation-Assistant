import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateWeightedEvaluationScore,
  calculateATSScore,
  deriveReadinessRating,
  calculateWordCount,
  calculateProgressPercentage,
} from './evaluation';

test('calculateWeightedEvaluationScore calculates weighted score correctly', () => {
  const scores = {
    technicalCorrectness: 90, // * 0.35 = 31.5
    tradeoffAnalysis: 80,     // * 0.25 = 20.0
    problemDecomposition: 85, // * 0.20 = 17.0
    communicationStructure: 85 // * 0.20 = 17.0
  };
  // Total = 31.5 + 20.0 + 17.0 + 17.0 = 85.5 -> 86
  const result = calculateWeightedEvaluationScore(scores);
  assert.equal(result, 86);
});

test('calculateATSScore calculates match properly', () => {
  // 8 out of 10 skills = 80% * 75 = 60
  // 5 out of 5 years = 100% * 25 = 25
  // Total = 85
  const score = calculateATSScore(8, 10, 5, 5);
  assert.equal(score, 85);
});

test('deriveReadinessRating yields expected tiering and offer probability', () => {
  const high = deriveReadinessRating(89);
  assert.equal(high.isOfferProbable, true);
  assert.match(high.tier, /Exceptional/);

  const borderline = deriveReadinessRating(68);
  assert.equal(borderline.isOfferProbable, false);
  assert.match(borderline.tier, /Borderline/);
});

test('calculateWordCount handles empty and multi-space answers', () => {
  assert.equal(calculateWordCount(''), 0);
  assert.equal(calculateWordCount('   '), 0);
  assert.equal(calculateWordCount('We use Raft consensus protocol across three nodes.'), 8);
});

test('calculateProgressPercentage clamps bounds', () => {
  assert.equal(calculateProgressPercentage(2, 5), 40);
  assert.equal(calculateProgressPercentage(0, 10), 0);
  assert.equal(calculateProgressPercentage(12, 10), 100);
});
