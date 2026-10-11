// Course content schema: language -> unit -> lesson -> items.
// One JSON file per unit lives under content/<lang>/.

export type Lang = 'ml' | 'bn'

export interface Item {
  /** Globally unique and stable forever: progress is keyed by it. */
  id: string
  /** Native script. */
  script: string
  /** Simple romanization without diacritics. */
  romanization: string
  english: string
  /** Path of the generated audio, filled in by `npm run audio`. Empty until then. */
  audio: string
  notes: string
  tags: string[]
  /** True when the spelling, wording or usage should be checked by a fluent speaker. */
  needs_check: boolean
  /** Other answers that also count as correct (script or romanization). */
  alt?: string[]
  /** Text to speak when it differs from `script` (e.g. a lone vowel sign). */
  tts?: string
  /** Who says it in dialogues; picks the voice. */
  speaker?: 'narrator' | 'female' | 'male'
}

export interface Lesson {
  id: string
  title: string
  items: Item[]
}

export interface Unit {
  id: string
  lang: Lang
  title: string
  lessons: Lesson[]
}
