// ─── Constants ───────────────────────────────────────────────────────────────

export const NOTES      = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
export const NOTES_FLAT = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']

// Semitone intervals for each scale mode
export const SCALES = {
  major:            [0, 2, 4, 5, 7, 9, 11],
  minor:            [0, 2, 3, 5, 7, 8, 10],
  dorian:           [0, 2, 3, 5, 7, 9, 10],
  phrygian:         [0, 1, 3, 5, 7, 8, 10],
  lydian:           [0, 2, 4, 6, 7, 9, 11],
  mixolydian:       [0, 2, 4, 5, 7, 9, 10],
  pentatonic_major: [0, 2, 4, 7, 9],
  pentatonic_minor: [0, 3, 5, 7, 10],
  blues:            [0, 3, 5, 6, 7, 10],
  diminished:       [0, 2, 3, 5, 6, 8, 9, 11],
  whole_tone:       [0, 2, 4, 6, 8, 10],
}

// Human-readable scale labels
export const SCALE_LABELS = {
  major:            'Major',
  minor:            'Natural Minor',
  dorian:           'Dorian',
  phrygian:         'Phrygian',
  lydian:           'Lydian',
  mixolydian:       'Mixolydian',
  pentatonic_major: 'Major Pentatonic',
  pentatonic_minor: 'Minor Pentatonic',
  blues:            'Blues',
  diminished:       'Diminished',
  whole_tone:       'Whole Tone',
}

// Krumhansl-Schmuckler key profiles (only major/minor used for key detection)
const KS_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const KS_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

// Chord type definitions: intervals (semitones from root) and display suffix
export const CHORD_TYPES = {
  maj:     { intervals: [0, 4, 7],        suffix: ''      },
  min:     { intervals: [0, 3, 7],        suffix: 'm'     },
  dom7:    { intervals: [0, 4, 7, 10],    suffix: '7'     },
  maj7:    { intervals: [0, 4, 7, 11],    suffix: 'maj7'  },
  min7:    { intervals: [0, 3, 7, 10],    suffix: 'm7'    },
  dim:     { intervals: [0, 3, 6],        suffix: 'dim'   },
  dim7:    { intervals: [0, 3, 6, 9],     suffix: 'dim7'  },
  half_dim:{ intervals: [0, 3, 6, 10],    suffix: 'm7b5'  },
  aug:     { intervals: [0, 4, 8],        suffix: 'aug'   },
  sus4:    { intervals: [0, 5, 7],        suffix: 'sus4'  },
  sus2:    { intervals: [0, 2, 7],        suffix: 'sus2'  },
  maj6:    { intervals: [0, 4, 7, 9],     suffix: '6'     },
  min6:    { intervals: [0, 3, 7, 9],     suffix: 'm6'    },
  add9:    { intervals: [0, 2, 4, 7],     suffix: 'add9'  },
}

// Chord types considered during real-time chroma matching
const MATCH_CHORD_TYPES = [
  'maj', 'min', 'dom7', 'min7', 'dim', 'half_dim', 'aug', 'sus4', 'add9',
]

// Minimum score for a chord match to be reported
const CHORD_MATCH_MIN_SCORE = 0.42

// Minimum margin over second-best for a match to be considered unambiguous
const CHORD_MATCH_MIN_MARGIN = 0.08

// Chord quality arrays for each scale degree in major and minor
const DEGREE_QUALITIES = {
  major: ['',  'm', 'm', '',  '',  'm', 'dim'],
  minor: ['m', 'dim','', 'm', 'm', '',  ''   ],
}

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

