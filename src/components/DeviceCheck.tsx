// Phase 1: proves the platform works on the phone (install, offline, audio,
// native keyboards, microphone). Later this becomes Settings > Device check.
import { useCallback, useEffect, useRef, useState } from 'react'
import mlTest from '../../content/_test/ml.json'
import bnTest from '../../content/_test/bn.json'
import type { Item, Lang, Unit } from '../lib/content-types'
import { deleteAudio, downloadAudio, isDownloaded, playUrl, prepareAudio, stopPlayback } from '../lib/audio'
import { recordingSupported, startRecording, type Recording } from '../lib/recorder'
import { formatBytes, getStorageInfo, isStandalone, requestPersistence, type StorageInfo } from '../lib/storage'
import { codepoints, compareKey } from '../lib/text'

const ML_ITEM = (mlTest as Unit).lessons[0].items[0]
const BN_ITEM = (bnTest as Unit).lessons[0].items[0]
const TEST_AUDIO = [ML_ITEM.audio, BN_ITEM.audio].filter(Boolean)

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online
}

export function DeviceCheck() {
  const [storage, setStorage] = useState<StorageInfo | null>(null)
  const refreshStorage = useCallback(() => {
    getStorageInfo().then(setStorage)
  }, [])
  useEffect(refreshStorage, [refreshStorage])

  return (
    <>
      <StatusCard storage={storage} onChange={refreshStorage} />
      <AudioCard onChange={refreshStorage} />
      <KeyboardCard lang="ml" label="Malayalam keyboard" target="അവൻ" targetRoman="avan" />
      <KeyboardCard lang="bn" label="Bangla keyboard" target="আমি" targetRoman="ami" />
      <RecordCard />
    </>
  )
}

function StatusCard({ storage, onChange }: { storage: StorageInfo | null; onChange: () => void }) {
  const online = useOnline()
  const standalone = isStandalone()
  const ask = async () => {
    await requestPersistence()
    onChange()
  }
  return (
    <section className="card">
      <h2>App status</h2>
      <dl className="facts">
        <dt>Version</dt>
        <dd>
          {__APP_VERSION__} <span className="muted">· built {new Date(__BUILD_TIME__).toLocaleString()}</span>
        </dd>
        <dt>Installed</dt>
        <dd className={standalone ? 'ok' : 'warn'}>{standalone ? 'Yes, running from home screen' : 'No, running in Safari'}</dd>
        <dt>Network</dt>
        <dd className={online ? 'ok' : 'warn'}>{online ? 'Online' : 'Offline'}</dd>
        <dt>Storage used</dt>
        <dd>
          {formatBytes(storage?.usedBytes ?? null)}
          {storage?.quotaBytes ? <span className="muted"> of {formatBytes(storage.quotaBytes)}</span> : null}
        </dd>
        <dt>Persistent</dt>
        <dd className={storage?.persisted ? 'ok' : 'warn'}>
          {storage?.persisted === null ? 'Not supported' : storage?.persisted ? 'Yes' : 'Not yet'}
        </dd>
      </dl>
      {storage && storage.persisted === false && (
        <button className="btn" onClick={ask}>
          Request persistent storage
        </button>
      )}
    </section>
  )
}

function AudioCard({ onChange }: { onChange: () => void }) {
  const [downloaded, setDownloaded] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (TEST_AUDIO.length === 0) return setDownloaded(false)
    const flags = await Promise.all(TEST_AUDIO.map(isDownloaded))
    setDownloaded(flags.every(Boolean))
  }, [])
  useEffect(() => {
    refresh()
  }, [refresh])

  const download = async () => {
    setBusy(true)
    setError('')
    try {
      await downloadAudio(TEST_AUDIO)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setBusy(false)
    refresh()
    onChange()
  }
  const remove = async () => {
    await deleteAudio(TEST_AUDIO)
    refresh()
    onChange()
  }

  return (
    <section className="card">
      <h2>Audio</h2>
      {TEST_AUDIO.length === 0 ? (
        <p className="warn">
          No audio has been generated yet. Run the "Generate audio" workflow on GitHub (see SETUP.md), then reload.
        </p>
      ) : (
        <>
          <PhraseRow item={ML_ITEM} lang="ml" />
          <PhraseRow item={BN_ITEM} lang="bn" slowOption />
          <p className="muted">
            Saved for offline: {downloaded === null ? '…' : downloaded ? 'yes' : 'no'}
          </p>
          <div className="row">
            <button className="btn btn-primary" onClick={download} disabled={busy || downloaded === true}>
              {busy ? 'Downloading…' : 'Download for offline'}
            </button>
            <button className="btn" onClick={remove} disabled={!downloaded}>
              Delete audio
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </>
      )}
    </section>
  )
}

