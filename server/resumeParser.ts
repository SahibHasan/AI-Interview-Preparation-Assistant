import mammoth from 'mammoth';
import { extractText } from 'unpdf';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  AssessmentRule,
  AtsBreakdown,
  CandidateProfile,
  InterviewSectionPlan,
  KeywordMetric,
  LevelingFitItem,
  ResumeAnalysis,
} from '../src/types';

export interface ExtractResumeFileInput {
  fileName?: string;
  fileBase64?: string;
  rawText?: string;
  mimeType?: string;
}

export interface ExtractedResumeDocument {
  fileName: string;
  fileSizeKb: number;
  rawText: string;
  wordCount: number;
  extractionMethod: 'txt' | 'docx' | 'pdf' | 'gemini-pdf' | 'pasted-text';
}

export interface AnalyzeResumeInput {
  fileName?: string;
  fileBase64?: string;
  rawText?: string;
  mimeType?: string;
  jobDescriptionText?: string;
  targetRole?: string;
  targetCompany?: string;
  interviewType?: string;
  difficulty?: string;
  questionCount?: number;
  candidateName?: string;
  customSkills?: string[];
}

interface SkillTaxonomyItem {
  label: string;
  category: string;
  aliases: string[];
  importance?: 'critical' | 'moderate' | 'nice-to-have';
}

const SKILL_TAXONOMY: SkillTaxonomyItem[] = [
  { label: 'TypeScript', category: 'Language', aliases: ['typescript', 'ts'] },
  { label: 'JavaScript', category: 'Language', aliases: ['javascript', 'es6', 'ecmascript'] },
  { label: 'Python', category: 'Language', aliases: ['python', 'py'] },
  { label: 'Java', category: 'Language', aliases: ['java', 'jvm', 'jdk'] },
  { label: 'C++', category: 'Language', aliases: ['c++', 'cpp'] },
  { label: 'Go', category: 'Language', aliases: ['golang', 'go language'] },
  { label: 'Rust', category: 'Language', aliases: ['rust'] },
  { label: 'SQL', category: 'Database & Querying', aliases: ['sql', 'structured query language'] },
  { label: 'PostgreSQL', category: 'Database & Querying', aliases: ['postgresql', 'postgres', 'psql'] },
  { label: 'MySQL', category: 'Database & Querying', aliases: ['mysql'] },
  { label: 'MongoDB', category: 'Database & Querying', aliases: ['mongodb', 'nosql'] },
  { label: 'Database Indexing & ACID', category: 'Database & Querying', aliases: ['indexing', 'acid', 'b-tree', 'joins', 'dbms', 'normalization', 'query optimization'] },
  { label: 'Data Structures & Algorithms (DSA)', category: 'DSA & Problem Solving', aliases: ['dsa', 'data structures', 'algorithms', 'dynamic programming', 'binary tree', 'graph', 'linked list', 'sorting', 'sliding window', 'leetcode'] },
  { label: 'Object-Oriented Programming (OOPs)', category: 'OOPs & Software Design', aliases: ['oops', 'oop', 'object-oriented', 'object oriented', 'solid principles', 'design patterns', 'encapsulation', 'polymorphism', 'inheritance'] },
  { label: 'React & Next.js', category: 'Frontend Framework', aliases: ['react', 'reactjs', 'react.js', 'next.js', 'nextjs'] },
  { label: 'Node.js & Express', category: 'Backend Runtime', aliases: ['node.js', 'nodejs', 'express', 'expressjs', 'nestjs'] },
  { label: 'Spring Boot', category: 'Backend Framework', aliases: ['spring boot', 'spring', 'hibernate'] },
  { label: 'Django & FastAPI', category: 'Backend Framework', aliases: ['django', 'fastapi', 'flask'] },
  { label: 'System Design', category: 'Architecture', aliases: ['system design', 'distributed systems', 'microservices', 'scalability', 'high availability'] },
  { label: 'REST APIs & GraphQL', category: 'API Design', aliases: ['rest', 'restful', 'graphql', 'grpc', 'api design'] },
  { label: 'Redis & Distributed Caching', category: 'Caching & Performance', aliases: ['redis', 'caching', 'cache', 'memcached', 'cdn'] },
  { label: 'Message Queues & Kafka', category: 'Streaming & Async', aliases: ['kafka', 'rabbitmq', 'sqs', 'message queue', 'event-driven', 'pub/sub'] },
  { label: 'Docker & Kubernetes', category: 'Cloud & DevOps', aliases: ['docker', 'kubernetes', 'k8s', 'containers'] },
  { label: 'AWS / Cloud Infrastructure', category: 'Cloud & DevOps', aliases: ['aws', 'gcp', 'azure', 'cloud', 'ec2', 's3', 'lambda'] },
  { label: 'CI/CD & Automated Testing', category: 'Quality Engineering', aliases: ['ci/cd', 'github actions', 'jest', 'playwright', 'unit testing', 'e2e', 'integration testing', 'tdd'] },
  { label: 'Web Vitals & Performance Optimization', category: 'Performance', aliases: ['web vitals', 'core web vitals', 'latency', 'p99', 'p95', 'optimization'] },
  { label: 'WebSockets & Real-Time Sync', category: 'Real-Time Systems', aliases: ['websocket', 'websockets', 'real-time', 'sse', 'webrtc'] },
  { label: 'State Synchronization & Idempotency', category: 'Reliability', aliases: ['state synchronization', 'state management', 'redux', 'idempotency', 'idempotent', 'retry', 'optimistic'] },
  { label: 'Security & OAuth Authentication', category: 'Security', aliases: ['oauth', 'jwt', 'rbac', 'authentication', 'authorization', 'security', 'xss', 'csrf'] },
  { label: 'Git & Version Control', category: 'Engineering Tooling', aliases: ['git', 'github', 'gitlab'] },
  { label: 'Tailwind CSS & Design Systems', category: 'UI Craft', aliases: ['tailwind', 'css', 'design system', 'accessibility', 'wcag'] },
  { label: 'Observability & Telemetry', category: 'Reliability', aliases: ['observability', 'telemetry', 'monitoring', 'prometheus', 'grafana', 'datadog', 'logging'] },
  { label: 'Raft / Distributed Consensus', category: 'Distributed Systems', aliases: ['raft', 'consensus', 'paxos', 'partition', 'sharding', 'replication'] },
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countTermOccurrences(haystackLower: string, termLower: string): number {
  const cleanTerm = termLower.trim().toLowerCase();
  if (!cleanTerm || !haystackLower) return 0;
  // Use word-ish boundaries for alphanumeric terms, substring for terms with symbols like c++
  const hasSymbols = /[^a-z0-9\s-]/.test(cleanTerm);
  const pattern = hasSymbols
    ? new RegExp(escapeRegex(cleanTerm), 'gi')
    : new RegExp(`(?<![a-z0-9])${escapeRegex(cleanTerm)}(?![a-z0-9])`, 'gi');
  const matches = haystackLower.match(pattern);
  return matches ? matches.length : 0;
}

function normalizeExtractedText(raw: string): string {
  return (raw || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function extractPdfViaGemini(base64Data: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || !apiKey.trim()) return '';
  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
    const res = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'application/pdf', data: base64Data } },
              {
                text: 'Extract all readable text from this resume PDF accurately, preserving section headings, job roles, dates, skills, education, and bullet points as plain text.',
              },
            ],
          },
        ],
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Gemini PDF timeout')), 8000)),
    ]);
    return normalizeExtractedText(res.text || '');
  } catch {
    return '';
  }
}

