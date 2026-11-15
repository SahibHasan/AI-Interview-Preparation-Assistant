import { 
  CandidateProfile, 
  EvaluationReport, 
  InterviewQuestion, 
  LearningPlan, 
  ResumeAnalysis, 
  SessionHistoryItem, 
  User 
} from '../types';

export const initialUser: User = {
  id: 'usr_alex_morgan',
  name: 'Alex Morgan',
  email: 'alex.morgan@example.com',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
  targetRole: 'Senior Frontend Engineer',
  targetCompany: 'Stripe',
  experienceLevel: 'senior-staff',
  readinessScore: 78,
  streakDays: 5,
};

export const sampleCandidateProfile: CandidateProfile = {
  id: 'prof_alex',
  userId: 'usr_alex_morgan',
  fullName: 'Alex Morgan',
  headline: '5+ Years Frontend Architecture & Distributed UI Systems',
  location: 'Seattle, WA • Open to Remote & Hybrid',
  yearsOfExperience: 5.5,
  education: {
    degree: 'B.S. in Computer Science',
    institution: 'University of Washington',
    graduationYear: 2020,
  },
  skills: [
    'TypeScript',
    'React 19 & Next.js',
    'State Synchronization',
    'Distributed Client Caching',
    'Web Vitals & Performance P99',
    'GraphQL & REST Enclaves',
    'System Design',
    'Tailwind CSS & Design Tokens',
    'WebSockets & Event-Driven Architecture',
    'Unit & E2E Testing',
  ],
  extractedExperiences: [
    {
      role: 'Staff Frontend Engineer',
      company: 'Fintech Scaleup (CloudPay)',
      period: '2022 - Present',
      bulletPoints: [
        'Architected real-time payments dashboard serving 4M+ daily active merchants with <50ms P95 latency.',
        'Implemented resilient offline-first optimistic cache invalidation layer reducing checkout abandonment by 14%.',
        'Led cross-functional migration to TypeScript monorepo with 45 engineers.',
      ],
    },
    {
      role: 'Senior Software Engineer',
      company: 'DataMetrics Corp',
      period: '2020 - 2022',
      bulletPoints: [
        'Built high-frequency telemetry charting suite rendering 50,000 live data points using WebGL and Canvas.',
        'Designed component design system with 60+ accessible WCAG AAA compliant primitives.',
      ],
    },
  ],
  preferences: {
    aiInterviewerPersona: 'Sarah',
    interviewerStyle: 'bar-raiser',
    speechTranscriptionEnabled: true,
    voiceFeedbackEnabled: true,
    cameraEnabled: false,
  },
};

export const sampleJobDescriptionText = `Role: Senior Frontend Engineer — Core Payments & Infrastructure
Company: Stripe
Location: Remote / Seattle / San Francisco
Level: L5 / L6

About the Role:
We are seeking an experienced Frontend / Systems Engineer to build mission-critical interfaces and financial infrastructure for millions of businesses worldwide. You will architect high-resilience web interfaces, design client-side caching strategies that withstand network jitter, and uphold uncompromising standards of reliability, performance, and accessibility.

Requirements:
• 5+ years of software engineering experience in modern JavaScript/TypeScript and React.
• Deep understanding of distributed state management, client-side caching, and network edge synchronization.
• Proven track record architecting highly available systems with fault-tolerant offline handling and optimistic rollbacks.
• Experience with telemetry, performance budgets (Core Web Vitals), and secure financial transactions.
• Strong communication skills for cross-functional consensus building and design documentation.`;

