import { getPentatonicScale, getFullScale, getChordTones, NOTES } from '../lib/theory'

// Standard tuning: pitch classes of open strings, high-E first (top of diagram)
const STRINGS = [
  { label: 'e', root: 4 },   // high E
  { label: 'B', root: 11 },
  { label: 'G', root: 7 },
  { label: 'D', root: 2 },
  { label: 'A', root: 9 },
  { label: 'E', root: 4 },   // low E
]

const NUM_FRETS = 13          // frets 0 (open) through 12
const FRET_MARKERS = [3, 5, 7, 9]
const DOUBLE_MARKER = 12

// Layout constants
const NUT_X = 40             // x of the nut line
const OPEN_X = 18            // x of open-string dot centres
const FRET_W = 52            // pixels per fret
const STRING_H = 28          // pixels between strings
const PAD_T = 28             // top padding (fret numbers)
const PAD_B = 18             // bottom padding (fret marker dots)
const BOARD_W = NUT_X + (NUM_FRETS - 1) * FRET_W + 10
const BOARD_H = PAD_T + 5 * STRING_H + PAD_B
const DOT_R = 10

// x centre of a fretted note (fret >= 1)
const fretX = f => NUT_X + (f - 0.5) * FRET_W
// y centre of string si (0 = high e, 5 = low E)
const stringY = si => PAD_T + si * STRING_H

function noteColor(isChordTone, isPenta, isScale) {
  if (isChordTone) return { fill: '#f59e0b', text: '#000' }   // amber
  if (isPenta)     return { fill: '#a855f7', text: '#fff' }   // purple
  if (isScale)     return { fill: '#374151', text: '#d1d5db' } // grey
  return null
}

export default function Fretboard({ keyInfo, currentChord, pentatonicOnly = false }) {
  const { root, mode } = keyInfo ?? {}

  if (!root) return null

  const pentaSet = new Set(getPentatonicScale(root, mode).map(n => NOTES.indexOf(n)))
  const scaleSet = pentatonicOnly
    ? pentaSet
    : new Set(getFullScale(root, mode).map(n => NOTES.indexOf(n)))
  const chordSet = currentChord
    ? new Set(getChordTones(currentChord).map(n => NOTES.indexOf(n)))
    : new Set()

  return (
    <div className="bg-panel border border-border rounded-2xl p-6">
      <p className="text-sm text-gray-500 uppercase tracking-widest mb-4">
        Fretboard — {root} {mode}
        {currentChord && <span className="text-amber-400 ml-2">/ {currentChord}</span>}
      </p>

      <div className="overflow-x-auto">
        <svg
          width={BOARD_W}
          height={BOARD_H}
          style={{ display: 'block', minWidth: BOARD_W }}
        >
          {/* Fretboard background */}
          <rect x={NUT_X} y={PAD_T - 6} width={BOARD_W - NUT_X - 4} height={5 * STRING_H + 12}
            fill="#1a120b" rx={2} />

          {/* Fret position marker dots (between strings 2–3 and 3–4) */}
          {FRET_MARKERS.map(f => (
            <circle key={f}
              cx={fretX(f)} cy={PAD_T + 2.5 * STRING_H}
              r={5} fill="#3a2a1a" />
          ))}
          {/* Double dot at 12 */}
          <circle cx={fretX(DOUBLE_MARKER)} cy={PAD_T + 1.5 * STRING_H} r={5} fill="#3a2a1a" />
          <circle cx={fretX(DOUBLE_MARKER)} cy={PAD_T + 3.5 * STRING_H} r={5} fill="#3a2a1a" />

          {/* Fret lines (1–12) */}
          {Array.from({ length: NUM_FRETS - 1 }, (_, i) => i + 1).map(f => (
            <line key={f}
              x1={NUT_X + f * FRET_W} y1={PAD_T - 6}
              x2={NUT_X + f * FRET_W} y2={PAD_T + 5 * STRING_H + 6}
              stroke={f === DOUBLE_MARKER ? '#888' : '#4a3a2a'}
              strokeWidth={f === DOUBLE_MARKER ? 2 : 1} />
          ))}

          {/* Nut */}
          <line x1={NUT_X} y1={PAD_T - 6} x2={NUT_X} y2={PAD_T + 5 * STRING_H + 6}
            stroke="#c0b090" strokeWidth={4} />

          {/* Strings */}
          {STRINGS.map((_, si) => (
            <line key={si}
              x1={OPEN_X - DOT_R - 2} y1={stringY(si)}
              x2={BOARD_W - 8} y2={stringY(si)}
              stroke="#9ca3af"
              strokeWidth={si < 2 ? 1 : si < 4 ? 1.5 : 2} />
          ))}

          {/* Fret numbers */}
          {[3, 5, 7, 9, 12].map(f => (
            <text key={f}
              x={fretX(f)} y={PAD_T - 10}
              textAnchor="middle" fontSize={10} fill="#6b7280"
            >{f}</text>
          ))}

          {/* String labels */}
          {STRINGS.map((s, si) => (
            <text key={si}
              x={6} y={stringY(si) + 4}
              textAnchor="middle" fontSize={10} fill="#6b7280"
            >{s.label}</text>
          ))}

          {/* Note dots */}
          {STRINGS.flatMap((str, si) =>
            Array.from({ length: NUM_FRETS }, (_, fi) => {
              const pc = (str.root + fi) % 12
              const color = noteColor(chordSet.has(pc), pentaSet.has(pc), scaleSet.has(pc))
              if (!color) return null

              const cx = fi === 0 ? OPEN_X : fretX(fi)
              const cy = stringY(si)

              return (
                <g key={`${si}-${fi}`}>
                  <circle cx={cx} cy={cy} r={DOT_R} fill={color.fill} />
                  <text
                    x={cx} y={cy + 4}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight="600"
                    fill={color.text}
                  >
                    {NOTES[pc]}
                  </text>
                </g>
              )
            })
          )}
        </svg>
      </div>

      <div className="mt-3 flex gap-5 text-xs text-gray-500">
        <span><span className="text-amber-400">●</span> Chord tone</span>
        <span><span className="text-accent">●</span> Pentatonic</span>
        <span><span className="text-gray-500">●</span> Scale</span>
      </div>
    </div>
  )
}
