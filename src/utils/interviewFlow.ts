export type InterviewPhase =
  | 'planning'
  | 'greeting-ready-check'
  | 'asking-question'
  | 'listening'
  | 'ai-thinking'
  | 'completed';

export interface PlannedTopic {
  id: string;
  order: number;
  sectionName?: string;
  title: string;
  category: string;
  focusSource: 'resume' | 'jd' | 'role-calibration';
  rationale: string;
  assessmentCriteria?: string[];
}

export interface TranscriptEntry {
  id: string;
  speaker: 'ai' | 'candidate';
  speakerName: string;
  kind: 'greeting' | 'question' | 'follow-up' | 'response' | 'summary';
  topicOrder?: number;
  topicTitle?: string;
  text: string;
  timestamp: string;
}

export interface VoiceOption {
  id: 'Kore' | 'Zephyr' | 'Charon' | 'Puck' | 'Fenrir';
  label: string;
  description: string;
}

export const INTERVIEWER_VOICE_OPTIONS: VoiceOption[] = [
  { id: 'Kore', label: 'Kore · Warm Executive (Ava)', description: 'Calm, natural human female voice' },
  { id: 'Zephyr', label: 'Zephyr · Crisp Analytical (Emma)', description: 'Measured, articulate human female voice' },
  { id: 'Charon', label: 'Charon · Grounded Director (Andrew)', description: 'Warm, steady human male baritone' },
  { id: 'Puck', label: 'Puck · Collaborative Lead (Brian)', description: 'Friendly, expressive human male voice' },
  { id: 'Fenrir', label: 'Fenrir · Bar-Raiser (Steffan)', description: 'Confident, incisive human male voice' },
];

export function isCandidateReadyConfirmation(spokenText: string): boolean {
  const normalized = (spokenText || '').trim().toLowerCase();
  if (!normalized) return false;

  const negativeSignals = [
    'not ready',
    "i'm not ready",
    'wait',
    'hold on',
    'one second',
    'give me a minute',
    'not yet',
    'repeat',
  ];
  if (negativeSignals.some((sig) => normalized.includes(sig))) {
    return false;
  }

  const positiveSignals = [
    'yes',
    'yeah',
    'yep',
    'sure',
    'ready',
    "let's start",
    'lets start',
    "let's begin",
    'lets begin',
    'start',
    'begin',
    'go ahead',
    'okay',
    'ok',
    'sounds good',
    'definitely',
    'absolutely',
  ];
  return positiveSignals.some((sig) => normalized.includes(sig));
}

export function pickNaturalBrowserVoice<
  T extends { name: string; lang: string; localService?: boolean }
>(voices: T[], personaName?: string, voiceOverride?: string): T | null {
  if (!Array.isArray(voices) || voices.length === 0) return null;

  const englishVoices = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'));
  const pool = englishVoices.length > 0 ? englishVoices : voices;

  const prefersMale = voiceOverride
    ? voiceOverride === 'Charon' || voiceOverride === 'Puck' || voiceOverride === 'Fenrir'
    : personaName === 'Marcus Reed' || personaName === 'David Chen';

  const maleHints = [
    'daniel',
    'arthur',
    'guy',
    'ryan',
    'andrew',
    'christopher',
    'brian',
    'steffan',
    'david',
    'mark',
    'male',
  ];
  const femaleHints = [
    'ava',
    'aria',
    'jenny',
    'samantha',
    'serena',
    'emma',
    'sonia',
    'libby',
    'allison',
    'victoria',
    'karen',
    'female',
  ];

  const scoreVoice = (v: T): number => {
    const n = v.name.toLowerCase();
    let score = 0;
    if (n.includes('natural')) score += 65;
    if (n.includes('neural')) score += 55;
    if (n.includes('online')) score += 45;
    if (n.includes('google us english') || n.includes('google uk english')) score += 45;
    if (n.includes('microsoft') && !n.includes('david desktop')) score += 25;
    if (
      n.includes('samantha') ||
      n.includes('daniel') ||
      n.includes('ava') ||
      n.includes('serena') ||
      n.includes('allison') ||
      n.includes('aria') ||
      n.includes('guy')
    ) {
      score += 32;
    }
    if (v.localService === false) score += 15;

    if (prefersMale) {
      if (maleHints.some((h) => n.includes(h))) score += 22;
      if (femaleHints.some((h) => n.includes(h))) score -= 10;
    } else {
      if (femaleHints.some((h) => n.includes(h))) score += 22;
      if (maleHints.some((h) => n.includes(h))) score -= 10;
    }

    if (n.includes('espeak') || n.includes('compact') || n.includes('festival')) score -= 45;
    return score;
  };

  return [...pool].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] || pool[0];
}

/**
 * Splits spoken AI interviewer prompts into clean sentence-sized chunks so
 * browser SpeechSynthesis maintains natural breath pauses and avoids Android Chrome's ~15s utterance cutoff.
 */
export function splitIntoNaturalSpeechChunks(text: string): string[] {
  const cleaned = (text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  const rawSentences = cleaned.match(/[^.!?]+(?:[.!?]+["')\]]*|$)/g) || [cleaned];
  const chunks: string[] = [];
  let buffer = '';

  for (const sentence of rawSentences) {
    const piece = sentence.trim();
    if (!piece) continue;
    if (!buffer) {
      buffer = piece;
    } else if ((buffer + ' ' + piece).length <= 165) {
      buffer = `${buffer} ${piece}`;
    } else {
      chunks.push(buffer);
      buffer = piece;
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks.length > 0 ? chunks : [cleaned];
}

export function getVoiceToneLabel(personaName?: string, voiceOverride?: string): string {
  if (voiceOverride) {
    const matched = INTERVIEWER_VOICE_OPTIONS.find((v) => v.id === voiceOverride);
    if (matched) return matched.label;
  }
  switch (personaName) {
    case 'Dr. Elena Vance':
      return 'Zephyr · Crisp Analytical (Emma)';
    case 'Marcus Reed':
      return 'Charon · Grounded Director (Andrew)';
    case 'David Chen':
      return 'Puck · Collaborative Lead (Brian)';
    case 'Sarah':
    default:
      return 'Kore · Warm Executive (Ava)';
  }
}

export function formatClockTimestamp(date: Date = new Date()): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
