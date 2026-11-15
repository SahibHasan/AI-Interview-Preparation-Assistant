import test from 'node:test';
import assert from 'node:assert/strict';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph } from 'docx';
import {
  extractTextFromUploadedFile,
  analyzeResumeAndJobDescription,
  buildRoleInterviewSectionsAndRules,
} from './resumeParser';
import { buildDeterministicInterviewPlan } from './aiInterviewer';

const SAMPLE_SOFTWARE_DEV_RESUME = `Priya Sharma
Bengaluru, India
Senior Software Developer | Java, Python, SQL, DSA & Microservices

Professional Summary
Backend-leaning Software Developer with 5+ years building distributed payment APIs, relational data pipelines, and object-oriented microservices serving 2M+ daily active users.

Work Experience
Senior Software Developer | RazorFin Systems | 2022 - Present
- Architected idempotent checkout ledger APIs in Java Spring Boot and PostgreSQL handling 18,000 requests/sec at P99 < 85ms.
- Optimized SQL queries with composite B-Tree indexes reducing database CPU load by 48%.
- Implemented Redis distributed caching and Kafka dead-letter queues for resilient retries.

Software Engineer | CloudScale Tech | 2020 - 2022
- Built object-oriented rule engine applying SOLID design patterns and clean unit testing (94% coverage).
- Designed Python ETL services and normalized MySQL schemas for billing reconciliation.

Education
B.Tech in Computer Science & Engineering | NIT Surathkal | 2020

Technical Skills
Java, Python, TypeScript, SQL, PostgreSQL, MySQL, Data Structures & Algorithms (DSA), OOPs, SOLID Principles, Spring Boot, Redis, Kafka, Docker, System Design, Git`;

const SAMPLE_SOFTWARE_DEV_JD = `Role: Software Engineer II / Senior Software Developer
About the Role:
We are looking for a Software Developer with strong fundamentals in Data Structures & Algorithms (DSA), Object-Oriented Programming (OOPs), SQL / PostgreSQL query optimization, System Design, Redis caching, and CI/CD automated testing.`;

test('extractTextFromUploadedFile parses real generated PDF buffers via unpdf', async () => {
  const doc = new jsPDF();
  const lines = SAMPLE_SOFTWARE_DEV_RESUME.split('\n');
  let y = 15;
  for (const line of lines) {
    doc.text(line.slice(0, 90), 12, y);
    y += 7;
  }
  const pdfArrayBuffer = doc.output('arraybuffer');
  const pdfBase64 = Buffer.from(pdfArrayBuffer).toString('base64');

  const extracted = await extractTextFromUploadedFile({
    fileName: 'Priya_Sharma_Resume.pdf',
    fileBase64: pdfBase64,
    mimeType: 'application/pdf',
  });

  assert.equal(extracted.fileName, 'Priya_Sharma_Resume.pdf');
  assert.ok(extracted.fileSizeKb >= 1);
  assert.equal(extracted.extractionMethod, 'pdf');
  assert.ok(extracted.rawText.includes('Priya Sharma'));
  assert.ok(extracted.rawText.includes('PostgreSQL'));
});

