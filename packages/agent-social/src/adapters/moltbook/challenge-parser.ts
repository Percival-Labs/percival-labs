/**
 * Moltbook challenge solver — robust word problem parser.
 *
 * Previous implementation failed on obfuscated text:
 * - "for ty" (split word for "forty") — couldn't parse
 * - "twen ty three" — couldn't merge fragments
 * - Randomized case "[F]o[r] t{y}" — couldn't strip decorators
 * - "gains" as addition keyword — wasn't recognized
 *
 * This implementation:
 * 1. Strips all non-alphanumeric decorators
 * 2. Greedy-merges adjacent fragments into known number words
 * 3. Handles compound numbers ("twenty three" → 23)
 * 4. Recognizes operation keywords with priority
 */

// ── Number Word Dictionary ──────────────────────────────────────────

const WORD_TO_NUM: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
};

/** All known number words for fragment merging */
const NUMBER_WORDS = Object.keys(WORD_TO_NUM);

// ── Types ───────────────────────────────────────────────────────────

export interface ParsedChallenge {
  numbers: number[];
  operation: 'add' | 'subtract' | 'multiply' | 'divide';
  answer: number;
  rawText: string;
  cleanedText: string;
}

// ── Fragment Merging ────────────────────────────────────────────────

/**
 * Strip non-alphanumeric decorators from text.
 * "[F]o[r] t{y}" → "for ty"
 */
export function stripDecorators(text: string): string {
  // Remove brackets, braces, and other decorators around letters
  return text.replace(/[[\]{}()]/g, '').trim();
}

/**
 * Greedy-merge adjacent fragments into known number words.
 *
 * "for ty" → "forty"
 * "twen ty" → "twenty"
 * "six teen" → "sixteen"
 * "eigh ty" → "eighty"
 *
 * Algorithm: Walk tokens left to right. Try concatenating current + next token.
 * If the concatenation is a known number word, merge them. Otherwise keep current.
 */
export function mergeFragments(tokens: string[]): string[] {
  const result: string[] = [];
  let i = 0;

  while (i < tokens.length) {
    let merged = false;

    // Try merging 3 tokens (e.g., "twen" + "ty" + "three" → but "twenty" is 2 tokens, "three" stays separate)
    if (i + 2 < tokens.length) {
      const three = tokens[i] + tokens[i + 1] + tokens[i + 2];
      if (NUMBER_WORDS.includes(three.toLowerCase())) {
        result.push(three.toLowerCase());
        i += 3;
        merged = true;
      }
    }

    // Try merging 2 tokens
    if (!merged && i + 1 < tokens.length) {
      const two = tokens[i] + tokens[i + 1];
      if (NUMBER_WORDS.includes(two.toLowerCase())) {
        result.push(two.toLowerCase());
        i += 2;
        merged = true;
      }
    }

    if (!merged) {
      result.push(tokens[i]);
      i++;
    }
  }

  return result;
}

// ── Number Parsing ──────────────────────────────────────────────────

/**
 * Convert a single word to a number, or return null.
 */
export function wordToNumber(word: string): number | null {
  const lower = word.toLowerCase();
  return WORD_TO_NUM[lower] ?? null;
}

/**
 * Parse a sequence of tokens into numbers, handling compounds.
 * ["twenty", "three"] → [23]
 * ["forty", "two"] → [42]
 * ["hundred"] → [100]
 * ["5"] → [5]
 */
export function parseNumbers(tokens: string[]): number[] {
  const numbers: number[] = [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    // Try numeric literal first
    const literal = parseFloat(token);
    if (!isNaN(literal)) {
      numbers.push(literal);
      i++;
      continue;
    }

    // Try word number
    const num = wordToNumber(token);
    if (num !== null) {
      // Check for compound: "twenty" + "three" = 23
      // Tens + ones pattern (20-99)
      if (num >= 20 && num <= 90 && num % 10 === 0 && i + 1 < tokens.length) {
        const next = wordToNumber(tokens[i + 1]);
        if (next !== null && next >= 1 && next <= 9) {
          numbers.push(num + next);
          i += 2;
          continue;
        }
      }

      // "hundred" multiplier: "three hundred" or just "hundred"
      if (i + 1 < tokens.length && tokens[i + 1].toLowerCase() === 'hundred') {
        let compound = num * 100;
        i += 2;
        // Optional: "three hundred twenty five"
        if (i < tokens.length) {
          const tens = wordToNumber(tokens[i]);
          if (tens !== null && tens >= 20 && tens <= 90 && tens % 10 === 0) {
            compound += tens;
            i++;
            if (i < tokens.length) {
              const ones = wordToNumber(tokens[i]);
              if (ones !== null && ones >= 1 && ones <= 9) {
                compound += ones;
                i++;
              }
            }
          } else if (tens !== null && tens >= 1 && tens <= 19) {
            compound += tens;
            i++;
          }
        }
        numbers.push(compound);
        continue;
      }

      numbers.push(num);
      i++;
      continue;
    }

    // Not a number — skip
    i++;
  }

  return numbers;
}

