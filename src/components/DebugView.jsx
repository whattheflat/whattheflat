import { getScale, getChordTones, NOTES } from '../lib/theory'

// ─── Piano keyboard constants ─────────────────────────────────────────────────
const WHITE_PCS  = [0, 2, 4, 5, 7, 9, 11]  // C D E F G A B
const BLACK_KEYS = [
  { pc: 1,  left: '10%'   }, // C#
  { pc: 3,  left: '24.3%' }, // D#
  { pc: 6,  left: '52.9%' }, // F#
  { pc: 8,  left: '67.1%' }, // G#
  { pc: 10, left: '81.4%' }, // A#
]

// ─── Piano keyboard component ─────────────────────────────────────────────────
function PianoKeyboard({ values, keyNotes, chordNotes, height = 'h-24' }) {
  const max = Math.max(...values, 0.01)

  return (
    <div className={`relative ${height} select-none`}>
      {/* White keys */}
      <div className="flex gap-px h-full">
        {WHITE_PCS.map(pc => {
          const name   = NOTES[pc]
          const energy = values[pc] / max
          const inChord = chordNotes?.has(pc)
          const inKey   = keyNotes?.has(pc)

          const glow = inChord
            ? `rgba(167,139,250,${0.25 + energy * 0.75})`
            : inKey
            ? `rgba(251,191,36,${0.15 + energy * 0.55})`
            : `rgba(200,200,210,${0.06 + energy * 0.18})`

          return (
            <div
              key={pc}
              className="flex-1 rounded-b border border-gray-700 relative overflow-hidden flex flex-col justify-end"
              style={{
                background: `linear-gradient(to top, ${glow} 0%, rgba(22,22,28,1) ${Math.max(5, energy * 75)}%)`,
                boxShadow: energy > 0.35 && inChord
                  ? '0 -6px 16px rgba(167,139,250,0.35) inset'
                  : energy > 0.35 && inKey
                  ? '0 -4px 10px rgba(251,191,36,0.2) inset'
                  : 'none',
              }}
            >
              <span className="text-center text-[8px] text-gray-600 pb-1 leading-none">{name}</span>
            </div>
          )
        })}
      </div>

      {/* Black keys */}
      {BLACK_KEYS.map(({ pc, left }) => {
        const name   = NOTES[pc]
        const energy = values[pc] / max
        const inChord = chordNotes?.has(pc)
        const inKey   = keyNotes?.has(pc)

        const bg = inChord
          ? `rgba(139,92,246,${0.45 + energy * 0.55})`
          : inKey
          ? `rgba(180,140,10,${0.4 + energy * 0.45})`
          : `rgba(12,12,16,${0.88 + energy * 0.12})`

        return (
          <div
            key={pc}
            className="absolute top-0 z-10 rounded-b"
            style={{
              left,
              width: '8.5%',
              height: '62%',
              background: bg,
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: energy > 0.4
                ? inChord
                  ? '0 0 10px rgba(139,92,246,0.5)'
                  : '0 0 4px rgba(255,255,255,0.08)'
                : 'none',
            }}
          />
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DebugView({ chroma, chordCandidates, noteAnalysis, keyInfo, currentChord }) {
  const keyPCs   = new Set(keyInfo ? getScale(keyInfo.root, keyInfo.mode).map(n => NOTES.indexOf(n)) : [])
  const chordPCs = new Set(currentChord ? getChordTones(currentChord).map(n => NOTES.indexOf(n)) : [])

  const chromaArr   = chroma       ? [...chroma]       : new Array(12).fill(0)
  const histFreq    = noteAnalysis ? noteAnalysis.freq  : new Array(12).fill(0)
  const topKeys     = noteAnalysis ? noteAnalysis.topKeys : []
  const topScore    = chordCandidates[0]?.score ?? 1
  const topKeyScore = topKeys[0]?.score ?? 1

  return (
    <div className="bg-panel border border-border rounded-2xl p-4 flex flex-col gap-4">
      <p className="text-xs text-gray-500 uppercase tracking-widest shrink-0">Behind the Scenes</p>

      {/* ── Large live chroma keyboard ── */}
      <div>
        <p className="text-xs text-gray-600 uppercase tracking-widest mb-2">Live chroma — what the engine hears right now</p>
        <PianoKeyboard values={chromaArr} keyNotes={keyPCs} chordNotes={chordPCs} height="h-28" />
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

        {/* Col 2: Note history keyboard */}
        <div>
          <p className="text-xs text-gray-600 uppercase tracking-widest mb-2">Note history — key evidence</p>
          <PianoKeyboard values={histFreq} keyNotes={keyPCs} chordNotes={chordPCs} height="h-20" />
          <div className="flex mt-2 gap-px">
            {NOTES.map((name, pc) => {
              const pct     = Math.round(histFreq[pc] * 100)
              const inKey   = keyPCs.has(pc)
              const isBlack = [1, 3, 6, 8, 10].includes(pc)
              return (
                <div key={pc} className="flex-1 flex flex-col items-center gap-0.5">
                  <span className={`text-[8px] tabular-nums ${inKey ? 'text-amber-400' : 'text-gray-600'}`}>
                    {pct > 0 ? `${pct}%` : ''}
                  </span>
                  <span className={`text-[7px] ${inKey ? 'text-gray-400' : isBlack ? 'text-gray-700' : 'text-gray-600'}`}>
                    {name}
                  </span>
                </div>
              )
            })}
          </div>
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
    </div>
  )
}
