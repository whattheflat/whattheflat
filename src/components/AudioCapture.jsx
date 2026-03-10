import { useEffect, useRef, useCallback } from 'react'
import { PitchDetector } from 'pitchy'
import { NOTES } from '../lib/theory'

// ─── Why two analysers? ───────────────────────────────────────────────────────
//
// The Web Audio FFT has linearly-spaced bins: bin width = sampleRate / fftSize.
//
//   fftSize 4096  →  ~10.8 Hz/bin  (default we were using)
//   fftSize 16384 →  ~2.7 Hz/bin   (multi-rate chord analyser)
//
// On the low guitar strings the gap between adjacent semitones is only ~5-6 Hz.
// At 10.8 Hz/bin we literally cannot separate A2 (110 Hz) from A#2 (116 Hz).
// That is the single biggest source of wrong chord notes on the low strings.
//
// Solution: run a second, larger analyser just for chord/chroma detection.
// The pitch analyser stays small (4096) so pitchy has a 90ms window — fast
// enough for responsive pitch detection.  The chord analyser uses 16384 (~370ms
// window) — slower to respond but with 2.7 Hz bins that can cleanly separate
// every semitone across the guitar's entire range.
//
// This is an approximation of the Constant-Q Transform (CQT) your friend
// mentioned: CQT achieves log-spaced bins mathematically; we approximate it
// by simply using a much larger FFT window.
// ─────────────────────────────────────────────────────────────────────────────

const PITCH_FFT   = 4096    // ~90ms window — good temporal resolution for pitch
const CHORD_FFT   = 16384   // ~370ms window — 2.7 Hz/bin, separates low semitones
const NOISE_FLOOR = -65    // dB

// ─── Harmonic summation chroma ────────────────────────────────────────────────
// Each FFT bin votes back toward lower fundamentals that could have generated
// it as an overtone.  This undoes the harmonic contamination that makes minor
// chords look like major ones (the 5th harmonic of the root lands on the major
// 3rd, which is NOT in the minor chord).
const HARMONIC_WEIGHTS = [1.0, 0.5, 0.33, 0.25, 0.2]  // h = 1…5

function computeChroma(freqData, sampleRate, fftSize) {
  const chroma = new Float32Array(12)
  const binHz  = sampleRate / fftSize
  const N      = freqData.length

  for (let bin = 2; bin < N; bin++) {
    const freq = bin * binHz
    if (freq < 80 || freq > 4000) continue
    const db = freqData[bin]
    if (db < NOISE_FLOOR) continue

    const amp = Math.sqrt(Math.pow(10, db / 10))   // amplitude, not power

    for (let h = 1; h <= HARMONIC_WEIGHTS.length; h++) {
      const fundamental = freq / h
      if (fundamental < 40 || fundamental > 2000) continue
      const midi = 12 * Math.log2(fundamental / 440) + 69
      const pc   = ((Math.round(midi) % 12) + 12) % 12
      chroma[pc] += amp * HARMONIC_WEIGHTS[h - 1]
    }
  }

  for (let i = 0; i < 12; i++) chroma[i] = Math.log1p(chroma[i])
  const max = Math.max(...chroma)
  if (max > 0) for (let i = 0; i < 12; i++) chroma[i] /= max
  return chroma
}

function detectBassPC(freqData, sampleRate, fftSize) {
  const binHz = sampleRate / fftSize
  let maxPower = 0, bestMidi = -1
  for (let bin = 2; bin < freqData.length; bin++) {
    const freq = bin * binHz
    if (freq < 40 || freq > 350) continue
    const db = freqData[bin]
    if (db < NOISE_FLOOR) continue
    const power = Math.pow(10, db / 10)
    if (power > maxPower) {
      maxPower = power
      bestMidi = Math.round(12 * Math.log2(freq / 440) + 69)
    }
  }
  if (bestMidi < 0) return null
  return ((bestMidi % 12) + 12) % 12
}

