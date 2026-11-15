import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeterministicInterviewPlan,
  buildDeterministicTurnResponse,
  buildDeterministicEvaluationFromTranscript,
  resolveVoiceConfig,
  isQuotaOrRateLimitError,
  parseRetryDelayMs,
  isModelInCooldown,
  markModelCooldown,
  resetModelCooldowns,
} from './aiInterviewer';

test('buildDeterministicInterviewPlan reviews role, JD, and resume to produce ordered topics and greeting overview', () => {
  const plan = buildDeterministicInterviewPlan({
    candidateName: 'Maya Lin',
    targetRole: 'Staff Frontend Engineer',
    targetCompany: 'Stripe',
    interviewType: 'technical',
    difficulty: 'senior-staff',
    questionCount: 4,
    aiPersona: 'Sarah',
    resumeSummary: {
      headline: 'Distributed Frontend Architect',
      skills: ['TypeScript', 'React 19', 'Optimistic Caching'],
      experiences: [
        {
          role: 'Senior Frontend Engineer',
          company: 'CloudPay',
          bulletPoints: ['Reduced merchant checkout latency by 42% using idempotent request queues.'],
        },
      ],
      matchedSkills: ['TypeScript & React Architecture'],
      missingSkills: ['Global Idempotency Enclaves'],
    },
    jobDescriptionText: 'Looking for a Staff Frontend Engineer experienced in financial reliability and edge caching.',
  });

  assert.equal(plan.topicOrder.length, 4);
  assert.equal(plan.questions.length, 4);
  assert.deepEqual(
    plan.topicOrder.map((t) => t.order),
    [1, 2, 3, 4]
  );
  assert.match(plan.greetingOverview, /Maya/);
  assert.match(plan.greetingOverview, /Stripe/);
  assert.match(plan.greetingOverview, /Staff Frontend Engineer/);
  assert.match(plan.greetingOverview, /ready/i);
  assert.match(plan.questions[0].questionText, /CloudPay/);
});

test('buildDeterministicTurnResponse asks personalized follow-up on first verbal turn then advances to next topic', () => {
  const plan = buildDeterministicInterviewPlan({
    candidateName: 'Alex Morgan',
    targetRole: 'Senior Frontend Engineer',
    targetCompany: 'Stripe',
    interviewType: 'technical',
    difficulty: 'senior-staff',
    questionCount: 3,
    aiPersona: 'Sarah',
  });

  const followUpTurn = buildDeterministicTurnResponse({
    candidateName: 'Alex Morgan',
    targetRole: 'Senior Frontend Engineer',
    targetCompany: 'Stripe',
    aiPersona: 'Sarah',
    currentTopic: plan.topicOrder[0],
    currentQuestion: plan.questions[0],
    candidateSpokenText: 'We introduced a Redis cache and idempotency keys across payment retries so latency dropped.',
    followUpCountForTopic: 0,
    nextTopic: plan.topicOrder[1],
    nextQuestion: plan.questions[1],
  });

  assert.equal(followUpTurn.action, 'follow_up');
  assert.ok(followUpTurn.followUpQuestion && followUpTurn.followUpQuestion.length > 20);
  assert.match(followUpTurn.spokenResponse.toLowerCase(), /cache|idempotency|latency|partition/);

  const nextTurn = buildDeterministicTurnResponse({
    candidateName: 'Alex Morgan',
    targetRole: 'Senior Frontend Engineer',
    targetCompany: 'Stripe',
    aiPersona: 'Sarah',
    currentTopic: plan.topicOrder[0],
    currentQuestion: plan.questions[0],
    candidateSpokenText: 'We bound retries with jittered exponential backoff and fence stale tokens.',
    followUpCountForTopic: 1,
    nextTopic: plan.topicOrder[1],
    nextQuestion: plan.questions[1],
  });

  assert.equal(nextTurn.action, 'next_topic');
  assert.match(nextTurn.spokenResponse, new RegExp(plan.topicOrder[1].title.slice(0, 12)));
});

test('resolveVoiceConfig maps interviewer personas to realistic neural voice models cleanly', () => {
  assert.equal(resolveVoiceConfig('Sarah').voiceName, 'Kore');
  assert.equal(resolveVoiceConfig('Dr. Elena Vance').voiceName, 'Zephyr');
  assert.equal(resolveVoiceConfig('Marcus Reed').voiceName, 'Charon');
  assert.equal(resolveVoiceConfig('David Chen').voiceName, 'Puck');
  assert.equal(resolveVoiceConfig('Sarah', 'Fenrir').voiceName, 'Fenrir');
});

