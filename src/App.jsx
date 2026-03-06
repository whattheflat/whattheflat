import { useState, useCallback, useRef, useEffect } from 'react'
import AudioCapture from './components/AudioCapture'
import ProgressionBanner from './components/ProgressionBanner'
import ProgressionSuggestions from './components/ProgressionSuggestions'
import Fretboard from './components/Fretboard'
import Tuner from './components/Tuner'
import Piano from './components/Piano'
import Settings from './components/Settings'
import DebugView from './components/DebugView'
import { NOTES, detectKey, detectTopKeys, matchChordFromChroma, detectRepeatingProgression, getChordTones, getChordCandidates, getNoteHistoryAnalysis } from './lib/theory'
import settingIcon from './assets/setting-icon.png'
import viewIcon from './assets/view.png'

const DEFAULTS = {
  // Key detection
  noteHistorySize:    12000, // ~whole session until New Song
  keyVoteWindow:      40,    // larger window → needs sustained evidence to shift
  keyVoteThreshold:   32,    // 80% of window must agree
  chordNoteBoost:     3,
  // Chord detection
  chromaSmooth:       14,   // more frames averaged → transient chords invisible
  chordVoteThreshold: 4,    // 4 consecutive identical reads → ~600ms sustained
  chordMinScore:      0.40, // slightly stricter match quality
  // Audio input
  minClarity:         0.80,
  minVolume:          0.01,
}

