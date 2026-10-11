// Audio download, offline storage and playback.
//
// Audio is kept in its own Cache Storage bucket, downloaded per unit, so it can
// be deleted per unit too. Playback goes through one shared <audio> element:
// iOS only lets a page play sound after a tap, and an element that has played
// once from a tap may keep playing later (e.g. "model, then my recording").
// <audio> also keeps playing when the iPhone's silent switch is on.

const CACHE_NAME = 'audio-v1'

let player: HTMLAudioElement | null = null
const objectUrls = new Map<string, string>()

function absolute(path: string): string {
  return new URL(path, window.location.origin + '/').href
}

export function getPlayer(): HTMLAudioElement {
  if (!player) {
    player = new Audio()
    player.preload = 'auto'
    player.setAttribute('playsinline', '')
  }
  return player
}

export async function isDownloaded(path: string): Promise<boolean> {
  const cache = await caches.open(CACHE_NAME)
  return (await cache.match(absolute(path))) !== undefined
}

/** Downloads any files not already stored. Calls onProgress(done, total). */
export async function downloadAudio(paths: string[], onProgress?: (done: number, total: number) => void): Promise<void> {
  const cache = await caches.open(CACHE_NAME)
  let done = 0
  for (const path of paths) {
    const url = absolute(path)
    if (!(await cache.match(url))) {
      const res = await fetch(url, { cache: 'no-store' })
      const type = res.headers.get('content-type') ?? ''
      if (!res.ok || !type.startsWith('audio/')) throw new Error(`Could not download ${path} (HTTP ${res.status})`)
      await cache.put(url, res)
    }
    onProgress?.(++done, paths.length)
  }
}

export async function deleteAudio(paths: string[]): Promise<void> {
  const cache = await caches.open(CACHE_NAME)
  for (const path of paths) {
    await cache.delete(absolute(path))
    const objectUrl = objectUrls.get(path)
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
      objectUrls.delete(path)
    }
  }
}

/**
 * Resolves a playable URL: a blob URL from the offline cache, or the network
 * URL if the file hasn't been downloaded. Call it before the user taps play,
 * so that play() itself runs synchronously inside the tap.
 */
export async function prepareAudio(path: string): Promise<string> {
  const ready = objectUrls.get(path)
  if (ready) return ready
  const cache = await caches.open(CACHE_NAME)
  const res = await cache.match(absolute(path))
  if (!res) return absolute(path)
  const objectUrl = URL.createObjectURL(await res.blob())
  objectUrls.set(path, objectUrl)
  return objectUrl
}

/** Plays a URL on the shared element. Resolves when playback ends. */
export function playUrl(url: string, rate = 1): Promise<void> {
  const el = getPlayer() as HTMLAudioElement & { webkitPreservesPitch?: boolean }
  el.pause()
  el.src = url
  // Safari resets playbackRate to defaultPlaybackRate when a new source loads.
  el.defaultPlaybackRate = rate
  el.playbackRate = rate
  el.preservesPitch = true
  el.webkitPreservesPitch = true
  return new Promise((resolve, reject) => {
    el.onended = () => resolve()
    el.onerror = () => reject(new Error('Audio could not be played'))
    el.play().catch(reject)
  })
}

export function stopPlayback(): void {
  getPlayer().pause()
}