export async function extractTextFromUploadedFile(
  input: ExtractResumeFileInput
): Promise<ExtractedResumeDocument> {
  const fallbackName = (input.fileName || 'candidate_resume.txt').trim();
  const ext = fallbackName.split('.').pop()?.toLowerCase() || '';

  if (input.fileBase64 && input.fileBase64.trim()) {
    const cleanedBase64 = input.fileBase64.includes(',')
      ? input.fileBase64.split(',').pop() || ''
      : input.fileBase64;
    const buffer = Buffer.from(cleanedBase64, 'base64');
    const fileSizeKb = Math.max(1, Math.round((buffer.length / 1024) * 10) / 10);

    if (ext === 'pdf' || input.mimeType === 'application/pdf') {
      let pdfText = '';
      try {
        const result = await extractText(new Uint8Array(buffer), { mergePages: true });
        pdfText = normalizeExtractedText(
          Array.isArray(result.text) ? result.text.join('\n') : String(result.text || '')
        );
      } catch {
        pdfText = '';
      }

      if (pdfText.length < 40) {
        const geminiPdfText = await extractPdfViaGemini(cleanedBase64);
        if (geminiPdfText.length > pdfText.length) {
          return {
            fileName: fallbackName,
            fileSizeKb,
            rawText: geminiPdfText,
            wordCount: geminiPdfText.split(/\s+/).filter(Boolean).length,
            extractionMethod: 'gemini-pdf',
          };
        }
      }

      if (!pdfText) {
        throw new Error(
          'Could not extract readable text from this PDF. Please upload a text-based PDF, DOCX, TXT, or paste your resume text.'
        );
      }

      return {
        fileName: fallbackName,
        fileSizeKb,
        rawText: pdfText,
        wordCount: pdfText.split(/\s+/).filter(Boolean).length,
        extractionMethod: 'pdf',
      };
    }

    if (
      ext === 'docx' ||
      input.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      const docxText = normalizeExtractedText(result.value || '');
      if (!docxText) {
        throw new Error('The uploaded DOCX file appears to be empty.');
      }
      return {
        fileName: fallbackName,
        fileSizeKb,
        rawText: docxText,
        wordCount: docxText.split(/\s+/).filter(Boolean).length,
        extractionMethod: 'docx',
      };
    }

    if (ext === 'doc') {
      // Legacy binary .doc fallback: extract printable ASCII/UTF-8 runs
      const legacyText = normalizeExtractedText(
        buffer
          .toString('latin1')
          .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
          .replace(/[ ]{3,}/g, '\n')
      );
      if (legacyText.split(/\s+/).filter(Boolean).length < 12) {
        throw new Error(
          'Legacy binary .doc files have limited text support. Please save as .docx, .pdf, or .txt, or paste your resume text.'
        );
      }
      return {
        fileName: fallbackName,
        fileSizeKb,
        rawText: legacyText,
        wordCount: legacyText.split(/\s+/).filter(Boolean).length,
        extractionMethod: 'txt',
      };
    }

    const plainText = normalizeExtractedText(buffer.toString('utf8'));
    if (!plainText) {
      throw new Error('The uploaded file contained no readable text.');
    }
    return {
      fileName: fallbackName,
      fileSizeKb,
      rawText: plainText,
      wordCount: plainText.split(/\s+/).filter(Boolean).length,
      extractionMethod: 'txt',
    };
  }

  const pasted = normalizeExtractedText(input.rawText || '');
  if (!pasted) {
    throw new Error('Please upload a resume file (.pdf, .docx, .txt) or paste your resume text.');
  }
  const sizeKb = Math.max(1, Math.round((Buffer.byteLength(pasted, 'utf8') / 1024) * 10) / 10);
  return {
    fileName: fallbackName || 'pasted_resume.txt',
    fileSizeKb: sizeKb,
    rawText: pasted,
    wordCount: pasted.split(/\s+/).filter(Boolean).length,
    extractionMethod: 'pasted-text',
  };
}

const SECTION_HEADER_PATTERNS: { key: 'experience' | 'education' | 'skills' | 'projects' | 'summary'; regex: RegExp }[] = [
  { key: 'experience', regex: /^(work\s+experience|professional\s+experience|experience|employment(\s+history)?|career\s+history)\b[:\s]*$/i },
  { key: 'projects', regex: /^(projects|key\s+projects|technical\s+projects|selected\s+projects)\b[:\s]*$/i },
  { key: 'education', regex: /^(education|academic\s+background|academics|qualifications)\b[:\s]*$/i },
  { key: 'skills', regex: /^(skills|technical\s+skills|core\s+competencies|technologies|tech\s+stack)\b[:\s]*$/i },
  { key: 'summary', regex: /^(summary|professional\s+summary|profile|about(\s+me)?|objective)\b[:\s]*$/i },
];

function detectSectionHeader(line: string): 'experience' | 'education' | 'skills' | 'projects' | 'summary' | null {
  const clean = line.replace(/^#+\s*/, '').trim();
  if (clean.length > 48) return null;
  for (const pat of SECTION_HEADER_PATTERNS) {
    if (pat.regex.test(clean)) return pat.key;
  }
  return null;
}

export function extractSkillsFromText(text: string, customSkills: string[] = []): string[] {
  const lower = (text || '').toLowerCase();
  const found = new Set<string>();

  for (const item of SKILL_TAXONOMY) {
    const matched = item.aliases.some((alias) => countTermOccurrences(lower, alias) > 0);
    if (matched) {
      found.add(item.label);
    }
  }

  // Parse explicit comma/pipe/bullet separated tokens under a Skills section
  const lines = (text || '').split('\n');
  let inSkillsSection = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (inSkillsSection) inSkillsSection = false;
      continue;
    }
    const header = detectSectionHeader(line);
    if (header) {
      inSkillsSection = header === 'skills';
      continue;
    }
    const inlineSkillLine = /^(?:skills|tech\s*stack|technologies|languages|databases|frameworks)\s*[:\-]\s*(.+)$/i.exec(line);
    const tokenLine = inSkillsSection ? line : inlineSkillLine?.[1] || '';
    if (tokenLine) {
      const tokens = tokenLine
        .replace(/^[•\-*]\s*/, '')
        .replace(/^(?:languages|frameworks|databases|tools|cloud|backend|frontend)\s*[:\-]\s*/i, '')
        .split(/[,|•·/]/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2 && t.length <= 36 && !/^\d+$/.test(t));

      for (const token of tokens) {
        const alreadyCovered = SKILL_TAXONOMY.some((item) =>
          item.aliases.some((a) => token.toLowerCase() === a || item.label.toLowerCase() === token.toLowerCase())
        );
        if (!alreadyCovered && !Array.from(found).some((f) => f.toLowerCase() === token.toLowerCase())) {
          found.add(token);
        }
      }
    }
  }

  for (const custom of customSkills) {
    const clean = (custom || '').trim();
    if (clean && !Array.from(found).some((f) => f.toLowerCase() === clean.toLowerCase())) {
      found.add(clean);
    }
  }

  return Array.from(found).slice(0, 24);
}

export function parseResumeTextStructure(
  rawText: string,
  fallbackName = 'Candidate'
): {
  fullName: string;
  headline: string;
  location: string;
  yearsOfExperience: number;
  education: { degree: string; institution: string; graduationYear: number };
  skills: string[];
  extractedExperiences: { role: string; company: string; period: string; bulletPoints: string[] }[];
} {
  const lines = normalizeExtractedText(rawText)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // 1. Candidate name & header inspection
  let fullName = fallbackName;
  for (const line of lines.slice(0, 5)) {
    const hasEmailOrPhone = /@|\+?\d{3}[-.\s)]?\d{3}|http|linkedin|github/i.test(line);
    const isHeaderWord = detectSectionHeader(line) !== null;
    if (!hasEmailOrPhone && !isHeaderWord && line.length >= 3 && line.length <= 45 && /^[A-Za-z.\s'-]+$/.test(line)) {
      fullName = line;
      break;
    }
  }

  // Location extraction
  let location = 'Remote / Open to Relocation';
  const locRegex = /\b([A-Z][a-zA-Z\s]{1,22},\s*(?:[A-Z]{2}|India|UK|Canada|Germany|Singapore|Remote|USA))\b/;
  for (const line of lines.slice(0, 10)) {
    const locMatch = locRegex.exec(line);
    if (locMatch) {
      location = locMatch[1].trim();
      break;
    }
    if (/\bremote\b/i.test(line) && line.length < 60) {
      location = 'Remote / Hybrid';
    }
  }

  // Segment lines by section
  const buckets: Record<'top' | 'experience' | 'education' | 'skills' | 'projects' | 'summary', string[]> = {
    top: [],
    experience: [],
    education: [],
    skills: [],
    projects: [],
    summary: [],
  };
  let currentBucket: keyof typeof buckets = 'top';
  for (const line of lines) {
    const header = detectSectionHeader(line);
    if (header) {
      currentBucket = header;
      continue;
    }
    buckets[currentBucket].push(line);
  }

  // Skills
  const skills = extractSkillsFromText(rawText);

  // Education
  const eduLines = buckets.education.length > 0 ? buckets.education : lines.filter((l) => /\b(b\.?s\.?|b\.?tech|b\.?e\.?|m\.?s\.?|m\.?tech|bachelor|master|university|college|institute|computer science|engineering)\b/i.test(l));
  let degree = 'B.S. in Computer Science';
  let institution = 'Verified University';
  let graduationYear = 2022;
  for (const el of eduLines) {
    const yearMatch = /\b(19\d{2}|20[0-3]\d)\b/.exec(el);
    if (yearMatch) graduationYear = Number(yearMatch[1]);
    if (/\b(b\.?s\.?|b\.?tech|b\.?e\.?|m\.?s\.?|m\.?tech|bachelor|master|ph\.?d|diploma)\b/i.test(el)) {
      degree = el.replace(/[|•·]\s*(19|20)\d{2}.*$/, '').trim().slice(0, 90);
    } else if (/\b(university|institute|college|school|academy)\b/i.test(el)) {
      institution = el.replace(/[|•·]\s*(19|20)\d{2}.*$/, '').trim().slice(0, 90);
    }
  }
  if (institution === 'Verified University' && eduLines.length > 0) {
    const parts = eduLines[0].split(/[|•·\-–—]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      degree = parts[0].slice(0, 80);
      institution = parts[1].replace(/\b(19|20)\d{2}\b/, '').trim().slice(0, 80) || institution;
    }
  }

  // Experience & Projects extraction
  const expSource = buckets.experience.length > 0 ? buckets.experience : buckets.projects;
  const extractedExperiences: { role: string; company: string; period: string; bulletPoints: string[] }[] = [];
  const dateRangeRegex = /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)?\.?\s*(?:19|20)\d{2}\s*(?:[-–—to]+\s*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)?\.?\s*(?:19|20)\d{2}|present|current|now))?)/i;

  let currentExp: { role: string; company: string; period: string; bulletPoints: string[] } | null = null;
  for (const line of expSource) {
    const isBullet = /^[•\-*▪▸]\s+/.test(line);
    const cleaned = line.replace(/^[•\-*▪▸]\s*/, '').trim();
    if (!cleaned) continue;

    const dateMatch = dateRangeRegex.exec(cleaned);
    const looksLikeRoleHeader =
      !isBullet &&
      cleaned.length <= 110 &&
      (dateMatch !== null ||
        /\s[@|–—-]\s/.test(cleaned) ||
        /\b(engineer|developer|architect|lead|intern|manager|analyst|scientist|consultant|project)\b/i.test(cleaned));

    if (looksLikeRoleHeader && (!currentExp || currentExp.bulletPoints.length > 0 || dateMatch !== null)) {
      if (currentExp) {
        extractedExperiences.push(currentExp);
      }
      const period = dateMatch ? dateMatch[1].trim() : 'Verified';
      const withoutPeriod = dateMatch ? cleaned.replace(dateMatch[0], '').replace(/[|•()]+$/g, '').trim() : cleaned;
      const splitRoleComp = withoutPeriod.split(/\s+(?:at|@)\s+|\s*[|–—]\s*|\s+-\s+/).map((s) => s.trim()).filter(Boolean);
      currentExp = {
        role: (splitRoleComp[0] || withoutPeriod || 'Software Engineer').slice(0, 80),
        company: (splitRoleComp[1] || (buckets.experience.length === 0 ? 'Key Technical Project' : 'Engineering Organization')).slice(0, 80),
        period,
        bulletPoints: [],
      };
    } else if (currentExp) {
      if (currentExp.bulletPoints.length < 5) {
        currentExp.bulletPoints.push(cleaned);
      }
    } else {
      currentExp = {
        role: 'Software Engineering Experience',
        company: 'Verified Resume Profile',
        period: 'Recent',
        bulletPoints: [cleaned],
      };
    }
  }
  if (currentExp) {
    extractedExperiences.push(currentExp);
  }

  // Years of experience
  let yearsOfExperience = 0;
  const expYearMention = /(\d+(?:\.\d+)?)\+?\s+years?\s+(?:of\s+)?(?:experience|software|engineering|development)/i.exec(rawText);
  if (expYearMention) {
    yearsOfExperience = Math.min(25, Math.max(0.5, Number(expYearMention[1])));
  } else {
    const yearMatches = Array.from(expSource.join(' ').matchAll(/\b(20[0-2]\d)\b/g)).map((m) => Number(m[1]));
    if (yearMatches.length > 0) {
      const minYear = Math.min(...yearMatches);
      const maxYear = /present|current/i.test(expSource.join(' ')) ? new Date().getFullYear() : Math.max(...yearMatches);
      yearsOfExperience = Math.max(1, Math.min(20, maxYear - minYear + 1));
    } else {
      yearsOfExperience = extractedExperiences.length >= 2 ? 3 : extractedExperiences.length === 1 ? 1.5 : 1;
    }
  }

  // Headline
  const summaryFirstLine =
    buckets.summary[0] ||
    lines.find(
      (l, idx) =>
        idx > 0 &&
        idx < 5 &&
        l !== location &&
        !locRegex.test(l) &&
        !/@|\d{3}/.test(l) &&
        detectSectionHeader(l) === null
    );
  const headline =
    summaryFirstLine && summaryFirstLine.length >= 10 && summaryFirstLine.length <= 120
      ? summaryFirstLine
      : `${extractedExperiences[0]?.role || 'Software Engineer'} · ${yearsOfExperience}+ Years (${skills.slice(0, 3).join(', ') || 'Core Engineering'})`;

  return {
    fullName,
    headline,
    location,
    yearsOfExperience,
    education: { degree, institution, graduationYear },
    skills,
    extractedExperiences:
      extractedExperiences.length > 0
        ? extractedExperiences.slice(0, 4)
        : [
            {
              role: 'Candidate Resume Summary',
              company: 'Uploaded Document',
              period: 'Current',
              bulletPoints: lines.slice(0, 3),
            },
          ],
  };
}