// Common chord progressions by genre, expressed as semitone offsets from the root
const PROGRESSIONS = {
  pop:    { name: 'Pop',    rn: ['I', 'V', 'vi', 'IV'],   degrees: [0, 7, 9, 5]  },
  blues:  { name: 'Blues',  rn: ['I', 'IV', 'V'],          degrees: [0, 5, 7]     },
  folk:   { name: 'Folk',   rn: ['I', 'IV', 'I', 'V'],    degrees: [0, 5, 0, 7]  },
  jazz:   { name: 'Jazz',   rn: ['ii', 'V', 'I'],          degrees: [2, 7, 0]     },
  rock:   { name: 'Rock',   rn: ['I', 'bVII', 'IV', 'I'], degrees: [0, 10, 5, 0] },
  '50s':  { name: "'50s",   rn: ['I', 'vi', 'IV', 'V'],   degrees: [0, 9, 5, 7]  },
  flamen: { name: 'Flamenco',rn: ['i', 'bVII', 'bVI', 'V'],degrees:[0, 10, 8, 7] },
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Returns the note name for a given semitone value (0–11, wraps automatically).
 * @param {number} semitone
 * @param {boolean} [preferFlat=false]
 * @returns {string}
 */
function noteName(semitone, preferFlat = false) {
  const pc = ((semitone % 12) + 12) % 12
  return preferFlat ? NOTES_FLAT[pc] : NOTES[pc]
}

/**
 * Pearson correlation between two equal-length numeric arrays.
 * Returns a value in [-1, 1]. A small epsilon avoids division by zero.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
function pearsonCorrelation(a, b) {
  const n = a.length
  const meanA = a.reduce((s, v) => s + v, 0) / n
  const meanB = b.reduce((s, v) => s + v, 0) / n
  let num = 0, denA = 0, denB = 0
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA
    const db = b[i] - meanB
    num  += da * db
    denA += da * da
    denB += db * db
  }
  return num / Math.sqrt(denA * denB + 1e-10)
}

/**
 * Returns the semitone offset (0–11) of a note name, or -1 if not found.
 * Accepts both sharp and flat spellings.
 * @param {string} note
 * @returns {number}
 */
function noteIndex(note) {
  const idx = NOTES.indexOf(note)
  if (idx !== -1) return idx
  return NOTES_FLAT.indexOf(note) // handles Db, Eb, etc.
}

// ─── Key Detection ───────────────────────────────────────────────────────────

/**
 * Detects the most likely musical key from a recent history of played notes.
 *
 * Uses the Krumhansl-Schmuckler algorithm: builds a pitch-class frequency
 * vector and correlates it against major and minor profiles for all 12 roots.
 *
 * @param {number[]} noteHistory  MIDI note numbers or pitch-class integers (0–11)
 * @returns {{ root: string, mode: 'major'|'minor', confidence: number }}
 *   confidence is normalised to [0, 1]; values below ~0.5 are unreliable.
 */
export function detectKey(noteHistory) {
  if (!noteHistory || noteHistory.length < 4) {
    return { root: 'C', mode: 'major', confidence: 0 }
  }

  // Build pitch-class frequency vector
  const freq = new Array(12).fill(0)
  for (const note of noteHistory) {
    freq[((note % 12) + 12) % 12]++
  }

  let best = { root: 0, mode: 'major', score: -Infinity }

  for (let root = 0; root < 12; root++) {
    // Rotate the observed frequencies to align with the profile's C-root
    const rotated = Array.from({ length: 12 }, (_, i) => freq[(i + root) % 12])

    const scoreMaj = pearsonCorrelation(rotated, KS_MAJOR)
    const scoreMin = pearsonCorrelation(rotated, KS_MINOR)

    if (scoreMaj > best.score) best = { root, mode: 'major', score: scoreMaj }
    if (scoreMin > best.score) best = { root, mode: 'minor', score: scoreMin }
  }

  // Map correlation [-1, 1] to a rough confidence in [0, 1]
  const confidence = Math.max(0, Math.min(1, (best.score + 1) / 2))

  return { root: noteName(best.root), mode: best.mode, confidence }
}

// ─── Scale helpers ───────────────────────────────────────────────────────────

/**
 * Returns all note names in a given scale.
 * @param {string} root  e.g. 'G', 'F#'
 * @param {keyof SCALES} mode
 * @returns {string[]}
 */
export function getScale(root, mode) {
  const rootIdx = noteIndex(root)
  if (rootIdx === -1) return []
  const intervals = SCALES[mode] ?? SCALES.major
  return intervals.map(i => noteName(rootIdx + i))
}

// Legacy aliases kept for backwards compatibility
export const getFullScale = (root, mode) => getScale(root, mode)
export const getPentatonicScale = (root, mode) =>
  getScale(root, mode === 'minor' ? 'pentatonic_minor' : 'pentatonic_major')

/**
 * Returns all scale modes that contain every note in `playedNotes`.
 * Useful for suggesting compatible scales from a detected chord or melody.
 * @param {string[]} playedNotes  e.g. ['C', 'E', 'G']
 * @param {string}   root
 * @returns {{ mode: string, label: string, notes: string[] }[]}
 */
export function getCompatibleScales(playedNotes, root) {
  const played = new Set(playedNotes)
  return Object.entries(SCALES)
    .map(([mode]) => ({ mode, label: SCALE_LABELS[mode] ?? mode, notes: getScale(root, mode) }))
    .filter(({ notes }) => [...played].every(n => notes.includes(n)))
}

// ─── Chord helpers ───────────────────────────────────────────────────────────

/**
 * Parses a chord name and returns its component note names.
 * @param {string} chordName  e.g. 'Am', 'Gmaj7', 'Fdim', 'Baug'
 * @returns {string[]}
 */
export function getChordTones(chordName) {
  const match = chordName.match(/^([A-G][b#]?)(.*)$/)
  if (!match) return []
  const root    = noteIndex(match[1])
  const suffix  = match[2] ?? ''

  const type = Object.values(CHORD_TYPES).find(t => t.suffix === suffix)
    ?? CHORD_TYPES.maj  // default to major triad

  return type.intervals.map(i => noteName(root + i))
}

/**
 * Returns the diatonic chords (triads) for every scale degree.
 * @param {string} root
 * @param {'major'|'minor'} mode
 * @returns {string[]}  e.g. ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim']
 */
export function getChordsInKey(root, mode) {
  const rootIdx  = noteIndex(root)
  if (rootIdx === -1) return []
  const scale    = SCALES[mode] ?? SCALES.major
  const qualities = DEGREE_QUALITIES[mode] ?? DEGREE_QUALITIES.major

  return scale.map((degree, i) => noteName(rootIdx + degree) + qualities[i])
}

// ─── Progression suggestions ─────────────────────────────────────────────────

/**
 * Returns common chord progressions transposed to the given key.
 *
 * For non-diatonic degrees (e.g. bVII in rock), the quality falls back to a
 * major triad rather than silently producing a wrong chord name.
 *
 * @param {string} root
 * @param {'major'|'minor'} mode
 * @returns {{ genre: string, rn: string[], chords: string[] }[]}
 */
export function getSuggestedProgressions(root, mode) {
  const rootIdx   = noteIndex(root)
  if (rootIdx === -1) return []
  const scale     = SCALES[mode] ?? SCALES.major
  const qualities = DEGREE_QUALITIES[mode] ?? DEGREE_QUALITIES.major

  return Object.values(PROGRESSIONS).map(prog => {
    const chords = prog.degrees.map(semitones => {
      const noteIdx    = (rootIdx + semitones) % 12
      const name       = noteName(noteIdx)
      const degreeIdx  = scale.indexOf(semitones)
      // Diatonic degree → use proper quality; chromatic (e.g. bVII) → major triad
      const quality    = degreeIdx >= 0 ? qualities[degreeIdx] : ''
      return name + quality
    })
    return { genre: prog.name, rn: prog.rn, chords }
  })
}

// ─── Chroma-based chord matching ─────────────────────────────────────────────

/**
 * Matches the most likely chord from a chroma energy vector.
 *
 * The algorithm scores each candidate chord by comparing in-chord vs
 * out-of-chord energy, with bonuses for bass-note and diatonic alignment.
 * Returns null when no unambiguous winner is found (e.g. during a transition).
 *
 * @param {Float32Array|number[]} chroma        12-element pitch-class energy (0–1)
 * @param {{ root: string, mode: string }}  keyInfo
 * @param {number|null} [bassPC=null]           Pitch class of the detected bass note
 * @param {boolean}     [strictDiatonic=false]  Only consider diatonic chords
 * @param {number}      [minScore]              Override default minimum match score
 * @param {number}      [minMargin]             Override default ambiguity margin
 * @returns {string|null}  Chord name, e.g. 'Am7', or null if ambiguous
 */
export function matchChordFromChroma(
  chroma,
  keyInfo,
  bassPC        = null,
  strictDiatonic = false,
  minScore      = CHORD_MATCH_MIN_SCORE,
  minMargin     = CHORD_MATCH_MIN_MARGIN,
) {
  if (!keyInfo?.root) return null

  const diatonicSet = new Set(getChordsInKey(keyInfo.root, keyInfo.mode))

  let best        = { name: null, score: -Infinity }
  let secondScore = -Infinity

  for (let r = 0; r < 12; r++) {
    for (const typeKey of MATCH_CHORD_TYPES) {
      const type      = CHORD_TYPES[typeKey]
      const chordName = noteName(r) + type.suffix

      if (strictDiatonic && !diatonicSet.has(chordName)) continue

      const tones = new Set(type.intervals.map(i => (r + i) % 12))

      let inEnergy = 0, outEnergy = 0
      for (let pc = 0; pc < 12; pc++) {
        if (pc === r) {
          // Root carries the strongest identity signal — double weight
          inEnergy  += chroma[pc] * 2
        } else if (tones.has(pc)) {
          inEnergy  += chroma[pc]
        } else {
          outEnergy += chroma[pc]
        }
      }

      // Skip near-silence
      if (inEnergy + outEnergy < 0.05) continue

      const coverageScore  = inEnergy / (inEnergy + outEnergy * 0.5)
      const bassBonus      = bassPC !== null && r === bassPC   ? 0.15 : 0
      const diatonicBonus  = diatonicSet.has(chordName)       ? 0.10 : 0

      const finalScore = coverageScore + bassBonus + diatonicBonus

      if (finalScore > best.score) {
        secondScore = best.score
        best        = { name: chordName, score: finalScore }
      } else if (finalScore > secondScore) {
        secondScore = finalScore
      }
    }
  }

  const clearWinner = best.score >= minScore && (best.score - secondScore) >= minMargin
  return clearWinner ? best.name : null
}

// ─── Roman numeral notation ───────────────────────────────────────────────────

/**
 * Converts a chord name to its Roman numeral relative to a key.
 *
 * Non-diatonic (borrowed/chromatic) chords are returned with a flat prefix,
 * e.g. 'Bb' in C major → '♭VII'. Previously this always returned '♭I'.
 *
 * @param {string} chordName  e.g. 'Am', 'G7'
 * @param {string} keyRoot    e.g. 'C'
 * @param {string} keyMode    e.g. 'major'
 * @returns {string}
 */
export function toRomanNumeral(chordName, keyRoot, keyMode) {
  if (!chordName || !keyRoot) return '?'

  const match = chordName.match(/^([A-G][b#]?)(.*)$/)
  if (!match) return '?'
  const [, root, quality] = match

  const chordRootIdx = noteIndex(root)
  const keyRootIdx   = noteIndex(keyRoot)
  if (chordRootIdx < 0 || keyRootIdx < 0) return '?'

  const semitones = ((chordRootIdx - keyRootIdx) + 12) % 12
  const scale     = SCALES[keyMode] ?? SCALES.major
  const degreeIdx = scale.indexOf(semitones)

  let rn
  if (degreeIdx >= 0) {
    rn = ROMAN_NUMERALS[degreeIdx]
  } else {
    // Chromatic chord: find the nearest diatonic degree above and flat it
    const nearestAbove = scale.findIndex(d => d > semitones)
    const refDegree    = nearestAbove >= 0 ? nearestAbove : 0
    rn = '♭' + ROMAN_NUMERALS[refDegree]
  }

  const isMinorQuality = /^m(?!aj)/.test(quality) || quality === 'dim' || quality === 'm7b5'
  return isMinorQuality ? rn.toLowerCase() : rn
}

// ─── Repeating progression detection ─────────────────────────────────────────

/**
 * Scans recent chord history for a repeating pattern of length 2–6.
 *
 * Returns the most recently completed pattern that appears at least twice
 * within the last 20 chords. Longer patterns that repeat are preferred over
 * shorter ones via a `repetitions × length` score.
 *
 * @param {string[]} history  Ordered list of chord names
 * @returns {string[]|null}   Detected repeating pattern, or null
 */
export function detectRepeatingProgression(history) {
  if (!history || history.length < 4) return null

  const window = history.slice(-20)
  let best = null, bestScore = 0

  for (let len = 2; len <= 6; len++) {
    if (len * 2 > window.length) break

    const candidate = window.slice(-len)
    let reps = 0

    // Count non-overlapping matches from left to right
    let i = 0
    while (i <= window.length - len) {
      const matches = candidate.every((c, j) => c === window[i + j])
      if (matches) {
        reps++
        i += len  // skip past this match to avoid overlaps
      } else {
        i++
      }
    }

    const score = reps * len
    if (reps >= 2 && score > bestScore) {
      bestScore = score
      best      = candidate
    }
  }

  return best
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/**
 * Returns the interval name for a semitone distance (0–11).
 * @param {number} semitones
 * @returns {string}
 */
export function intervalName(semitones) {
  const names = [
    'Unison', 'Minor 2nd', 'Major 2nd', 'Minor 3rd', 'Major 3rd',
    'Perfect 4th', 'Tritone', 'Perfect 5th', 'Minor 6th',
    'Major 6th', 'Minor 7th', 'Major 7th',
  ]
  return names[((semitones % 12) + 12) % 12] ?? 'Unknown'
}

/**
 * Transposes a chord name by a given number of semitones.
 * @param {string} chordName  e.g. 'Am7'
 * @param {number} semitones  Positive = up, negative = down
 * @returns {string}
 */
export function transposeChord(chordName, semitones) {
  const match = chordName.match(/^([A-G][b#]?)(.*)$/)
  if (!match) return chordName
  const newRoot = noteName(noteIndex(match[1]) + semitones)
  return newRoot + match[2]
}

/**
 * Transposes an entire progression by a given number of semitones.
 * @param {string[]} chords
 * @param {number}   semitones
 * @returns {string[]}
 */
export function transposeProgression(chords, semitones) {
  return chords.map(c => transposeChord(c, semitones))
}