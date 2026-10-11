import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import type { Unit } from '../../src/lib/content-types'

export const ROOT = new URL('../..', import.meta.url).pathname
export const CONTENT_DIR = join(ROOT, 'content')
export const PUBLIC_DIR = join(ROOT, 'public')

export interface UnitFile {
  path: string
  unit: Unit
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return walk(p)
    return name.endsWith('.json') ? [p] : []
  })
}

export function loadUnits(): UnitFile[] {
  return walk(CONTENT_DIR)
    .sort()
    .map((path) => ({ path, unit: JSON.parse(readFileSync(path, 'utf8')) as Unit }))
}

export function saveUnit(file: UnitFile): void {
  writeFileSync(file.path, JSON.stringify(file.unit, null, 2) + '\n')
}

export function rel(path: string): string {
  return relative(ROOT, path)
}