export function buildAssessmentRules(): AssessmentRule[] {
  return [
    {
      id: 'rule_tech_depth',
      dimension: 'Technical Depth & Concept Accuracy',
      weightPercentage: 35,
      ruleDescription:
        'Grades strictly from candidate spoken mechanics: exact algorithms, complexity bounds, OOP design principles, SQL execution/ACID semantics, or architecture invariants.',
      passSignals: [
        'Explains underlying data structures, time/space Big-O, or SQL query plan/index behavior',
        'Cites concrete production metrics (latency, P95/P99, throughput, error budgets)',
        'Uses domain-accurate terminology tailored to the target role',
      ],
      redFlags: [
        'Evasive replies ("I don\'t know", "skip", "not sure") cap this dimension at 0–15/100',
        'Buzzword-only answers without explaining how components actually work',
        'Unanswered questions receive an automatic 0/100 score',
      ],
    },
    {
      id: 'rule_tradeoffs',
      dimension: 'Tradeoff & Failure-Mode Analysis',
      weightPercentage: 25,
      ruleDescription:
        'Assesses whether the candidate compares at least two design options and proactively addresses edge cases, bottlenecks, and rollback paths.',
      passSignals: [
        'Contrasts latency vs consistency, normalization vs read speed, or memory vs CPU',
        'Addresses network jitter, deadlocks, concurrency races, or null/boundary inputs',
        'Answers live AI follow-up probes directly without deflecting',
      ],
      redFlags: [
        'Claims a design has zero downsides or ignores scale bottlenecks',
        'Leaves follow-up failure probes unaddressed',
      ],
    },
    {
      id: 'rule_decomposition',
      dimension: 'Problem Decomposition & Scoping',
      weightPercentage: 20,
      ruleDescription:
        'Evaluates structured problem-solving workflow: clarifying constraints, defining interfaces/schemas, and isolating subproblems before solving.',
      passSignals: [
        'States functional requirements, scale targets, or data schema upfront',
        'Breaks complex problems into logical steps or clean OOP/module boundaries',
      ],
      redFlags: [
        'Jumps into unguided rambling without stating assumptions or constraints',
      ],
    },
    {
      id: 'rule_communication',
      dimension: 'Verbal Clarity & STAR Structure',
      weightPercentage: 20,
      ruleDescription:
        'Scores candidate-only spoken articulation, logical signposting, and concise delivery (AI interviewer speech is strictly excluded from scoring).',
      passSignals: [
        'Clear signposting (First / Second / Tradeoff / Result or Situation-Task-Action-Result)',
        'High signal-to-noise ratio with concrete personal ownership ("I designed/built")',
      ],
      redFlags: [
        'Excessive filler phrases (>25%) or vague one-sentence fragments',
        'Speaking off-topic without answering the asked question',
      ],
    },
  ];
}

