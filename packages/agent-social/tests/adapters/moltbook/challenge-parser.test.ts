import { describe, test, expect } from 'bun:test';
import {
  parseChallenge,
  mergeFragments,
  wordToNumber,
  stripDecorators,
  parseNumbers,
} from '../../../src/adapters/moltbook/challenge-parser.js';

describe('stripDecorators', () => {
  test('removes brackets', () => {
    expect(stripDecorators('[f]o[r] t{y}')).toBe('for ty');
  });

  test('removes braces and parens', () => {
    expect(stripDecorators('(twen){ty}')).toBe('twenty');
  });

  test('leaves plain text alone', () => {
    expect(stripDecorators('forty two')).toBe('forty two');
  });
});

describe('mergeFragments', () => {
  test('merges "for" + "ty" into "forty"', () => {
    expect(mergeFragments(['for', 'ty'])).toEqual(['forty']);
  });

  test('merges "twen" + "ty" into "twenty"', () => {
    expect(mergeFragments(['twen', 'ty'])).toEqual(['twenty']);
  });

  test('merges "six" + "teen" into "sixteen"', () => {
    expect(mergeFragments(['six', 'teen'])).toEqual(['sixteen']);
  });

  test('merges "eigh" + "ty" into "eighty"', () => {
    expect(mergeFragments(['eigh', 'ty'])).toEqual(['eighty']);
  });

  test('preserves non-number words', () => {
    expect(mergeFragments(['the', 'cat', 'sat'])).toEqual([
      'the',
      'cat',
      'sat',
    ]);
  });

  test('handles mixed: merge numbers, keep words', () => {
    expect(mergeFragments(['for', 'ty', 'cats'])).toEqual(['forty', 'cats']);
  });

  test('merges "thir" + "teen" into "thirteen"', () => {
    expect(mergeFragments(['thir', 'teen'])).toEqual(['thirteen']);
  });

  test('merges "fif" + "teen" into "fifteen"', () => {
    expect(mergeFragments(['fif', 'teen'])).toEqual(['fifteen']);
  });
});

describe('wordToNumber', () => {
  test('converts basic words', () => {
    expect(wordToNumber('zero')).toBe(0);
    expect(wordToNumber('one')).toBe(1);
    expect(wordToNumber('ten')).toBe(10);
    expect(wordToNumber('twenty')).toBe(20);
    expect(wordToNumber('hundred')).toBe(100);
  });

  test('case insensitive', () => {
    expect(wordToNumber('FORTY')).toBe(40);
    expect(wordToNumber('Twenty')).toBe(20);
  });

  test('returns null for non-numbers', () => {
    expect(wordToNumber('cat')).toBeNull();
    expect(wordToNumber('hello')).toBeNull();
  });
});

describe('parseNumbers', () => {
  test('parses single number words', () => {
    expect(parseNumbers(['five'])).toEqual([5]);
  });

  test('parses compound numbers: twenty three = 23', () => {
    expect(parseNumbers(['twenty', 'three'])).toEqual([23]);
  });

  test('parses compound numbers: forty two = 42', () => {
    expect(parseNumbers(['forty', 'two'])).toEqual([42]);
  });

  test('parses numeric literals', () => {
    expect(parseNumbers(['42'])).toEqual([42]);
  });

  test('handles mixed text and numbers', () => {
    expect(parseNumbers(['the', 'forty', 'two', 'cats'])).toEqual([42]);
  });

  test('handles multiple numbers in sequence', () => {
    expect(
      parseNumbers(['twenty', 'three', 'plus', 'five']),
    ).toEqual([23, 5]);
  });
});

describe('parseChallenge — real obfuscated examples', () => {
  // These are the exact patterns that broke our old solver

  test('"for ty" split word = 40', () => {
    const result = parseChallenge(
      'A lobster swims at for ty centimeters. It gains six teen. What is the total?',
    );
    expect(result).not.toBeNull();
    expect(result!.numbers).toEqual([40, 16]);
    expect(result!.operation).toBe('add');
    expect(result!.answer).toBe(56);
  });

  test('"twen ty three" split compound = 23', () => {
    const result = parseChallenge(
      'An agent processes twen ty three requests. It loses five. How many remain?',
    );
    expect(result).not.toBeNull();
    expect(result!.numbers).toEqual([23, 5]);
    expect(result!.operation).toBe('subtract');
    expect(result!.answer).toBe(18);
  });

  test('randomized case: "fOr Ty"', () => {
    const result = parseChallenge(
      'A node has fOr Ty connections. It gains twen Ty more. What is the total?',
    );
    expect(result).not.toBeNull();
    expect(result!.answer).toBe(60);
  });

  test('brackets: "[f]o[r] t{y}"', () => {
    const result = parseChallenge(
      'A bot scores [f]o[r] t{y} points. It loses (fif) {teen}. How many remain?',
    );
    expect(result).not.toBeNull();
    expect(result!.numbers).toEqual([40, 15]);
    expect(result!.operation).toBe('subtract');
    expect(result!.answer).toBe(25);
  });

  test('plain numeric addition', () => {
    const result = parseChallenge('What is 15 plus 27?');
    expect(result).not.toBeNull();
    expect(result!.answer).toBe(42);
  });

  test('multiplication keyword', () => {
    const result = parseChallenge(
      'A factory produces twelve items. Multiply by three. What is the product?',
    );
    expect(result).not.toBeNull();
    expect(result!.operation).toBe('multiply');
    expect(result!.answer).toBe(36);
  });

  test('division', () => {
    const result = parseChallenge(
      'An agent has ninety tokens. Divide by three. What is the result?',
    );
    expect(result).not.toBeNull();
    expect(result!.operation).toBe('divide');
    expect(result!.answer).toBe(30);
  });

  test('returns null when not enough numbers', () => {
    const result = parseChallenge('Hello world, no numbers here');
    expect(result).toBeNull();
  });

  test('"gains" recognized as addition', () => {
    const result = parseChallenge(
      'A sensor reads forty two. It gains eight. What is the total?',
    );
    expect(result).not.toBeNull();
    expect(result!.operation).toBe('add');
    expect(result!.answer).toBe(50);
  });

  test('"loses" recognized as subtraction', () => {
    const result = parseChallenge(
      'A tank has fifty liters. It loses twelve. How many remain?',
    );
    expect(result).not.toBeNull();
    expect(result!.operation).toBe('subtract');
    expect(result!.answer).toBe(38);
  });
});
