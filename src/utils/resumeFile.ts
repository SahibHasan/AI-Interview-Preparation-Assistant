export const ACCEPTED_RESUME_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt', '.md'];
export const MAX_RESUME_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

export function validateResumeFile(file: File): { valid: boolean; error?: string } {
  const lower = file.name.toLowerCase();
  const hasSupportedExt = ACCEPTED_RESUME_EXTENSIONS.some((ext) => lower.endsWith(ext));
  if (!hasSupportedExt) {
    return {
      valid: false,
      error: `Unsupported file format (${file.name}). Please upload a .pdf, .docx, .doc, .txt, or .md resume.`,
    };
  }
  if (file.size === 0) {
    return {
      valid: false,
      error: 'The selected file is empty (0 bytes). Please choose a valid resume file.',
    };
  }
  if (file.size > MAX_RESUME_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'File exceeds the 8 MB limit. Please upload a smaller resume document.',
    };
  }
  return { valid: true };
}

export function readFileAsBase64DataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read file contents as base64.'));
      }
    };
    reader.onerror = () => {
      reject(new Error(reader.error?.message || 'Failed to read resume file from disk.'));
    };
    reader.readAsDataURL(file);
  });
}

export function getAtsScoreBand(score: number): {
  label: string;
  barClass: string;
  badgeClass: string;
  textClass: string;
} {
  if (score >= 82) {
    return {
      label: 'Strong ATS Match',
      barClass: 'bg-emerald-500',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      textClass: 'text-emerald-700',
    };
  }
  if (score >= 65) {
    return {
      label: 'Competitive Match',
      barClass: 'bg-[#4f46e5]',
      badgeClass: 'bg-[#eff4ff] text-[#3525cd] border-[#c7d2fe]',
      textClass: 'text-[#3525cd]',
    };
  }
  if (score >= 45) {
    return {
      label: 'Needs Calibration',
      barClass: 'bg-amber-500',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      textClass: 'text-amber-700',
    };
  }
  return {
    label: 'Low ATS Alignment',
    barClass: 'bg-red-500',
    badgeClass: 'bg-red-50 text-red-800 border-red-200',
    textClass: 'text-red-700',
  };
}