export const sampleResumeAnalysis: ResumeAnalysis = {
  id: 'analysis_001',
  fileName: 'Alex_Morgan_Senior_Frontend_2025.pdf',
  fileSizeKb: 240,
  uploadedAt: 'Yesterday, 4:10 PM',
  atsScore: 86,
  wordCount: 412,
  rawText: `Alex Morgan
Seattle, WA
5+ Years Frontend Architecture & Distributed UI Systems
Experience:
Staff Frontend Engineer — Fintech Scaleup (CloudPay) (2022 - Present)
• Architected real-time payments dashboard serving 4M+ daily active merchants with <50ms P95 latency.
• Implemented resilient offline-first optimistic cache invalidation layer reducing checkout abandonment by 14%.
• Led cross-functional migration to TypeScript monorepo with 45 engineers.
Senior Software Engineer — DataMetrics Corp (2020 - 2022)
• Built high-frequency telemetry charting suite rendering 50,000 live data points using WebGL and Canvas.
• Designed component design system with 60+ accessible WCAG AAA compliant primitives.
Education: B.S. in Computer Science, University of Washington (2020)
Skills: TypeScript, React 19, Next.js, State Synchronization, Distributed Client Caching, Web Vitals, GraphQL, REST, System Design, Tailwind CSS, WebSockets, Unit & E2E Testing`,
  atsBreakdown: {
    keywordAlignment: 84,
    technicalDepth: 90,
    quantifiedImpact: 86,
    sectionCompleteness: 88,
  },
  parsedProfile: sampleCandidateProfile,
  matchAnalysis: {
    overallMatchPercentage: 84,
    matchedSkills: [
      { skill: 'TypeScript & React Architecture', category: 'Frontend Core', matchStrength: 98 },
      { skill: 'Distributed Client Caching', category: 'Architecture', matchStrength: 90 },
      { skill: 'Web Vitals & Performance Optimization', category: 'Reliability', matchStrength: 92 },
      { skill: 'System Design & State Synchronization', category: 'Systems', matchStrength: 86 },
      { skill: 'Financial Dashboard Telemetry', category: 'Domain Experience', matchStrength: 82 },
      { skill: 'Accessibility & WCAG AAA Compliance', category: 'UI Craft', matchStrength: 88 },
    ],
    missingSkills: [
      { skill: 'Raft / Consensus Protocols at Edge', category: 'Distributed Systems', importance: 'critical' },
      { skill: 'WAN Jitter Threshold Handling', category: 'Network Resilience', importance: 'moderate' },
      { skill: 'Global Idempotency Enclaves', category: 'Payments Safety', importance: 'critical' },
    ],
    inferredStrengths: [
      'Strong institutional knowledge of real-time transactional financial UIs',
      'High-velocity delivery in distributed engineering organizations',
      'Solid foundations in optimistic mutations and resilience patterns',
    ],
    suggestedFocusAreas: [
      'Distributed consensus mechanics during partition spikes',
      'Idempotent API retry guarantees on degraded mobile networks',
      'Cross-tab multi-window cache consistency primitives',
    ],
  },
  keywordAnalysis: [
    { term: 'TypeScript', status: 'present', count: 3, density: '0.7%', category: 'Language' },
    { term: 'React & Next.js', status: 'present', count: 2, density: '0.5%', category: 'Frontend Framework' },
    { term: 'Distributed Client Caching', status: 'present', count: 2, density: '0.5%', category: 'Architecture' },
    { term: 'State Synchronization', status: 'present', count: 2, density: '0.5%', category: 'Reliability' },
    { term: 'Web Vitals & Performance Optimization', status: 'present', count: 1, density: '0.2%', category: 'Performance' },
    { term: 'Raft / Distributed Consensus', status: 'missing', count: 0, density: '0.0%', category: 'Distributed Systems' },
    { term: 'Security & OAuth Authentication', status: 'missing', count: 0, density: '0.0%', category: 'Security' },
  ],
  levelingFit: [
    { level: 'L4 · Mid-Level', bar: 'Independent Contributor', fit: '94% Strong Exceed', score: 94, status: 'solid' },
    { level: 'L5 · Senior Engineer', bar: 'Subsystem & Ownership Lead', fit: '86% Target Match', score: 86, status: 'target' },
    { level: 'L6 · Staff Engineer', bar: 'Multi-Team Architecture Bar', fit: '74% Stretch Fit', score: 74, status: 'solid' },
    { level: 'L7 · Principal', bar: 'Org-Wide Technical Strategy', fit: '52% Growth Gap', score: 52, status: 'gap' },
  ],
  compensationBand: '$245k - $315k Total Comp',
  detectedRoleSections: [
    {
      id: 'sec_1',
      order: 1,
      sectionName: 'Resume & Production Architecture Deep-Dive',
      category: 'Resume & Project Defense',
      focusSource: 'resume',
      weightPercentage: 25,
      topicsCovered: ['Payments Dashboard Latency (<50ms P95)', 'Optimistic Cache Invalidation', 'Monorepo Tradeoffs'],
      rationale: 'Validates hands-on ownership and architectural decisions behind claimed resume metrics.',
      assessmentCriteria: ['Specificity of your personal technical decisions', 'Measured latency & conversion impact', 'Post-launch operational lessons'],
    },
    {
      id: 'sec_2',
      order: 2,
      sectionName: 'Frontend Architecture, Rendering & Web Vitals',
      category: 'Frontend Engineering',
      focusSource: 'jd',
      weightPercentage: 25,
      topicsCovered: ['State Synchronization', '60fps Virtualized Charts', 'Layout Stability & Core Web Vitals'],
      rationale: 'Tests deep understanding of browser rendering, React concurrency, and real-time data batching.',
      assessmentCriteria: ['Frame-budget & memory leak prevention', 'State normalization & cache staleness handling'],
    },
    {
      id: 'sec_3',
      order: 3,
      sectionName: 'Distributed Systems & Client Resilience',
      category: 'System Design',
      focusSource: 'jd',
      weightPercentage: 25,
      topicsCovered: ['Idempotency Keys', 'Offline Queuing & Retry Backoff', 'Multi-Tab Sync'],
      rationale: 'Closes JD-identified gaps in network jitter recovery and fault-tolerant financial workflows.',
      assessmentCriteria: ['Failure-mode enumeration', 'Idempotency guarantees under spotty networks'],
    },
    {
      id: 'sec_4',
      order: 4,
      sectionName: 'Engineering Leadership & Tradeoffs (STAR)',
      category: 'Behavioral & Cross-Team Impact',
      focusSource: 'role-calibration',
      weightPercentage: 25,
      topicsCovered: ['Technical Debt vs Velocity', 'Cross-Functional Alignment', 'Incident Post-Mortems'],
      rationale: 'Evaluates senior/staff influence, ambiguity handling, and metrics-backed prioritization.',
      assessmentCriteria: ['Clear Situation-Task-Action-Result flow', 'Quantified team or business outcomes'],
    },
  ],
  assessmentRules: [
    {
      id: 'rule_depth',
      dimension: 'Technical Depth & Mechanism Precision',
      weightPercentage: 35,
      ruleDescription: 'Grades concrete mechanisms, complexities, schemas, and protocol details from your spoken explanations.',
      passSignals: ['Names exact algorithms, data structures, or SQL indexing strategies', 'Explains execution flow step-by-step'],
      redFlags: ['Buzzword dropping without mechanism', 'Skipping edge-case failure behavior'],
    },
    {
      id: 'rule_tradeoff',
      dimension: 'Tradeoff & Failure-Mode Analysis',
      weightPercentage: 25,
      ruleDescription: 'Evaluates ability to compare alternatives cleanly and reason about bottlenecks under scale.',
      passSignals: ['Contrasts latency vs consistency or memory vs CPU', 'Identifies failure modes and mitigation'],
      redFlags: ['Single-option answers with zero tradeoff awareness'],
    },
    {
      id: 'rule_decomp',
      dimension: 'Problem Decomposition & Scoping',
      weightPercentage: 20,
      ruleDescription: 'Measures how systematically you clarify constraints and partition complex problems.',
      passSignals: ['Establishes API contracts & constraints early', 'Breaks problem into clean testable modules'],
      redFlags: ['Jumping into details without defining constraints'],
    },
    {
      id: 'rule_clarity',
      dimension: 'Verbal Clarity & Candidate-Only Evidence',
      weightPercentage: 20,
      ruleDescription: 'Scores ONLY candidate responses (AI prompts excluded); zero-tolerance deduction for non-answers or evasion.',
      passSignals: ['Structured STAR examples with real numbers', 'Direct answers tied to your own experience'],
      redFlags: ['Evasive replies ("skip", "idk") or off-topic filler'],
    },
  ],
};

