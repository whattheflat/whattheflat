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

// Krumhansl-Schmuckler key profiles (major/minor only — used for key detection)
const KS_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const KS_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

// Chord type definitions: intervals (semitones from root) and display suffix
export const CHORD_TYPES = {
  maj:      { intervals: [0, 4, 7],        suffix: ''      },
  min:      { intervals: [0, 3, 7],        suffix: 'm'     },
  dom7:     { intervals: [0, 4, 7, 10],    suffix: '7'     },
  maj7:     { intervals: [0, 4, 7, 11],    suffix: 'maj7'  },
  min7:     { intervals: [0, 3, 7, 10],    suffix: 'm7'    },
  dim:      { intervals: [0, 3, 6],        suffix: 'dim'   },
  dim7:     { intervals: [0, 3, 6, 9],     suffix: 'dim7'  },
  half_dim: { intervals: [0, 3, 6, 10],    suffix: 'm7b5'  },
  aug:      { intervals: [0, 4, 8],        suffix: 'aug'   },
  sus4:     { intervals: [0, 5, 7],        suffix: 'sus4'  },
  sus2:     { intervals: [0, 2, 7],        suffix: 'sus2'  },
  maj6:     { intervals: [0, 4, 7, 9],     suffix: '6'     },
  min6:     { intervals: [0, 3, 7, 9],     suffix: 'm6'    },
  add9:     { intervals: [0, 2, 4, 7],     suffix: 'add9'  },
}

// Chord types considered during real-time chroma matching
const MATCH_CHORD_TYPES = [
  'maj', 'min', 'dom7', 'maj7', 'min7', 'dim', 'half_dim', 'aug', 'sus4', 'sus2', 'add9',
]

// Minimum score for a chord match to be reported
const CHORD_MATCH_MIN_SCORE  = 0.42
// Minimum margin over second-best for a match to be considered unambiguous
const CHORD_MATCH_MIN_MARGIN = 0.07

// Chord quality for each scale degree, per mode
const DEGREE_QUALITIES = {
  major:      ['',  'm',   'm',   '',    '',  'm',   'dim'],
  minor:      ['m', 'dim', '',    'm',   'm', '',    ''   ],
  dorian:     ['m', 'm',   '',    '',    'm', 'dim', ''   ],
  phrygian:   ['m', '',    '',    'm',   'dim','',   'm'  ],
  lydian:     ['',  '',    'm',   'dim', '',  'm',   'm'  ],
  mixolydian: ['',  'm',   'dim', '',    'm', 'm',   ''   ],
}

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

