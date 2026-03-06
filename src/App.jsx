import { useState, useCallback, useRef, useEffect } from 'react'
import AudioCapture from './components/AudioCapture'
import ProgressionBanner from './components/ProgressionBanner'
import KeyDisplay from './components/KeyDisplay'
import ChordDisplay from './components/ChordDisplay'
import SafeNotes from './components/SafeNotes'
import Fretboard from './components/Fretboard'
import ProgressionSuggestions from './components/ProgressionSuggestions'
import Tuner from './components/Tuner'
import Piano from './components/Piano'
import { NOTES, detectKey, detectTopKeys, matchChordFromChroma, detectRepeatingProgression, getChordTones } from './lib/theory'

// Key detection tuning
const NOTE_HISTORY_SIZE  = 160   // larger = chord boosts dominate over melody runs
const KEY_VOTE_WINDOW    = 12
const KEY_VOTE_THRESHOLD = 9     // out of 12
const CHORD_NOTE_BOOST   = 3     // confirmed chord tones injected N× into note history

// Chord detection tuning
const CHROMA_SMOOTH        = 8    // frames to average — more responsive
const CHORD_VOTE_THRESHOLD = 2    // consecutive identical detections required
const CHORD_MIN_SCORE      = 0.38 // lower = more chord types detected