function PhraseRow({ item, lang, slowOption }: { item: Item; lang: Lang; slowOption?: boolean }) {
  const [url, setUrl] = useState<string | null>(null)
  const [slow, setSlow] = useState(false)
  const [error, setError] = useState('')

  // Resolve the URL ahead of the tap so play() runs inside the tap on iOS.
  useEffect(() => {
    if (item.audio) prepareAudio(item.audio).then(setUrl)
  }, [item.audio])

  const play = () => {
    if (!url) return
    setError('')
    playUrl(url, slow ? 0.75 : 1).catch((e) => setError(e instanceof Error ? e.message : String(e)))
    // A file downloaded after the first resolve should switch to the cached copy.
    prepareAudio(item.audio).then(setUrl)
  }

  return (
    <div className="phrase">
      <div className="phrase-text">
        <div className={`script script-${lang}`} lang={lang}>
          {item.script}
        </div>
        <div className="roman">{item.romanization}</div>
        <div className="muted">{item.english}</div>
      </div>
      <div className="phrase-actions">
        <button className="btn btn-icon" onClick={play} disabled={!url} aria-label="Play">
          ▶
        </button>
        {slowOption && (
          <button className={`btn btn-small ${slow ? 'btn-on' : ''}`} onClick={() => setSlow(!slow)} aria-pressed={slow}>
            Slow
          </button>
        )}
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  )
}

function KeyboardCard({ lang, label, target, targetRoman }: { lang: Lang; label: string; target: string; targetRoman: string }) {
  const [text, setText] = useState('')
  const key = compareKey(text, lang)
  const matches = key !== '' && (key === compareKey(target, lang) || key === compareKey(targetRoman, lang))
  return (
    <section className="card">
      <h2>{label}</h2>
      <p className="muted">
        Switch to the {lang === 'ml' ? 'Malayalam' : 'Bangla'} keyboard (🌐 key) and type{' '}
        <span className={`script-inline script-${lang}`} lang={lang}>
          {target}
        </span>{' '}
        ({targetRoman}).
      </p>
      <input
        className={`answer script-${lang}`}
        lang={lang}
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="done"
        placeholder="Type here"
      />
      {text && (
        <>
          <p className={matches ? 'ok' : 'muted'}>{matches ? '✓ Matches' : 'Does not match yet'}</p>
          <p className="codepoints">{codepoints(text).join(' ')}</p>
        </>
      )}
    </section>
  )
}

function RecordCard() {
  const [recording, setRecording] = useState<Recording | null>(null)
  const [mine, setMine] = useState<string | null>(null)
  const [modelUrl, setModelUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [seconds, setSeconds] = useState(0)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (BN_ITEM.audio) prepareAudio(BN_ITEM.audio).then(setModelUrl)
  }, [])
  useEffect(() => () => window.clearInterval(timer.current), [])

  if (!recordingSupported()) {
    return (
      <section className="card">
        <h2>Microphone</h2>
        <p className="error">Recording isn't supported in this browser.</p>
      </section>
    )
  }

  const start = async () => {
    setError('')
    stopPlayback()
    try {
      const rec = await startRecording()
      setRecording(rec)
      setSeconds(0)
      timer.current = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch (e) {
      setError(e instanceof Error && e.name === 'NotAllowedError' ? 'Microphone permission was denied.' : String(e))
    }
  }
  const stop = async () => {
    if (!recording) return
    window.clearInterval(timer.current)
    const blob = await recording.stop()
    setRecording(null)
    if (mine) URL.revokeObjectURL(mine)
    setMine(URL.createObjectURL(blob))
  }
  const report = (e: unknown) => setError(e instanceof Error ? e.message : String(e))
  const playMine = () => {
    if (mine) playUrl(mine).catch(report)
  }
  const playBoth = () => {
    if (!mine || !modelUrl) return
    playUrl(modelUrl)
      .then(() => playUrl(mine))
      .catch(report)
  }

  return (
    <section className="card">
      <h2>Microphone</h2>
      <p className="muted">
        Shadowing test: say{' '}
        <span className="script-inline script-bn" lang="bn">
          {BN_ITEM.script}
        </span>{' '}
        ({BN_ITEM.romanization}), then compare.
      </p>
      <div className="row">
        {recording ? (
          <button className="btn btn-record on" onClick={stop}>
            ■ Stop ({seconds}s)
          </button>
        ) : (
          <button className="btn btn-record" onClick={start}>
            ● Record
          </button>
        )}
      </div>
      <div className="row">
        <button className="btn" onClick={playMine} disabled={!mine || !!recording}>
          Play mine
        </button>
        <button className="btn" onClick={playBoth} disabled={!mine || !modelUrl || !!recording}>
          Model, then mine
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </section>
  )
}
