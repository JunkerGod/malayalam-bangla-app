export interface StorageInfo {
  usedBytes: number | null
  quotaBytes: number | null
  persisted: boolean | null
}

export async function getStorageInfo(): Promise<StorageInfo> {
  const s = navigator.storage
  const estimate = s?.estimate ? await s.estimate().catch(() => null) : null
  const persisted = s?.persisted ? await s.persisted().catch(() => null) : null
  return {
    usedBytes: estimate?.usage ?? null,
    quotaBytes: estimate?.quota ?? null,
    persisted,
  }
}

/** Asks the browser not to evict our data under storage pressure. */
export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  return navigator.storage.persist().catch(() => false)
}

export function formatBytes(n: number | null): string {
  if (n === null) return 'unknown'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`
}

export function isStandalone(): boolean {
  return (
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  )
}