test('buildDeterministicEvaluationFromTranscript evaluates real spoken turns and preserves transcript evidence', () => {
  const plan = buildDeterministicInterviewPlan({
    candidateName: 'Priya Nair',
    targetRole: 'Principal Backend Engineer',
    targetCompany: 'Cloudflare',
    interviewType: 'system-design',
    difficulty: 'senior-staff',
    questionCount: 2,
    aiPersona: 'Marcus Reed',
  });

  const richReport = buildDeterministicEvaluationFromTranscript({
    candidateName: 'Priya Nair',
    targetRole: 'Principal Backend Engineer',
    targetCompany: 'Cloudflare',
    difficulty: 'senior-staff',
    interviewType: 'system-design',
    aiPersona: 'Marcus Reed',
    durationSeconds: 185,
    questions: plan.questions,
    answers: [],
    transcript: [
      {
        id: 't1',
        speaker: 'ai',
        speakerName: 'Marcus Reed',
        kind: 'question',
        topicOrder: 1,
        topicTitle: plan.topicOrder[0].title,
        text: plan.questions[0].questionText,
        timestamp: '10:00',
      },
      {
        id: 't2',
        speaker: 'candidate',
        speakerName: 'Priya Nair',
        kind: 'response',
        topicOrder: 1,
        topicTitle: plan.topicOrder[0].title,
        text: 'We route ingestion through a Kafka dead-letter queue and Redis idempotency cache with circuit breaker backoff and p99 latency monitoring so partition retries never duplicate writes.',
        timestamp: '10:01',
      },
      {
        id: 't3',
        speaker: 'ai',
        speakerName: 'Marcus Reed',
        kind: 'follow-up',
        topicOrder: 1,
        topicTitle: plan.topicOrder[0].title,
        text: 'How do you trigger a safe canary rollback when queue lag spikes?',
        timestamp: '10:02',
      },
      {
        id: 't4',
        speaker: 'candidate',
        speakerName: 'Priya Nair',
        kind: 'response',
        topicOrder: 1,
        topicTitle: plan.topicOrder[0].title,
        text: 'Automated canary rollback fires if p99 latency exceeds budget for 60 seconds and sheds non-critical traffic cleanly.',
        timestamp: '10:03',
      },
    ],
  });

  const emptyReport = buildDeterministicEvaluationFromTranscript({
    candidateName: 'Priya Nair',
    targetRole: 'Principal Backend Engineer',
    targetCompany: 'Cloudflare',
    difficulty: 'senior-staff',
    interviewType: 'system-design',
    aiPersona: 'Marcus Reed',
    durationSeconds: 20,
    questions: plan.questions,
    answers: [],
    transcript: [],
  });

  assert.ok(richReport.overallScore > emptyReport.overallScore);
  assert.match(richReport.questionFeedbacks[0].candidateResponse, /Kafka dead-letter queue/);
  assert.match(richReport.questionFeedbacks[0].followUpResponse || '', /Automated canary rollback/);
  assert.equal(richReport.durationFormatted, '3m 5s');
  assert.equal(richReport.evaluationBasis.evaluatedSpeaker, 'candidate-only');
  assert.equal(richReport.evaluationBasis.aiTurnsExcluded, 2);
  assert.equal(richReport.evaluationBasis.candidateTurnsAnalyzed, 2);
  assert.equal(richReport.evaluationBasis.topicsAnswered, 1);
  assert.equal(richReport.evaluationBasis.totalTopics, plan.questions.length);
  assert.ok(richReport.evaluationBasis.totalCandidateWords >= 30);
  assert.equal(emptyReport.evaluationBasis.candidateTurnsAnalyzed, 0);
  assert.equal(emptyReport.evaluationBasis.topicsAnswered, 0);
  assert.match(emptyReport.overallSummary, /before answering any interview questions/i);
  assert.match(emptyReport.overallSummary, /only candidate spoken responses are evaluated/i);
});

test('quota detection and model cooldown circuit breaker prevent repeated 429 retries', () => {
  resetModelCooldowns();
  const sample429 = new Error(
    '{"error":{"code":429,"status":"RESOURCE_EXHAUSTED","details":[{"retryDelay":"56193s"}]}}'
  );
  assert.equal(isQuotaOrRateLimitError(sample429), true);
  assert.equal(isQuotaOrRateLimitError(new Error('network timeout')), false);
  assert.equal(parseRetryDelayMs(sample429), 3600_000);

  assert.equal(isModelInCooldown('gemini-4-hydrogen'), false);
  markModelCooldown('gemini-4-hydrogen', sample429);
  assert.equal(isModelInCooldown('gemini-4-hydrogen'), true);
  resetModelCooldowns();
  assert.equal(isModelInCooldown('gemini-4-hydrogen'), false);
});