export function buildRoleInterviewSectionsAndRules(params: {
  targetRole: string;
  targetCompany?: string;
  interviewType?: string;
  difficulty?: string;
  questionCount?: number;
  resumeSkills?: string[];
  matchedSkills?: string[];
  missingSkills?: string[];
  jobDescriptionText?: string;
  experiences?: { role: string; company: string; bulletPoints?: string[] }[];
}): {
  sections: InterviewSectionPlan[];
  assessmentRules: AssessmentRule[];
} {
  const roleLower = (params.targetRole || 'Software Developer').toLowerCase();
  const jdLower = (params.jobDescriptionText || '').toLowerCase();
  const type = (params.interviewType || 'technical').toLowerCase();
  const count = Math.max(3, Math.min(5, params.questionCount || 5));
  const company = params.targetCompany || 'Target Company';
  const topExp = params.experiences?.[0]
    ? `${params.experiences[0].role} at ${params.experiences[0].company}`
    : 'your primary project work';
  const topMatched = params.matchedSkills?.[0] || params.resumeSkills?.[0] || 'Core Engineering Stack';
  const topGap = params.missingSkills?.[0] || 'Edge-Case Fault Tolerance & Optimization';

  const isBehavioral = type === 'behavioral';
  const isHrCultural = type === 'hr-cultural';
  const isSystemDesign = type === 'system-design';

  const isFrontendFocus =
    (roleLower.includes('frontend') || roleLower.includes('ui engineer') || roleLower.includes('react')) &&
    !roleLower.includes('full stack') &&
    !roleLower.includes('fullstack');
  const isBackendFocus =
    roleLower.includes('backend') || roleLower.includes('distributed') || roleLower.includes('api engineer');
  const isDevOpsFocus =
    roleLower.includes('devops') || roleLower.includes('cloud') || roleLower.includes('sre') || roleLower.includes('site reliability');
  const isMobileFocus =
    roleLower.includes('mobile') || roleLower.includes('ios') || roleLower.includes('android');
  const isQaFocus =
    roleLower.includes('qa') || roleLower.includes('sdet') || roleLower.includes('automation') || roleLower.includes('test engineer');
  const isSecurityFocus =
    roleLower.includes('security') || roleLower.includes('cyber');
  const isEmFocus =
    roleLower.includes('engineering manager') || roleLower.includes('tech lead manager');
  const isProductFocus =
    roleLower.includes('product manager') || roleLower === 'pm';
  const isDataFocus =
    roleLower.includes('data') || roleLower.includes('machine learning') || roleLower.includes('ml ') || roleLower.includes('ai engineer');

  let catalog: Omit<InterviewSectionPlan, 'id' | 'order'>[] = [];

  if (isHrCultural) {
    catalog = [
      {
        sectionName: 'Career Trajectory & Role Motivation',
        category: 'HR & Cultural Fit',
        focusSource: 'resume',
        weightPercentage: 25,
        topicsCovered: [topExp, `Why ${company}`, `${params.targetRole} mission alignment`],
        rationale: `Assesses long-term motivation and alignment with ${company}'s ${params.targetRole} scope.`,
        assessmentCriteria: [
          'Connects past milestones coherently to this role',
          'Shows genuine research into product and engineering culture',
        ],
      },
      {
        sectionName: 'Team Collaboration & Operating Values',
        category: 'Culture Alignment',
        focusSource: 'role-calibration',
        weightPercentage: 25,
        topicsCovered: ['Cross-functional communication', 'Feedback receptivity', 'Ownership mindset'],
        rationale: `Evaluates day-to-day collaboration habits and cultural synergy at ${company}.`,
        assessmentCriteria: [
          'Shares concrete examples of constructive feedback and peer support',
        ],
      },
      {
        sectionName: 'Adaptability, Deadlines & Workstyle',
        category: 'Behavioral STAR',
        focusSource: 'jd',
        weightPercentage: 20,
        topicsCovered: ['Shifting priorities', 'Workload transparency', 'Stakeholder updates'],
        rationale: 'Tests composure and transparent communication when priorities evolve.',
        assessmentCriteria: [
          'Communicates risks early and negotiates scope thoughtfully',
        ],
      },
      {
        sectionName: 'Growth Mindset & Coaching Experience',
        category: 'Leadership Bar',
        focusSource: 'role-calibration',
        weightPercentage: 15,
        topicsCovered: ['Skill upskilling', 'Mentorship', topGap],
        rationale: 'Checks continuous learning habits and how the candidate raises team capability.',
        assessmentCriteria: ['Demonstrates reflective self-awareness and clear learning goals'],
      },
      {
        sectionName: 'Role Expectations & Long-Term Impact',
        category: 'Alignment',
        focusSource: 'jd',
        weightPercentage: 15,
        topicsCovered: ['90-day onboarding priorities', 'Success metrics', 'Team expectations'],
        rationale: 'Ensures mutual clarity on expectations, autonomy, and career growth.',
        assessmentCriteria: ['Articulates thoughtful 90-day contribution goals'],
      },
    ];
  } else if (isBehavioral) {
    catalog = [
      {
        sectionName: 'Resume Ownership & Measurable Impact (STAR)',
        category: 'Behavioral STAR',
        focusSource: 'resume',
        weightPercentage: 25,
        topicsCovered: [topExp, 'Technical ownership', 'Quantified business metrics'],
        rationale: `Validates real-world delivery scope and personal impact claimed in ${topExp}.`,
        assessmentCriteria: [
          'Clear Situation, Task, Action, and measurable Result breakdown',
          'Distinguishes individual decisions from team outcomes',
        ],
      },
      {
        sectionName: 'Cross-Functional Conflict & Consensus',
        category: 'Stakeholder Leadership',
        focusSource: 'role-calibration',
        weightPercentage: 25,
        topicsCovered: ['Engineering vs Product tradeoffs', 'Data-driven persuasion', 'Alignment'],
        rationale: `Assesses collaboration maturity expected at ${company} for ${params.targetRole}.`,
        assessmentCriteria: [
          'Shows empathy and objective evidence rather than authority escalation',
          'Articulates post-decision outcome and relationship health',
        ],
      },
      {
        sectionName: 'Production Failure Recovery & Post-Mortem',
        category: 'Ownership & Resilience',
        focusSource: 'jd',
        weightPercentage: 20,
        topicsCovered: ['Incident containment', 'Blameless root-cause analysis', 'Prevention guardrails'],
        rationale: 'Tests accountability under pressure and systemic learning.',
        assessmentCriteria: [
          'Prioritizes customer impact mitigation before debugging',
          'Describes concrete preventive safeguards shipped afterward',
        ],
      },
      {
        sectionName: 'Ambiguity Navigation & Prioritization',
        category: 'Execution Judgment',
        focusSource: 'jd',
        weightPercentage: 15,
        topicsCovered: ['Scope cutting', 'Deadline risk mitigation', topGap],
        rationale: 'Measures ability to deliver high-priority outcomes under shifting requirements.',
        assessmentCriteria: [
          'Explains prioritization framework and explicit tradeoffs accepted',
        ],
      },
      {
        sectionName: 'Mentorship, Standards & Engineering Bar',
        category: 'Leadership Bar',
        focusSource: 'role-calibration',
        weightPercentage: 15,
        topicsCovered: ['Code review culture', 'Onboarding/mentoring peers', 'Long-term growth'],
        rationale: `Calibrated to ${company}'s operating principles and leadership bar.`,
        assessmentCriteria: [
          'Gives specific examples of elevating team velocity or engineering standards',
        ],
      },
    ];
  } else if (isSystemDesign) {
    catalog = [
      {
        sectionName: `Resume Architecture Walkthrough (${params.targetRole})`,
        category: 'Architecture Deep-Dive',
        focusSource: 'resume',
        weightPercentage: 20,
        topicsCovered: [topExp, topMatched, 'Scale constraints & bottlenecks'],
        rationale: `Grounds the design session in the largest real system you owned in ${topExp}.`,
        assessmentCriteria: ['Clarifies traffic load, SLA targets, and architectural evolution'],
      },
      {
        sectionName: isFrontendFocus
          ? 'Client State, Caching & Edge Synchronization Architecture'
          : 'High-Level Distributed System & API Architecture',
        category: 'System Design',
        focusSource: 'jd',
        weightPercentage: 25,
        topicsCovered: isFrontendFocus
          ? ['Normalized cache & optimistic UI', 'CDN invalidation', 'Real-time WebSocket streams']
          : ['Load balancing & API Gateway', 'Stateless services', 'Rate limiting & idempotency'],
        rationale: `Evaluates end-to-end component topology and scaling strategy for ${params.targetRole} at ${company}.`,
        assessmentCriteria: ['Defines clean API contracts, capacity estimates, and core component boundaries'],
      },
      {
        sectionName: 'Data Modeling, Storage Partitioning & Caching Tiers',
        category: 'Data & Storage Design',
        focusSource: 'role-calibration',
        weightPercentage: 20,
        topicsCovered: ['SQL vs NoSQL selection', 'Sharding & replication', 'Redis cache eviction & write-through'],
        rationale: 'Assesses storage engine tradeoffs, indexing at scale, and cache consistency.',
        assessmentCriteria: ['Handles hot keys, replication lag, and consistency models explicitly'],
      },
      {
        sectionName: 'Resilience, Queues & Failure Recovery',
        category: 'Fault Tolerance',
        focusSource: 'jd',
        weightPercentage: 20,
        topicsCovered: [topGap, 'Circuit breakers & backpressure', 'Dead-letter queues & multi-region failover'],
        rationale: `Probes graceful degradation and zero-data-loss invariants under partial outage.`,
        assessmentCriteria: ['Prevents cascading retries and quantifies recovery time/point objectives'],
      },
      {
        sectionName: 'Observability, Telemetry & Safe Rollouts',
        category: 'Production Readiness',
        focusSource: 'role-calibration',
        weightPercentage: 15,
        topicsCovered: ['SLIs / SLOs & P99 alerts', 'Distributed tracing', 'Canary & rollback automation'],
        rationale: 'Validates operational maturity for shipping distributed changes safely.',
        assessmentCriteria: ['Defines actionable metrics and automated rollback triggers'],
      },
    ];
  } else if (isProductFocus) {
    catalog = [
      {
        sectionName: 'Resume Product Launch & Metrics Deep-Dive',
        category: 'Product Execution',
        focusSource: 'resume',
        weightPercentage: 25,
        topicsCovered: [topExp, 'North Star KPIs', 'Retention & Funnel Tradeoffs'],
        rationale: `Probes product intuition and outcome ownership from ${topExp}.`,
        assessmentCriteria: ['Ties product choices to concrete user and revenue metrics'],
      },
      {
        sectionName: 'Product Sense & User Journey Design',
        category: 'Product Strategy',
        focusSource: 'jd',
        weightPercentage: 25,
        topicsCovered: ['User segmentation', 'Pain-point prioritization', 'MVP scoping'],
        rationale: `Evaluates structured product design for ${company}'s user ecosystem.`,
        assessmentCriteria: ['Defines target persona, constraints, and clear success criteria'],
      },
      {
        sectionName: 'Analytics, SQL Metrics & Experimentation',
        category: 'Analytical Rigor',
        focusSource: 'role-calibration',
        weightPercentage: 20,
        topicsCovered: ['A/B testing', 'Guardrail metrics', 'SQL cohort & funnel queries'],
        rationale: 'Checks quantitative rigor when diagnosing product regressions.',
        assessmentCriteria: ['Identifies confounding variables and counter-metrics'],
      },
      {
        sectionName: 'Technical Architecture Alignment',
        category: 'Engineering Partnership',
        focusSource: 'jd',
        weightPercentage: 15,
        topicsCovered: ['API/Latency tradeoffs', 'Build vs Buy', topGap],
        rationale: 'Tests fluency in partnering with engineering teams on technical constraints.',
        assessmentCriteria: ['Understands API constraints, rollout phases, and tech debt cost'],
      },
      {
        sectionName: 'Executive Alignment & Conflict Resolution',
        category: 'Leadership STAR',
        focusSource: 'role-calibration',
        weightPercentage: 15,
        topicsCovered: ['Stakeholder disagreement', 'Roadmap prioritization'],
        rationale: 'Evaluates influence without authority across senior stakeholders.',
        assessmentCriteria: ['Structured STAR response backed by customer evidence'],
      },
    ];
  } else if (isEmFocus) {
    catalog = [
      {
        sectionName: 'Resume Org Delivery & Team Scaling Deep-Dive',
        category: 'Engineering Management',
        focusSource: 'resume',
        weightPercentage: 25,
        topicsCovered: [topExp, 'Roadmap execution', 'Cross-team dependencies'],
        rationale: `Explores engineering delivery leadership and org impact in ${topExp}.`,
        assessmentCriteria: ['Balances delivery predictability with technical quality'],
      },
      {
        sectionName: 'People Leadership, Coaching & Performance',
        category: 'People & Hiring',
        focusSource: 'role-calibration',
        weightPercentage: 25,
        topicsCovered: ['1:1 coaching', 'Underperformance turnarounds', 'Hiring bar calibration'],
        rationale: 'Assesses empathetic, high-standard people management.',
        assessmentCriteria: ['Demonstrates actionable feedback and career sponsorship'],
      },
      {
        sectionName: 'Architecture Tradeoffs & Tech Debt Governance',
        category: 'Technical Strategy',
        focusSource: 'jd',
        weightPercentage: 20,
        topicsCovered: ['Architecture reviews', 'Reliability budgets', topGap],
        rationale: `Validates technical credibility guiding ${company} engineering squads.`,
        assessmentCriteria: ['Aligns engineering investments directly with product outcomes'],
      },
      {
        sectionName: 'Incident Command & Operational Excellence',
        category: 'Execution & Reliability',
        focusSource: 'jd',
        weightPercentage: 15,
        topicsCovered: ['On-call health', 'Blameless post-mortems', 'SLA enforcement'],
        rationale: 'Tests operational leadership during high-severity production events.',
        assessmentCriteria: ['Establishes psychological safety paired with rigorous action items'],
      },
      {
        sectionName: 'Executive Stakeholder Alignment & Conflict',
        category: 'Leadership STAR',
        focusSource: 'role-calibration',
        weightPercentage: 15,
        topicsCovered: ['Scope negotiation', 'Executive tradeoffs'],
        rationale: 'Evaluates strategic communication across Product, Design, and VP peers.',
        assessmentCriteria: ['Clear STAR framing with quantified organizational outcomes'],
      },
    ];
  } else if (isDevOpsFocus) {
    catalog = [
      {
        sectionName: 'Resume Infrastructure & CI/CD Deep-Dive',
        category: 'Resume Experience',
        focusSource: 'resume',
        weightPercentage: 20,
        topicsCovered: [topExp, topMatched, 'Deployment velocity & MTTR'],
        rationale: `Probes real cloud automation and reliability ownership from ${topExp}.`,
        assessmentCriteria: ['Explains blast-radius reduction, IaC modularity, and real SLA impact'],
      },
      {
        sectionName: 'Kubernetes, Containers & Cloud Networking',
        category: 'Cloud & Orchestration',
        focusSource: 'jd',
        weightPercentage: 25,
        topicsCovered: ['K8s scheduling & autoscaling', 'DNS/Ingress/TLS', 'Zero-downtime rollouts'],
        rationale: `Tests core ${params.targetRole} infrastructure mechanics for ${company}.`,
        assessmentCriteria: ['Diagnoses pod eviction, network policy, and resource contention cleanly'],
      },
      {
        sectionName: 'CI/CD Pipelines, Terraform IaC & Security',
        category: 'Automation & IaC',
        focusSource: 'role-calibration',
        weightPercentage: 20,
        topicsCovered: ['Terraform state locking', 'GitOps & canary gates', 'Secrets & IAM least privilege'],
        rationale: 'Evaluates reproducible infrastructure and supply-chain safety.',
        assessmentCriteria: ['Handles state drift, rollback safety, and credential rotation cleanly'],
      },
      {
        sectionName: 'Observability, Incident Response & SRE Metrics',
        category: 'SRE & Monitoring',
        focusSource: 'jd',
        weightPercentage: 20,
        topicsCovered: ['SLIs/SLOs & error budgets', 'Prometheus/OpenTelemetry', 'Load & latency debugging'],
        rationale: 'Measures systematic incident triage and telemetry signal design.',
        assessmentCriteria: ['Separates symptom alerts from root-cause metrics rapidly'],
      },
      {
        sectionName: 'Linux Internals, Scripting & Database Reliability',
        category: 'Systems & Scripting',
        focusSource: 'role-calibration',
        weightPercentage: 15,
        topicsCovered: ['Process/disk/network troubleshooting', 'SQL connection pooling & backups', topGap],
        rationale: 'Verifies OS/database troubleshooting under production pressure.',
        assessmentCriteria: ['Uses systematic Linux diagnostics and safe failover runbooks'],
      },
    ];
  } else if (isMobileFocus) {
    catalog = [
      {
        sectionName: 'Resume Mobile App Architecture Deep-Dive',
        category: 'Resume Experience',
        focusSource: 'resume',
        weightPercentage: 25,
        topicsCovered: [topExp, topMatched, 'App startup, memory & crash-free rate'],
        rationale: `Reviews real mobile shipping decisions and performance wins from ${topExp}.`,
        assessmentCriteria: ['Quantifies startup latency, memory profiling, and release reliability'],
      },
      {
        sectionName: 'Mobile Concurrency, UI Thread & Lifecycle',
        category: 'Mobile Runtime',
        focusSource: 'role-calibration',
        weightPercentage: 25,
        topicsCovered: ['Main-thread frame budget (60/120fps)', 'Coroutines / async tasks', 'Memory leaks'],
        rationale: `Assesses runtime mastery for ${params.targetRole} apps.`,
        assessmentCriteria: ['Prevents ANRs/main-thread stalls and retain cycles cleanly'],
      },
      {
        sectionName: 'Offline Sync, Local Storage (SQLite) & Caching',
        category: 'Data & Offline Architecture',
        focusSource: 'jd',
        weightPercentage: 20,
        topicsCovered: ['Local SQLite / Room / CoreData', 'Optimistic mutations', 'Conflict resolution'],
        rationale: 'Tests resilient data synchronization on unstable cellular networks.',
        assessmentCriteria: ['Handles idempotency keys, background sync, and schema migrations'],
      },
      {
        sectionName: 'DSA & Modular OOP App Design',
        category: 'DSA & OOPs',
        focusSource: 'role-calibration',
        weightPercentage: 15,
        topicsCovered: ['MVVM / Clean Architecture', 'Tree/Graph/Cache structures', 'Dependency injection'],
        rationale: 'Evaluates clean architecture boundaries and algorithmic complexity.',
        assessmentCriteria: ['Demonstrates testable viewmodels and optimal collection choices'],
      },
      {
        sectionName: 'Release CI/CD, Telemetry & Crash Recovery',
        category: 'Reliability & Tooling',
        focusSource: 'jd',
        weightPercentage: 15,
        topicsCovered: ['Feature flags & staged rollouts', 'ANR/Crashlytics triage', topGap],
        rationale: 'Probes safe mobile deployment when rollbacks are constrained by app stores.',
        assessmentCriteria: ['Uses remote kill switches and backward-compatible API versioning'],
      },
    ];
  } else if (isQaFocus) {
    catalog = [
      {
        sectionName: 'Resume Test Strategy & Automation Deep-Dive',
        category: 'Resume Experience',
        focusSource: 'resume',
        weightPercentage: 25,
        topicsCovered: [topExp, topMatched, 'Flakiness reduction & release confidence'],
        rationale: `Examines real test architecture and quality metrics you shipped in ${topExp}.`,
        assessmentCriteria: ['Quantifies regression catch rate and CI pipeline speedup'],
      },
      {
        sectionName: 'Test Pyramid, E2E Frameworks & API Testing',
        category: 'Automation Architecture',
        focusSource: 'jd',
        weightPercentage: 25,
        topicsCovered: ['Playwright/Selenium/Cypress design', 'Contract & API testing', 'Parallel sharding'],
        rationale: `Evaluates scalable test automation architecture for ${company}.`,
        assessmentCriteria: ['Eliminates brittle selectors/sleeps and designs deterministic fixtures'],
      },
      {
        sectionName: 'DSA, OOPs & Framework Design Patterns',
        category: 'Coding & OOPs',
        focusSource: 'role-calibration',
        weightPercentage: 20,
        topicsCovered: ['Page Object / Screenplay patterns', 'Data-driven parsing', 'Complexity tradeoffs'],
        rationale: 'Assesses clean software engineering craft within automation frameworks.',
        assessmentCriteria: ['Writes maintainable abstractions with clear SOLID boundaries'],
      },
      {
        sectionName: 'SQL Data Verification, Edge Cases & Concurrency',
        category: 'SQL & Quality Engineering',
        focusSource: 'jd',
        weightPercentage: 15,
        topicsCovered: ['SQL assertions & test data isolation', 'Race conditions', 'Boundary value testing'],
        rationale: 'Tests ability to validate backend ledger/database integrity end-to-end.',
        assessmentCriteria: ['Catches idempotency bugs, null states, and concurrency defects'],
      },
      {
        sectionName: 'CI/CD Quality Gates, Load Testing & Triage',
        category: 'Release Engineering',
        focusSource: 'role-calibration',
        weightPercentage: 15,
        topicsCovered: ['Performance/load smoke checks', 'Root-cause triage', topGap],
        rationale: 'Measures pragmatic risk-based release sign-off judgment.',
        assessmentCriteria: ['Balances release speed with severity-calibrated blocking gates'],
      },
    ];
  } else if (isSecurityFocus) {
    catalog = [
      {
        sectionName: 'Resume Security Engineering Deep-Dive',
        category: 'Resume Experience',
        focusSource: 'resume',
        weightPercentage: 20,
        topicsCovered: [topExp, topMatched, 'Threat modeling & remediation'],
        rationale: `Reviews high-impact vulnerabilities mitigated or security systems built in ${topExp}.`,
        assessmentCriteria: ['Articulates threat vectors, blast radius, and measurable risk reduction'],
      },
      {
        sectionName: 'Application Security, OWASP & Auth Architecture',
        category: 'AppSec & Auth',
        focusSource: 'jd',
        weightPercentage: 25,
        topicsCovered: ['OAuth2/OIDC/JWT security', 'SQLi / XSS / SSRF defense', 'Zero-trust RBAC'],
        rationale: `Tests defensive engineering mastery for ${company}.`,
        assessmentCriteria: ['Identifies subtle auth bypasses and enforces defense-in-depth controls'],
      },
      {
        sectionName: 'Cloud Security, KMS & Secrets Management',
        category: 'Cloud Infrastructure Security',
        focusSource: 'role-calibration',
        weightPercentage: 20,
        topicsCovered: ['IAM least privilege', 'TLS/mTLS & key rotation', 'Container hardening'],
        rationale: 'Evaluates cloud posture hardening and encryption key lifecycle.',
        assessmentCriteria: ['Eliminates long-lived credentials and isolates workload blast radius'],
      },
      {
        sectionName: 'Threat Modeling & Incident Forensics',
        category: 'Detection & Response',
        focusSource: 'jd',
        weightPercentage: 20,
        topicsCovered: ['Audit logging', 'Anomaly triage', 'Containment playbooks'],
        rationale: 'Tests structured incident containment and post-incident hardening.',
        assessmentCriteria: ['Prioritizes evidence preservation, token revocation, and root cause'],
      },
      {
        sectionName: 'Secure Coding, SQL Safety & System Tradeoffs',
        category: 'Secure Design',
        focusSource: 'role-calibration',
        weightPercentage: 15,
        topicsCovered: ['Parameterized queries', 'Rate limiting & abuse prevention', topGap],
        rationale: 'Checks pragmatic balance between strong security and developer/user friction.',
        assessmentCriteria: ['Designs secure defaults developers cannot accidentally misuse'],
      },
    ];
  } else if (isBackendFocus) {
    catalog = [
      {
        sectionName: 'Resume & Backend Service Deep-Dive',
        category: 'Resume Experience',
        focusSource: 'resume',
        weightPercentage: 20,
        topicsCovered: [topExp, topMatched, 'Throughput, latency & reliability wins'],
        rationale: `Verifies real backend ownership, API scale, and production debugging from ${topExp}.`,
        assessmentCriteria: ['Explains individual service design choices and measurable P95/P99 gains'],
      },
      {
        sectionName: 'SQL, DBMS Internals & Transactional Integrity',
        category: 'SQL & Databases',
        focusSource: 'jd',
        weightPercentage: 25,
        topicsCovered: ['Composite B-Tree indexing', 'ACID isolation & locking', 'Query plans & sharding'],
        rationale: `Core ${params.targetRole} evaluation on relational performance and zero-corruption writes.`,
        assessmentCriteria: ['Eliminates N+1 queries, deadlocks, and double-write race conditions'],
      },
      {
        sectionName: 'DSA, Concurrency & OOPs Design',
        category: 'DSA & OOPs',
        focusSource: 'role-calibration',
        weightPercentage: 20,
        topicsCovered: ['Concurrent data structures', 'SOLID & clean service contracts', 'Big-O bounds'],
        rationale: 'Tests algorithmic efficiency, thread safety, and extensible class architecture.',
        assessmentCriteria: ['Selects optimal structures and explains thread-safe abstractions'],
      },
      {
        sectionName: 'Distributed Systems, Caching & Async Queues',
        category: 'Distributed Architecture',
        focusSource: 'jd',
        weightPercentage: 20,
        topicsCovered: ['Redis caching & invalidation', 'Kafka/worker retries & DLQs', 'Idempotency keys'],
        rationale: `Calibrated to ${company}'s distributed throughput and consistency requirements.`,
        assessmentCriteria: ['Handles at-least-once delivery, backpressure, and outbox patterns cleanly'],
      },
      {
        sectionName: 'API Reliability, Rate Limiting & Observability',
        category: 'System Reliability',
        focusSource: 'role-calibration',
        weightPercentage: 15,
        topicsCovered: [topGap, 'Circuit breakers & timeouts', 'Tracing & canary rollbacks'],
        rationale: 'Probes defensive production habits under traffic spikes and downstream outages.',
        assessmentCriteria: ['Defines SLIs, bounded retries, and graceful degradation paths'],
      },
    ];
  } else if (isFrontendFocus) {
    catalog = [
      {
        sectionName: 'Resume & Frontend Architecture Deep-Dive',
        category: 'Resume Experience',
        focusSource: 'resume',
        weightPercentage: 25,
        topicsCovered: [topExp, topMatched, 'Production performance wins'],
        rationale: `Grounds the loop in real frontend systems listed in your resume.`,
        assessmentCriteria: ['Explains state lifecycle, rendering bottlenecks, and real impact metrics'],
      },
      {
        sectionName: 'JavaScript/TypeScript Runtime & DSA',
        category: 'Core Language & DSA',
        focusSource: 'role-calibration',
        weightPercentage: 20,
        topicsCovered: ['Event loop & async concurrency', 'DOM/Tree algorithms', 'Type safety & closures'],
        rationale: 'Evaluates algorithmic thinking and browser runtime fundamentals.',
        assessmentCriteria: ['Analyzes time/space complexity and avoids memory leaks or race conditions'],
      },
      {
        sectionName: 'React State Synchronization & Web Vitals',
        category: 'Frontend Systems',
        focusSource: 'jd',
        weightPercentage: 25,
        topicsCovered: ['Optimistic updates', 'Client caching', 'LCP / CLS / INP optimization'],
        rationale: `Tests core ${company} JD expectations around resilient UI state and P99 responsiveness.`,
        assessmentCriteria: ['Addresses cache invalidation, idempotency, and render batching'],
      },
      {
        sectionName: 'OOPs, Component Design & Testing',
        category: 'Software Design',
        focusSource: 'role-calibration',
        weightPercentage: 15,
        topicsCovered: ['Composition vs Inheritance', 'Design tokens', 'Unit & E2E verification'],
        rationale: 'Validates clean modular design and accessibility boundaries.',
        assessmentCriteria: ['Separates UI presentation from state contracts and handles edge states'],
      },
      {
        sectionName: 'API Integration, Reliability & Tradeoffs',
        category: 'System Reliability',
        focusSource: 'jd',
        weightPercentage: 15,
        topicsCovered: [topGap, 'Retry backoff', 'Graceful degradation'],
        rationale: 'Probes defensive client engineering during partial backend outages.',
        assessmentCriteria: ['Explains jittered backoff, circuit breakers, and safe rollbacks'],
      },
    ];
  } else if (isDataFocus) {
    catalog = [
      {
        sectionName: 'Resume Data Pipeline & Project Deep-Dive',
        category: 'Resume Experience',
        focusSource: 'resume',
        weightPercentage: 25,
        topicsCovered: [topExp, topMatched, 'Throughput & data quality wins'],
        rationale: 'Verifies end-to-end ownership of real data/ML pipelines from your resume.',
        assessmentCriteria: ['Articulates volume, latency SLAs, and schema evolution handling'],
      },
      {
        sectionName: 'SQL, Window Functions & Query Tuning',
        category: 'SQL & DBMS',
        focusSource: 'jd',
        weightPercentage: 25,
        topicsCovered: ['Complex JOINs & CTEs', 'Partitioning & Indexes', 'ACID & Isolation levels'],
        rationale: 'Core assessment of analytical and transactional SQL mastery.',
        assessmentCriteria: ['Writes/explains optimal execution plans and avoids full table scans'],
      },
      {
        sectionName: 'DSA & Large-Scale Data Processing',
        category: 'DSA & Algorithms',
        focusSource: 'role-calibration',
        weightPercentage: 20,
        topicsCovered: ['Streaming algorithms', 'Hash/Heap/Graph structures', 'Memory-bounded processing'],
        rationale: 'Evaluates algorithmic complexity on high-volume datasets.',
        assessmentCriteria: ['Identifies Big-O time/space tradeoffs and external memory bounds'],
      },
      {
        sectionName: 'Distributed Data Architecture & Reliability',
        category: 'System Design',
        focusSource: 'jd',
        weightPercentage: 15,
        topicsCovered: ['Kafka/CDC pipelines', 'Backfill idempotency', topGap],
        rationale: 'Tests fault tolerance, late-arriving data, and deduplication.',
        assessmentCriteria: ['Handles exactly-once/at-least-once semantics cleanly'],
      },
      {
        sectionName: 'OOPs, Pipeline Modularity & Collaboration',
        category: 'Software Design & STAR',
        focusSource: 'role-calibration',
        weightPercentage: 15,
        topicsCovered: ['Reusable ETL abstractions', 'Stakeholder tradeoff alignment'],
        rationale: 'Measures maintainability and cross-team engineering judgment.',
        assessmentCriteria: ['Balances schema governance with delivery speed'],
      },
    ];
  } else {
    // Default / Software Developer / Software Engineer / Full Stack Engineer
    // Divided cleanly into Resume Deep-Dive, DSA, OOPs, SQL/DBMS, and System Architecture
    const hasSqlInJdOrSkills =
      jdLower.includes('sql') ||
      jdLower.includes('database') ||
      jdLower.includes('postgres') ||
      (params.resumeSkills || []).some((s) => /sql|postgres|mysql|database/i.test(s));

    catalog = [
      {
        sectionName: 'Resume & Project Deep-Dive',
        category: 'Resume Experience',
        focusSource: 'resume',
        weightPercentage: 20,
        topicsCovered: [topExp, topMatched, 'Architecture ownership & metrics'],
        rationale: `Probes real projects, stack choices (${topMatched}), and measurable engineering impact from your uploaded resume.`,
        assessmentCriteria: [
          'Explains concrete personal contributions and system boundaries',
          'Cites measurable performance, reliability, or adoption outcomes',
        ],
      },
      {
        sectionName: 'DSA & Algorithmic Problem Solving',
        category: 'DSA & Complexity',
        focusSource: 'role-calibration',
        weightPercentage: 25,
        topicsCovered: ['Arrays/HashMaps/Sliding Window', 'Trees, Graphs & DP', 'Time & Space Big-O tradeoffs'],
        rationale: `Core ${params.targetRole} algorithmic assessment evaluating optimal data structure selection and edge-case handling.`,
        assessmentCriteria: [
          'Identifies optimal time & space complexity before/while walking through logic',
          'Covers empty, duplicate, cycle, and overflow edge cases cleanly',
        ],
      },
      {
        sectionName: 'OOPs & Clean Software Design',
        category: 'OOPs & Design Patterns',
        focusSource: 'role-calibration',
        weightPercentage: 20,
        topicsCovered: ['Encapsulation & Polymorphism', 'SOLID Principles', 'Composition vs Inheritance & Patterns'],
        rationale: `Assesses object-oriented modeling, extensible class/interface contracts, and maintainable code structure.`,
        assessmentCriteria: [
          'Applies SOLID principles and clear interface abstractions instead of tight coupling',
          'Explains why a design pattern fits the concurrency or extensibility constraint',
        ],
      },
      {
        sectionName: 'SQL, DBMS & Data Modeling',
        category: 'SQL & Databases',
        focusSource: hasSqlInJdOrSkills ? 'jd' : 'role-calibration',
        weightPercentage: 20,
        topicsCovered: ['JOINs, Subqueries & Indexing (B-Tree)', 'ACID Transactions & Locking', 'Normalization vs Denormalization'],
        rationale: `Verifies relational database fluency, query latency optimization, and transactional integrity for ${company}.`,
        assessmentCriteria: [
          'Designs normalized schemas with composite indexes and explains N+1 / lock contention fixes',
          'Understands isolation levels, race conditions, and safe migrations',
        ],
      },
      {
        sectionName: 'System Architecture & Fault Tolerance',
        category: 'System Design & Reliability',
        focusSource: 'jd',
        weightPercentage: 15,
        topicsCovered: [topGap, 'Caching, Queues & Idempotency', 'Observability & Rollback Safety'],
        rationale: `Calibrates ${company} ${params.difficulty || 'senior-staff'} bar on scaling, network resilience, and failure recovery.`,
        assessmentCriteria: [
          'Balances latency, consistency, and cost tradeoffs explicitly',
          'Defines monitoring SLIs, circuit breakers, and safe rollback strategies',
        ],
      },
    ];
  }

  const sliced = catalog.slice(0, count);
  const weightSum = sliced.reduce((sum, s) => sum + s.weightPercentage, 0) || 100;
  let allocated = 0;

  const sections: InterviewSectionPlan[] = sliced.map((item, idx) => {
    const isLast = idx === sliced.length - 1;
    const normalizedWeight = isLast
      ? Math.max(5, 100 - allocated)
      : Math.round((item.weightPercentage / weightSum) * 100);
    allocated += normalizedWeight;

    return {
      id: `section_${idx + 1}`,
      order: idx + 1,
      ...item,
      weightPercentage: normalizedWeight,
    };
  });

  return {
    sections,
    assessmentRules: buildAssessmentRules(),
  };
}

