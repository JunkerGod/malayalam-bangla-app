// Microphone recording for shadowing. iOS Safari records audio/mp4 (AAC);
// other browsers usually record webm/opus.

const PREFERRED_TYPES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']

export function recordingSupported(): boolean {
  return typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}

export interface Recording {
  /** Stops recording and resolves with the recorded audio. */
  stop(): Promise<Blob>
}

export async function startRecording(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
  })
  const mimeType = PREFERRED_TYPES.find((t) => MediaRecorder.isTypeSupported(t))
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }
  recorder.start()

  return {
    stop: () =>
      new Promise((resolve) => {
        recorder.onstop = () => {
          // Release the mic straight away: while it is open, iOS routes
          // playback to the quiet earpiece and shows the red mic indicator.
          stream.getTracks().forEach((t) => t.stop())
          resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/mp4' }))
        }
        recorder.stop()
      }),
  }
}