// ── Operation Detection ─────────────────────────────────────────────

type Operation = 'add' | 'subtract' | 'multiply' | 'divide';

const OPERATION_PATTERNS: Array<{ op: Operation; pattern: RegExp }> = [
  { op: 'multiply', pattern: /\b(?:multipl|times|product)\b/i },
  {
    op: 'add',
    pattern:
      /\b(?:add|plus|sum|combined|total|together|gains?|increase|more)\b/i,
  },
  {
    op: 'subtract',
    pattern:
      /\b(?:subtract|minus|difference|less|fewer|reduce|loses?|decrease|drop)\b/i,
  },
  {
    op: 'divide',
    pattern: /\b(?:divide|split|quotient|per|ratio|half)\b/i,
  },
  // "twice" / "double" as multiply
  { op: 'multiply', pattern: /\b(?:twice|double|triple)\b/i },
];

function detectOperation(text: string): Operation {
  for (const { op, pattern } of OPERATION_PATTERNS) {
    if (pattern.test(text)) return op;
  }
  // Default to add if no operation keyword found
  return 'add';
}

// ── Main Parser ─────────────────────────────────────────────────────

/**
 * Parse an obfuscated challenge text and compute the answer.
 *
 * Returns null if parsing fails (not enough numbers found).
 */
export function parseChallenge(rawText: string): ParsedChallenge | null {
  // Cap input length to prevent ReDoS on pathological strings
  if (rawText.length > 5000) return null;

  // Step 1: Strip decorators
  const stripped = stripDecorators(rawText);

  // Step 2: Normalize punctuation — strip trailing periods, commas, etc from tokens
  // "two." → "two", "forty," → "forty"
  const rawTokens = stripped.split(/\s+/).filter(Boolean);
  const tokens = rawTokens.map((t) => t.replace(/[.,;:!?]+$/g, ''));

  // Step 3: Merge fragments into known words
  const merged = mergeFragments(tokens);
  const cleanedText = merged.join(' ');

  // Step 4: Extract numbers
  const numbers = parseNumbers(merged);

  if (numbers.length < 2) {
    // Try with just numeric literals from original text as fallback
    const literalNumbers = rawText.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
    if (literalNumbers.length >= 2) {
      const operation = detectOperation(rawText);
      const answer = compute(literalNumbers[0], literalNumbers[1], operation);
      if (answer === null) return null;
      return {
        numbers: literalNumbers,
        operation,
        answer,
        rawText,
        cleanedText,
      };
    }
    return null;
  }

  // Step 5: Detect operation
  const operation = detectOperation(cleanedText);

  // Step 6: Compute
  // Special case: "twice X" / "double X" = X * 2
  if (/\b(?:twice|double)\b/i.test(cleanedText) && numbers.length === 1) {
    return {
      numbers: [numbers[0], 2],
      operation: 'multiply',
      answer: numbers[0] * 2,
      rawText,
      cleanedText,
    };
  }

  const answer = compute(numbers[0], numbers[1], operation);
  if (answer === null) return null;

  return {
    numbers: [numbers[0], numbers[1]],
    operation,
    answer,
    rawText,
    cleanedText,
  };
}

function compute(a: number, b: number, op: Operation): number | null {
  switch (op) {
    case 'add':
      return a + b;
    case 'subtract':
      return a - b;
    case 'multiply':
      return a * b;
    case 'divide':
      return b === 0 ? null : Math.round((a / b) * 100) / 100;
  }
}
