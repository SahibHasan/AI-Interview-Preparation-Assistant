import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  calculateWeightedEvaluationScore, 
  calculateATSScore, 
  deriveReadinessRating, 
  calculateWordCount, 
  calculateProgressPercentage 
} from './evaluation';

test('calculateATSScore boundary conditions', () => {
  assert.equal(calculateATSScore(0, 0, 0, 0), 0);
  assert.equal(calculateATSScore(10, 10, 5, 5), 100);
  assert.equal(calculateATSScore(5, 10, 2, 5), 48); // 37.5 + 10 = 47.5 -> 48
});

test('deriveReadinessRating boundary classification', () => {
  assert.equal(deriveReadinessRating(85).tier, 'Exceptional • Strong Pass');
  assert.equal(deriveReadinessRating(75).tier, 'Competitive • Qualified');
  assert.equal(deriveReadinessRating(60).tier, 'Borderline • Review Needed');
  assert.equal(deriveReadinessRating(59).tier, 'Critical Gap • Needs Preparation');
});

test('calculateWordCount handles newlines, tabs, and special spaces', () => {
  assert.equal(calculateWordCount('   '), 0);
  assert.equal(calculateWordCount('\n\t\r'), 0);
  assert.equal(calculateWordCount('Distributed\nsystems\tarchitecture'), 3);
  assert.equal(calculateWordCount('One   two    three    four'), 4);
});

test('calculateProgressPercentage clamps negative and over 100 values', () => {
  assert.equal(calculateProgressPercentage(0, 5), 0);
  assert.equal(calculateProgressPercentage(2, 5), 40);
  assert.equal(calculateProgressPercentage(5, 5), 100);
  assert.equal(calculateProgressPercentage(0, 0), 0);
});

test('calculateWeightedEvaluationScore verifies standard enterprise weighting', () => {
  const perfect = {
    technicalCorrectness: 100,
    tradeoffAnalysis: 100,
    problemDecomposition: 100,
    communicationStructure: 100,
  };
  assert.equal(calculateWeightedEvaluationScore(perfect), 100);

  const mixed = {
    technicalCorrectness: 90, // 31.5
    tradeoffAnalysis: 80,    // 20
    problemDecomposition: 70,// 14
    communicationStructure: 80,// 16
  };
  // 31.5 + 20 + 14 + 16 = 81.5 -> 82
  assert.equal(calculateWeightedEvaluationScore(mixed), 82);
});