export default function App() {
  // ── Config ───────────────────────────────────────────────────────────────────
  const [config, setConfig] = useState(DEFAULTS)
  const configRef = useRef(DEFAULTS)
  useEffect(() => { configRef.current = config }, [config])

  const [showSettings, setShowSettings] = useState(false)

  function updateConfig(key, val) {
    setConfig(prev => ({ ...prev, [key]: val }))
  }

  // ── Listening state ──────────────────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false)

  // ── Instrument view + tuner ───────────────────────────────────────────────────
  const [instrument, setInstrument] = useState('guitar')  // 'guitar' | 'piano'
  const [showTuner, setShowTuner]   = useState(false)
  const [showDebug, setShowDebug]   = useState(false)

  // ── Mic permission error ──────────────────────────────────────────────────────
  const [micError, setMicError] = useState(null)

  // ── Debug data ────────────────────────────────────────────────────────────────
  const [debugChroma,       setDebugChroma]       = useState(null)
  const [debugCandidates,   setDebugCandidates]   = useState([])
  const [debugNoteAnalysis, setDebugNoteAnalysis] = useState(null)

  // ── Stable refs for values used inside callbacks ──────────────────────────────
  const showDebugRef  = useRef(showDebug)
  const lockedKeyRef  = useRef(null)
  useEffect(() => { showDebugRef.current = showDebug }, [showDebug])

  // ── BPM estimation from chord-change intervals ────────────────────────────────
  const [bpm, setBpm]               = useState(null)
  const chordTimestampsRef = useRef([])
  const bpmSmoothRef       = useRef(null)   // exponentially smoothed BPM

  // ── Key: auto-detected + optional lock ───────────────────────────────────────
  const [keyInfo, setKeyInfo]     = useState(null)     // auto-detected
  const [lockedKey, setLockedKey] = useState(null)     // { root, mode } or null
  useEffect(() => { lockedKeyRef.current = lockedKey }, [lockedKey])
  const [lockRoot, setLockRoot]   = useState('A')
  const [lockMode, setLockMode]   = useState('minor')

  const effectiveKey = lockedKey ?? keyInfo

  // ── Chord state ───────────────────────────────────────────────────────────────
  const [chordHistory, setChordHistory]               = useState([])
  const [detectedProgression, setDetectedProgression] = useState(null)

  // ── Top key candidates (shown as quick-lock chips) ────────────────────────────
  const [topKeyCandidates, setTopKeyCandidates] = useState([])

  // ── Internal refs ─────────────────────────────────────────────────────────────
  const noteHistoryRef  = useRef([])
  const keyVotesRef     = useRef([])
  const effectiveKeyRef = useRef(null)
  const chromaRingRef = useRef(
    Array.from({ length: DEFAULTS.chromaSmooth }, () => new Float32Array(12))
  )
  const chromaIdxRef         = useRef(0)
  const chordVotesRef        = useRef([])
  const progressionVoteRef   = useRef(null)
  const pendingKeyRef        = useRef(null)

  // Keep refs in sync
  useEffect(() => { effectiveKeyRef.current = effectiveKey }, [effectiveKey])

  // Re-init chroma ring when chromaSmooth changes
  useEffect(() => {
    chromaRingRef.current = Array.from(
      { length: config.chromaSmooth },
      () => new Float32Array(12)
    )
    chromaIdxRef.current = 0
  }, [config.chromaSmooth])

  // ── Detect progression — require 2 consecutive identical results to commit ────
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

  // ── New song — full reset ─────────────────────────────────────────────────────
  function newSong() {
    const cfg = configRef.current
    noteHistoryRef.current     = []
    keyVotesRef.current        = []
    chordVotesRef.current      = []
    progressionVoteRef.current = null
    pendingKeyRef.current      = null
    chromaIdxRef.current       = 0
    chromaRingRef.current      = Array.from({ length: cfg.chromaSmooth }, () => new Float32Array(12))
    chordTimestampsRef.current = []
    bpmSmoothRef.current       = null
    setKeyInfo(null)
    setLockedKey(null)
    effectiveKeyRef.current    = null
    setChordHistory([])
    setDetectedProgression(null)
    setTopKeyCandidates([])
    setBpm(null)
    setMicError(null)
    setDebugChroma(null)
    setDebugCandidates([])
    setDebugNoteAnalysis(null)
  }

  // ── Key lock handlers ─────────────────────────────────────────────────────────
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

  // ── Note handler: drives key detection (pitch-based) ──────────────────────────
  const handleNote = useCallback(({ pitchClass }) => {
    const cfg = configRef.current
    const history = noteHistoryRef.current
    history.push(pitchClass)
    if (history.length > cfg.noteHistorySize) history.shift()
    if (history.length < 10) return
    if (history.length % 5 !== 0) return

    const result = detectKey(history)
    setTopKeyCandidates(detectTopKeys(history))
    if (showDebugRef.current) setDebugNoteAnalysis(getNoteHistoryAnalysis(history))
    if (result.confidence < 0.5) return

    const votes = keyVotesRef.current
    votes.push(`${result.root}_${result.mode}`)
    if (votes.length > cfg.keyVoteWindow) votes.shift()

    const counts = {}
    for (const v of votes) counts[v] = (counts[v] || 0) + 1
    const [winner, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]

    if (count >= cfg.keyVoteThreshold) {
      const [root, mode] = winner.split('_')
      const candidateKey = `${root}_${mode}`

      setKeyInfo(prev => {
        const currentKey = prev ? `${prev.root}_${prev.mode}` : null

        if (currentKey === candidateKey) {
          pendingKeyRef.current = null
          return { root, mode, confidence: result.confidence }
        }

        if (pendingKeyRef.current === candidateKey) {
          pendingKeyRef.current = null
          if (!lockedKeyRef.current) chordVotesRef.current = []
          return { root, mode, confidence: result.confidence }
        }

        pendingKeyRef.current = candidateKey
        return prev
      })
    }
  }, [])

  // ── Chroma handler: drives chord detection ────────────────────────────────────
  const handleChroma = useCallback((chroma, bassPC) => {
    const cfg = configRef.current
    const ring = chromaRingRef.current
    ring[chromaIdxRef.current % cfg.chromaSmooth] = chroma
    chromaIdxRef.current++
    if (chromaIdxRef.current % cfg.chromaSmooth !== 0) return

    const key = effectiveKeyRef.current
    if (!key) return

    const avg = new Float32Array(12)
    for (const frame of ring) for (let i = 0; i < 12; i++) avg[i] += frame[i]
    for (let i = 0; i < 12; i++) avg[i] /= cfg.chromaSmooth

    if (showDebugRef.current) {
      setDebugChroma([...avg])
      setDebugCandidates(getChordCandidates(avg, key, bassPC))
    }

    const chord = matchChordFromChroma(avg, key, bassPC, false, cfg.chordMinScore)
    if (!chord) {
      chordVotesRef.current = []
      return
    }

    const votes = chordVotesRef.current
    votes.push(chord)
    if (votes.length > cfg.chordVoteThreshold) votes.shift()

    if (votes.length >= cfg.chordVoteThreshold && votes.every(v => v === votes[0])) {
      const winner = votes[0]
      setChordHistory(prev => {
        if (prev[prev.length - 1] === winner) return prev
        return [...prev.slice(-30), winner]
      })

      // BPM: track chord commit timestamps, trim outliers, smooth result
      const now = performance.now()
      const ts = chordTimestampsRef.current
      ts.push(now)
      if (ts.length > 32) ts.shift()
      if (ts.length >= 4) {
        const intervals = []
        for (let i = 1; i < ts.length; i++) intervals.push(ts[i] - ts[i - 1])

        // Trim the most extreme 25% on each side to remove held/rushed chords
        const sorted = [...intervals].sort((a, b) => a - b)
        const trim   = Math.max(1, Math.floor(sorted.length * 0.25))
        const trimmed = sorted.slice(trim, sorted.length - trim)
        const avgMs  = trimmed.reduce((a, b) => a + b) / trimmed.length

        let raw = 60000 / avgMs
        while (raw < 55)  raw *= 2
        while (raw > 220) raw /= 2

        // Exponential smoothing — blend toward new estimate gradually
        const prev = bpmSmoothRef.current
        bpmSmoothRef.current = prev === null ? raw : 0.25 * raw + 0.75 * prev
        setBpm(Math.round(bpmSmoothRef.current))
      }

      // Inject chord tones into note history to anchor key detection
      const chordPCs = getChordTones(winner)
        .map(n => NOTES.indexOf(n))
        .filter(i => i >= 0)
      const history = noteHistoryRef.current
      for (let j = 0; j < cfg.chordNoteBoost; j++) {
        for (const pc of chordPCs) history.push(pc)
      }
      while (history.length > cfg.noteHistorySize) history.shift()
    }
  }, [])

  const currentChord = chordHistory[chordHistory.length - 1]

  if (showSettings) {
    return (
      <Settings
        config={config}
        onChange={updateConfig}
        onClose={() => setShowSettings(false)}
        onReset={() => setConfig(DEFAULTS)}
      />
    )
  }

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
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setShowDebug(v => !v)}
            className={`p-2 rounded-full border transition-all ${showDebug ? 'border-accent bg-accent/10' : 'border-border hover:border-gray-400'}`}
            title="Behind the scenes"
          >
            <img src={viewIcon} alt="Debug view" className="w-5 h-5" style={{ filter: 'invert(1) opacity(0.75)' }} />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-full border border-border hover:border-gray-400 transition-all"
            title="Settings"
          >
            <img src={settingIcon} alt="Settings" className="w-5 h-5" style={{ filter: 'invert(1) opacity(0.75)' }} />
          </button>
          <button
            onClick={newSong}
            className="group px-5 py-2 rounded-full text-sm font-semibold border border-border text-gray-400 hover:text-gray-200 hover:border-gray-400 transition-all"
          >
            <span className="group-hover:hidden">New Song</span>
            <span className="hidden group-hover:inline">Clear History</span>
          </button>
          <button
            onClick={() => { setMicError(null); setIsListening(l => !l) }}
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

        {/* Instrument select */}
        <div className="relative">
          <select
            value={instrument}
            onChange={e => setInstrument(e.target.value)}
            className="appearance-none bg-surface border border-border hover:border-gray-500 focus:border-accent focus:outline-none rounded-lg pl-3 pr-7 py-1 text-sm text-gray-200 cursor-pointer transition-colors"
          >
            <option value="guitar">Guitar</option>
            <option value="piano">Piano</option>
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">▾</span>
        </div>

        {/* BPM badge */}
        {bpm && (
          <span className="px-3 py-1 bg-accent/10 border border-accent/30 rounded-lg text-sm text-accent font-mono tabular-nums">
            ♩ <span className="inline-block w-[3ch] text-right">{Math.round(bpm)}</span> <span className="text-accent/50 text-xs">BPM</span>
          </span>
        )}

        <div className="w-px h-5 bg-border shrink-0" />

        {lockedKey ? (
          <div className="flex items-center gap-2 px-3 py-1 bg-accent/20 border border-accent rounded-full">
            <span className="text-accent text-sm font-semibold shrink-0">🔒 {lockedKey.root}</span>
            <div className="relative">
              <select
                value={lockedKey.mode}
                onChange={e => {
                  const info = { ...lockedKey, mode: e.target.value }
                  setLockedKey(info)
                  effectiveKeyRef.current = info
                  chordVotesRef.current = []
                }}
                className="appearance-none bg-transparent text-accent text-sm font-semibold border-none outline-none cursor-pointer pr-4"
              >
                <option value="major">Major</option>
                <option value="minor">Minor</option>
                <option value="dorian">Dorian</option>
                <option value="mixolydian">Mixolydian</option>
                <option value="phrygian">Phrygian</option>
                <option value="lydian">Lydian</option>
              </select>
              <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-accent/60 text-xs">▾</span>
            </div>
            <button onClick={removeLock} className="text-xs text-accent/50 hover:text-accent transition-colors">
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
                    : 'border-border text-gray-400 hover:border-gray-500 hover:text-gray-200'
                }`}
              >
                {k.root} {k.mode === 'major' ? 'maj' : 'min'} · {Math.round(k.confidence * 100)}%
              </button>
            ))}
            {topKeyCandidates.length > 0 && <span className="text-gray-600 text-xs">or</span>}
            <div className="relative">
              <select
                value={lockRoot}
                onChange={e => setLockRoot(e.target.value)}
                className="appearance-none bg-surface border border-border hover:border-gray-500 focus:border-accent focus:outline-none rounded-lg pl-3 pr-7 py-1 text-sm text-gray-200 cursor-pointer transition-colors"
              >
                {NOTES.map(n => <option key={n}>{n}</option>)}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">▾</span>
            </div>
            <div className="relative">
              <select
                value={lockMode}
                onChange={e => setLockMode(e.target.value)}
                className="appearance-none bg-surface border border-border hover:border-gray-500 focus:border-accent focus:outline-none rounded-lg pl-3 pr-7 py-1 text-sm text-gray-200 cursor-pointer transition-colors"
              >
                <option value="major">Major</option>
                <option value="minor">Minor</option>
                <option value="dorian">Dorian</option>
                <option value="mixolydian">Mixolydian</option>
                <option value="phrygian">Phrygian</option>
                <option value="lydian">Lydian</option>
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">▾</span>
            </div>
            <button
              onClick={applyLock}
              className="px-3 py-1 bg-accent/10 hover:bg-accent/20 border border-accent/40 hover:border-accent text-accent text-sm rounded-lg transition-all"
            >
              Lock key
            </button>
          </div>
        )}
      </div>

      <AudioCapture
        onNote={handleNote}
        onChroma={handleChroma}
        isListening={isListening}
        minClarity={config.minClarity}
        minVolume={config.minVolume}
        onPermissionError={() => {
          setMicError(true)
          setIsListening(false)
        }}
      />

      {micError && (
        <div className="mb-2 px-4 py-3 rounded-xl border border-red-800 bg-red-900/20 text-sm text-red-400 flex items-center justify-between">
          <span>Microphone permission denied. Please allow microphone access in your browser or OS settings and try again.</span>
          <button onClick={() => setMicError(null)} className="ml-4 text-red-600 hover:text-red-400 text-lg leading-none">×</button>
        </div>
      )}

      {/* ── Progression banner ── */}
      <ProgressionBanner
        chordHistory={chordHistory}
        keyInfo={effectiveKey}
        detectedProgression={detectedProgression}
        currentChord={currentChord}
      />

      {/* ── Instrument + progressions row ── */}
      <div className="flex gap-3 mb-3 items-stretch">
        <div className="w-full lg:w-[70%] min-w-0">
          {instrument === 'guitar'
            ? <Fretboard keyInfo={effectiveKey} currentChord={currentChord} pentatonicOnly={false} />
            : <Piano keyInfo={effectiveKey} currentChord={currentChord} />
          }
        </div>

        <div className="hidden lg:block w-[30%] min-w-0 relative">
          <div className="absolute inset-0">
            <ProgressionSuggestions keyInfo={effectiveKey} currentChord={currentChord} />
          </div>
        </div>
      </div>

      {/* ── Behind the scenes debug view ── */}
      {showDebug && (
        <div className="mb-3">
          <DebugView
            chroma={debugChroma}
            chordCandidates={debugCandidates}
            noteAnalysis={debugNoteAnalysis}
            keyInfo={effectiveKey}
            currentChord={currentChord}
          />
        </div>
      )}

      {/* ── Tuner — collapsible ── */}
      <div>
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
  )
}