export const sampleInterviewQuestions: InterviewQuestion[] = [
  {
    id: 'q1',
    order: 1,
    category: 'Architecture & State Synchronization',
    difficulty: 'L5',
    questionText: 'When designing an international payments checkout flow, how do you architect client-side state to guarantee idempotency and prevent accidental double-charges during network timeouts?',
    contextOrConstraint: 'Assume mobile browser on spotty 3G with frequent connection drops during POST submission.',
    sampleExpectedAnswer: 'Generate a unique client-side idempotency key (UUIDv4) upon form initialization. Pass it in an Idempotency-Key header. If the network drops before response, retry with exponential backoff reusing the exact same key.',
    evaluationRubric: [
      { criterion: 'Idempotency Key Generation & Scoping', weight: 40, description: 'Candidate defines key generation lifecycle and prevents client regenerate on retry' },
      { criterion: 'Network Failure Handling', weight: 30, description: 'Explicit exponential backoff and connection state inspection' },
      { criterion: 'UX Locking & Error State Feedback', weight: 30, description: 'Disabling submission buttons, pending modal, and non-blocking retry' },
    ],
  },
  {
    id: 'q2',
    order: 2,
    category: 'Distributed Systems & Consistency',
    difficulty: 'L6',
    questionText: 'You suggested splitting partition logs across three edge nodes. How does your Raft heartbeat threshold handle a temporary 800ms WAN jitter spike without triggering false leader elections?',
    contextOrConstraint: 'Stripe L6 Bar: System must prevent split-brain while avoiding sluggish failover.',
    sampleExpectedAnswer: 'Configure election timeout as a randomized window (e.g. 1500ms-3000ms) distinctly larger than the heartbeat interval (150ms) plus expected maximum WAN jitter (800ms). Use pre-vote phases to verify network reachability before stepping down leaders.',
    evaluationRubric: [
      { criterion: 'Election Timeout vs Heartbeat Ratio', weight: 35, description: 'Calculates election timeout window safely above max jitter' },
      { criterion: 'Pre-Vote Protocol Mechanism', weight: 35, description: 'Mentions Pre-Vote phase to prevent disruptive partitioned node election storms' },
      { criterion: 'Client Request Buffer & Queuing', weight: 30, description: 'Addresses client request buffering during leadership confirmation' },
    ],
  },
  {
    id: 'q3',
    order: 3,
    category: 'Performance & Web Vitals',
    difficulty: 'L5',
    questionText: 'How would you architect a complex financial analytics dashboard rendering 50 live chart widgets to maintain sub-16ms frame times (60fps) and zero Cumulative Layout Shift?',
    contextOrConstraint: 'High frequency data updates arriving via WebSockets every 100ms.',
    sampleExpectedAnswer: 'Throttle WebSocket payloads using requestAnimationFrame batches, use OffscreenCanvas or WebGL for heavy series rendering, reserve explicit SVG/container aspect ratios to eliminate CLS, and decouple data store from React render tree via external mutable buffers.',
    evaluationRubric: [
      { criterion: 'RAF Batching & Render Throttling', weight: 35, description: 'Batches incoming messages to match screen refresh rate' },
      { criterion: 'Layout Stability & Aspect Ratio Reservation', weight: 35, description: 'Zero layout shift through strict bounding boxes and skeletons' },
      { criterion: 'Memory & DOM Node Management', weight: 30, description: 'Avoids unbounded DOM growth by canvas rendering or virtualized windowing' },
    ],
  },
  {
    id: 'q4',
    order: 4,
    category: 'Behavioral & Engineering Leadership',
    difficulty: 'L6',
    questionText: 'Describe a situation where you had a fundamental architectural disagreement with a Principal Engineer or Product Manager regarding technical debt vs feature velocity. How did you resolve it?',
    contextOrConstraint: 'Use the STAR format (Situation, Task, Action, Result) with quantitative business outcomes.',
    sampleExpectedAnswer: 'Framed technical debt in business metrics (conversion drop, incident rate, developer velocity). Conducted an empirical POC demonstrating that fixing the debt saved 120ms latency and improved conversion by 2.4%. Aligned stakeholders on incremental refactoring alongside sprint commitments.',
    evaluationRubric: [
      { criterion: 'Objective Business Metric Framing', weight: 40, description: 'Translates technical debt into revenue, reliability, or velocity metrics' },
      { criterion: 'Collaborative Consensus & Influence', weight: 35, description: 'Resolves conflict constructively without escalating unnecessarily' },
      { criterion: 'Empirical Verification & Results', weight: 25, description: 'Measures outcome with concrete post-mortem data' },
    ],
  },
  {
    id: 'q5',
    order: 5,
    category: 'Failure Recovery & Post-Mortem',
    difficulty: 'L6',
    questionText: 'Suppose a bad deployment caused 0.5% of checkout transactions to hang indefinitely for 18 minutes before automated rollback. Walk through your systematic incident mitigation and blameless post-mortem process.',
    contextOrConstraint: 'Highlight customer communication, data reconciliation, and automated guardrails.',
    sampleExpectedAnswer: 'Immediate mitigation via feature flag kill switch. Establish incident commander role. Query audit logs to isolate affected session IDs. Initiate automated idempotency-safe reconciliation scripts to complete or refund hung intents. Conduct blameless post-mortem introducing automated canary health probes and circuit breakers.',
    evaluationRubric: [
      { criterion: 'Rapid Containment & Telemetry', weight: 35, description: 'Prioritizes stopping bleed via kill switch before root cause analysis' },
      { criterion: 'Safe Data Reconciliation', weight: 35, description: 'Audits incomplete transactions and avoids double refunds' },
      { criterion: 'Systemic Prevention & Blameless Culture', weight: 30, description: 'Adds canary checks and semantic health monitors' },
    ],
  },
];

