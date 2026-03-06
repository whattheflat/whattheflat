import { getFullScale, getChordTones, NOTES } from '../lib/theory'

// White keys in order within an octave, mapped to pitch class
const WHITE_KEYS = [
  { pc: 0, label: 'C' },
  { pc: 2, label: 'D' },
  { pc: 4, label: 'E' },
  { pc: 5, label: 'F' },
  { pc: 7, label: 'G' },
  { pc: 9, label: 'A' },
  { pc: 11, label: 'B' },
]

// Black keys: position (in white-key units from left of octave) and pitch class
const BLACK_KEYS = [
  { pc: 1,  offset: 0.7 },  // C#
  { pc: 3,  offset: 1.7 },  // D#
  { pc: 6,  offset: 3.7 },  // F#
  { pc: 8,  offset: 4.7 },  // G#
  { pc: 10, offset: 5.7 },  // A#
]

const OCTAVES    = 2          // number of octaves shown
const KEY_W      = 40         // white key width
const KEY_H      = 130        // white key height
const BLACK_W    = 26         // black key width
const BLACK_H    = 82         // black key height
const LABEL_Y    = KEY_H - 10 // y of note label on white key
const BLACK_LABEL_Y = BLACK_H - 8

function keyColor(isChordTone, isScale, isBlack) {
  if (isChordTone) return { fill: '#a855f7', text: '#fff' }
  if (isScale)     return { fill: '#f59e0b', text: '#000' }
  return isBlack
    ? { fill: '#1f1f1f', text: '#6b7280' }
    : { fill: '#f5f5f5', text: '#6b7280' }
}

export default function Piano({ keyInfo, currentChord }) {
  const { root, mode } = keyInfo ?? {}
  if (!root) return null

  const scaleSet = new Set(getFullScale(root, mode).map(n => NOTES.indexOf(n)))
  const chordSet = currentChord
    ? new Set(getChordTones(currentChord).map(n => NOTES.indexOf(n)))
    : new Set()

  const totalWhite = WHITE_KEYS.length * OCTAVES
  const svgW = totalWhite * KEY_W + 2
  const svgH = KEY_H + 20  // +20 for octave labels

  return (
    <div className="bg-panel border border-border rounded-2xl p-6">
      <p className="text-sm text-gray-500 uppercase tracking-widest mb-4">
        Piano — {root} {mode}
        {currentChord && <span className="text-amber-400 ml-2">/ {currentChord}</span>}
      </p>

      <div>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" height="auto" style={{ display: 'block' }}>

          {/* White keys */}
          {Array.from({ length: OCTAVES }, (_, oct) =>
            WHITE_KEYS.map((k, wi) => {
              const x = (oct * WHITE_KEYS.length + wi) * KEY_W + 1
              const isChordTone = chordSet.has(k.pc)
              const isScale     = scaleSet.has(k.pc)
              const { fill, text } = keyColor(isChordTone, isScale, false)
              return (
                <g key={`w-${oct}-${wi}`}>
                  <rect
                    x={x} y={0}
                    width={KEY_W - 1} height={KEY_H}
                    fill={fill}
                    rx={3}
                    stroke="#2a2a2a"
                    strokeWidth={1}
                  />
                  <text
                    x={x + KEY_W / 2} y={LABEL_Y}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight="600"
                    fill={text}
                  >
                    {k.label}{oct + 3}
                  </text>
                </g>
              )
            })
          )}

          {/* Black keys (drawn on top) */}
          {Array.from({ length: OCTAVES }, (_, oct) =>
            BLACK_KEYS.map((k, bi) => {
              const x = (oct * WHITE_KEYS.length + k.offset) * KEY_W + 1
              const isChordTone = chordSet.has(k.pc)
              const isScale     = scaleSet.has(k.pc)
              const { fill, text } = keyColor(isChordTone, isScale, true)
              return (
                <g key={`b-${oct}-${bi}`}>
                  <rect
                    x={x} y={0}
                    width={BLACK_W} height={BLACK_H}
                    fill={fill}
                    rx={2}
                    stroke="#111"
                    strokeWidth={1}
                  />
                  <text
                    x={x + BLACK_W / 2} y={BLACK_LABEL_Y}
                    textAnchor="middle"
                    fontSize={8}
                    fontWeight="600"
                    fill={text}
                  >
                    {NOTES[k.pc]}
                  </text>
                </g>
              )
            })
          )}

        </svg>
      </div>

      <div className="mt-3 flex gap-5 text-xs text-gray-500">
        <span><span className="text-accent">●</span> Chord tone</span>
        <span><span className="text-accent">●</span> Scale note</span>
      </div>
    </div>
  )
}
