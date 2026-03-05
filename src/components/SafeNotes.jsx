import { getPentatonicScale, getFullScale, getChordTones } from '../lib/theory'

const ALL_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export default function SafeNotes({ keyInfo, currentChord }) {
  const { root, mode } = keyInfo ?? {}

  if (!root) return null

  const penta = getPentatonicScale(root, mode)
  const full = getFullScale(root, mode)
  const chordTones = currentChord ? getChordTones(currentChord) : []

  return (
    <div className="bg-panel border border-border rounded-2xl p-6">
      <p className="text-sm text-gray-500 uppercase tracking-widest mb-4">Safe Notes</p>
      <div className="flex gap-2 flex-wrap">
        {ALL_NOTES.map(note => {
          const isChordTone = chordTones.includes(note)
          const isPenta = penta.includes(note)
          const isScale = full.includes(note)

          let cls = 'px-3 py-2 rounded-lg text-sm font-semibold border transition-all '
          if (isChordTone) {
            cls += 'bg-accent text-white border-accent scale-105'
          } else if (isPenta) {
            cls += 'bg-accent/20 text-accent border-accent/40'
          } else if (isScale) {
            cls += 'bg-border text-gray-300 border-border'
          } else {
            cls += 'bg-transparent text-gray-700 border-transparent'
          }

          return (
            <span key={note} className={cls}>{note}</span>
          )
        })}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-gray-500">
        <span><span className="text-accent">■</span> Chord tone</span>
        <span><span className="text-accent/60">■</span> Pentatonic</span>
        <span><span className="text-gray-500">■</span> Scale</span>
      </div>
    </div>
  )
}