// Common chord progressions by genre, expressed as semitone offsets from the root
const PROGRESSIONS = {
  // Pop
  pop:     { name: 'Pop',      rn: ['I', 'V', 'vi', 'IV'],      degrees: [0, 7, 9, 5]     },
  pop2:    { name: 'Pop',      rn: ['I', 'IV', 'vi', 'V'],      degrees: [0, 5, 9, 7]     },
  pop3:    { name: 'Pop',      rn: ['I', 'vi', 'ii', 'V'],      degrees: [0, 9, 2, 7]     },
  // Blues
  blues:   { name: 'Blues',    rn: ['I', 'IV', 'V'],             degrees: [0, 5, 7]        },
  blues2:  { name: 'Blues',    rn: ['I', 'IV', 'V', 'IV'],       degrees: [0, 5, 7, 5]     },
  blues3:  { name: 'Blues',    rn: ['I', 'I', 'IV', 'V'],        degrees: [0, 0, 5, 7]     },
  // Folk
  folk:    { name: 'Folk',     rn: ['I', 'IV', 'I', 'V'],        degrees: [0, 5, 0, 7]     },
  folk2:   { name: 'Folk',     rn: ['I', 'V', 'IV', 'I'],        degrees: [0, 7, 5, 0]     },
  folk3:   { name: 'Folk',     rn: ['I', 'ii', 'IV', 'V'],       degrees: [0, 2, 5, 7]     },
  // Jazz
  jazz:    { name: 'Jazz',     rn: ['ii', 'V', 'I'],             degrees: [2, 7, 0]        },
  jazz2:   { name: 'Jazz',     rn: ['I', 'vi', 'ii', 'V'],       degrees: [0, 9, 2, 7]     },
  jazz3:   { name: 'Jazz',     rn: ['iii', 'vi', 'ii', 'V'],     degrees: [4, 9, 2, 7]     },
  // Rock
  rock:    { name: 'Rock',     rn: ['I', 'bVII', 'IV', 'I'],     degrees: [0, 10, 5, 0]    },
  rock2:   { name: 'Rock',     rn: ['I', 'IV', 'V', 'I'],        degrees: [0, 5, 7, 0]     },
  rock3:   { name: 'Rock',     rn: ['I', 'bVII', 'bVI', 'bVII'], degrees: [0, 10, 8, 10]   },
  // '50s
  '50s':   { name: "'50s",     rn: ['I', 'vi', 'IV', 'V'],       degrees: [0, 9, 5, 7]     },
  '50s2':  { name: "'50s",     rn: ['I', 'V', 'vi', 'iii'],      degrees: [0, 7, 9, 4]     },
  // Flamenco
  flamen:  { name: 'Flamenco', rn: ['i', 'bVII', 'bVI', 'V'],   degrees: [0, 10, 8, 7]    },
  flamen2: { name: 'Flamenco', rn: ['i', 'bVI', 'bVII', 'i'],   degrees: [0, 8, 10, 0]    },
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function noteName(semitone, preferFlat = false) {
  const pc = ((semitone % 12) + 12) % 12
  return preferFlat ? NOTES_FLAT[pc] : NOTES[pc]
}

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

// Accepts both sharp (C#) and flat (Db) spellings
function noteIndex(note) {
  const idx = NOTES.indexOf(note)
  if (idx !== -1) return idx
  return NOTES_FLAT.indexOf(note)
}

// ─── Key Detection ───────────────────────────────────────────────────────────

/**
 * detectTopKeys(noteHistory, n) → top N key candidates sorted by confidence.
 * Each entry: { root, mode, confidence }
 */
export function detectTopKeys(noteHistory, n = 3) {
  if (!noteHistory || noteHistory.length < 8) return []

  const freq = new Array(12).fill(0)
  for (const note of noteHistory) freq[((note % 12) + 12) % 12]++

  const candidates = []
  for (let root = 0; root < 12; root++) {
    const rotated  = Array.from({ length: 12 }, (_, i) => freq[(i + root) % 12])
    const scoreMaj = pearsonCorrelation(rotated, KS_MAJOR)
    const scoreMin = pearsonCorrelation(rotated, KS_MINOR)
    candidates.push({ root: noteName(root), mode: 'major', score: scoreMaj,
      confidence: Math.max(0, Math.min(1, (scoreMaj + 1) / 2)) })
    candidates.push({ root: noteName(root), mode: 'minor', score: scoreMin,
      confidence: Math.max(0, Math.min(1, (scoreMin + 1) / 2)) })
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, n)
    .map(({ root, mode, confidence }) => ({ root, mode, confidence }))
}

/**
 * detectKey(noteHistory) → { root, mode, confidence }
 * Uses Krumhansl-Schmuckler: correlates pitch-class histogram with key profiles.
 * noteHistory: array of MIDI note numbers or pitch-class integers (0–11)
 */
export function detectKey(noteHistory) {
  if (!noteHistory || noteHistory.length < 4) {
    return { root: 'C', mode: 'major', confidence: 0 }
  }

  const freq = new Array(12).fill(0)
  for (const note of noteHistory) {
    freq[((note % 12) + 12) % 12]++
  }

  let best = { root: 0, mode: 'major', score: -Infinity }

  for (let root = 0; root < 12; root++) {
    const rotated = Array.from({ length: 12 }, (_, i) => freq[(i + root) % 12])
    const scoreMaj = pearsonCorrelation(rotated, KS_MAJOR)
    const scoreMin = pearsonCorrelation(rotated, KS_MINOR)
    if (scoreMaj > best.score) best = { root, mode: 'major', score: scoreMaj }
    if (scoreMin > best.score) best = { root, mode: 'minor', score: scoreMin }
  }

  const confidence = Math.max(0, Math.min(1, (best.score + 1) / 2))
  return { root: noteName(best.root), mode: best.mode, confidence }
}

// ─── Scale helpers ───────────────────────────────────────────────────────────

export function getScale(root, mode) {
  const rootIdx = noteIndex(root)
  if (rootIdx === -1) return []
  return (SCALES[mode] ?? SCALES.major).map(i => noteName(rootIdx + i))
}

// Legacy aliases
export const getFullScale      = (root, mode) => getScale(root, mode)
export const getPentatonicScale = (root, mode) =>
  getScale(root, mode === 'minor' ? 'pentatonic_minor' : 'pentatonic_major')

/**
 * Returns all scale modes that contain every note in playedNotes.
 * Useful for suggesting compatible scales from a detected chord or melody.
 */
export function getCompatibleScales(playedNotes, root) {
  const played = new Set(playedNotes)
  return Object.entries(SCALES)
    .map(([mode]) => ({ mode, label: SCALE_LABELS[mode] ?? mode, notes: getScale(root, mode) }))
    .filter(({ notes }) => [...played].every(n => notes.includes(n)))
}

// ─── Chord helpers ───────────────────────────────────────────────────────────

export function getChordTones(chordName) {
  const match = chordName.match(/^([A-G][b#]?)(.*)$/)
  if (!match) return []
  const root = noteIndex(match[1])
  const suffix = match[2] ?? ''
  const type = Object.values(CHORD_TYPES).find(t => t.suffix === suffix) ?? CHORD_TYPES.maj
  return type.intervals.map(i => noteName(root + i))
}

export function getChordsInKey(root, mode) {
  const rootIdx = noteIndex(root)
  if (rootIdx === -1) return []
  const scale    = SCALES[mode] ?? SCALES.major
  const qualities = DEGREE_QUALITIES[mode] ?? DEGREE_QUALITIES.major
  return scale.map((degree, i) => noteName(rootIdx + degree) + qualities[i])
}

// ─── Progression suggestions ─────────────────────────────────────────────────

export function getSuggestedProgressions(root, mode) {
  const rootIdx = noteIndex(root)
  if (rootIdx === -1) return []
  const scale    = SCALES[mode] ?? SCALES.major
  const qualities = DEGREE_QUALITIES[mode] ?? DEGREE_QUALITIES.major

  return Object.values(PROGRESSIONS).map(prog => {
    const chords = prog.degrees.map(semitones => {
      const noteIdx   = (rootIdx + semitones) % 12
      const degreeIdx = scale.indexOf(semitones)
      // Chromatic degrees (e.g. bVII in rock) default to major triad
      const quality   = degreeIdx >= 0 ? qualities[degreeIdx] : ''
      return noteName(noteIdx) + quality
    })
    return { genre: prog.name, rn: prog.rn, chords }
  })
}

// ─── Chroma-based chord matching ─────────────────────────────────────────────

/**
 * matchChordFromChroma(chroma, keyInfo, bassPC?, strictDiatonic?, minScore?, minMargin?)
 * chroma: Float32Array[12], normalised 0–1 energy per pitch class.
 * Returns null when no unambiguous winner is found (transition/silence).
 */
export function matchChordFromChroma(
  chroma,
  keyInfo,
  bassPC         = null,
  strictDiatonic = false,
  minScore       = CHORD_MATCH_MIN_SCORE,
  minMargin      = CHORD_MATCH_MIN_MARGIN,
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

      // Skip if root has no meaningful energy — chord without its root is unreliable
      if (chroma[r] < 0.08) continue

      let inEnergy = 0, outEnergy = 0
      for (let pc = 0; pc < 12; pc++) {
        if (pc === r) {
          inEnergy  += chroma[pc] * 1.5  // root weight reduced: 2→1.5 (less root bias)
        } else if (tones.has(pc)) {
          inEnergy  += chroma[pc]
        } else {
          outEnergy += chroma[pc]
        }
      }

      if (inEnergy + outEnergy < 0.05) continue

      // Stricter outEnergy penalty (0.7 vs 0.5) — wrong notes hurt more
      const coverageScore = inEnergy / (inEnergy + outEnergy * 0.7)
      const bassBonus     = bassPC !== null && r === bassPC ? 0.15 : 0
      const diatonicBonus = diatonicSet.has(chordName)     ? 0.15 : 0

      const finalScore = coverageScore + bassBonus + diatonicBonus

      if (finalScore > best.score) {
        secondScore = best.score
        best        = { name: chordName, score: finalScore }
      } else if (finalScore > secondScore) {
        secondScore = finalScore
      }
    }
  }

  return (best.score >= minScore && best.score - secondScore >= minMargin)
    ? best.name
    : null
}

// ─── Roman numeral notation ───────────────────────────────────────────────────

/**
 * Converts a chord name to its Roman numeral relative to a key.
 * Chromatic (borrowed) chords get a flat prefix, e.g. Bb in C major → ♭VII.
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
    // Chromatic chord: flat the nearest diatonic degree above it
    const nearestAbove = scale.findIndex(d => d > semitones)
    const refDegree    = nearestAbove >= 0 ? nearestAbove : 0
    rn = '♭' + ROMAN_NUMERALS[refDegree]
  }

  const isMinorQuality = /^m(?!aj)/.test(quality) || quality === 'dim' || quality === 'm7b5'
  return isMinorQuality ? rn.toLowerCase() : rn
}

// ─── Repeating progression detection ─────────────────────────────────────────

// Returns true if arr is made of a shorter repeating unit (e.g. [A,B,A,B] → true)
function isPeriodicPattern(arr) {
  for (let p = 1; p <= Math.floor(arr.length / 2); p++) {
    if (arr.length % p !== 0) continue
    const unit = arr.slice(0, p)
    if (arr.every((v, i) => v === unit[i % p])) return true
  }
  return false
}

// Returns the lexicographically smallest rotation so the same loop always
// produces the same string regardless of where in the cycle we currently are.
function canonicalize(pattern) {
  let best = pattern
  for (let i = 1; i < pattern.length; i++) {
    const rot = [...pattern.slice(i), ...pattern.slice(0, i)]
    if (rot.join('\0') < best.join('\0')) best = rot
  }
  return best
}

/**
 * detectRepeatingProgression(history) → chord[] or null
 *
 * Tests every unique subsequence of every length (not just the tail) so the
 * result is stable regardless of where in the loop the musician currently is.
 * Returns the canonical (rotation-normalised) form of the best pattern found.
 */
export function detectRepeatingProgression(history) {
  if (!history || history.length < 6) return null

  const win = history.slice(-32)
  let best = null, bestScore = 0

  for (let len = 2; len <= 6; len++) {
    if (len * 2 > win.length) break

    const seen = new Set()

    for (let start = 0; start <= win.length - len; start++) {
      const candidate = win.slice(start, start + len)
      const key = candidate.join('\0')
      if (seen.has(key)) continue
      seen.add(key)

      // A pattern that is itself a repetition of something shorter will be
      // found at that shorter length — skip it here to avoid inflating scores.
      if (len >= 4 && isPeriodicPattern(candidate)) continue

      let reps = 0, i = 0
      while (i <= win.length - len) {
        if (candidate.every((c, j) => c === win[i + j])) { reps++; i += len }
        else i++
      }

      if (reps < 2) continue

      const score = reps * len
      // Prefer longer patterns on equal score — more descriptive loop wins
      if (score > bestScore || (score === bestScore && len > (best?.length ?? 0))) {
        bestScore = score
        best = candidate
      }
    }
  }

  return best ? canonicalize(best) : null
}

// ─── Debug / analysis helpers ─────────────────────────────────────────────────

/**
 * Returns top N chord candidates with full score breakdown for the given chroma.
 */
export function getChordCandidates(chroma, keyInfo, bassPC = null, topN = 8) {
  if (!keyInfo?.root || !chroma) return []
  const diatonicSet = new Set(getChordsInKey(keyInfo.root, keyInfo.mode))
  const candidates  = []

  for (let r = 0; r < 12; r++) {
    for (const typeKey of MATCH_CHORD_TYPES) {
      const type      = CHORD_TYPES[typeKey]
      const chordName = noteName(r) + type.suffix
      const tones     = new Set(type.intervals.map(i => (r + i) % 12))

      let inEnergy = 0, outEnergy = 0
      for (let pc = 0; pc < 12; pc++) {
        if      (pc === r)        inEnergy  += chroma[pc] * 2
        else if (tones.has(pc))   inEnergy  += chroma[pc]
        else                      outEnergy += chroma[pc]
      }
      if (inEnergy + outEnergy < 0.05) continue

      const coverage     = inEnergy / (inEnergy + outEnergy * 0.5)
      const bassBonus    = bassPC !== null && r === bassPC ? 0.15 : 0
      const diatBonus    = diatonicSet.has(chordName) ? 0.15 : 0
      const score        = coverage + bassBonus + diatBonus
      candidates.push({ name: chordName, score, coverage, bassBonus, diatBonus, diatonic: diatonicSet.has(chordName) })
    }
  }
  return candidates.sort((a, b) => b.score - a.score).slice(0, topN)
}

/**
 * Analyses note history: returns normalised pitch-class frequencies and
 * top K-S key candidates with correlation scores.
 */
export function getNoteHistoryAnalysis(noteHistory) {
  const freq = new Array(12).fill(0)
  if (!noteHistory?.length) return { freq, topKeys: [] }

  for (const note of noteHistory) freq[((note % 12) + 12) % 12]++
  const total      = noteHistory.length
  const normalized = freq.map(f => f / total)

  const candidates = []
  for (let root = 0; root < 12; root++) {
    const rotated = Array.from({ length: 12 }, (_, i) => normalized[(i + root) % 12])
    candidates.push({ root: noteName(root), mode: 'major', score: pearsonCorrelation(rotated, KS_MAJOR) })
    candidates.push({ root: noteName(root), mode: 'minor', score: pearsonCorrelation(rotated, KS_MINOR) })
  }
  return {
    freq:    normalized,
    total,
    topKeys: candidates.sort((a, b) => b.score - a.score).slice(0, 5),
  }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

export function intervalName(semitones) {
  const names = [
    'Unison', 'Minor 2nd', 'Major 2nd', 'Minor 3rd', 'Major 3rd',
    'Perfect 4th', 'Tritone', 'Perfect 5th', 'Minor 6th',
    'Major 6th', 'Minor 7th', 'Major 7th',
  ]
  return names[((semitones % 12) + 12) % 12] ?? 'Unknown'
}

export function transposeChord(chordName, semitones) {
  const match = chordName.match(/^([A-G][b#]?)(.*)$/)
  if (!match) return chordName
  return noteName(noteIndex(match[1]) + semitones) + match[2]
}

export function transposeProgression(chords, semitones) {
  return chords.map(c => transposeChord(c, semitones))
}
