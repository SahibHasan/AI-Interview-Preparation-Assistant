/**
 * PrepPilot AI - Core TypeScript Definitions
 * Aligned with Executive Precision design system and full candidate interview lifecycle
 */

export type InterviewType = 
  | 'technical' 
  | 'behavioral' 
  | 'system-design' 
  | 'hr-cultural';

export type ExperienceLevel = 
  | 'entry' 
  | 'mid' 
  | 'senior-staff' 
  | 'principal';

export type SessionStatus = 
  | 'draft' 
  | 'in-progress' 
  | 'completed' 
  | 'abandoned';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  authProvider?: 'email' | 'google' | 'github';
  targetRole: string;
  targetCompany: string;
  experienceLevel: ExperienceLevel;
  readinessScore: number;
  streakDays: number;
}

export interface CandidateProfile {
  id: string;
  userId: string;
  email?: string;
  avatarUrl?: string;
  authProvider?: 'email' | 'google' | 'github';
  fullName: string;
  headline: string;
  location: string;
  yearsOfExperience: number;
  education: {
    degree: string;
    institution: string;
    graduationYear: number;
  };
  skills: string[];
  extractedExperiences: {
    role: string;
    company: string;
    period: string;
    bulletPoints: string[];
  }[];
  preferences: {
    aiInterviewerPersona: 'Dr. Elena Vance' | 'Sarah' | 'Marcus Reed' | 'David Chen';
    interviewerStyle: 'collaborative' | 'challenging' | 'bar-raiser';
    speechTranscriptionEnabled: boolean;
    voiceFeedbackEnabled: boolean;
    cameraEnabled: boolean;
  };
}

export interface JobDescription {
  id: string;
  title: string;
  company: string;
  rawText: string;
  extractedRequirements: {
    mustHaveSkills: string[];
    niceToHaveSkills: string[];
    responsibilities: string[];
    coreCompetencies: string[];
  };
}

export interface ResumeAnalysis {
  id: string;
  fileName: string;
  fileSizeKb: number;
  uploadedAt: string;
  atsScore: number;
  parsedProfile: Partial<CandidateProfile>;
  matchAnalysis: {
    overallMatchPercentage: number;
    matchedSkills: { skill: string; category: string; matchStrength: number }[];
    missingSkills: { skill: string; category: string; importance: 'critical' | 'moderate' | 'nice-to-have' }[];
    inferredStrengths: string[];
    suggestedFocusAreas: string[];
  };
}

export interface InterviewQuestion {
  id: string;
  order: number;
  category: string;
  difficulty: 'L4' | 'L5' | 'L6' | 'L7';
  questionText: string;
  contextOrConstraint?: string;
  sampleExpectedAnswer?: string;
  evaluationRubric: {
    criterion: string;
    weight: number; // 0 - 100
    description: string;
  }[];
}

export interface CandidateAnswer {
  questionId: string;
  answerText: string;
  durationSeconds: number;
  wordCount: number;
  timestamp: string;
  adaptiveFollowUp?: {
    triggerReason: string;
    followUpQuestion: string;
    followUpAnswer?: string;
  };
}

export interface TranscriptTurnRecord {
  id: string;
  speaker: 'ai' | 'candidate';
  speakerName: string;
  kind: 'greeting' | 'question' | 'follow-up' | 'response' | 'summary';
  topicOrder?: number;
  topicTitle?: string;
  text: string;
  timestamp: string;
}

export interface QuestionFeedback {
  questionId: string;
  questionText?: string;
  category?: string;
  candidateResponse?: string;
  followUpQuestion?: string;
  followUpResponse?: string;
  score: number; // 0-100
  criterionScores: {
    criterion: string;
    score: number;
    feedback: string;
  }[];
  strengths: string[];
  missingConcepts: string[];
  suggestedImprovements: string[];
  modelExemplarAnswer: string;
}

export interface EvaluationBasis {
  evaluatedSpeaker: 'candidate-only';
  aiTurnsExcluded: number;
  candidateTurnsAnalyzed: number;
  topicsAnswered: number;
  totalTopics: number;
  totalCandidateWords: number;
  rubricWeights: {
    technicalCorrectness: number;
    tradeoffAnalysis: number;
    communicationStructure: number;
    problemDecomposition: number;
  };
  scoringMethodLabel: string;
}

export interface EvaluationReport {
  id: string;
  sessionId: string;
  completedAt: string;
  overallScore: number; // 0-100
  targetRole: string;
  targetCompany: string;
  calibratedBenchmark: string;
  durationFormatted: string;
  durationSeconds?: number;
  interviewerPersona?: string;
  percentileRank: number;
  source?: 'gemini' | 'calibrated-fallback';
  categoryScores: {
    technicalCorrectness: number;
    communicationStructure: number;
    problemDecomposition: number;
    tradeoffAnalysis: number;
  };
  overallSummary: string;
  questionFeedbacks: QuestionFeedback[];
  recommendedDrills: string[];
  conversationTranscript?: TranscriptTurnRecord[];
  evaluationBasis?: EvaluationBasis;
}

export interface LearningModule {
  id: string;
  title: string;
  domain: string;
  priority: 'critical' | 'high' | 'recommended';
  estimatedHours: number;
  completed: boolean;
  keyTopics: string[];
  reason: string;
}

export interface LearningPlan {
  id: string;
  userId: string;
  targetRole: string;
  targetCompany: string;
  targetDate: string;
  completionPercentage: number;
  totalModules: number;
  completedModules: number;
  modules: LearningModule[];
}

export interface SessionHistoryItem {
  id: string;
  date: string;
  title: string;
  track: string;
  company: string;
  interviewerName: string;
  score: number;
  duration: string;
  status: 'passed' | 'needs-review' | 'strong-pass';
  keyWeakness: string;
}
