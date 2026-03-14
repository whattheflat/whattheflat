import { useEffect, useRef, useState } from 'react'

export const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

// simple autocorrelation from existing tuner
function autoCorrelate(buffer, sampleRate) {
  let SIZE = buffer.length
  let sum = 0
  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i]
    sum += val * val
  }
  if (sum < 1e-8) return -1

  let r1 = 0, r2 = SIZE - 1, thres = 0.2
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < thres) { r1 = i; break }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < thres) { r2 = SIZE - i; break }
  }

  buffer = buffer.slice(r1, r2)
  SIZE = buffer.length

  const c = new Array(SIZE).fill(0)
  for (let i = 0; i < SIZE; i++) for (let j = 0; j < SIZE - i; j++) c[i] += buffer[j] * buffer[j + i]

  let d = 0
  while (c[d] > c[d + 1]) d++

  let maxval = -1, maxpos = -1
  for (let i = d; i < SIZE; i++) if (c[i] > maxval) { maxval = c[i]; maxpos = i }
  let T0 = maxpos
  if (!T0) return -1

  const x1 = c[T0 - 1]
  const x2 = c[T0]
  const x3 = c[T0 + 1]
  const a = (x1 + x3 - 2 * x2) / 2
  const b = (x3 - x1) / 2
  if (a) T0 = T0 - b / (2 * a)

  return sampleRate / T0
}

function frequencyToNoteData(freq) {
  if (!freq || freq <= 0) return null
  const A4 = 440
  const noteNum = 12 * Math.log2(freq / A4) + 69
  const rounded = Math.round(noteNum)
  const cents = Math.floor((noteNum - rounded) * 100)
  const noteNames = NOTES
  const name = noteNames[(rounded + 120) % 12]
  const octave = Math.floor(rounded / 12) - 1
  return { freq, note: name, octave, cents }
}

export function useAudioTuner() {
  const [pitchData, setPitchData] = useState(null)
  const [isListening, setIsListening] = useState(false)

  const audioRef = useRef({ ctx: null, analyser: null, source: null, stream: null, raf: null, buf: null })
  const prevPitchRef = useRef(null)
  const lastUpdateRef = useRef(0)
  const UPDATE_INTERVAL_MS = 80 // ~12.5 updates/sec

  useEffect(() => {
    return () => {
      const { raf, stream, source, ctx } = audioRef.current
      if (raf) cancelAnimationFrame(raf)
      if (source) try { source.disconnect() } catch (e) {}
      if (stream) for (const t of stream.getTracks()) t.stop()
      if (ctx) try { ctx.close() } catch (e) {}
    }
  }, [])

  const startListening = async () => {
    if (isListening) return
    try {
      // Read saved device selection from config (if present)
      let deviceId = null
      try {
        const cfg = JSON.parse(localStorage.getItem('wtf_config') || '{}')
        deviceId = cfg.audioDeviceId || null
      } catch (e) {
        // ignore
      }
      const constraints = deviceId ? { audio: { deviceId: { exact: deviceId } } } : { audio: true }
      console.log('Tuner requesting getUserMedia with', constraints)
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 4096
      analyser.smoothingTimeConstant = 0.6
      const source = ctx.createMediaStreamSource(stream)
      source.connect(analyser)

      const buf = new Float32Array(analyser.fftSize)
      audioRef.current = { ctx, analyser, source, stream, raf: null, buf }

      setIsListening(true)

      const tick = () => {
        const { analyser, buf, ctx } = audioRef.current
        analyser.getFloatTimeDomainData(buf)
        const freq = autoCorrelate(buf, ctx.sampleRate)
        const data = frequencyToNoteData(freq)

        // compute RMS signal strength; simple noise gate
        let sum = 0
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
        const rms = Math.sqrt(sum / buf.length)

        // throttle updates to avoid excessive React state churn
        const now = performance.now()
        const prev = prevPitchRef.current
        if (rms < 0.001) {
          if (prev !== null && now - lastUpdateRef.current >= UPDATE_INTERVAL_MS) {
            prevPitchRef.current = null
            lastUpdateRef.current = now
            setPitchData(null)
          }
        } else {
          const shouldUpdateByTime = now - lastUpdateRef.current >= UPDATE_INTERVAL_MS
          if (data && prev) {
            const freqDiff = Math.abs((prev.freq || 0) - (data.freq || 0))
            const centsDiff = Math.abs((prev.cents || 0) - (data.cents || 0))
            const significant = freqDiff >= 0.5 || centsDiff >= 1
            if (significant && shouldUpdateByTime) {
              prevPitchRef.current = data
              lastUpdateRef.current = now
              setPitchData(data)
            }
            // otherwise skip update (either insignificant or too soon)
          } else if (shouldUpdateByTime) {
            // first time audible or no prev — update
            prevPitchRef.current = data
            lastUpdateRef.current = now
            setPitchData(data)
          }
        }

        audioRef.current.raf = requestAnimationFrame(tick)
      }

      audioRef.current.raf = requestAnimationFrame(tick)
    } catch (e) {
      console.error('startListening error', e)
    }
  }

  const stopListening = () => {
    const { raf, stream, source, ctx } = audioRef.current
    if (raf) cancelAnimationFrame(raf)
    if (source) try { source.disconnect() } catch (e) {}
    if (stream) for (const t of stream.getTracks()) t.stop()
    if (ctx) try { ctx.close() } catch (e) {}
    audioRef.current = { ctx: null, analyser: null, source: null, stream: null, raf: null, buf: null }
    setIsListening(false)
    setPitchData(null)
  }

  return { pitchData, isListening, startListening, stopListening }
}
