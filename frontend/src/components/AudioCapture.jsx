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

const PITCH_FFT  = 4096    // ~90ms window — good temporal resolution for pitch
const CHORD_FFT  = 16384   // ~370ms window — 2.7 Hz/bin, separates low semitones
const MIN_CLARITY = 0.80
const MIN_VOLUME  = 0.01
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

export default function AudioCapture({ onNote, onChroma, isListening }) {
  const audioCtxRef    = useRef(null)
  const pitchAnalyser  = useRef(null)
  const chordAnalyser  = useRef(null)
  const timeBufRef     = useRef(null)
  const freqBufRef     = useRef(null)
  const detectorRef    = useRef(null)
  const rafRef         = useRef(null)
  const streamRef      = useRef(null)

  const stop = useCallback(() => {
    if (rafRef.current)      cancelAnimationFrame(rafRef.current)
    if (streamRef.current)   streamRef.current.getTracks().forEach(t => t.stop())
    if (audioCtxRef.current) audioCtxRef.current.close()
    audioCtxRef.current = null
  }, [])

  const start = useCallback(async () => {
    stop()
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream

    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    const source = ctx.createMediaStreamSource(stream)

    // Small analyser — pitch detection needs fast time-domain data
    const pa = ctx.createAnalyser()
    pa.fftSize = PITCH_FFT
    pa.smoothingTimeConstant = 0.0   // no smoothing: pitchy needs clean waveform
    pitchAnalyser.current = pa
    source.connect(pa)
    timeBufRef.current = new Float32Array(pa.fftSize)
    detectorRef.current = PitchDetector.forFloat32Array(pa.fftSize)

    // Large analyser — chord detection needs fine frequency resolution
    const ca = ctx.createAnalyser()
    ca.fftSize = CHORD_FFT
    ca.smoothingTimeConstant = 0.65  // smooth over time for stable chord reading
    chordAnalyser.current = ca
    source.connect(ca)
    freqBufRef.current = new Float32Array(ca.frequencyBinCount)

    function tick() {
      const timeBuf = timeBufRef.current
      pa.getFloatTimeDomainData(timeBuf)

      const rms = Math.sqrt(timeBuf.reduce((s, v) => s + v * v, 0) / timeBuf.length)
      if (rms >= MIN_VOLUME) {
        // Pitch via McLeod (autocorrelation) — unaffected by FFT bin size
        const [freq, clarity] = detectorRef.current.findPitch(timeBuf, ctx.sampleRate)
        if (clarity >= MIN_CLARITY && freq > 60 && freq < 4200) {
          const midi       = Math.round(12 * Math.log2(freq / 440) + 69)
          const pitchClass = ((midi % 12) + 12) % 12
          onNote({ noteName: NOTES[pitchClass], pitchClass, freq, midi, clarity })
        }

        // Chord chroma from the high-resolution FFT
        if (onChroma) {
          const freqBuf = freqBufRef.current
          ca.getFloatFrequencyData(freqBuf)
          onChroma(
            computeChroma(freqBuf, ctx.sampleRate, ca.fftSize),
            detectBassPC(freqBuf, ctx.sampleRate, ca.fftSize)
          )
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    tick()
  }, [onNote, onChroma, stop])

  useEffect(() => {
    if (isListening) start().catch(console.error)
    else stop()
    return stop
  }, [isListening, start, stop])

  return null
}