export const sampleEvaluationReport: EvaluationReport = {
  id: 'eval_014',
  sessionId: 'sess_stripe_l6_consensus',
  completedAt: 'Yesterday, 4:15 PM',
  overallScore: 89,
  targetRole: 'Senior Staff Frontend / Systems Engineer',
  targetCompany: 'Stripe',
  calibratedBenchmark: 'Stripe L6 Core Bar (Verified 1,420 loops)',
  durationFormatted: '45m 12s',
  percentileRank: 92,
  categoryScores: {
    technicalCorrectness: 91,
    communicationStructure: 88,
    problemDecomposition: 86,
    tradeoffAnalysis: 90,
  },
  overallSummary: 'Candidate demonstrated exceptional systems fluency, particularly in isolating network partition behaviors and client-side idempotency safeguards. Strong executive presence with structured STAR responses. Minor opportunity to strengthen explicit pre-vote algorithm step-throughs.',
  questionFeedbacks: [
    {
      questionId: 'q1',
      score: 94,
      criterionScores: [
        { criterion: 'Idempotency Key Lifecycle', score: 96, feedback: 'Accurately articulated UUID generation at form init rather than submit event.' },
        { criterion: 'Network Failure Handling', score: 92, feedback: 'Clean exponential backoff algorithm with jitter inclusion.' },
        { criterion: 'UX Locking', score: 94, feedback: 'Thorough consideration of button disabling and optimistic feedback states.' },
      ],
      strengths: [
        'Precise distinction between server idempotency cache vs client retry buffer',
        'Considered edge cases of battery-saving OS mobile background throttling',
      ],
      missingConcepts: [],
      suggestedImprovements: [
        'Mention cross-tab BroadcastChannel to lock simultaneous submissions across duplicate tabs.',
      ],
      modelExemplarAnswer: 'Generate an idempotency key upon form creation, store in indexedDB with pending state, transmit in Idempotency-Key header, and reuse during automated retries with randomized exponential jitter.',
    },
    {
      questionId: 'q2',
      score: 86,
      criterionScores: [
        { criterion: 'Election Timeout vs Heartbeat', score: 88, feedback: 'Clear formulation of randomized election timeouts.' },
        { criterion: 'Pre-Vote Protocol Mechanism', score: 82, feedback: 'Discussed quorum check, could have deepened pre-candidate RPC phase.' },
        { criterion: 'Client Buffer', score: 88, feedback: 'Good handling of pending writes during leader re-elections.' },
      ],
      strengths: [
        'Understood that WAN jitter (800ms) requires election timeouts > 1600ms minimum',
        'Strong clarity around split-brain avoidance',
      ],
      missingConcepts: [
        'Explicit Pre-Vote phase step where candidate checks quorum before incrementing term number',
      ],
      suggestedImprovements: [
        'Specify how stale leader lease expiration interacts with read consistency.',
      ],
      modelExemplarAnswer: 'Set election timeout window (1800ms–3200ms) safely above heartbeat (150ms) plus jitter. Use Raft Pre-Vote extension where node requests permission to campaign without stepping down current leader.',
    },
  ],
  recommendedDrills: [
    'System Design Mock: Distributed Cache Architecture & Client Caching (45m)',
    'Raft Consensus Pre-Vote Phase Under WAN Jitter Simulation (25m)',
    'Multi-Tab BroadcastChannel Synchronization Primitives (30m)',
  ],
};