test('extractTextFromUploadedFile parses real generated DOCX buffers via mammoth', async () => {
  const docx = new Document({
    sections: [
      {
        children: SAMPLE_SOFTWARE_DEV_RESUME.split('\n').map((line) => new Paragraph(line)),
      },
    ],
  });
  const docxBuffer = await Packer.toBuffer(docx);

  const extracted = await extractTextFromUploadedFile({
    fileName: 'Priya_Sharma_CV.docx',
    fileBase64: docxBuffer.toString('base64'),
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  assert.equal(extracted.extractionMethod, 'docx');
  assert.ok(extracted.rawText.includes('RazorFin Systems'));
  assert.ok(extracted.rawText.includes('Data Structures & Algorithms'));
});

test('analyzeResumeAndJobDescription computes real ATS score & discriminates strong vs sparse resumes', async () => {
  const strong = await analyzeResumeAndJobDescription({
    fileName: 'priya.txt',
    rawText: SAMPLE_SOFTWARE_DEV_RESUME,
    jobDescriptionText: SAMPLE_SOFTWARE_DEV_JD,
    targetRole: 'Software Developer',
    targetCompany: 'Razorpay',
    interviewType: 'technical',
    difficulty: 'senior-staff',
    questionCount: 5,
  });

  const sparse = await analyzeResumeAndJobDescription({
    fileName: 'sparse.txt',
    rawText: 'John Doe\nLooking for work in marketing and sales spreadsheets.',
    jobDescriptionText: SAMPLE_SOFTWARE_DEV_JD,
    targetRole: 'Software Developer',
    targetCompany: 'Razorpay',
    interviewType: 'technical',
    difficulty: 'entry',
    questionCount: 5,
  });

  assert.ok(strong.atsScore >= 75, `Expected strong resume ATS >= 75, got ${strong.atsScore}`);
  assert.ok(sparse.atsScore <= 45, `Expected sparse resume ATS <= 45, got ${sparse.atsScore}`);
  assert.ok(strong.atsScore > sparse.atsScore + 30);

  assert.equal(strong.parsedProfile.fullName, 'Priya Sharma');
  assert.ok(strong.parsedProfile.skills?.includes('SQL'));
  assert.ok(strong.parsedProfile.skills?.includes('PostgreSQL'));
  assert.ok((strong.keywordAnalysis?.length || 0) >= 5);
  assert.ok(strong.atsBreakdown && strong.atsBreakdown.keywordAlignment > sparse.atsBreakdown!.keywordAlignment);
});

test('buildRoleInterviewSectionsAndRules divides Software Developer interviews into Resume, DSA, OOPs, SQL, and System Design with rules', () => {
  const { sections, assessmentRules } = buildRoleInterviewSectionsAndRules({
    targetRole: 'Software Developer',
    targetCompany: 'Google',
    interviewType: 'technical',
    difficulty: 'mid',
    questionCount: 5,
    resumeSkills: ['Java', 'SQL', 'DSA', 'OOPs'],
    jobDescriptionText: SAMPLE_SOFTWARE_DEV_JD,
  });

  assert.equal(sections.length, 5);
  const names = sections.map((s) => s.sectionName.toLowerCase());
  assert.ok(names.some((n) => n.includes('resume')));
  assert.ok(names.some((n) => n.includes('dsa')));
  assert.ok(names.some((n) => n.includes('oop')));
  assert.ok(names.some((n) => n.includes('sql')));
  assert.ok(names.some((n) => n.includes('system')));

  const totalWeight = sections.reduce((sum, s) => sum + s.weightPercentage, 0);
  assert.equal(totalWeight, 100);
  assert.equal(assessmentRules.length, 4);
  assert.equal(
    assessmentRules.reduce((sum, r) => sum + r.weightPercentage, 0),
    100
  );
});

test('buildDeterministicInterviewPlan maps section questions for DSA, OOPs, SQL, and uploaded resume details', () => {
  const plan = buildDeterministicInterviewPlan({
    candidateName: 'Priya Sharma',
    targetRole: 'Software Developer',
    targetCompany: 'Razorpay',
    interviewType: 'technical',
    difficulty: 'senior-staff',
    questionCount: 5,
    aiPersona: 'Sarah',
    resumeSummary: {
      headline: 'Senior Software Developer',
      skills: ['Java', 'SQL', 'DSA', 'OOPs'],
      experiences: [
        {
          role: 'Senior Software Developer',
          company: 'RazorFin Systems',
          bulletPoints: ['Architected idempotent checkout ledger APIs in Java Spring Boot'],
        },
      ],
      rawText: SAMPLE_SOFTWARE_DEV_RESUME,
    },
    jobDescriptionText: SAMPLE_SOFTWARE_DEV_JD,
  });

  assert.equal(plan.topicOrder.length, 5);
  assert.equal(plan.questions.length, 5);
  assert.ok(plan.greetingOverview.includes('Priya'));
  assert.ok(plan.greetingOverview.includes('RazorFin Systems'));
  assert.ok(plan.questions.some((q) => /dsa|data structures|complexity/i.test(q.questionText)));
  assert.ok(plan.questions.some((q) => /oop|solid|object-oriented/i.test(q.questionText)));
  assert.ok(plan.questions.some((q) => /sql|b-tree|acid/i.test(q.questionText)));
  assert.ok((plan.assessmentRules?.length || 0) === 4);
});
