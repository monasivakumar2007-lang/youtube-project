// ============================================================
// src/utils/moderation.ts
// AI & Rule-based Content Moderation Engine
// Detects abusive words, spam patterns, and repeated special characters
// ============================================================

export interface ModerationResult {
  isBlocked: boolean;
  reason?: 'ABUSIVE_LANGUAGE' | 'SPAM' | 'REPEATED_SPECIAL_CHARACTERS';
  message?: string;
  matchedTerm?: string;
}

// Common abusive / profanity / toxic terms in English and Hinglish
const ABUSIVE_WORDS = [
  'abuse', 'asshole', 'bastard', 'bitch', 'bullshit', 'cunt', 'dick', 'fuck', 'fucking',
  'motherfucker', 'idiot', 'moron', 'retard', 'scam', 'shit', 'slut', 'whore',
  'chutiya', 'madarchod', 'bhenchod', 'harami', 'kutta', 'gandu', 'saala', 'kamina',
  'gaand', 'randi', 'lauda', 'lodu', 'bhosdike'
];

// Spam keywords and promotional phrases
const SPAM_PATTERNS = [
  /buy\s+followers/i,
  /free\s+crypto/i,
  /free\s+money/i,
  /whatsapp\s+me/i,
  /call\s+now\s+for/i,
  /telegram\s*:/i,
  /bit\.ly\//i,
  /tinyurl\.com/i,
  /earn\s+\$?\d+\s+daily/i,
  /subscribe\s+to\s+my\s+channel\s+for/i,
  /dm\s+me\s+for\s+nudes/i,
  /invest\s+now\s+and\s+get/i,
];

// Repeated special characters: e.g. "!!!!!!", "??????", "@@@@@@", "$$$$$$" (4 or more in a row)
const REPEATED_SPECIAL_CHARS_REGEX = /([!@#$%^&*()_+=\-[\]{};':"\\|,.<>/?`~])\1{3,}/;

// Repeated identical characters (e.g. "aaaaaaa", "zzzzzzzz" 6 or more times)
const REPEATED_CHARS_REGEX = /(.)\1{5,}/;

/**
 * Validates comment text against community guidelines.
 * Returns whether comment is blocked, along with the specific reason.
 */
export function moderateCommentText(text: string): ModerationResult {
  if (!text || typeof text !== 'string') {
    return {
      isBlocked: true,
      reason: 'SPAM',
      message: 'Comment text cannot be empty.',
    };
  }

  const cleanText = text.trim();

  if (cleanText.length < 2) {
    return {
      isBlocked: true,
      reason: 'SPAM',
      message: 'Comment is too short.',
    };
  }

  // 1. Check Repeated Special Characters (e.g. "!!!!!!", "??????", "$$$$$")
  const specialMatch = cleanText.match(REPEATED_SPECIAL_CHARS_REGEX);
  if (specialMatch) {
    return {
      isBlocked: true,
      reason: 'REPEATED_SPECIAL_CHARACTERS',
      message: 'Comment blocked: Contains excessive repeated special characters (' + specialMatch[0] + '). Please write meaningful comments.',
      matchedTerm: specialMatch[0],
    };
  }

  // 2. Check Spam Patterns & URLs
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(cleanText)) {
      return {
        isBlocked: true,
        reason: 'SPAM',
        message: 'Comment blocked: Suspected spam or promotional content detected.',
      };
    }
  }

  // Check generic repeated characters spam (e.g. "nooooooooooooooo")
  if (REPEATED_CHARS_REGEX.test(cleanText) && cleanText.length > 20) {
    return {
      isBlocked: true,
      reason: 'SPAM',
      message: 'Comment blocked: Excessive repeated character sequences detected.',
    };
  }

  // 3. Check Abusive Words & Profanity
  const normalizedWords = cleanText
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/);

  for (const word of normalizedWords) {
    if (ABUSIVE_WORDS.includes(word)) {
      return {
        isBlocked: true,
        reason: 'ABUSIVE_LANGUAGE',
        message: 'Comment blocked: Inappropriate or abusive language is not permitted.',
        matchedTerm: word,
      };
    }
  }

  // Text is clean and safe
  return { isBlocked: false };
}