export default function AudioCapture({ onNote, onChroma, onOnset, onWaveform, isListening, minClarity = 0.80, minVolume = 0.01, onPermissionError }) {
  const audioCtxRef   = useRef(null)
  const timeBufRef    = useRef(null)
  const freqBufRef    = useRef(null)
  const detectorRef   = useRef(null)
  const rafRef        = useRef(null)
  const streamRef     = useRef(null)
  const activeRef     = useRef(false)   // guards against stale tick callbacks

  // All callbacks and thresholds read via refs — so start/stop never need to recreate
  const onNoteRef            = useRef(onNote)
  const onChromaRef          = useRef(onChroma)
  const onOnsetRef           = useRef(onOnset)
  const onWaveformRef        = useRef(onWaveform)
  const onPermissionErrorRef = useRef(onPermissionError)
  const minClarityRef        = useRef(minClarity)
  const minVolumeRef         = useRef(minVolume)
  const smoothRmsRef         = useRef(0)
  const lastOnsetRef         = useRef(0)
  const specPeakRef          = useRef(null)   // peak-hold spectrum for display lingering
  useEffect(() => { onNoteRef.current            = onNote            }, [onNote])
  useEffect(() => { onChromaRef.current          = onChroma          }, [onChroma])
  useEffect(() => { onOnsetRef.current           = onOnset           }, [onOnset])
  useEffect(() => { onWaveformRef.current        = onWaveform        }, [onWaveform])
  useEffect(() => { onPermissionErrorRef.current = onPermissionError }, [onPermissionError])
  useEffect(() => { minClarityRef.current        = minClarity        }, [minClarity])
  useEffect(() => { minVolumeRef.current         = minVolume         }, [minVolume])

  const stop = useCallback(() => {
    activeRef.current = false
    specPeakRef.current = null
    if (rafRef.current)    { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null }
  }, [])

  const start = useCallback(async () => {
    stop()
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      onPermissionErrorRef.current?.(err)
      return
    }
    streamRef.current  = stream
    activeRef.current  = true
    smoothRmsRef.current  = 0
    lastOnsetRef.current  = 0

    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    const source = ctx.createMediaStreamSource(stream)

    // Small analyser — pitch detection needs fast time-domain data
    const pa = ctx.createAnalyser()
    pa.fftSize = PITCH_FFT
    pa.smoothingTimeConstant = 0.0
    source.connect(pa)
    timeBufRef.current = new Float32Array(pa.fftSize)
    detectorRef.current = PitchDetector.forFloat32Array(pa.fftSize)

    // Large analyser — chord detection needs fine frequency resolution
    const ca = ctx.createAnalyser()
    ca.fftSize = CHORD_FFT
    ca.smoothingTimeConstant = 0.5   // reduced from 0.65 — clears faster between chords
    source.connect(ca)
    freqBufRef.current = new Float32Array(ca.frequencyBinCount)

    function tick() {
      if (!activeRef.current) return   // stop() was called — bail immediately

      const timeBuf = timeBufRef.current
      pa.getFloatTimeDomainData(timeBuf)

      const rms = Math.sqrt(timeBuf.reduce((s, v) => s + v * v, 0) / timeBuf.length)

      // Onset detection — RMS spike significantly above smoothed baseline
      const sr = smoothRmsRef.current
      smoothRmsRef.current = 0.85 * sr + 0.15 * rms
      const nowMs = performance.now()
      if (rms > sr * 2.2 && rms > minVolumeRef.current * 1.5 && nowMs - lastOnsetRef.current > 120) {
        lastOnsetRef.current = nowMs
        onOnsetRef.current?.()
      }

      // Always fire waveform callback — downsample 4096 → 512 points + log-binned spectrum
      if (onWaveformRef.current) {
        const stride = 8   // 4096 / 8 = 512 points
        const wave = new Float32Array(PITCH_FFT / stride)
        for (let i = 0; i < wave.length; i++) wave[i] = timeBuf[i * stride]

        // Log-binned frequency spectrum: 256 bins from 40 Hz → 4000 Hz
        const LOG_BINS = 256
        const F_MIN = 40, F_MAX = 4000
        const binHz  = ctx.sampleRate / ca.fftSize
        const freqBuf = freqBufRef.current
        ca.getFloatFrequencyData(freqBuf)
        const spectrum = new Float32Array(LOG_BINS)
        for (let b = 0; b < LOG_BINS; b++) {
          const f   = F_MIN * Math.pow(F_MAX / F_MIN, b / (LOG_BINS - 1))
          const bin = Math.round(f / binHz)
          if (bin < freqBuf.length) {
            const db = freqBuf[bin]
            spectrum[b] = db < NOISE_FLOOR ? 0 : Math.max(0, (db - NOISE_FLOOR) / (-NOISE_FLOOR))
          }
        }

        // Peak-hold with exponential decay — spectrum rises instantly, falls slowly
        if (!specPeakRef.current) specPeakRef.current = new Float32Array(LOG_BINS)
        const peak = specPeakRef.current
        for (let b = 0; b < LOG_BINS; b++) {
          peak[b] = spectrum[b] > peak[b] ? spectrum[b] : peak[b] * 0.92
        }

        let detectedFreq = null, detectedNote = null
        if (rms >= minVolumeRef.current) {
          const [f, c] = detectorRef.current.findPitch(timeBuf, ctx.sampleRate)
          if (c >= minClarityRef.current && f > 60 && f < 4200) {
            detectedFreq = f
            detectedNote = NOTES[((Math.round(12 * Math.log2(f / 440) + 69) % 12) + 12) % 12]
          }
        }
        onWaveformRef.current({ wave, rms, detectedFreq, detectedNote, spectrum: peak })
      }

      if (rms >= minVolumeRef.current) {
        const [freq, clarity] = detectorRef.current.findPitch(timeBuf, ctx.sampleRate)
        if (clarity >= minClarityRef.current && freq > 60 && freq < 4200) {
          const midi       = Math.round(12 * Math.log2(freq / 440) + 69)
          const pitchClass = ((midi % 12) + 12) % 12
          onNoteRef.current({ noteName: NOTES[pitchClass], pitchClass, freq, midi, clarity })
        }

        if (onChromaRef.current) {
          const freqBuf = freqBufRef.current
          ca.getFloatFrequencyData(freqBuf)
          onChromaRef.current(
            computeChroma(freqBuf, ctx.sampleRate, ca.fftSize),
            detectBassPC(freqBuf, ctx.sampleRate, ca.fftSize)
          )
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    tick()
  }, [stop])

  useEffect(() => {
    if (isListening) start().catch(console.error)
    else stop()
    return stop
  }, [isListening, start, stop])

  return null
}