export const sampleLearningPlan: LearningPlan = {
  id: 'plan_stripe_01',
  userId: 'usr_alex_morgan',
  targetRole: 'Senior Staff Frontend Engineer',
  targetCompany: 'Stripe',
  targetDate: 'Nov 14, 2026',
  completionPercentage: 64,
  totalModules: 28,
  completedModules: 18,
  modules: [
    {
      id: 'mod_1',
      title: 'Distributed Consensus & Edge Cache Invalidation',
      domain: 'System Design',
      priority: 'critical',
      estimatedHours: 2.5,
      completed: false,
      keyTopics: ['Raft Pre-Vote Phase', 'WAN Jitter Tolerances', 'Leader Lease Mechanics'],
      reason: 'Diagnosed as primary delta during Session #14 evaluation to clear Stripe L6 bar.',
    },
    {
      id: 'mod_2',
      title: 'Idempotency & Double-Charge Elimination Patterns',
      domain: 'Payments Infrastructure',
      priority: 'critical',
      estimatedHours: 2.0,
      completed: true,
      keyTopics: ['Idempotency-Key headers', 'Client-side UUID lifecycle', 'Cross-tab locks'],
      reason: 'Core requirement for Stripe Core Payments engineering loops.',
    },
    {
      id: 'mod_3',
      title: 'Optimistic UI Rollbacks & Conflict Resolution',
      domain: 'Frontend Architecture',
      priority: 'high',
      estimatedHours: 3.0,
      completed: false,
      keyTopics: ['CRDTs', 'Mutation queues', 'Rollback visual cues'],
      reason: 'Required for real-time collaboration and responsive dashboard tooling.',
    },
    {
      id: 'mod_4',
      title: 'High-Scale Telemetry & Core Web Vitals (P99)',
      domain: 'Performance Engineering',
      priority: 'high',
      estimatedHours: 2.5,
      completed: true,
      keyTopics: ['CLS elimination', 'RAF scheduling', 'OffscreenCanvas'],
      reason: 'Scored 92% in mock; consolidate mastery with high-frequency drill.',
    },
    {
      id: 'mod_5',
      title: 'Executive STAR Storytelling & Trade-off Articulation',
      domain: 'Behavioral & Leadership',
      priority: 'recommended',
      estimatedHours: 1.5,
      completed: true,
      keyTopics: ['Quantified business impact', 'Conflict resolution', 'Mentorship narratives'],
      reason: 'Enhances bar-raiser interview rounds for Staff/Principal leveling.',
    },
  ],
};