function buildDynamicLevelingFit(
  targetRole: string,
  yearsExp: number,
  overallMatch: number,
  difficulty: string
): { levels: LevelingFitItem[]; compensationBand: string } {
  const targetIsL4 = difficulty === 'entry';
  const targetIsL5 = difficulty === 'mid';
  const targetIsL7 = difficulty === 'principal';
  const targetIsL6 = !targetIsL4 && !targetIsL5 && !targetIsL7;

  const expBoost = Math.min(18, Math.round(yearsExp * 2.5));
  const l4Score = Math.min(99, Math.max(45, overallMatch + 10));
  const l5Score = Math.min(98, Math.max(32, Math.round(overallMatch * 0.94 + expBoost * 0.3)));
  const l6Score = Math.min(96, Math.max(20, Math.round(overallMatch * 0.85 + expBoost * 0.4 - (yearsExp < 4 ? 10 : 0))));
  const l7Score = Math.min(92, Math.max(12, Math.round(overallMatch * 0.65 + expBoost * 0.45 - (yearsExp < 7 ? 15 : 0))));

  const levels: LevelingFitItem[] = [
    {
      level: 'L4 · Software Engineer II',
      bar: 'Independent Feature Execution',
      fit: `${l4Score}% Fit`,
      score: l4Score,
      status: targetIsL4 ? 'target' : l4Score >= 75 ? 'solid' : 'gap',
    },
    {
      level: 'L5 · Senior Engineer',
      bar: 'Subsystem Ownership & SQL/DSA Depth',
      fit: `${l5Score}% Fit`,
      score: l5Score,
      status: targetIsL5 ? 'target' : l5Score >= 75 ? 'solid' : 'gap',
    },
    {
      level: 'L6 · Staff / Lead Engineer',
      bar: 'Cross-Team Architecture & Reliability',
      fit: `${l6Score}% Fit`,
      score: l6Score,
      status: targetIsL6 ? 'target' : l6Score >= 78 ? 'solid' : 'gap',
    },
    {
      level: 'L7 · Principal Engineer',
      bar: 'Org-Wide Technical Strategy',
      fit: `${l7Score}% Fit`,
      score: l7Score,
      status: targetIsL7 ? 'target' : l7Score >= 82 ? 'solid' : 'gap',
    },
  ];

  const roleLower = targetRole.toLowerCase();
  const compensationBand = targetIsL7
    ? '$340k – $430k'
    : targetIsL6
    ? roleLower.includes('product')
      ? '$260k – $325k'
      : '$275k – $340k'
    : targetIsL5
    ? '$195k – $255k'
    : '$135k – $175k';

  return { levels, compensationBand };
}

