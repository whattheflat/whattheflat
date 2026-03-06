import { useState, useEffect } from 'react'
import { getSuggestedProgressions, getChordsInKey, toRomanNumeral, NOTES, NOTES_FLAT } from '../lib/theory'

// ─── Mood map ─────────────────────────────────────────────────────────────────
const MOOD = {
  'I':    'Resolved',   'i':    'Settled',
  'II':   'Lifted',     'ii':   'Yearning',
  'III':  'Hopeful',    'iii':  'Tender',
  'IV':   'Uplifting',  'iv':   'Longing',
  'V':    'Tense',      'v':    'Unsettled',
  'VI':   'Bright',     'vi':   'Melancholic',
  'VII':  'Driving',    'vii':  'Uneasy',
  '♭VII': 'Bluesy',     'bVII': 'Bluesy',
  '♭VI':  'Dramatic',   'bVI':  'Dramatic',
  '♭III': 'Epic',       '♭II':  'Mysterious',
}

function getMood(rn) {
  return MOOD[rn] ?? MOOD[rn?.replace(/[0-9]/g, '')] ?? 'Adventurous'
}

// ─── Genre accent colors ──────────────────────────────────────────────────────
const GENRE_COLOR = {
  'Pop':      'text-pink-400',
  'Blues':    'text-blue-400',
  'Folk':     'text-green-400',
  'Jazz':     'text-yellow-400',
  'Rock':     'text-red-400',
  "'50s":     'text-orange-400',
  'Flamenco': 'text-rose-400',
  'Circle ↑': 'text-cyan-400',
  'Circle ↓': 'text-teal-400',
  'Relative': 'text-violet-400',
  'Thirds':   'text-indigo-400',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function noteIndex(note) {
  const i = NOTES.indexOf(note)
  return i >= 0 ? i : NOTES_FLAT.indexOf(note)
}

function chordRoot(chord) {
  const m = chord.match(/^([A-G][b#]?)/)
  return m ? m[1] : null
}

// ─── Circle-of-fifths padding ─────────────────────────────────────────────────
// Moves tried in order to fill up to 6 total suggestions:
//   +7  perfect 5th up   (dominant direction — most common resolution)
//   +5  perfect 4th up   (subdominant direction)
//   +9  major/minor 6th  (relative minor/major feel)
//   +3  minor 3rd up     (mediant movement, dark → light)
const COF_MOVES = [
  { semitones: 7, genre: 'Circle ↑' },
  { semitones: 5, genre: 'Circle ↓' },
  { semitones: 9, genre: 'Relative' },
  { semitones: 3, genre: 'Thirds'   },
]

function cofSuggestions(currentChord, root, mode, exclude) {
  const rootPc = noteIndex(chordRoot(currentChord) ?? '')
  if (rootPc < 0) return []

  const diatonic = getChordsInKey(root, mode)
  const results  = []

  for (const { semitones, genre } of COF_MOVES) {
    const targetPc = ((rootPc + semitones) % 12 + 12) % 12
    const match = diatonic.find(c => {
      const r = chordRoot(c)
      return r !== null && noteIndex(r) === targetPc
    })
    if (!match || exclude.has(match)) continue
    const rn = toRomanNumeral(match, root, mode)
    results.push({ genre, chord: match, rn, mood: getMood(rn) })
  }
  return results
}

// ─── Main suggestion builder ──────────────────────────────────────────────────
function buildSuggestions(currentChord, root, mode) {
  if (!currentChord || !root) return []

  const genreSuggestions = getSuggestedProgressions(root, mode)
    .map(prog => {
      const idx = prog.chords.indexOf(currentChord)
      if (idx < 0) return null
      const next = (n) => prog.chords[(idx + n) % prog.chords.length]
      const rnAt = (n) => prog.rn[(idx + n) % prog.chords.length]
      const c1 = next(1), c2 = next(2), c3 = next(3)
      const chord2 = c2 !== c1 ? c2 : null
      const chord3 = chord2 && c3 !== c2 && c3 !== c1 ? c3 : null
      return {
        genre: prog.genre,
        chord: c1, rn: rnAt(1), mood: getMood(rnAt(1)),
        chord2, rn2: chord2 ? rnAt(2) : null, mood2: chord2 ? getMood(rnAt(2)) : null,
        chord3, rn3: chord3 ? rnAt(3) : null, mood3: chord3 ? getMood(rnAt(3)) : null,
      }
    })
    .filter(Boolean)

  if (genreSuggestions.length >= 4) return genreSuggestions.slice(0, 5)

  // Pad with circle-of-fifths moves not already covered
  const used   = new Set(genreSuggestions.map(s => s.chord))
  const padded = cofSuggestions(currentChord, root, mode, used)

  return [...genreSuggestions, ...padded].slice(0, 5)
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProgressionSuggestions({ keyInfo, currentChord }) {
  const { root, mode } = keyInfo ?? {}
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => {
    setSuggestions(buildSuggestions(currentChord, root, mode))
  }, [currentChord, root, mode])

  if (!root) return null

  return (
    <div className="bg-panel border border-border rounded-2xl p-3 flex flex-col h-full gap-1.5 overflow-hidden">

      <p className="text-xs text-gray-500 uppercase tracking-widest shrink-0">
        Suggested Progression
      </p>

      {!currentChord || suggestions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-600 text-sm text-center">
            {currentChord ? 'No suggestions' : 'Play a chord…'}
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-start gap-1 overflow-y-auto min-h-0">
          {suggestions.map((s, i) => (
            <div
              key={`${s.genre}-${i}`}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-border bg-surface/40 hover:border-gray-600 transition-colors duration-200"
            >
              <span className={`text-xs font-bold w-12 shrink-0 ${GENRE_COLOR[s.genre] ?? 'text-gray-400'}`}>
                {s.genre}
              </span>
              <div className="min-w-0">
                <div className="text-lg font-black text-white leading-none">{s.chord}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs font-semibold text-amber-400">{s.rn}</span>
                  <span className="text-gray-700 text-xs">·</span>
                  <span className="text-xs text-gray-500 truncate">{s.mood}</span>
                </div>
              </div>
              {s.chord2 && (
                <>
                  <span className="text-gray-600 text-xs shrink-0">|</span>
                  <div className="min-w-0">
                    <div className="text-lg font-black text-white/70 leading-none">{s.chord2}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs font-semibold text-amber-400/70">{s.rn2}</span>
                      <span className="text-gray-700 text-xs">·</span>
                      <span className="text-xs text-gray-500 truncate">{s.mood2}</span>
                    </div>
                  </div>
                </>
              )}
              {s.chord3 && (
                <>
                  <span className="text-gray-600 text-xs shrink-0">|</span>
                  <div className="min-w-0">
                    <div className="text-lg font-black text-white/50 leading-none">{s.chord3}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs font-semibold text-amber-400/50">{s.rn3}</span>
                      <span className="text-gray-700 text-xs">·</span>
                      <span className="text-xs text-gray-500 truncate">{s.mood3}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