export const sampleSessionHistory: SessionHistoryItem[] = [
  {
    id: 'sess_14',
    date: 'Yesterday at 4:15 PM',
    title: 'Distributed Consensus & Raft Protocols',
    track: 'System Architecture',
    company: 'Stripe (L6)',
    interviewerName: 'Sarah (Principal Architect)',
    score: 89,
    duration: '45m 12s',
    status: 'strong-pass',
    keyWeakness: 'Pre-Vote Protocol Mechanism',
  },
  {
    id: 'sess_13',
    date: 'Oct 23, 2026',
    title: 'React Architecture & State Synchronization',
    track: 'Technical Deep-Dive',
    company: 'Stripe (L5/L6)',
    interviewerName: 'Dr. Elena Vance (AI Architect)',
    score: 84,
    duration: '42m 05s',
    status: 'passed',
    keyWeakness: 'Cross-tab locking mechanisms',
  },
  {
    id: 'sess_12',
    date: 'Oct 20, 2026',
    title: 'Conflict Resolution & Technical Debt Tradeoffs',
    track: 'Behavioral STAR',
    company: 'Meta (E6)',
    interviewerName: 'Marcus Reed (Bar Raiser)',
    score: 86,
    duration: '38m 40s',
    status: 'passed',
    keyWeakness: 'Early stakeholder escalation timing',
  },
  {
    id: 'sess_11',
    date: 'Oct 17, 2026',
    title: 'Financial Transaction Idempotency & Retries',
    track: 'System Architecture',
    company: 'Stripe (L5)',
    interviewerName: 'Sarah (Principal Architect)',
    score: 79,
    duration: '47m 18s',
    status: 'needs-review',
    keyWeakness: 'Client UUID regeneration on retry bug',
  },
  {
    id: 'sess_10',
    date: 'Oct 14, 2026',
    title: 'Real-time Telemetry Dashboard (50k points)',
    track: 'Technical Deep-Dive',
    company: 'Datadog (Staff)',
    interviewerName: 'David Chen (Systems Lead)',
    score: 82,
    duration: '41m 30s',
    status: 'passed',
    keyWeakness: 'OffscreenCanvas worker serialization overhead',
  },
];
