import { useState, useCallback, useRef, useEffect } from 'react'
import AudioCapture from './components/AudioCapture'
import ProgressionBanner from './components/ProgressionBanner'
import KeyDisplay from './components/KeyDisplay'
import ChordDisplay from './components/ChordDisplay'
import SafeNotes from './components/SafeNotes'
import Fretboard from './components/Fretboard'
import ProgressionSuggestions from './components/ProgressionSuggestions'
import { NOTES, detectKey, detectTopKeys, matchChordFromChroma, detectRepeatingProgression } from './lib/theory'

// Key detection tuning
const NOTE_HISTORY_SIZE  = 80
const KEY_VOTE_WINDOW    = 12
const KEY_VOTE_THRESHOLD = 9   // out of 12 — very stable

// Chord detection tuning
const CHROMA_SMOOTH        = 12   // frames to average (~200ms at 60fps)
const CHORD_VOTE_THRESHOLD = 3    // consecutive identical detections required

export default function App() {
  // ── Listening state ──────────────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false)

  // ── App mode ─────────────────────────────────────────────────────────────
  const [appMode, setAppMode] = useState('beginner')   // 'beginner' | 'advanced'

  // ── Key: auto-detected + optional lock ───────────────────────────────────
  const [keyInfo, setKeyInfo]     = useState(null)     // auto-detected
  const [lockedKey, setLockedKey] = useState(null)     // { root, mode } or null
  const [lockRoot, setLockRoot]   = useState('A')
  const [lockMode, setLockMode]   = useState('minor')

  // Effective key used by all components
  const effectiveKey = lockedKey ?? keyInfo
  // Beginner + locked key = only match the 7 diatonic chords (simpler, fewer false positives)
  // Advanced + locked key = allow borrowed/chromatic chords like D7 in Am
  const isStrictMode = appMode === 'beginner' && lockedKey !== null

  // ── Chord state ───────────────────────────────────────────────────────────
  const [chordHistory, setChordHistory]               = useState([])
  const [detectedProgression, setDetectedProgression] = useState(null)

  // ── Top key candidates (shown as quick-lock chips) ────────────────────────
  const [topKeyCandidates, setTopKeyCandidates] = useState([])

  // ── Internal refs ─────────────────────────────────────────────────────────
  const noteHistoryRef  = useRef([])
  const keyVotesRef     = useRef([])
  const effectiveKeyRef = useRef(null)    // mirror for use inside callbacks
  const chromaRingRef   = useRef(
    Array.from({ length: CHROMA_SMOOTH }, () => new Float32Array(12))
  )
  const chromaIdxRef    = useRef(0)
  const chordVotesRef   = useRef([])

  // Keep ref in sync
  useEffect(() => { effectiveKeyRef.current = effectiveKey }, [effectiveKey])

  // ── Detect progression whenever chord history changes ─────────────────────
  useEffect(() => {
    setDetectedProgression(detectRepeatingProgression(chordHistory))
  }, [chordHistory])

  // ── Key lock handlers ─────────────────────────────────────────────────────
  function applyLock() {
    const info = { root: lockRoot, mode: lockMode, confidence: 1 }
    setLockedKey(info)
    effectiveKeyRef.current = info
    chordVotesRef.current = []
    setChordHistory([])
    setDetectedProgression(null)
  }

  function quickLock({ root, mode, confidence }) {
    const info = { root, mode, confidence }
    setLockedKey(info)
    effectiveKeyRef.current = info
    chordVotesRef.current = []
    setChordHistory([])
    setDetectedProgression(null)
  }

  function removeLock() {
    setLockedKey(null)
    effectiveKeyRef.current = keyInfo
  }

  // ── Note handler: drives key detection (pitch-based) ──────────────────────
  const handleNote = useCallback(({ pitchClass }) => {
    const history = noteHistoryRef.current
    history.push(pitchClass)
    if (history.length > NOTE_HISTORY_SIZE) history.shift()
    if (history.length < 10) return
    if (history.length % 5 !== 0) return

    const result = detectKey(history)
    setTopKeyCandidates(detectTopKeys(history))
    if (result.confidence < 0.5) return

    const votes = keyVotesRef.current
    votes.push(`${result.root}_${result.mode}`)
    if (votes.length > KEY_VOTE_WINDOW) votes.shift()

    const counts = {}
    for (const v of votes) counts[v] = (counts[v] || 0) + 1
    const [winner, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]

    if (count >= KEY_VOTE_THRESHOLD) {
      const [root, mode] = winner.split('_')
      setKeyInfo(prev => {
        if (prev?.root === root && prev?.mode === mode) {
          return { root, mode, confidence: result.confidence }
        }
        // Key changed — reset chord votes but keep history visible
        if (!lockedKey) {
          chordVotesRef.current = []
        }
        return { root, mode, confidence: result.confidence }
      })
    }
  }, [lockedKey])

  // ── Chroma handler: drives chord detection ────────────────────────────────
  const handleChroma = useCallback((chroma, bassPC) => {
    const ring = chromaRingRef.current
    ring[chromaIdxRef.current % CHROMA_SMOOTH] = chroma
    chromaIdxRef.current++
    if (chromaIdxRef.current % CHROMA_SMOOTH !== 0) return

    const key = effectiveKeyRef.current
    if (!key) return

    // Average ring buffer
    const avg = new Float32Array(12)
    for (const frame of ring) for (let i = 0; i < 12; i++) avg[i] += frame[i]
    for (let i = 0; i < 12; i++) avg[i] /= CHROMA_SMOOTH

    const chord = matchChordFromChroma(avg, key, bassPC, isStrictMode)
    if (!chord) {
      // Ambiguous moment (transition, silence) — reset streak, history is untouched
      chordVotesRef.current = []
      return
    }

    const votes = chordVotesRef.current
    votes.push(chord)
    if (votes.length > CHORD_VOTE_THRESHOLD) votes.shift()

    // All last N detections must agree — one wrong reading resets the streak
    if (votes.length >= CHORD_VOTE_THRESHOLD && votes.every(v => v === votes[0])) {
      const winner = votes[0]
      setChordHistory(prev => {
        if (prev[prev.length - 1] === winner) return prev
        return [...prev.slice(-30), winner]
      })
    }
  }, [isStrictMode])

  const currentChord = chordHistory[chordHistory.length - 1]

  return (
    <div className="min-h-screen bg-surface text-white p-4 md:p-6">

      {/* ── Header ── */}
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-accent">
            WhatTheFlat <span className="text-gray-600">&#9837;?</span>
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">Real-time key detection for real humans</p>
        </div>
        <button
          onClick={() => setIsListening(l => !l)}
          className={`px-5 py-2.5 rounded-full font-semibold text-sm transition-all ${
            isListening
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-accent hover:bg-purple-600 text-white'
          }`}
        >
          {isListening ? 'Stop' : 'Start Listening'}
        </button>
      </header>

      {/* ── Controls bar ── */}
      <div className="mb-4 flex flex-wrap gap-3 items-center p-3 bg-panel border border-border rounded-xl">
        {/* Mode toggle */}
        <div className="flex bg-surface border border-border rounded-full p-0.5 text-sm">
          {['beginner', 'advanced'].map(m => (
            <button
              key={m}
              onClick={() => setAppMode(m)}
              className={`px-4 py-1 rounded-full capitalize transition-all ${
                appMode === m ? 'bg-accent text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Key lock */}
        {lockedKey ? (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-accent/20 border border-accent text-accent rounded-full text-sm font-semibold">
              🔒 {lockedKey.root} {lockedKey.mode}
            </span>
            <button
              onClick={removeLock}
              className="text-xs text-gray-500 hover:text-gray-300 underline"
            >
              unlock
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 items-center">
            {/* Top 3 detected key candidates — click to lock */}
            {topKeyCandidates.map((k, i) => (
              <button
                key={i}
                onClick={() => quickLock(k)}
                className={`px-3 py-1 rounded-full text-sm font-semibold border transition-all ${
                  i === 0
                    ? 'border-accent text-accent hover:bg-accent/10'
                    : 'border-border text-gray-400 hover:border-gray-400 hover:text-gray-200'
                }`}
              >
                {k.root} {k.mode === 'major' ? 'maj' : 'min'} · {Math.round(k.confidence * 100)}%
              </button>
            ))}
            {topKeyCandidates.length > 0 && (
              <span className="text-gray-600 text-xs">or</span>
            )}
            {/* Manual override */}
            <select
              value={lockRoot}
              onChange={e => setLockRoot(e.target.value)}
              className="bg-surface border border-border rounded-lg px-2 py-1 text-sm text-gray-300"
            >
              {NOTES.map(n => <option key={n}>{n}</option>)}
            </select>
            <select
              value={lockMode}
              onChange={e => setLockMode(e.target.value)}
              className="bg-surface border border-border rounded-lg px-2 py-1 text-sm text-gray-300"
            >
              <option value="major">Major</option>
              <option value="minor">Minor</option>
            </select>
            <button
              onClick={applyLock}
              className="px-3 py-1 bg-border hover:bg-accent/20 border border-border hover:border-accent text-sm rounded-lg transition-all"
            >
              Lock
            </button>
          </div>
        )}
      </div>

      <AudioCapture onNote={handleNote} onChroma={handleChroma} isListening={isListening} />

      {/* ── Progression banner — full width ── */}
      <ProgressionBanner
        chordHistory={chordHistory}
        keyInfo={effectiveKey}
        detectedProgression={detectedProgression}
      />

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KeyDisplay keyInfo={effectiveKey} locked={!!lockedKey} />
        <ChordDisplay history={chordHistory} />
        <SafeNotes keyInfo={effectiveKey} currentChord={currentChord} />
        <ProgressionSuggestions keyInfo={effectiveKey} />
        <div className="md:col-span-2">
          <Fretboard
            keyInfo={effectiveKey}
            currentChord={currentChord}
            pentatonicOnly={appMode === 'beginner'}
          />
        </div>
      </div>
    </div>
  )
}