async function enhanceResumeInsightsWithGemini(params: {
  resumeText: string;
  jdText: string;
  targetRole: string;
  targetCompany: string;
  matchedSkills: string[];
  missingSkills: string[];
}): Promise<{
  inferredStrengths?: string[];
  suggestedFocusAreas?: string[];
  headline?: string;
} | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || !apiKey.trim()) return null;

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
    const res = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `Analyze this candidate resume excerpt against the target job description for "${params.targetRole}" at "${params.targetCompany}".
Matched skills already verified: ${params.matchedSkills.join(', ')}
Missing JD skills: ${params.missingSkills.join(', ')}

Resume Text:
${params.resumeText.slice(0, 2600)}

Target JD:
${params.jdText.slice(0, 1800)}

Return JSON with:
1. "headline": concise 6-12 word professional headline summarizing candidate seniority and core stack.
2. "inferredStrengths": 3 concrete strengths grounded in the resume text.
3. "suggestedFocusAreas": 3 high-leverage interview preparation topics based on the resume vs JD delta.`,
        config: {
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: { type: Type.STRING },
              inferredStrengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              suggestedFocusAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['inferredStrengths', 'suggestedFocusAreas'],
          },
        },
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Gemini resume analysis timeout')), 6000)),
    ]);

    const parsed = JSON.parse((res.text || '{}').trim());
    if (Array.isArray(parsed.inferredStrengths) && Array.isArray(parsed.suggestedFocusAreas)) {
      return {
        headline: typeof parsed.headline === 'string' && parsed.headline.trim() ? parsed.headline.trim() : undefined,
        inferredStrengths: parsed.inferredStrengths.map(String).slice(0, 4),
        suggestedFocusAreas: parsed.suggestedFocusAreas.map(String).slice(0, 4),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function analyzeResumeAndJobDescription(
  input: AnalyzeResumeInput
): Promise<ResumeAnalysis> {
  const doc = await extractTextFromUploadedFile({
    fileName: input.fileName,
    fileBase64: input.fileBase64,
    rawText: input.rawText,
    mimeType: input.mimeType,
  });

  const targetRole = (input.targetRole || 'Software Engineer').trim();
  const targetCompany = (input.targetCompany || 'Stripe').trim();
  const jdText = (input.jobDescriptionText || '').trim();
  const resumeLower = doc.rawText.toLowerCase();
  const jdLower = jdText.toLowerCase();

  const structured = parseResumeTextStructure(doc.rawText, input.candidateName || 'Candidate');
  const mergedSkills = Array.from(
    new Set([
      ...structured.skills,
      ...(Array.isArray(input.customSkills) ? input.customSkills.map((s) => s.trim()).filter(Boolean) : []),
    ])
  ).slice(0, 28);

  // Identify JD required skills from taxonomy + role defaults
  const jdSkillItems = SKILL_TAXONOMY.filter((item) =>
    item.aliases.some((alias) => countTermOccurrences(jdLower, alias) > 0)
  );

  // Fallback baseline skills if JD is short or sparse
  const effectiveTargetItems: SkillTaxonomyItem[] =
    jdSkillItems.length >= 3
      ? jdSkillItems
      : SKILL_TAXONOMY.filter((item) => {
          const rLower = targetRole.toLowerCase();
          if (rLower.includes('frontend')) {
            return ['TypeScript', 'React & Next.js', 'System Design', 'Web Vitals & Performance Optimization', 'CI/CD & Automated Testing', 'REST APIs & GraphQL'].includes(item.label);
          }
          return ['Data Structures & Algorithms (DSA)', 'Object-Oriented Programming (OOPs)', 'SQL', 'System Design', 'REST APIs & GraphQL', 'CI/CD & Automated Testing'].includes(item.label);
        });

  const keywordAnalysis: KeywordMetric[] = effectiveTargetItems.map((item) => {
    const aliasCounts = item.aliases.map((alias) => countTermOccurrences(resumeLower, alias));
    const maxCount = Math.max(0, ...aliasCounts);
    const customMatched = (input.customSkills || []).some((cs) =>
      cs.toLowerCase() === item.label.toLowerCase() || item.aliases.some((a) => cs.toLowerCase().includes(a))
    );
    const effectiveCount = maxCount > 0 ? maxCount : customMatched ? 1 : 0;
    const densityPct = doc.wordCount > 0 ? ((effectiveCount / doc.wordCount) * 100).toFixed(1) : '0.0';
    return {
      term: item.label,
      status: effectiveCount > 0 ? 'present' : 'missing',
      count: effectiveCount,
      density: `${densityPct}%`,
      category: item.category,
    };
  });

  // Also include extra matched resume skills that aren't already in keywordAnalysis (up to 14 rows total)
  for (const rSkill of mergedSkills.slice(0, 6)) {
    if (keywordAnalysis.length >= 14) break;
    const alreadyPresent = keywordAnalysis.some(
      (k) => k.term.toLowerCase() === rSkill.toLowerCase()
    );
    if (!alreadyPresent) {
      const cnt = Math.max(1, countTermOccurrences(resumeLower, rSkill.toLowerCase()));
      const densityPct = doc.wordCount > 0 ? ((cnt / doc.wordCount) * 100).toFixed(1) : '0.2';
      keywordAnalysis.push({
        term: rSkill,
        status: 'present',
        count: cnt,
        density: `${densityPct}%`,
        category: 'Verified Resume Skill',
      });
    }
  }

  const jdKeywordsOnly = keywordAnalysis.slice(0, effectiveTargetItems.length);
  const matchedJdKeywords = jdKeywordsOnly.filter((k) => k.status === 'present');
  const missingJdKeywords = jdKeywordsOnly.filter((k) => k.status === 'missing');

  const matchedSkills = matchedJdKeywords.map((k) => ({
    skill: k.term,
    category: k.category,
    matchStrength: Math.min(99, 72 + Math.min(27, k.count * 7)),
  }));

  if (matchedSkills.length === 0 && mergedSkills.length > 0) {
    mergedSkills.slice(0, 4).forEach((skill) => {
      matchedSkills.push({
        skill,
        category: 'Resume Core',
        matchStrength: 74,
      });
    });
  }

  const missingSkills = missingJdKeywords.map((k, idx) => ({
    skill: k.term,
    category: k.category,
    importance: (idx < 2 ? 'critical' : idx < 4 ? 'moderate' : 'nice-to-have') as
      | 'critical'
      | 'moderate'
      | 'nice-to-have',
  }));

  // Compute REAL 4-pillar ATS Breakdown (0–100)
  const jdRatio = effectiveTargetItems.length > 0 ? matchedJdKeywords.length / effectiveTargetItems.length : 0.5;
  const keywordAlignment = Math.max(10, Math.min(99, Math.round(jdRatio * 94 + (matchedJdKeywords.length > 0 ? 5 : 0))));

  const technicalDepth = Math.max(
    12,
    Math.min(
      98,
      Math.round(
        18 +
          Math.min(45, mergedSkills.length * 4.5) +
          Math.min(20, doc.wordCount / 18) +
          (structured.extractedExperiences.length >= 2 ? 15 : structured.extractedExperiences.length === 1 ? 8 : 0)
      )
    )
  );

  const metricsHits = (
    doc.rawText.match(/\b\d+(?:\.\d+)?%|\b\d+\s*(?:ms|s|x|k|m|b)\b|\$\d+|\bp9[59]\b|\b\d{2,}\+?\s*(?:users|merchants|requests|rps|qps|engineers)\b/gi) ||
    []
  ).length;
  const quantifiedImpact = Math.max(
    15,
    Math.min(98, Math.round(20 + Math.min(78, metricsHits * 13)))
  );

  const hasExperience = structured.extractedExperiences.length > 0 && structured.extractedExperiences[0].bulletPoints.length > 0;
  const hasEducation = Boolean(structured.education.degree && structured.education.institution);
  const hasSkills = mergedSkills.length >= 3;
  const hasContactOrLocation = /@|\d{3}/.test(doc.rawText) || Boolean(structured.location);
  const sectionCompleteness = Math.min(
    100,
    (hasExperience ? 35 : 10) +
      (hasSkills ? 30 : 10) +
      (hasEducation ? 20 : 5) +
      (hasContactOrLocation ? 15 : 5)
  );

  const atsScore = Math.max(
    15,
    Math.min(
      99,
      Math.round(
        keywordAlignment * 0.35 +
          technicalDepth * 0.25 +
          quantifiedImpact * 0.2 +
          sectionCompleteness * 0.2
      )
    )
  );

  const overallMatchPercentage = Math.max(
    12,
    Math.min(98, Math.round(keywordAlignment * 0.68 + technicalDepth * 0.32))
  );

  const { sections: detectedRoleSections, assessmentRules } = buildRoleInterviewSectionsAndRules({
    targetRole,
    targetCompany,
    interviewType: input.interviewType || 'technical',
    difficulty: input.difficulty || 'senior-staff',
    questionCount: input.questionCount || 5,
    resumeSkills: mergedSkills,
    matchedSkills: matchedSkills.map((m) => m.skill),
    missingSkills: missingSkills.map((m) => m.skill),
    jobDescriptionText: jdText,
    experiences: structured.extractedExperiences,
  });

  const { levels: levelingFit, compensationBand } = buildDynamicLevelingFit(
    targetRole,
    structured.yearsOfExperience,
    overallMatchPercentage,
    input.difficulty || 'senior-staff'
  );

  const deterministicStrengths = [
    matchedSkills.length > 0
      ? `Strong verified alignment in ${matchedSkills.slice(0, 3).map((m) => m.skill).join(', ')} matching ${targetCompany}'s ${targetRole} requirements.`
      : `Clean structured resume parsed across ${doc.wordCount} words.`,
    metricsHits >= 2
      ? `Includes ${metricsHits} quantified engineering impact metrics strengthening ATS impact ranking (${quantifiedImpact}/100).`
      : `Contains ${structured.extractedExperiences.length} parsed experience/project blocks with clear technical ownership.`,
    `Covers ${mergedSkills.length} verified competencies across ${structured.yearsOfExperience}+ years of technical scope.`,
  ];

  const deterministicFocusAreas = [
    ...(missingSkills.slice(0, 2).map(
      (gap) => `Bridge ${gap.importance} gap in ${gap.skill} (${gap.category}) with architecture & edge-case examples.`
    )),
    ...(metricsHits < 2
      ? ['Quantify outcomes in bullets with P95/P99 latency, throughput, or revenue/reliability percentages.']
      : []),
    `Practice ${detectedRoleSections[1]?.sectionName || 'core technical'} & ${detectedRoleSections[2]?.sectionName || 'design tradeoffs'} under verbal follow-up probing.`,
  ].slice(0, 4);

  const geminiEnrichment = await enhanceResumeInsightsWithGemini({
    resumeText: doc.rawText,
    jdText,
    targetRole,
    targetCompany,
    matchedSkills: matchedSkills.map((m) => m.skill),
    missingSkills: missingSkills.map((m) => m.skill),
  });

  return {
    id: `analysis_${Date.now()}`,
    fileName: doc.fileName,
    fileSizeKb: doc.fileSizeKb,
    uploadedAt: 'Just now',
    atsScore,
    rawText: doc.rawText,
    wordCount: doc.wordCount,
    atsBreakdown: {
      keywordAlignment,
      technicalDepth,
      quantifiedImpact,
      sectionCompleteness,
    },
    parsedProfile: {
      fullName: structured.fullName,
      headline: geminiEnrichment?.headline || structured.headline,
      location: structured.location,
      yearsOfExperience: structured.yearsOfExperience,
      education: structured.education,
      skills: mergedSkills,
      extractedExperiences: structured.extractedExperiences,
    },
    matchAnalysis: {
      overallMatchPercentage,
      matchedSkills,
      missingSkills,
      inferredStrengths: geminiEnrichment?.inferredStrengths || deterministicStrengths,
      suggestedFocusAreas: geminiEnrichment?.suggestedFocusAreas || deterministicFocusAreas,
    },
    keywordAnalysis,
    levelingFit,
    compensationBand,
    detectedRoleSections,
    assessmentRules,
    analysisSource: geminiEnrichment ? 'gemini' : 'deterministic-parser',
  };
}
