import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { EnclaveDatabase } from './enclaveDb';
import { buildRoleInterviewSectionsAndRules } from './resumeParser';
import {
  buildDeterministicInterviewPlan,
  buildDeterministicTurnResponse,
} from './aiInterviewer';

test('EnclaveDatabase enforces strict email sign-in, password reset, and rejects empty OAuth email', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'preppilot-auth-'));
  const dbPath = path.join(tmpDir, 'enclave.json');

  try {
    const db = new EnclaveDatabase(dbPath);

    // 1. Unknown email must NOT auto-register or log in
    const unknownLogin = db.authenticateEmailUser({
      email: 'unknown.person@gmail.com',
      password: 'Password123!',
    });
    assert.equal(unknownLogin.ok, false);
    if (!unknownLogin.ok) {
      assert.equal(unknownLogin.status, 401);
      assert.match(unknownLogin.error, /no account found/i);
    }

    // 2. Register real user
    const reg = db.registerEmailUser({
      email: 'Priya.Sharma@gmail.com',
      password: 'InitialPass99!',
      name: 'Priya Sharma',
      targetRole: 'Backend Systems Engineer',
      targetCompany: 'Google',
    });
    assert.equal(reg.ok, true);
    if (!reg.ok) return;

    // 3. Wrong password rejected
    const badPw = db.authenticateEmailUser({
      email: 'priya.sharma@gmail.com',
      password: 'WrongPassword!',
    });
    assert.equal(badPw.ok, false);

    // 4. Reset password updates stored hash
    const resetRes = db.resetPassword({
      email: 'priya.sharma@gmail.com',
      newPassword: 'UpdatedPass2026!',
    });
    assert.equal(resetRes.ok, true);

    const oldPwLogin = db.authenticateEmailUser({
      email: 'priya.sharma@gmail.com',
      password: 'InitialPass99!',
    });
    assert.equal(oldPwLogin.ok, false);

    const newPwLogin = db.authenticateEmailUser({
      email: 'priya.sharma@gmail.com',
      password: 'UpdatedPass2026!',
    });
    assert.equal(newPwLogin.ok, true);

    // 5. Empty OAuth email throws (zero google.candidate@example.com fallback)
    assert.throws(() => {
      db.authenticateOAuthUser({ provider: 'google', email: '' });
    }, /provide your google email/i);

    // 6. GitHub handle fallback constructs noreply email cleanly
    const ghUser = db.authenticateOAuthUser({
      provider: 'github',
      email: 'octocat-dev',
      name: 'Octo Dev',
    });
    assert.equal(ghUser.email, 'octocat-dev@users.noreply.github.com');
    assert.equal(ghUser.targetRole, 'Software Developer');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('buildRoleInterviewSectionsAndRules respects interviewType and chosen role accurately', () => {
  const behavioral = buildRoleInterviewSectionsAndRules({
    targetRole: 'Software Developer',
    targetCompany: 'Stripe',
    interviewType: 'behavioral',
    difficulty: 'mid',
    questionCount: 4,
    matchedSkills: ['React', 'PostgreSQL'],
    missingSkills: ['Kubernetes'],
  });
  assert.equal(behavioral.sections.length, 4);
  assert.ok(
    behavioral.sections.every((s) =>
      /ownership|leadership|conflict|delivery|communication|execution|post-mortem|ambiguity|prioritization|impact/i.test(
        s.sectionName + ' ' + s.topicsCovered.join(' ')
      )
    ),
    'Behavioral sections should stay leadership/STAR-focused, not DSA/SQL coding drills'
  );

  const hrRound = buildRoleInterviewSectionsAndRules({
    targetRole: 'Backend Systems Engineer',
    targetCompany: 'Google',
    interviewType: 'hr-cultural',
    difficulty: 'mid',
    questionCount: 3,
  });
  assert.equal(hrRound.sections.length, 3);
  assert.match(hrRound.sections[0].sectionName, /Motivation|Alignment|Values/i);

  const devops = buildRoleInterviewSectionsAndRules({
    targetRole: 'DevOps / Cloud Engineer',
    targetCompany: 'Amazon',
    interviewType: 'technical',
    difficulty: 'senior-staff',
    questionCount: 4,
  });
  assert.equal(devops.sections.length, 4);
  assert.ok(
    devops.sections.some((s) => /kubernetes|ci\/cd|terraform|observability|cloud/i.test(s.sectionName + ' ' + s.topicsCovered.join(' ')))
  );

  const pmRound = buildRoleInterviewSectionsAndRules({
    targetRole: 'Product Manager',
    targetCompany: 'Meta',
    interviewType: 'technical',
    difficulty: 'mid',
    questionCount: 4,
  });
  assert.ok(
    pmRound.sections.some((s) => /product|metrics|roadmap|execution/i.test(s.sectionName))
  );
});

test('buildDeterministicInterviewPlan & buildDeterministicTurnResponse align with interviewType and role', () => {
  const behavioralPlan = buildDeterministicInterviewPlan({
    candidateName: 'Rohan Mehta',
    targetRole: 'Backend Systems Engineer',
    targetCompany: 'Microsoft',
    interviewType: 'behavioral',
    difficulty: 'senior-staff',
    questionCount: 4,
    aiPersona: 'Marcus Reed',
  });

  assert.equal(behavioralPlan.topicOrder.length, 4);
  assert.equal(behavioralPlan.questions.length, 4);
  assert.match(behavioralPlan.greetingOverview, /Behavioral & Leadership/i);
  assert.match(behavioralPlan.greetingOverview, /Backend Systems Engineer/);
  assert.match(behavioralPlan.greetingOverview, /Microsoft/);
  assert.match(behavioralPlan.greetingOverview, /calibrated this session for your Backend Systems Engineer track/i);
  assert.doesNotMatch(behavioralPlan.greetingOverview, /CloudPay|Alex Morgan/i);
  assert.doesNotMatch(behavioralPlan.questions[0].questionText, /CloudPay|Alex Morgan/i);

  const behavioralFollowUp = buildDeterministicTurnResponse({
    candidateName: 'Rohan Mehta',
    targetRole: 'Backend Systems Engineer',
    targetCompany: 'Microsoft',
    interviewType: 'behavioral',
    aiPersona: 'Marcus Reed',
    currentTopic: behavioralPlan.topicOrder[0],
    currentQuestion: behavioralPlan.questions[0],
    candidateSpokenText: 'We disagreed on the rollout timeline so I aligned both teams around shared SLA milestones.',
    followUpCountForTopic: 0,
    nextTopic: behavioralPlan.topicOrder[1],
    nextQuestion: behavioralPlan.questions[1],
  });

  assert.equal(behavioralFollowUp.action, 'follow_up');
  assert.match(
    behavioralFollowUp.spokenResponse,
    /metric|outcome|stakeholder|lesson|alignment|decision|personally own|final result/i,
    'Behavioral follow-up should ask STAR/stakeholder reflection questions rather than cache/partition tech drills'
  );
});
