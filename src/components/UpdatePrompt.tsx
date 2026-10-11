import { useRegisterSW } from 'virtual:pwa-register/react'

const CHECK_INTERVAL_MS = 30 * 60 * 1000

/**
 * Shows "Update available" when a new deploy has been downloaded in the
 * background. Installed iOS apps are rarely restarted, so we also check for
 * a new version every time the app comes back to the foreground.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => {
        if (navigator.onLine) registration.update().catch(() => {})
      }
      setInterval(check, CHECK_INTERVAL_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
  })

  if (!needRefresh) return null
  return (
    <div className="update-banner" role="status">
      <span>A new version is ready.</span>
      <button className="btn btn-primary" onClick={() => updateServiceWorker(true)}>
        Update now
      </button>
    </div>
  )
}
