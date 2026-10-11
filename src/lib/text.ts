// Unicode handling shared by the app and the content scripts.
import type { Lang } from './content-types'

const VIRAMA_ML = '്'
const ZWJ = '‍'
const ZWNJ = '‌'

// Old (Unicode < 5.1) chillu encoding is consonant + virama + ZWJ.
// Map it to the atomic chillu letters so both spellings compare equal.
const ML_CHILLU: Array<[string, string]> = [
  ['ണ' + VIRAMA_ML + ZWJ, 'ൺ'], // ണ്‍ -> ൺ
  ['ന' + VIRAMA_ML + ZWJ, 'ൻ'], // ന്‍ -> ൻ
  ['ര' + VIRAMA_ML + ZWJ, 'ർ'], // ര്‍ -> ർ
  ['ല' + VIRAMA_ML + ZWJ, 'ൽ'], // ല്‍ -> ൽ
  ['ള' + VIRAMA_ML + ZWJ, 'ൾ'], // ള്‍ -> ൾ
  ['ക' + VIRAMA_ML + ZWJ, 'ൿ'], // ക്‍ -> ൿ
]

// "nta" (ന്റ) has three encodings in the wild; use the Unicode-recommended one.
const ML_NTA: Array<[string, string]> = [
  ['ൻ' + VIRAMA_ML + 'റ', 'ന' + VIRAMA_ML + 'റ'], // ൻ്റ -> ന്റ
  ['ൻറ', 'ന' + VIRAMA_ML + 'റ'], // ൻറ -> ന്റ
]

// Bangla khanda ta: old encoding ত + hasanta + ZWJ.
const BN_KHANDA_TA: [string, string] = ['ত্' + ZWJ, 'ৎ']

/** Canonical form of native-script text, used before storing or comparing. */
export function normalizeScript(text: string, lang: Lang): string {
  let s = text.normalize('NFC')
  if (lang === 'ml') {
    for (const [from, to] of ML_CHILLU) s = s.split(from).join(to)
    for (const [from, to] of ML_NTA) s = s.split(from).join(to)
  } else {
    s = s.split(BN_KHANDA_TA[0]).join(BN_KHANDA_TA[1])
  }
  return s.normalize('NFC')
}

/**
 * Key used to compare an answer with the expected text: canonical script,
 * lowercased, with joiners, punctuation and extra spaces removed.
 */
export function compareKey(text: string, lang: Lang): string {
  return normalizeScript(text, lang)
    .replace(new RegExp(`[${ZWJ}${ZWNJ}]`, 'g'), '')
    .toLowerCase()
    .replace(/[\p{P}\p{S}।॥]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export const SCRIPT_RANGES: Record<Lang, [number, number]> = {
  ml: [0x0d00, 0x0d7f],
  bn: [0x0980, 0x09ff],
}

/** Characters allowed in a `script` field besides the language's own block. */
const SHARED_ALLOWED = new Set(
  [...' ,.?!\'"‘’“”-–—:;()…0123456789', ZWJ, ZWNJ, '।', '॥'].map((c) => c.codePointAt(0)!),
)

/** Returns the characters that don't belong in native script text for `lang`. */
export function foreignChars(text: string, lang: Lang): string[] {
  const [lo, hi] = SCRIPT_RANGES[lang]
  const bad: string[] = []
  for (const ch of text) {
    const cp = ch.codePointAt(0)!
    if ((cp >= lo && cp <= hi) || SHARED_ALLOWED.has(cp)) continue
    bad.push(ch)
  }
  return bad
}

/** "U+0D28 U+0D4D ..." for debugging what a keyboard actually produced. */
export function codepoints(text: string): string[] {
  return [...text].map((ch) => 'U+' + ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0'))
}
