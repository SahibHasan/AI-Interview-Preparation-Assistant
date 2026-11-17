export const INTERVIEW_ROLE_OPTIONS = [
  'Software Developer',
  'Software Engineer',
  'Full Stack Engineer',
  'Senior Frontend Engineer',
  'Backend Systems Engineer',
  'DevOps / Cloud Engineer',
  'Site Reliability Engineer (SRE)',
  'Data Engineer',
  'Machine Learning / AI Engineer',
  'Mobile App Developer (iOS / Android)',
  'QA / Automation Engineer (SDET)',
  'Cybersecurity Engineer',
  'Product Manager',
  'Engineering Manager',
] as const;

export const CUSTOM_ROLE_VALUE = '__custom__';

export type InterviewTypeValue = 'technical' | 'behavioral' | 'system-design' | 'hr-cultural';

export const INTERVIEW_TYPE_LABELS: Record<InterviewTypeValue, string> = {
  technical: 'Technical & Core CS Loop',
  behavioral: 'Behavioral & Leadership (STAR)',
  'system-design': 'Distributed System Design',
  'hr-cultural': 'HR & Cultural Alignment',
};

export function isPresetRole(role: string): boolean {
  const normalized = (role || '').trim().toLowerCase();
  return INTERVIEW_ROLE_OPTIONS.some((preset) => preset.toLowerCase() === normalized);
}
