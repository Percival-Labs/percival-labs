/**
 * Content sanitization for untrusted platform content.
 *
 * Strips potential prompt injection patterns from social media post content.
 * We read posts to understand conversations, but NEVER execute instructions
 * embedded in post content.
 */

const INJECTION_PATTERNS = [
  // Instruction patterns
  /(?:you must|you should|execute|run this|fetch this|download|delete|ignore previous|disregard|system prompt|override|<\/?system>|<\/?instruction>)/gi,

  // Script/executable URLs
  /https?:\/\/[^\s]+\.(sh|bash|ps1|cmd|exe|py|js|ts)\b/gi,

  // Shell code blocks
  /```(?:bash|sh|shell|cmd|powershell)[\s\S]*?```/gi,
];

// Base64 blocks (80+ chars of base64 alphabet)
const BASE64_PATTERN = /[A-Za-z0-9+/]{80,}={0,2}/g;

/**
 * Sanitize a string by replacing injection patterns with [filtered].
 */
export function sanitize(raw: string): string {
  // Cap input length to prevent ReDoS on pathological strings
  let clean = raw.length > 50_000 ? raw.slice(0, 50_000) : raw;

  for (const pattern of INJECTION_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    clean = clean.replace(pattern, '[filtered]');
  }

  clean = clean.replace(BASE64_PATTERN, '[filtered-data]');

  return clean;
}

/**
 * Deep sanitize: recursively sanitize all string values in an object.
 */
export function sanitizeDeep(obj: unknown): unknown {
  if (typeof obj === 'string') return sanitize(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeDeep);
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = sanitizeDeep(v);
    }
    return result;
  }
  return obj;
}
