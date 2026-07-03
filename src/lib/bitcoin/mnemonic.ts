import {
  generateMnemonic,
  mnemonicToSeedSync,
  validateMnemonic,
} from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

export { wordlist };

export type MnemonicLength = 12 | 24;

const STRENGTH: Record<MnemonicLength, number> = { 12: 128, 24: 256 };

/** Generate a fresh mnemonic using the platform CSPRNG. */
export function createMnemonic(words: MnemonicLength = 12): string {
  return generateMnemonic(wordlist, STRENGTH[words]);
}

/**
 * Normalize free-form user input into canonical mnemonic form:
 * lowercase, single-spaced, trimmed. Import UIs should normalize
 * before validating so stray whitespace never fails a good phrase.
 */
export function normalizeMnemonic(input: string): string {
  return input.trim().toLowerCase().split(/\s+/).join(' ');
}

/** Validate words + checksum (normalizes first). */
export function isValidMnemonic(input: string): boolean {
  return validateMnemonic(normalizeMnemonic(input), wordlist);
}

/** BIP39 seed (64 bytes). The optional passphrase changes every derived key. */
export function mnemonicToSeed(mnemonic: string, passphrase = ''): Uint8Array {
  return mnemonicToSeedSync(normalizeMnemonic(mnemonic), passphrase);
}

/** Is this a word in the English BIP39 list? (exact match, lowercase) */
export function isBip39Word(word: string): boolean {
  return wordlist.includes(word.toLowerCase());
}

/** Autocomplete suggestions for a partial word. */
export function suggestWords(prefix: string, limit = 5): string[] {
  const p = prefix.toLowerCase();
  if (!p) return [];
  return wordlist.filter((w) => w.startsWith(p)).slice(0, limit);
}
