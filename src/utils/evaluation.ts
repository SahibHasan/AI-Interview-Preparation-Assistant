/**
 * Pure evaluation and analytical utility functions for PrepPilot AI
 * Unit tested via node:test and node:assert/strict
 */

export interface CategoryScores {
  technicalCorrectness: number;
  communicationStructure: number;
  problemDecomposition: number;
  tradeoffAnalysis: number;
}

/**
 * Standard enterprise rubric weighting:
 * Technical Correctness (35%)
 * Tradeoff Analysis (25%)
 * Problem Decomposition (20%)
 * Communication & Structure (20%)
 */
export function calculateWeightedEvaluationScore(scores: CategoryScores): number {
  const weighted =
    scores.technicalCorrectness * 0.35 +
    scores.tradeoffAnalysis * 0.25 +
    scores.problemDecomposition * 0.20 +
    scores.communicationStructure * 0.20;

  return Math.round(Math.min(100, Math.max(0, weighted)));
}

/**
 * Derives ATS Match Score based on required skill coverage and experience alignment
 */
export function calculateATSScore(
  matchedSkillsCount: number,
  totalRequiredSkills: number,
  candidateYears: number,
  targetMinYears: number
): number {
  if (totalRequiredSkills <= 0) return 0;
  
  const skillRatio = Math.min(1, matchedSkillsCount / totalRequiredSkills);
  const expRatio = targetMinYears > 0 ? Math.min(1.2, candidateYears / targetMinYears) : 1;
  
  // 75% skill coverage, 25% experience seniority
  const rawScore = (skillRatio * 75) + (Math.min(1, expRatio) * 25);
  return Math.round(Math.min(100, Math.max(0, rawScore)));
}

/**
 * Categorizes readiness tier into executive badge states
 */
export function deriveReadinessRating(score: number): {
  tier: string;
  badgeClass: string;
  isOfferProbable: boolean;
} {
  if (score >= 85) {
    return {
      tier: 'Exceptional • Strong Pass',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      isOfferProbable: true,
    };
  }
  if (score >= 75) {
    return {
      tier: 'Competitive • Qualified',
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      isOfferProbable: true,
    };
  }
  if (score >= 60) {
    return {
      tier: 'Borderline • Review Needed',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      isOfferProbable: false,
    };
  }
  return {
    tier: 'Critical Gap • Needs Preparation',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    isOfferProbable: false,
  };
}

/**
 * Calculates words in candidate transcript/answer
 */
export function calculateWordCount(text: string): number {
  if (!text || text.trim() === '') return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Safe progress percentage
 */
export function calculateProgressPercentage(completed: number, total: number): number {
  if (total <= 0) return 0;
  const pct = (completed / total) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}
