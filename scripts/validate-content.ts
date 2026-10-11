// Checks all course content:  npm run validate
//   - required fields present and of the right type
//   - ids unique across the whole course
//   - script fields only use characters from the language's Unicode block
//   - audio files exist (a warning; an error with --strict)
// Also prints the items marked needs_check so they can be reviewed.
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Item } from '../src/lib/content-types'
import { foreignChars, normalizeScript } from '../src/lib/text'
import { loadUnits, PUBLIC_DIR, rel } from './lib/content'

const strict = process.argv.includes('--strict')
const showFlagged = process.argv.includes('--flagged')

const errors: string[] = []
const warnings: string[] = []
const flagged: string[] = []
const seen = new Map<string, string>()

function checkId(id: unknown, where: string) {
  if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(id)) {
    errors.push(`${where}: invalid id ${JSON.stringify(id)} (use lowercase letters, digits and dashes)`)
    return
  }
  const prev = seen.get(id)
  if (prev) errors.push(`${where}: duplicate id "${id}" (also in ${prev})`)
  else seen.set(id, where)
}

const STRING_FIELDS = ['id', 'script', 'romanization', 'english', 'audio', 'notes'] as const

for (const { path, unit } of loadUnits()) {
  const file = rel(path)
  if (unit.lang !== 'ml' && unit.lang !== 'bn') errors.push(`${file}: lang must be "ml" or "bn"`)
  checkId(unit.id, file)
  if (!unit.title) errors.push(`${file}: missing title`)
  if (!Array.isArray(unit.lessons) || unit.lessons.length === 0) errors.push(`${file}: no lessons`)

  for (const lesson of unit.lessons ?? []) {
    checkId(lesson.id, `${file} lesson ${lesson.id}`)
    if (!lesson.title) errors.push(`${file} ${lesson.id}: missing title`)
    for (const item of (lesson.items ?? []) as Item[]) {
      const where = `${file} ${item.id ?? '(no id)'}`
      checkId(item.id, where)
      for (const f of STRING_FIELDS) {
        if (typeof item[f] !== 'string') errors.push(`${where}: "${f}" must be a string`)
      }
      if (!item.script?.trim()) errors.push(`${where}: empty script`)
      if (!item.romanization?.trim()) errors.push(`${where}: empty romanization`)
      if (!item.english?.trim()) errors.push(`${where}: empty english`)
      if (!Array.isArray(item.tags)) errors.push(`${where}: "tags" must be an array`)
      if (typeof item.needs_check !== 'boolean') errors.push(`${where}: "needs_check" must be true or false`)

      if (typeof item.script === 'string') {
        const bad = foreignChars(item.script, unit.lang)
        if (bad.length) errors.push(`${where}: script has characters outside the ${unit.lang} block: ${JSON.stringify(bad.join(''))}`)
        if (normalizeScript(item.script, unit.lang) !== item.script) {
          errors.push(`${where}: script is not in canonical form (NFC, atomic chillu). Retype or normalize it.`)
        }
      }
      if (/[^\x20-\x7E]/.test(item.romanization ?? '')) {
        errors.push(`${where}: romanization should be plain ASCII (no diacritics)`)
      }
      if (!item.audio) warnings.push(`${where}: no audio yet (run npm run audio)`)
      else if (!existsSync(join(PUBLIC_DIR, item.audio))) warnings.push(`${where}: audio file missing: ${item.audio}`)

      if (item.needs_check) flagged.push(`${where}: ${item.script}  (${item.romanization}) = ${item.english}`)
    }
  }
}

for (const w of warnings) console.warn(`warning: ${w}`)
for (const e of errors) console.error(`error: ${e}`)
if (showFlagged) {
  console.log(`\nItems marked needs_check (${flagged.length}):`)
  for (const f of flagged) console.log(`  ${f}`)
}
console.log(`\n${seen.size} ids checked, ${errors.length} error(s), ${warnings.length} warning(s), ${flagged.length} item(s) need checking.`)
if (errors.length || (strict && warnings.length)) process.exit(1)
