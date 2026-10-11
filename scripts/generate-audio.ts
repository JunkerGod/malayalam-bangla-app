// Generates missing audio for every content item with Azure AI Speech.
//
//   npm run audio              generate what's missing
//   npm run audio -- --dry-run list what would be generated
//   npm run audio -- --limit 200   stop after 200 new files
//   npm run audio -- --prune   also delete audio files no item uses
//
// Needs AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in the environment (never in the repo).
// Files are named by a hash of voice + text, so a file is only generated once
// and editing an item's text automatically produces a new file.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Item, Lang } from '../src/lib/content-types'
import { loadUnits, PUBLIC_DIR, rel, saveUnit, type UnitFile } from './lib/content'

const VOICES: Record<Lang, Record<NonNullable<Item['speaker']>, string>> = {
  ml: { narrator: 'ml-IN-SobhanaNeural', female: 'ml-IN-SobhanaNeural', male: 'ml-IN-MidhunNeural' },
  bn: { narrator: 'bn-BD-NabanitaNeural', female: 'bn-BD-NabanitaNeural', male: 'bn-BD-PradeepNeural' },
}
const LOCALES: Record<Lang, string> = { ml: 'ml-IN', bn: 'bn-BD' }
// Small but clear for speech, and MP3 plays everywhere including iOS Safari.
const FORMAT = 'audio-24khz-48kbitrate-mono-mp3'
// Azure's free tier allows 20 requests per minute.
const MIN_INTERVAL_MS = 3100

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const prune = args.includes('--prune')
const limitArg = args.indexOf('--limit')
const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : Infinity

const key = process.env.AZURE_SPEECH_KEY
const region = process.env.AZURE_SPEECH_REGION

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function synthesize(text: string, lang: Lang, voice: string): Promise<Buffer> {
  const ssml =
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${LOCALES[lang]}">` +
    `<voice name="${voice}">${escapeXml(text)}</voice></speak>`
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key!,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': FORMAT,
        'User-Agent': 'malayalam-bangla-app-audio',
      },
      body: ssml,
    })
    if (res.ok) return Buffer.from(await res.arrayBuffer())
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Azure rejected the key (HTTP ${res.status}). Check AZURE_SPEECH_KEY and AZURE_SPEECH_REGION.`)
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 6) {
      const wait = Number(res.headers.get('retry-after')) * 1000 || 2000 * 2 ** attempt
      console.warn(`  HTTP ${res.status}, retrying in ${Math.round(wait / 1000)}s`)
      await sleep(wait)
      continue
    }
    throw new Error(`Azure TTS failed (HTTP ${res.status}): ${await res.text()}`)
  }
}

async function main() {
  const files = loadUnits()
  const used = new Set<string>()
  const changed = new Set<UnitFile>()
  const todo: Array<{ item: Item; lang: Lang; voice: string; text: string; path: string }> = []

  for (const file of files) {
    const lang = file.unit.lang
    for (const lesson of file.unit.lessons) {
      for (const item of lesson.items) {
        const text = (item.tts ?? item.script).normalize('NFC').trim()
        const voice = VOICES[lang][item.speaker ?? 'narrator']
        const hash = createHash('sha1').update(`${voice}|${FORMAT}|${text}`).digest('hex').slice(0, 16)
        const path = `audio/${lang}/${hash}.mp3`
        used.add(path)
        if (item.audio !== path) {
          item.audio = path
          changed.add(file)
        }
        if (!existsSync(join(PUBLIC_DIR, path))) todo.push({ item, lang, voice, text, path })
      }
    }
  }

  // Record the audio paths in the content even before generating, so a
  // missing file shows up in validation instead of silently having no audio.
  if (!dryRun) {
    for (const f of changed) {
      saveUnit(f)
      console.log(`Updated audio paths in ${rel(f.path)}`)
    }
  }

  const chars = todo.reduce((n, t) => n + t.text.length, 0)
  console.log(`${todo.length} audio file(s) missing (${chars} characters).`)

  if (dryRun) {
    for (const t of todo) console.log(`  ${t.item.id}  ${t.text}  -> ${t.path}`)
  } else if (todo.length > 0) {
    if (!key || !region) {
      console.error('AZURE_SPEECH_KEY and AZURE_SPEECH_REGION must be set to generate audio. See SETUP.md.')
      process.exit(1)
    }
    let done = 0
    for (const t of todo) {
      if (done >= limit) {
        console.log(`Stopped after --limit ${limit}. Run again to continue.`)
        break
      }
      const started = Date.now()
      const audio = await synthesize(t.text, t.lang, t.voice)
      const out = join(PUBLIC_DIR, t.path)
      mkdirSync(join(out, '..'), { recursive: true })
      writeFileSync(out, audio)
      done++
      console.log(`  [${done}/${Math.min(todo.length, limit)}] ${t.item.id}  ${t.text}  (${(audio.length / 1024).toFixed(1)} KB)`)
      const elapsed = Date.now() - started
      if (elapsed < MIN_INTERVAL_MS) await sleep(MIN_INTERVAL_MS - elapsed)
    }
  }

  if (prune) {
    for (const lang of Object.keys(LOCALES)) {
      const dir = join(PUBLIC_DIR, 'audio', lang)
      if (!existsSync(dir)) continue
      for (const name of readdirSync(dir)) {
        const path = `audio/${lang}/${name}`
        if (!used.has(path)) {
          console.log(`  pruning unused ${path}`)
          if (!dryRun) unlinkSync(join(PUBLIC_DIR, path))
        }
      }
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
