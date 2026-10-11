import { DeviceCheck } from './components/DeviceCheck'
import { UpdatePrompt } from './components/UpdatePrompt'

export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Device check</h1>
        <p className="muted">Phase 1: make sure everything works on this phone.</p>
      </header>
      <main>
        <DeviceCheck />
      </main>
      <UpdatePrompt />
    </div>
  )
}
