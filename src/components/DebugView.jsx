import { useRef } from 'react'
import { getScale, getChordTones, NOTES } from '../lib/theory'

// ─── SVG Piano — 2 octaves (C3–B4) ───────────────────────────────────────────
const KEY_W   = 30
const KEY_H   = 80
const BLACK_W = 18
const BLACK_H = 50
const PIANO_W = 14 * KEY_W

const WHITE_OCT = [0, 2, 4, 5, 7, 9, 11]  // pitch classes per octave
const BLACK_OCT = [
  { pc: 1, wi: 0 }, { pc: 3, wi: 1 }, { pc: 6, wi: 3 },
  { pc: 8, wi: 4 }, { pc: 10, wi: 5 },
]
const WHITE_LABELS = ['C3','D3','E3','F3','G3','A3','B3','C4','D4','E4','F4','G4','A4','B4']

function PianoSVG({ values, keyNotes, chordNotes, keyH = KEY_H, showPct = false, monoColor = false }) {
  const max = Math.max(...values, 0.01)
  const wKeys = []
  const bKeys = []
  for (let oct = 0; oct < 2; oct++) {
    WHITE_OCT.forEach((pc, wi) => wKeys.push({ pc, wi: oct * 7 + wi }))
    BLACK_OCT.forEach(({ pc, wi }) => bKeys.push({ pc, wi: oct * 7 + wi }))
  }
  const svgH = keyH + 6 + (showPct ? 16 : 0)

  return (
    <svg viewBox={`0 0 ${PIANO_W} ${svgH}`} width="100%" style={{ display: 'block' }}>
      {/* White keys */}
      {wKeys.map(({ pc, wi }) => {
        const energy  = values[pc] / max
        const inChord = chordNotes?.has(pc)
        const inKey   = keyNotes?.has(pc)
        const x = wi * KEY_W
        const fillColor = inChord
          ? `rgba(167,139,250,${0.12 + energy * 0.88})`
          : inKey
          ? monoColor ? `rgba(192,132,252,${0.1 + energy * 0.7})` : `rgba(251,191,36,${0.1 + energy * 0.7})`
          : `rgba(180,180,190,${0.05 + energy * 0.2})`
        const pct = showPct ? Math.round(values[pc] * 100) : 0

        return (
          <g key={`w${wi}`}>
            <rect x={x+1} y={3} width={KEY_W-2} height={keyH}
              rx={3} fill="rgb(20,20,26)" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
            {energy > (inChord || inKey ? 0.12 : 0.35) && (
              <rect
                x={x+1} y={3 + keyH * (1 - Math.min(energy, 1) * 0.85)}
                width={KEY_W-2} height={keyH * Math.min(energy, 1) * 0.85}
                rx={2} fill={fillColor} />
            )}
            <text x={x + KEY_W/2} y={keyH - 4} textAnchor="middle" fontSize={8}
              fill={inKey || inChord ? 'rgba(200,200,210,0.9)' : 'rgba(90,90,100,0.8)'}>
              {WHITE_LABELS[wi]}
            </text>
            {showPct && pct > 0 && (
              <text x={x + KEY_W/2} y={keyH + 14} textAnchor="middle" fontSize={8}
                fill={inKey ? (monoColor ? 'rgb(192,132,252)' : 'rgb(251,191,36)') : 'rgba(100,100,110,0.8)'}>
                {pct}%
              </text>
            )}
          </g>
        )
      })}

      {/* Black keys */}
      {bKeys.map(({ pc, wi }, i) => {
        const energy  = values[pc] / max
        const inChord = chordNotes?.has(pc)
        const inKey   = keyNotes?.has(pc)
        const x = wi * KEY_W + KEY_W - BLACK_W / 2
        const fillColor = inChord
          ? 'rgba(139,92,246,0.9)'
          : inKey
          ? monoColor ? 'rgba(192,132,252,0.85)' : 'rgba(180,130,0,0.85)'
          : 'rgba(70,70,80,0.75)'
        const pct = showPct ? Math.round(values[pc] * 100) : 0

        return (
          <g key={`b${i}`}>
            {/* Base */}
            <rect x={x} y={3} width={BLACK_W} height={BLACK_H}
              rx={2} fill="rgb(14,14,18)" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
            {/* Partial fill from bottom — same mechanic as white keys */}
            {energy > (inChord || inKey ? 0.05 : 0.35) && (
              <rect
                x={x} y={3 + BLACK_H * (1 - Math.min(energy, 1) * 0.9)}
                width={BLACK_W} height={BLACK_H * Math.min(energy, 1) * 0.9}
                rx={1} fill={fillColor} />
            )}
            {/* % label near top of key (inside) */}
            {showPct && pct > 0 && (
              <text x={x + BLACK_W/2} y={3 + 10} textAnchor="middle" fontSize={7}
                fill={inKey || inChord ? 'rgba(220,220,230,0.9)' : 'rgba(110,110,120,0.7)'}>
                {pct}%
              </text>
            )}
            {/* Note name near bottom of key */}
            <text x={x + BLACK_W/2} y={3 + BLACK_H - 5} textAnchor="middle" fontSize={7}
              fill={inKey || inChord ? 'rgba(210,210,220,0.85)' : 'rgba(110,110,120,0.6)'}>
              {NOTES[pc]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Mini fretboard — guitar mode chroma view ─────────────────────────────────
const STRINGS = [
  { label: 'e', root: 4 },
  { label: 'B', root: 11 },
  { label: 'G', root: 7 },
  { label: 'D', root: 2 },
  { label: 'A', root: 9 },
  { label: 'E', root: 4 },
]
const MF_NUT_X  = 22
const MF_OPEN_X = 10
const MF_FRET_W = 28
const MF_STR_H  = 16
const MF_PAD_T  = 16
const MF_PAD_B  = 8
const MF_FRETS  = 13  // frets 0–12
const MF_DOT_R  = 6
const MF_W = MF_NUT_X + (MF_FRETS - 1) * MF_FRET_W + 10
const MF_H = MF_PAD_T + 5 * MF_STR_H + MF_PAD_B

const mfFretX   = f  => MF_NUT_X + (f - 0.5) * MF_FRET_W
const mfStringY = si => MF_PAD_T + si * MF_STR_H

function MiniFretboard({ values, keyNotes, chordNotes, monoColor = false }) {
  const max = Math.max(...values, 0.01)

  return (
    <svg viewBox={`0 0 ${MF_W} ${MF_H}`} width="100%" style={{ display: 'block' }}>
      {/* Board background */}
      <rect x={MF_NUT_X} y={MF_PAD_T - 5}
        width={MF_W - MF_NUT_X - 6} height={5 * MF_STR_H + 10}
        fill="#1a120b" rx={2} />

      {/* Fret position dots */}
      {[3, 5, 7, 9].map(f => (
        <circle key={f} cx={mfFretX(f)} cy={MF_PAD_T + 2.5 * MF_STR_H} r={3} fill="#3a2a1a" />
      ))}
      <circle cx={mfFretX(12)} cy={MF_PAD_T + 1.5 * MF_STR_H} r={3} fill="#3a2a1a" />
      <circle cx={mfFretX(12)} cy={MF_PAD_T + 3.5 * MF_STR_H} r={3} fill="#3a2a1a" />

      {/* Fret lines */}
      {Array.from({ length: MF_FRETS - 1 }, (_, i) => i + 1).map(f => (
        <line key={f}
          x1={MF_NUT_X + f * MF_FRET_W} y1={MF_PAD_T - 5}
          x2={MF_NUT_X + f * MF_FRET_W} y2={MF_PAD_T + 5 * MF_STR_H + 5}
          stroke="#4a3a2a" strokeWidth={1} />
      ))}

      {/* Nut */}
      <line x1={MF_NUT_X} y1={MF_PAD_T - 5} x2={MF_NUT_X} y2={MF_PAD_T + 5 * MF_STR_H + 5}
        stroke="#c0b090" strokeWidth={3} />

      {/* Strings */}
      {STRINGS.map((_, si) => (
        <line key={si}
          x1={MF_OPEN_X - MF_DOT_R - 2} y1={mfStringY(si)}
          x2={MF_W - 6} y2={mfStringY(si)}
          stroke="#9ca3af"
          strokeWidth={si < 2 ? 0.8 : si < 4 ? 1.2 : 1.8} />
      ))}

      {/* Fret numbers */}
      {[3, 5, 7, 9, 12].map(f => (
        <text key={f} x={mfFretX(f)} y={MF_PAD_T - 5}
          textAnchor="middle" fontSize={8} fill="#6b7280">{f}</text>
      ))}

      {/* String labels */}
      {STRINGS.map((s, si) => (
        <text key={si} x={5} y={mfStringY(si) + 3.5}
          textAnchor="middle" fontSize={9} fill="#6b7280">{s.label}</text>
      ))}

      {/* Note dots — colored by energy */}
      {STRINGS.flatMap((str, si) =>
        Array.from({ length: MF_FRETS }, (_, fi) => {
          const pc      = (str.root + fi) % 12
          const energy  = values[pc] / max
          const inChord = chordNotes?.has(pc)
          const inKey   = keyNotes?.has(pc)
          if (!inChord && !inKey && energy < 0.35) return null
          if ((inChord || inKey) && energy < 0.08) return null

          const cx = fi === 0 ? MF_OPEN_X : mfFretX(fi)
          const cy = mfStringY(si)

          let fill, textFill
          if (inChord) {
            fill = `rgba(168,85,247,${0.3 + energy * 0.7})`
            textFill = '#fff'
          } else if (inKey) {
            fill = monoColor ? `rgba(192,132,252,${0.2 + energy * 0.75})` : `rgba(245,158,11,${0.2 + energy * 0.75})`
            textFill = monoColor ? '#fff' : 'rgba(0,0,0,0.85)'
          } else {
            fill = `rgba(100,100,120,${energy * 0.7})`
            textFill = 'rgba(180,180,190,0.7)'
          }

          return (
            <g key={`${si}-${fi}`}>
              {energy > 0.3 && (inChord || inKey) && (
                <circle cx={cx} cy={cy} r={MF_DOT_R + 4}
                  fill={inChord ? 'rgba(168,85,247,0.25)' : monoColor ? 'rgba(192,132,252,0.2)' : 'rgba(245,158,11,0.2)'}
                  style={{ filter: 'blur(4px)' }} />
              )}
              <circle cx={cx} cy={cy} r={MF_DOT_R} fill={fill} />
              <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize={7} fontWeight="600" fill={textFill}>
                {NOTES[pc]}
              </text>
            </g>
          )
        })
      )}
    </svg>
  )
}

// ─── Oscilloscope strip ───────────────────────────────────────────────────────
const OSC_W = 600
const OSC_H = 110

function Oscilloscope({ waveform }) {
  const { wave, rms, detectedFreq, detectedNote } = waveform || {}
  const silent = !rms || rms < 0.005

  // ── Note scroll history — last 5 distinct notes ───────────────────────────
  const noteHistoryRef = useRef([])   // [{ note, freq, id }, ...] oldest first
  const lastNoteRef    = useRef(null)
  const noteIdRef      = useRef(0)
  const lastDisplayRef = useRef(null) // last detected note shown in header — never flickers
  if (detectedNote && detectedNote !== lastNoteRef.current) {
    lastNoteRef.current = detectedNote
    lastDisplayRef.current = { note: detectedNote, freq: detectedFreq }
    noteHistoryRef.current.push({ note: detectedNote, freq: detectedFreq, id: noteIdRef.current++ })
    if (noteHistoryRef.current.length > 5) noteHistoryRef.current.shift()
  } else if (detectedFreq && detectedNote) {
    lastDisplayRef.current = { note: detectedNote, freq: detectedFreq }
  }

  // ── Ghost waveform — holds the last clear-pitch shape, fades slowly ───────
  const ghostRef = useRef({ path: '', fill: '', opacity: 0 })
  if (detectedFreq) {
    ghostRef.current = { path: '', fill: '', opacity: 1 }   // will be filled below
  } else {
    ghostRef.current = { ...ghostRef.current, opacity: ghostRef.current.opacity * 0.97 }
  }

  let path = '', sinePath = ''
  if (wave?.length) {
    const mid     = OSC_H / 2
    const waveAmp = Math.max(...wave.map(Math.abs), 0.001)
    const gain    = Math.min((OSC_H * 0.44) / waveAmp, OSC_H * 0.44)

    const lo = Math.floor(wave.length / 4)
    const hi = Math.floor(wave.length / 2)
    let offset = lo
    for (let i = lo; i < hi - 1; i++) {
      if (wave[i] <= 0 && wave[i + 1] > 0) { offset = i; break }
    }
    const drawLen = Math.min(wave.length - offset, Math.floor(wave.length * 0.85))
    const step    = OSC_W / drawLen

    path = Array.from({ length: drawLen }, (_, i) => {
      const v = wave[offset + i]
      return `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(mid - v * gain).toFixed(1)}`
    }).join(' ')

    // Capture ghost path when we have a clear pitch
    if (detectedFreq) {
      ghostRef.current.path = path
      ghostRef.current.fill = path + ` L${OSC_W},${mid} L0,${mid} Z`
    }

    if (detectedFreq) {
      const effectiveSR = 44100 / 8
      const sineAmp = Math.min(waveAmp * gain * 0.55, OSC_H * 0.38)
      sinePath = Array.from({ length: 300 }, (_, i) => {
        const t     = i / 299
        const x     = (t * OSC_W).toFixed(1)
        const phase = ((offset + t * drawLen) / effectiveSR) * detectedFreq * Math.PI * 2
        const y     = (mid - Math.sin(phase) * sineAmp).toFixed(1)
        return `${i === 0 ? 'M' : 'L'}${x},${y}`
      }).join(' ')
    }
  }

  const lineColor = detectedFreq
    ? 'rgba(168,85,247,0.9)'
    : silent ? 'rgba(50,50,60,0.8)' : 'rgba(100,200,140,0.75)'

  const ghost       = ghostRef.current
  const ghostOp     = ghost.opacity
  const noteHistory = noteHistoryRef.current
  const lastDisplay = lastDisplayRef.current

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-600 uppercase tracking-widest">Oscilloscope — raw mic input</p>
        <div className="flex items-center gap-3">
          {lastDisplay && (
            <>
              <span className={`text-xs font-bold ${detectedFreq ? 'text-accent' : 'text-gray-500'}`}>{lastDisplay.note}</span>
              <span className="text-xs text-gray-500 tabular-nums">{lastDisplay.freq.toFixed(1)} Hz</span>
              <span className="text-xs text-gray-600 tabular-nums">{(1000 / lastDisplay.freq).toFixed(2)} ms / cycle</span>
            </>
          )}
          {silent && <span className="text-xs text-gray-700">silence</span>}
          <span className="text-xs text-gray-700 tabular-nums">rms {rms ? (rms * 100).toFixed(1) : '0.0'}%</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${OSC_W} ${OSC_H}`} width="100%" style={{ display: 'block' }}
        className="rounded-lg bg-surface border border-border">
        {/* Zero line */}
        <line x1={0} y1={OSC_H / 2} x2={OSC_W} y2={OSC_H / 2}
          stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />

        {/* Ghost waveform — previous clear-pitch shape fading out */}
        {ghost.path && ghostOp > 0.04 && !detectedFreq && (
          <>
            <path d={ghost.fill} fill={`rgba(168,85,247,${(ghostOp * 0.06).toFixed(3)})`} />
            <path d={ghost.path} fill="none"
              stroke={`rgba(150,120,200,${(ghostOp * 0.35).toFixed(3)})`}
              strokeWidth={0.8} strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}

        {/* Fill body */}
        {path && (
          <path
            d={`${path} L${OSC_W},${OSC_H / 2} L0,${OSC_H / 2} Z`}
            fill={detectedFreq
              ? 'rgba(168,85,247,0.08)'
              : silent ? 'none' : 'rgba(90,190,130,0.07)'}
          />
        )}
        {/* Waveform line */}
        {path && <path d={path} fill="none" stroke={lineColor} strokeWidth={0.9}
          strokeLinejoin="round" strokeLinecap="round" />}
        {/* Sine overlay */}
        {sinePath && <path d={sinePath} fill="none"
          stroke="rgba(168,85,247,0.28)" strokeWidth={0.9}
          strokeLinejoin="round" strokeDasharray="5 4" />}

        {/* Scrolling note history — newest on right, slides left on each new note */}
        {noteHistory.map((entry, i) => {
          const age   = noteHistory.length - 1 - i   // 0 = newest
          const x     = OSC_W - 28 - age * 100
          const op    = (1 - age * 0.18).toFixed(2)
          const isNew = age === 0
          return (
            <g key={entry.id}
              style={{ transform: `translateX(${x}px)`, transition: 'transform 0.45s cubic-bezier(0.4,0,0.2,1)' }}>
              <text x={0} y={OSC_H - 18} textAnchor="middle"
                fontSize={isNew ? 13 : 11} fontWeight={isNew ? '700' : '400'}
                fill={isNew ? `rgba(168,85,247,${op})` : `rgba(160,130,210,${op})`}>
                {entry.note}
              </text>
              <text x={0} y={OSC_H - 7} textAnchor="middle" fontSize={7}
                fill={`rgba(120,100,160,${(parseFloat(op) * 0.7).toFixed(2)})`}>
                {entry.freq ? entry.freq.toFixed(0) : ''}Hz
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Frequency spectrum ───────────────────────────────────────────────────────
const SPEC_H   = 130
const SPEC_F_MIN = 40
const SPEC_F_MAX = 4000
const SPEC_LOG   = Math.log(SPEC_F_MAX / SPEC_F_MIN)

// Map a frequency in Hz to an x pixel position (log scale)
function specX(f, w) {
  if (f <= SPEC_F_MIN) return 0
  if (f >= SPEC_F_MAX) return w
  return w * Math.log(f / SPEC_F_MIN) / SPEC_LOG
}

const SPEC_GRID = [
  { label: 'E2', freq: 82.4  },
  { label: 'C3', freq: 130.8 },
  { label: 'E3', freq: 164.8 },
  { label: 'A3', freq: 220   },
  { label: 'C4', freq: 261.6 },
  { label: 'E4', freq: 329.6 },
  { label: 'A4', freq: 440   },
  { label: 'C5', freq: 523.3 },
  { label: 'C6', freq: 1046.5},
  { label: 'C7', freq: 2093  },
]

function SpectrumPanel({ spectrum, detectedFreq }) {
  const W = OSC_W
  const ghostRef    = useRef(null)
  const ghostFreqRef = useRef(null)  // { freq, opacity }

  // Ghost frequency lines — lock on detection, decay slowly when gone
  if (detectedFreq) {
    ghostFreqRef.current = { freq: detectedFreq, opacity: 1 }
  } else if (ghostFreqRef.current) {
    ghostFreqRef.current = { freq: ghostFreqRef.current.freq, opacity: ghostFreqRef.current.opacity * 0.97 }
  }
  const ghostFreq    = ghostFreqRef.current?.opacity > 0.04 ? ghostFreqRef.current.freq : null
  const ghostOpacity = ghostFreqRef.current?.opacity ?? 0

  // Ghost: rises instantly with signal, decays very slowly — lingers as grey
  if (spectrum?.length) {
    if (!ghostRef.current) ghostRef.current = new Float32Array(spectrum.length)
    const ghost = ghostRef.current
    for (let i = 0; i < spectrum.length; i++) {
      ghost[i] = spectrum[i] > ghost[i] ? spectrum[i] : ghost[i] * 0.988
    }
  }

  let fillPath = '', strokePath = '', ghostFill = '', ghostStroke = ''

  if (spectrum?.length) {
    const n = spectrum.length
    const pts = Array.from({ length: n }, (_, i) => {
      const x = ((i / (n - 1)) * W).toFixed(1)
      const y = (SPEC_H * (1 - spectrum[i])).toFixed(1)
      return `${i === 0 ? 'M' : 'L'}${x},${y}`
    }).join(' ')
    strokePath = pts
    fillPath   = pts + ` L${W},${SPEC_H} L0,${SPEC_H} Z`

    const ghost = ghostRef.current
    if (ghost) {
      const gpts = Array.from({ length: n }, (_, i) => {
        const x = ((i / (n - 1)) * W).toFixed(1)
        const y = (SPEC_H * (1 - ghost[i])).toFixed(1)
        return `${i === 0 ? 'M' : 'L'}${x},${y}`
      }).join(' ')
      ghostStroke = gpts
      ghostFill   = gpts + ` L${W},${SPEC_H} L0,${SPEC_H} Z`
    }
  }

  return (
    <div>
      <p className="text-xs text-gray-600 uppercase tracking-widest mb-1">
        Frequency spectrum — 40 Hz → 4 kHz (log scale)
      </p>
      <svg viewBox={`0 0 ${W} ${SPEC_H}`} width="100%" style={{ display: 'block' }}
        className="rounded-lg bg-surface border border-border">

        {/* Note grid lines */}
        {SPEC_GRID.map(({ label, freq }) => {
          const x = specX(freq, W).toFixed(1)
          return (
            <g key={label}>
              <line x1={x} y1={0} x2={x} y2={SPEC_H - 14}
                stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
              <text x={x} y={SPEC_H - 3} textAnchor="middle" fontSize={7.5}
                fill="rgba(80,80,95,0.9)">{label}</text>
            </g>
          )
        })}

        {/* Ghost — slow-decaying grey residue from previous peaks */}
        {ghostFill && (
          <>
            <path d={ghostFill} fill="rgba(120,120,130,0.08)" />
            <path d={ghostStroke} fill="none" stroke="rgba(130,130,145,0.30)" strokeWidth={0.7} />
          </>
        )}

        {/* Live spectrum fill + stroke */}
        {fillPath && (
          <>
            <path d={fillPath} fill="rgba(80,180,130,0.13)" />
            <path d={strokePath} fill="none" stroke="rgba(90,200,145,0.55)" strokeWidth={0.8} />
          </>
        )}

        {/* Fundamental + harmonics */}
        {ghostFreq && [1, 2, 3, 4, 5].map(h => {
          const hf = ghostFreq * h
          if (hf > SPEC_F_MAX) return null
          const xNum  = specX(hf, W)
          const x     = xNum.toFixed(1)
          const midi  = Math.round(12 * Math.log2(hf / 440) + 69)
          const note  = NOTES[((midi % 12) + 12) % 12]
          const oct   = Math.floor(midi / 12) - 1
          // Place label left of line near the right edge, right of line elsewhere
          const labelX  = xNum > W - 40 ? xNum - 3 : xNum + 3
          const anchor  = xNum > W - 40 ? 'end' : 'start'

          if (h === 1) {
            const op     = (0.9 * ghostOpacity).toFixed(3)
            const textOp = (ghostOpacity * 0.95).toFixed(3)
            return (
              <g key={h}>
                <line x1={x} y1={0} x2={x} y2={SPEC_H - 14}
                  stroke={`rgba(168,85,247,${op})`} strokeWidth={1.2} />
                <text x={labelX} y={10} textAnchor={anchor} fontSize={8} fontWeight="700"
                  fill={`rgba(168,85,247,${textOp})`}>{note}{oct}</text>
                <text x={labelX} y={20} textAnchor={anchor} fontSize={7}
                  fill={`rgba(168,85,247,${(ghostOpacity * 0.55).toFixed(3)})`}>f</text>
              </g>
            )
          }

          const op = ((0.5 - (h - 2) * 0.1) * ghostOpacity).toFixed(3)
          return (
            <g key={h}>
              <line x1={x} y1={0} x2={x} y2={SPEC_H - 14}
                stroke={`rgba(168,85,247,${op})`} strokeWidth={0.7} strokeDasharray="3 4" />
              <text x={labelX} y={10} textAnchor={anchor} fontSize={7.5}
                fill={`rgba(168,85,247,${op})`}>{note}{oct}</text>
              <text x={labelX} y={19} textAnchor={anchor} fontSize={7}
                fill={`rgba(168,85,247,${(parseFloat(op) * 0.7).toFixed(3)})`}>{h}f</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DebugView({ chroma, chordCandidates, noteAnalysis, waveform, keyInfo, currentChord, instrument = 'guitar', monoColor = false }) {
  const keyPCs   = new Set(keyInfo ? getScale(keyInfo.root, keyInfo.mode).map(n => NOTES.indexOf(n)) : [])
  const chordPCs = new Set(currentChord ? getChordTones(currentChord).map(n => NOTES.indexOf(n)) : [])

  const chromaArr    = chroma       ? [...chroma]            : new Array(12).fill(0)
  const histFreq     = noteAnalysis ? noteAnalysis.freq       : new Array(12).fill(0)
  const topKeys      = noteAnalysis ? noteAnalysis.topKeys    : []
  const totalNotes   = noteAnalysis?.total      ?? 0
  const sessionSecs  = noteAnalysis?.sessionSecs ?? 0
  const sessionLabel = sessionSecs >= 60
    ? `${Math.floor(sessionSecs / 60)}m ${sessionSecs % 60}s`
    : `${sessionSecs}s`
  const topScore    = chordCandidates[0]?.score ?? 1
  const topKeyScore = topKeys[0]?.score ?? 1

  return (
    <div className="flex flex-col gap-4">
{/* ── Live chroma visualization (instrument-synced) ── */}
      <div>
        <p className="text-xs text-gray-600 uppercase tracking-widest mb-2">Live chroma — what the engine hears right now</p>
        {instrument === 'guitar'
          ? <MiniFretboard values={chromaArr} keyNotes={keyPCs} chordNotes={chordPCs} monoColor={monoColor} />
          : <PianoSVG values={chromaArr} keyNotes={keyPCs} chordNotes={chordPCs} keyH={90} monoColor={monoColor} />
        }
      </div>

      {/* ── Bottom three columns ── */}
      <div className="grid grid-cols-[2fr_1.5fr_1fr] gap-5">

        {/* Col 1: Chord candidates */}
        <div>
          <p className="text-xs text-gray-600 uppercase tracking-widest mb-2">Chord candidates</p>
          <div className="flex flex-col gap-1">
            {chordCandidates.length === 0 && (
              <p className="text-gray-700 text-xs">No signal detected</p>
            )}
            {chordCandidates.map((c, i) => (
              <div
                key={c.name}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${
                  i === 0 ? 'bg-accent/10 border border-accent/25' : 'border border-transparent'
                }`}
              >
                <span className="text-xs text-gray-600 w-3 shrink-0">{i + 1}</span>
                <span className={`text-sm font-bold w-14 shrink-0 ${i === 0 ? 'text-white' : 'text-gray-400'}`}>
                  {c.name}
                </span>
                <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${i === 0 ? 'bg-accent' : 'bg-gray-600'}`}
                    style={{ width: `${(c.score / topScore) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-8 text-right tabular-nums">{c.score.toFixed(2)}</span>
                <div className="flex gap-1 w-14 justify-end">
                  {c.diatonic  && <span className="text-[9px] px-1 rounded bg-green-900/50 text-green-400">key</span>}
                  {c.bassBonus > 0 && <span className="text-[9px] px-1 rounded bg-blue-900/50 text-blue-400">bass</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Col 2: Note history piano with % labels */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-xs text-gray-600 uppercase tracking-widest">Note history</p>
            {totalNotes > 0 && (
              <span className="text-[10px] text-gray-600 tabular-nums">
                {totalNotes.toLocaleString()} notes · {sessionLabel}
              </span>
            )}
          </div>
          <PianoSVG values={histFreq} keyNotes={keyPCs} chordNotes={chordPCs} keyH={70} showPct={true} monoColor={monoColor} />
        </div>

        {/* Col 3: Key candidates */}
        <div>
          <p className="text-xs text-gray-600 uppercase tracking-widest mb-2">Key match scores</p>
          <div className="flex flex-col gap-1.5">
            {topKeys.length === 0 && (
              <p className="text-gray-700 text-xs">Not enough history</p>
            )}
            {topKeys.map((k, i) => (
              <div key={`${k.root}-${k.mode}`} className="flex items-center gap-2">
                <span className={`text-xs w-16 shrink-0 ${i === 0 ? 'text-white font-semibold' : 'text-gray-500'}`}>
                  {k.root} {k.mode === 'major' ? 'maj' : 'min'}
                </span>
                <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${i === 0 ? 'bg-amber-400' : 'bg-gray-600'}`}
                    style={{ width: `${Math.max(0, (k.score / topKeyScore) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-600 tabular-nums w-8 text-right">{k.score.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Oscilloscope + spectrum ── */}
      <div className="flex flex-col gap-3">
        <Oscilloscope waveform={waveform} />
        <SpectrumPanel spectrum={waveform?.spectrum} detectedFreq={waveform?.detectedFreq} />
      </div>
    </div>
  )
}