export default function App() {
  // ── Listening state ──────────────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false)

  // ── Instrument view + tuner ───────────────────────────────────────────────
  const [instrument, setInstrument] = useState('guitar')  // 'guitar' | 'piano'
  const [showTuner, setShowTuner]   = useState(false)

  // ── Key: auto-detected + optional lock ───────────────────────────────────
  const [keyInfo, setKeyInfo]     = useState(null)     // auto-detected
  const [lockedKey, setLockedKey] = useState(null)     // { root, mode } or null
  const [lockRoot, setLockRoot]   = useState('A')
  const [lockMode, setLockMode]   = useState('minor')

  // Effective key used by all components
  const effectiveKey = lockedKey ?? keyInfo

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
  const chordVotesRef        = useRef([])
  const progressionVoteRef   = useRef(null)   // stabilise loop display
  const pendingKeyRef        = useRef(null)   // proposed key change — require 2 consecutive wins

  // Keep ref in sync
  useEffect(() => { effectiveKeyRef.current = effectiveKey }, [effectiveKey])

  // ── Detect progression — require 2 consecutive identical results to commit ─
  useEffect(() => {
    const detected = detectRepeatingProgression(chordHistory)
    if (!detected) return
    const key = detected.join(',')
    if (progressionVoteRef.current === key) {
      setDetectedProgression(detected)
    } else {
      progressionVoteRef.current = key
    }
  }, [chordHistory])

  // ── New song — full reset ─────────────────────────────────────────────────
  function newSong() {
    noteHistoryRef.current   = []
    keyVotesRef.current      = []
    chordVotesRef.current    = []
    progressionVoteRef.current = null
    pendingKeyRef.current    = null
    chromaIdxRef.current     = 0
    chromaRingRef.current    = Array.from({ length: CHROMA_SMOOTH }, () => new Float32Array(12))
    setKeyInfo(null)
    setLockedKey(null)
    effectiveKeyRef.current  = null
    setChordHistory([])
    setDetectedProgression(null)
    setTopKeyCandidates([])
  }

  // ── Key lock handlers ─────────────────────────────────────────────────────
  function applyLock() {
    const info = { root: lockRoot, mode: lockMode, confidence: 1 }
    setLockedKey(info)
    effectiveKeyRef.current = info
    chordVotesRef.current = []
  }

  function quickLock({ root, mode, confidence }) {
    const info = { root, mode, confidence }
    setLockedKey(info)
    effectiveKeyRef.current = info
    chordVotesRef.current = []
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
      const candidateKey = `${root}_${mode}`

      setKeyInfo(prev => {
        const currentKey = prev ? `${prev.root}_${prev.mode}` : null

        if (currentKey === candidateKey) {
          // Same key — just refresh confidence, clear pending
          pendingKeyRef.current = null
          return { root, mode, confidence: result.confidence }
        }

        // Different key — require a second consecutive win before committing
        if (pendingKeyRef.current === candidateKey) {
          pendingKeyRef.current = null
          if (!lockedKey) chordVotesRef.current = []
          return { root, mode, confidence: result.confidence }
        }

        pendingKeyRef.current = candidateKey
        return prev  // hold current key until next confirmation
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

    const chord = matchChordFromChroma(avg, key, bassPC, false, CHORD_MIN_SCORE)
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

      // Inject chord tones into note history with boost weight so key detection
      // anchors to confirmed chords rather than transient melody notes
      const chordPCs = getChordTones(winner)
        .map(n => NOTES.indexOf(n))
        .filter(i => i >= 0)
      const history = noteHistoryRef.current
      for (let j = 0; j < CHORD_NOTE_BOOST; j++) {
        for (const pc of chordPCs) history.push(pc)
      }
      while (history.length > NOTE_HISTORY_SIZE) history.shift()
    }
  }, [])

  const currentChord = chordHistory[chordHistory.length - 1]

  return (
    <div className="min-h-screen bg-surface text-white p-3">

      {/* ── Header ── */}
      <header className="mb-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-accent">
            WhatTheFlat <span className="text-gray-600">&#9837;?</span>
          </h1>
          <p className="text-xs text-gray-600">Real-time key detection for live jams</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={newSong}
            className="px-3 py-2 rounded-full text-sm border border-border text-gray-500 hover:text-gray-300 hover:border-gray-400 transition-all leading-tight text-center"
          >
            <span className="block font-semibold">New Song</span>
            <span className="block text-xs opacity-60">clear history</span>
          </button>
          <button
            onClick={() => setIsListening(l => !l)}
            className={`px-5 py-2 rounded-full font-semibold text-sm transition-all ${
              isListening
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-accent hover:bg-purple-600 text-white'
            }`}
          >
            {isListening ? 'Stop' : 'Start Listening'}
          </button>
        </div>
      </header>

      {/* ── Controls bar ── */}
      <div className="mb-2 flex flex-wrap gap-2 items-center p-2 bg-panel border border-border rounded-xl">
        {lockedKey ? (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-accent/20 border border-accent text-accent rounded-full text-sm font-semibold">
              🔒 {lockedKey.root} {lockedKey.mode}
            </span>
            <button onClick={removeLock} className="text-xs text-gray-500 hover:text-gray-300 underline">
              unlock
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 items-center">
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
            {topKeyCandidates.length > 0 && <span className="text-gray-600 text-xs">or</span>}
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

      {/* ── Progression banner ── */}
      <ProgressionBanner
        chordHistory={chordHistory}
        keyInfo={effectiveKey}
        detectedProgression={detectedProgression}
      />

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <KeyDisplay keyInfo={effectiveKey} locked={!!lockedKey} />
        <ChordDisplay history={chordHistory} />
        <SafeNotes keyInfo={effectiveKey} currentChord={currentChord} />
        <ProgressionSuggestions keyInfo={effectiveKey} />

        {/* ── Instrument view — select in header ── */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-1 px-1">
            <span className="text-xs text-gray-500 uppercase tracking-widest">Instrument</span>
            <select
              value={instrument}
              onChange={e => setInstrument(e.target.value)}
              className="bg-surface border border-border rounded-lg px-2 py-1 text-sm text-gray-300"
            >
              <option value="guitar">Guitar</option>
              <option value="piano">Piano</option>
            </select>
          </div>
          {instrument === 'guitar'
            ? <Fretboard keyInfo={effectiveKey} currentChord={currentChord} pentatonicOnly={false} />
            : <Piano keyInfo={effectiveKey} currentChord={currentChord} />
          }
        </div>

        {/* ── Tuner — collapsible ── */}
        <div className="md:col-span-2">
          <button
            onClick={() => setShowTuner(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2 bg-panel border border-border rounded-xl text-sm text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-all"
          >
            <span>Tuner</span>
            <span>{showTuner ? '▲' : '▼'}</span>
          </button>
          {showTuner && <div className="mt-2"><Tuner /></div>}
        </div>
      </div>
    </div>
  )
}
