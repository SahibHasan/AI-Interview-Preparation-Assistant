export const ALLOWED_AVATAR_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
] as const;

export const MAX_AVATAR_RAW_BYTES = 5 * 1024 * 1024; // 5MB raw upload limit
export const MAX_AVATAR_URL_LENGTH = 1_200_000; // ~1.2MB serialized data URL ceiling

export interface AvatarValidationResult {
  valid: boolean;
  error?: string;
}

export function validateAvatarFile(fileMeta: { type?: string; size: number }): AvatarValidationResult {
  const normalizedType = (fileMeta.type || '').toLowerCase();
  if (!ALLOWED_AVATAR_MIME_TYPES.includes(normalizedType as any)) {
    return {
      valid: false,
      error: 'Please select a valid image file (PNG, JPG, WebP, or GIF).',
    };
  }
  if (fileMeta.size <= 0) {
    return {
      valid: false,
      error: 'The selected image file is empty.',
    };
  }
  if (fileMeta.size > MAX_AVATAR_RAW_BYTES) {
    return {
      valid: false,
      error: 'Profile image must be smaller than 5 MB.',
    };
  }
  return { valid: true };
}

export function isValidAvatarUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > MAX_AVATAR_URL_LENGTH) return false;
  if (/^https?:\/\/.+/i.test(trimmed)) return true;
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) return true;
  return false;
}

export function formatAuthProviderLabel(provider?: 'email' | 'google' | 'github' | string): string {
  switch (provider) {
    case 'google':
      return 'Google (Gmail)';
    case 'github':
      return 'GitHub OAuth';
    default:
      return 'Email & Password';
  }
}

export function getDefaultAvatarUrl(name: string = 'Candidate'): string {
  const parts = String(name || 'Candidate').trim().split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : (parts[0] || 'C').slice(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="64" fill="#4f46e5"/><text x="50%" y="53%" dominant-baseline="middle" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="48" font-weight="700" fill="#ffffff">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Compresses & crops/fits an uploaded image File into a compact square-friendly Data URL
 * suitable for persistent database storage.
 */
export async function resizeImageFileToDataUrl(file: File, maxDimension = 256): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return rawDataUrl;
  }

  return await new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDimension / Math.max(img.width || 1, img.height || 1));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.85);
        resolve(compressed && compressed.length < rawDataUrl.length ? compressed : rawDataUrl);
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}
